/**
 * Lightview.js Server Version - HTML string generation with reactivity for server-side rendering
 * @license MIT
 * @version 1.0.0
 */
export const Lightview = () => {
    let activeEffect = null;
    const effectQueue = new Set();
    const changeListeners = new Map();

    function scheduleUpdate() {
        Promise.resolve().then(async () => await runEffects());
    }

    async function runEffects() {
        const effectsToRun = new Set(effectQueue);
        effectQueue.clear();
        await Promise.all([...effectsToRun].map(effect => effect()));
    }

    function createEffect(fn) {
        const effect = async () => {
            activeEffect = effect;
            try {
                await fn();
            } finally {
                activeEffect = null;
            }
        };
        effect.dependencies = new Set();
        return effect;
    }

    function track(dependencies) {
        if (activeEffect) {
            dependencies.add(activeEffect);
            activeEffect.dependencies.add(dependencies);
        }
    }

    function trigger(dependencies) {
        dependencies.forEach(effect => effectQueue.add(effect));
        scheduleUpdate();
    }

    function notifyChangeListeners(path, oldValue, newValue) {
        // Notify exact path listeners
        const exactListeners = changeListeners.get(path);
        if (exactListeners) {
            exactListeners.forEach(handler => {
                try {
                    handler(path, oldValue, newValue);
                } catch (error) {
                    console.error('Error in change listener:', error);
                }
            });
        }

        // Notify parent path listeners (for nested changes)
        if (path.includes('.')) {
            const pathParts = path.split('.');
            for (let i = pathParts.length - 1; i > 0; i--) {
                const parentPath = pathParts.slice(0, i).join('.');
                const parentListeners = changeListeners.get(parentPath);
                if (parentListeners) {
                    parentListeners.forEach(handler => {
                        try {
                            handler(path, oldValue, newValue);
                        } catch (error) {
                            console.error('Error in change listener:', error);
                        }
                    });
                }
            }
        }
    }

    const stateHandler = {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            if (typeof value === 'object' && value !== null && !value.__isLightviewState && property !== '__dependencies' && property !== '__path') {
                const currentPath = target.__path || '';
                const newPath = currentPath ? `${currentPath}.${property}` : property;
                const nestedProxy = new Proxy(value, stateHandler);
                Object.defineProperty(nestedProxy, '__path', { value: newPath, enumerable: false, configurable: true });
                return nestedProxy;
            }
            if (!target.hasOwnProperty('__dependencies')) {
                Object.defineProperty(target, '__dependencies', { value: new Map(), enumerable: false });
            }
            if (!target.__dependencies.has(property)) {
                target.__dependencies.set(property, new Set());
            }
            track(target.__dependencies.get(property));
            return value;
        },
        set(target, property, value, receiver) {
            const oldValue = Reflect.get(target, property, receiver);
            if (Object.is(oldValue, value)) {
                return true;
            }
            
            const currentPath = target.__path || '';
            const fullPath = currentPath ? `${currentPath}.${property}` : property;
            
            const result = Reflect.set(target, property, value, receiver);
            
            notifyChangeListeners(fullPath, oldValue, value);
            
            if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                trigger(target.__dependencies.get(property));
            }
            return result;
        },
        deleteProperty(target, property) {
            const oldValue = Reflect.get(target, property);
            const currentPath = target.__path || '';
            const fullPath = currentPath ? `${currentPath}.${property}` : property;
            
            const result = Reflect.deleteProperty(target, property);
            
            notifyChangeListeners(fullPath, oldValue, undefined);
            
            if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                trigger(target.__dependencies.get(property));
            }
            return result;
        }
    };

    const state = (initialState) => {
        if (initialState && typeof initialState === 'object') {
            if(initialState.__isLightviewState) return initialState;
            Object.defineProperty(initialState, '__isLightviewState', { value: true, enumerable: false });
            Object.defineProperty(initialState, '__path', { value: '', enumerable: false, configurable: true });
        }
        return new Proxy(initialState, stateHandler);
    };

    const states = new Map();

    state.register = (name, object) => {
        if (object && typeof object === 'object') {
            Object.defineProperty(object, '__name', { value: name, enumerable: false });
        }
        const reactiveState = state(object);
        states.set(name, reactiveState);
        return reactiveState;
    };

    state.get = (name) => states.get(name);

    state.addChangeListener = (path, handler) => {
        if (typeof path !== 'string') {
            throw new Error('Path must be a string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        
        if (!changeListeners.has(path)) {
            changeListeners.set(path, []);
        }
        changeListeners.get(path).push(handler);
        
        return () => {
            const listeners = changeListeners.get(path);
            if (listeners) {
                const index = listeners.indexOf(handler);
                if (index > -1) {
                    listeners.splice(index, 1);
                    if (listeners.length === 0) {
                        changeListeners.delete(path);
                    }
                }
            }
        };
    };

    state.removeChangeListener = (path, handler) => {
        const listeners = changeListeners.get(path);
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index > -1) {
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    changeListeners.delete(path);
                }
                return true;
            }
        }
        return false;
    };

    state.removeAllChangeListeners = (path) => {
        if (path === undefined) {
            changeListeners.clear();
        } else {
            changeListeners.delete(path);
        }
    };

    state.getChangeListeners = (path) => {
        return changeListeners.get(path) || [];
    };

    const templates = new Map();
    const templateRenderer = async (template) => {
        let f = templates.get(template);
        if(f) return f;
        f = new (async function () {}).constructor("state",`{ try { with(state||{}) { return \`${template}\`} } catch (e) { return \`${template.replace(/\`/g, '\\\\`')}\`; } }`);
        templates.set(template, f);
        return f;
    }

    function createFunctionRegistry(description) {
        const registry = new Map();
        const processedDescription = JSON.parse(JSON.stringify(description, (key, value) => {
            if (typeof value === 'function') {
                const funcStr = value.toString();
                
                // Extract function name if it's a named function
                const namedFuncMatch = funcStr.match(/^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
                if (namedFuncMatch) {
                    const funcName = namedFuncMatch[1];
                    const refKey = `__Lightview_FUNC_REF__${funcName}__`;
                    registry.set(refKey, funcStr);
                    return refKey;
                }
                
                // For unnamed functions, return a special marker with the function string
                const funcId = `__Lightview_INLINE_FUNC__${Math.random().toString(36).substr(2, 9)}__`;
                registry.set(funcId, funcStr);
                return funcId;
            }
            return value;
        }));
        
        return { registry, processedDescription };
    }

    function generateHydrationScript(options, stateObj, description, states) {
        const clientOptions = { ...options };
        delete clientOptions.state;

        const { registry, processedDescription } = createFunctionRegistry(description);

        // Generate function registry script
        const functionRegistryScript = Array.from(registry.entries()).map(([key, funcStr]) => {
            if (key.startsWith('__Lightview_FUNC_REF__')) {
                const funcName = key.replace('__Lightview_FUNC_REF__', '').replace('__', '');
                return `${funcStr};`;
            } else if (key.startsWith('__Lightview_INLINE_FUNC__')) {
                return `const ${key} = ${funcStr};`;
            }
            return '';
        }).filter(Boolean).join('\n');

        // Convert processed description back to proper format for client
        let descriptionStr = JSON.stringify(processedDescription);
        
        // Replace function references with actual function references (unquoted)
        registry.forEach((funcStr, key) => {
            if (key.startsWith('__Lightview_FUNC_REF__')) {
                const funcName = key.replace('__Lightview_FUNC_REF__', '').replace('__', '');
                descriptionStr = descriptionStr.replace(`"${key}"`, funcName);
            } else if (key.startsWith('__Lightview_INLINE_FUNC__')) {
                descriptionStr = descriptionStr.replace(`"${key}"`,key);
            }
        });

        return '<script>' 
        + `(() => {
            if(lightview.debug) {
                debugger;
            }
            ${Array.from(states.entries()).map(([name, state]) => {
                return `lightview.state.register(${JSON.stringify(name)}, ${JSON.stringify(state)});`;
            }).join('\n')}
            ${functionRegistryScript}
            const options = ${JSON.stringify(clientOptions)};
            options.replaceEl = document.currentScript.previousElementSibling;
            ${stateObj ? `options.state = lightview.state.get('${stateObj.__name}');` : ''}
            lightview.render(${descriptionStr}, options);
            document.currentScript.remove();
        })();`
        + '<' + '/script>';
    }

    async function render(description, options = {}, mode = "ssr-static") {
        if (!["ssr-static", "ssr-hydrate"].includes(mode)) {
            throw new Error(`Lightview Server: mode "${mode}" is not supported. Use "ssr-static" or "ssr-hydrate".`);
        }

        description = await description;
        if (typeof description === "function") description = await description();

        if (typeof description !== 'object' || !description) {
            const stateObj = options.state;
            const renderer = description?.includes("${") ? await templateRenderer(description) : () => description;
            const text = await renderer(stateObj);
            return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        let { tagName, attributes = {}, children = [] } = description;
        const stateObj = options.state;

        if (typeof attributes === "function") attributes = await attributes();
        if (typeof children === "function") children = await children();

        // Build HTML string
        let html = `<${tagName}`;

        for (const [key, value] of Object.entries(attributes)) {
            if(!isNaN(key)) continue;
            if (key.startsWith('on') && typeof value === 'function') {
                // Skip event handlers in HTML mode
            } else if (key === 'style') {
                if (typeof value === 'object') {
                    const styleStr = Object.entries(value).map(([k, v]) => `${k}:${v}`).join(';');
                    html += ` style="${styleStr}"`;
                } else {
                    const renderer = await templateRenderer(value);
                    const styleValue = await renderer(stateObj);
                    html += ` style="${styleValue}"`;
                }
            } else {
                const renderer = await templateRenderer(String(value));
                const attrValue = await renderer(stateObj);
                html += ` ${key}="${attrValue.replace(/"/g, '&quot;')}"`;
            }
        }

        html += '>';

        for (let child of children) {
            html += await render(child, { state: stateObj }, mode);
        }

        html += `</${tagName}>`;

        // Add hydration script for "ssr-hydrate" mode
        if (mode === "ssr-hydrate") {
            html += generateHydrationScript(options, stateObj, description, states);
        }

        return html;
    }

    const tags = new Proxy({}, {
        get(_, tagName) {
            return (attrs = {}) => {
                const { children, ...rest } = attrs;
                return render({ tagName, attributes: rest, children: children || [] });
            };
        }
    });

    return { render, state, tags };
};

export default Lightview;