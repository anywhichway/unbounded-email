/**
 * Baux.js Browser Version - Lightweight DOM rendering with reactivity
 * @license MIT
 * @version 1.0.0
 */
const Baux = () => {
    let activeEffect = null;
    const effectQueue = new Set();
    const changeListeners = new Map();

    let scheduled = false;
    function scheduleUpdate() {
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(async () => {
                scheduled = false;
                await runEffects();
            });
        }
    }

    async function runEffects() {
        const effectsToRun = new Set(effectQueue);
        effectQueue.clear();
        await Promise.all([...effectsToRun].map(effect => effect()));
    }

    function createEffect(fn) {
        const effect = async () => {
            const oldActiveEffect = activeEffect;
            activeEffect = effect;
            // Cleanup previous dependencies
            if (effect.dependencies) {
                effect.dependencies.forEach(dep => dep.delete(effect));
                effect.dependencies.clear();
            } else {
                effect.dependencies = new Set();
            }
            try {
                await fn();
            } finally {
                activeEffect = oldActiveEffect;
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
        dependencies.forEach(effect => {
            effectQueue.add(effect);
        });
        scheduleUpdate();
    }

    function notifyChangeListeners(path, oldValue, newValue) {
        // Notify exact path listeners
        const exactListeners = changeListeners.get(path);
        if (exactListeners) {
            exactListeners.forEach(handler => {
                handler(path, oldValue, newValue);
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
                        handler(path, oldValue, newValue);
                    });
                }
            }
        }
    }

    const stateHandler = {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            
            // Track dependency for this property (moved here to cover all cases)
            if (!target.hasOwnProperty('__dependencies')) {
                Object.defineProperty(target, '__dependencies', { value: new Map(), enumerable: false });
            }
            if (!target.__dependencies.has(property)) {
                const deps = new Set();
                target.__dependencies.set(property, deps);
            }
            track(target.__dependencies.get(property));
            
            if (typeof value === 'object' && value !== null && !value.__isBauxState && property !== '__dependencies' && property !== '__path') {
                // Special handling for Date objects
                if (value instanceof Date) {
                    const currentPath = target.__path || '';
                    const datePath = currentPath ? `${currentPath}.${property}` : property;
                    
                    // Create a proxy for the Date that intercepts mutations
                    const dateProxy = new Proxy(value, {
                        get(dateTarget, dateProperty, receiver) {
                            const dateValue = Reflect.get(dateTarget, dateProperty, receiver);
                            
                            // If it's a method that mutates the date, wrap it to trigger reactivity
                            if (typeof dateValue === 'function' && [
                                'setDate', 'setFullYear', 'setHours', 'setMilliseconds', 'setMinutes', 
                                'setMonth', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear', 
                                'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth', 
                                'setUTCSeconds', 'setYear'
                            ].includes(dateProperty)) {
                                return function(...args) {
                                    const oldValue = new Date(dateTarget.getTime());
                                    const result = dateValue.apply(dateTarget, args);
                                    
                                    // Trigger reactivity by notifying change listeners
                                    notifyChangeListeners(datePath, oldValue, new Date(dateTarget.getTime()));
                                    
                                    // Also trigger the property's dependencies
                                    if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                                        trigger(target.__dependencies.get(property));
                                    }
                                    
                                    return result;
                                };
                            }
                            
                            // For all other properties/methods, return them as-is but bound to the original Date
                            if (typeof dateValue === 'function') {
                                return dateValue.bind(dateTarget);
                            }
                            
                            return dateValue;
                        },
                        set(dateTarget, dateProperty, value, receiver) {
                            // Handle direct property assignment on Date objects
                            const oldValue = new Date(dateTarget.getTime());
                            const result = Reflect.set(dateTarget, dateProperty, value, receiver);
                            
                            // Trigger reactivity
                            notifyChangeListeners(datePath, oldValue, new Date(dateTarget.getTime()));
                            if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                                trigger(target.__dependencies.get(property));
                            }
                            
                            return result;
                        }
                    });
                    
                    return dateProxy;
                }
                
                const currentPath = target.__path || '';
                const newPath = currentPath ? `${currentPath}.${property}` : property;
                const nestedProxy = new Proxy(value, stateHandler);
                Object.defineProperty(nestedProxy, '__path', { value: newPath, enumerable: false, configurable: true });
                return nestedProxy;
            }
            
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
            if(initialState.__isBauxState) return initialState;
            Object.defineProperty(initialState, '__isBauxState', { value: true, enumerable: false });
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
        f = template.includes("${") ? new (async function () {}).constructor("state",`{ try { with(state||{}) { return \`${template}\`} } catch (e) { return \`${template.replace(/\`/g, '\\\\`')}\`; } }`) : () => template;
        templates.set(template, f);
        return f;
    }

    async function render(description, options = {}) {
        description = await description;
        
        // Handle function descriptions specially
        if (typeof description === "function") {
            // First, call it once to see what type of content it returns
            const initialResult = await description();
            
            // If it returns a simple value (string/number), treat it as reactive text
            if (typeof initialResult !== 'object' || !initialResult) {
                const stateObj = options.state;
                
                // Create the text node first
                const node = document.createTextNode('');
                
                const effect = createEffect(async () => {
                    // Call the function inside the effect for reactivity
                    const newText = String(await description() || '');
                    
                    // Always update the existing node
                    node.textContent = newText;
                });
                await effect();
                return node;
            } else {
                // If it returns an object/HTMLElement, treat it as a reactive element
                const stateObj = options.state;
                let currentElement = null;
                
                const effect = createEffect(async () => {
                    const newDescription = await description();
                    const newElement = await render(newDescription, { state: stateObj });
                    
                    if (currentElement) {
                        currentElement.replaceWith(newElement);
                    }
                    currentElement = newElement;
                });
                
                await effect();
                return currentElement;
            }
        }

        if (typeof description !== 'object' || !description) {
            const stateObj = options.state;
            
            // Create the text node first
            const node = document.createTextNode('');
            
            const effect = createEffect(async () => {
                const renderer = await templateRenderer(description);
                const newText = await renderer(stateObj);
                
                // Always update the existing node
                node.textContent = newText;
            });
            await effect();
            return node;
        }

        if (description instanceof HTMLElement) {
            return description;
        }

        let { tagName, attributes = {}, children = [] } = description;
        const stateObj = options.state;

        if (typeof attributes === "function") attributes = await attributes();

        const el = document.createElement(tagName);
        if (stateObj) {
            Object.defineProperty(el, "state", {
                value: stateObj,
                enumerable: false,
                configurable: true
            });
        }

        for (const entry of [...Object.entries(attributes)]) {
            if(!isNaN(entry[0])) continue;
            const effect = createEffect(async () => {
                let [key, value] = entry;
                const type = typeof value;
                if(!key.startsWith("on") && type === "function") {
                    value = await value();
                }
                if (key.startsWith('on') && type === 'function') {
                    el[key.toLowerCase()] = value;
                } else if (key === 'style') {
                    if (typeof value === 'object') {
                        Object.assign(el.style, value);
                    } else {
                        const renderer = await templateRenderer(value);
                        el.style.cssText = await renderer(stateObj);
                    }
                } else {
                    const renderer = await templateRenderer(String(value));
                    el.setAttribute(key, await renderer(stateObj));
                }
            });
            await effect();
        }

        const originalChildren = children; // Preserve the original function
        const effect = createEffect(async () => {
            let resolvedChildren = originalChildren;
            if (typeof originalChildren === "function") {
                resolvedChildren = await originalChildren();
            }
            el.innerHTML = '';
            for (let child of resolvedChildren) {
                el.appendChild(await render(child, { state: stateObj }));
            }
        });
        await effect();
        

        if (options.replaceEl) {
            options.replaceEl.replaceWith(el);
        }

        return el;
    }

    const tags = new Proxy({}, {
        get(_, tagName) {
            return (attrs = {}) => {
                const { children, ...rest } = attrs;
                return render({ tagName, attributes: rest, children: children || [] });
            };
        }
    });

    // Browser-specific DOM enhancements
    const oldSetAttribute = HTMLElement.prototype.setAttribute;
    Object.defineProperty(HTMLElement.prototype, "setAttribute", {
        value(name, value) {
            const oldValue = this.getAttribute(name);
            oldSetAttribute.bind(this)(name, value);
            
            if (name === "src" && oldValue !== value) {
                if (this.tagName === "IFRAME") {
                    this.dispatchEvent(new Event('change'));
                }
            }
        },
        enumerable: false,
        configurable: true,
        writable: false
    });

    const hydrate = (el) => {
        const scripts = el.querySelectorAll('script');
        scripts.forEach(script => {
            if(!['','application/javascript', 'text/javascript'].includes(script.type)) return;
            if(script.src) return;
            if (script.innerHTML) {
                const newScript = document.createElement('script');
                Array.from(script.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.innerHTML = script.innerHTML;
                script.replaceWith(newScript);
            }
        });
    };

    document.addEventListener("click", (event) => {
        if(["LINK", "A"].includes(event.target.tagName)) {
            return;
        }
        
        const href = event.target.getAttribute("href");
        if(!href) return;
        
        const target = event.target.getAttribute("target") || "_self";
        
        if(["_self", "::innerHTML"].includes(target)) {
            event.target.setAttribute("src", href);
            return;
        }
        
        const targetEls = document.querySelectorAll(target);
        targetEls.forEach(target => target.setAttribute("src", href));
    });

    return { render, state, tags, hydrate };
};
