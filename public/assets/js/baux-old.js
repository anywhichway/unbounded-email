/**
 * Baux.js - A lightweight library for rendering JSON objects as DOM nodes or HTML strings with reactivity.
 *
 * @license MIT
 * @author an AI assistant
 * @version 1.0.0
 */
const Baux = (env = "browser") => {
    env = env.toLowerCase();
    if (env !== "browser" && env !== "server") {
        throw new Error(`Baux: env "${env}" is not supported.`);
    }

    const isHtml = env === "server";
    const isServer = env === "server";

    let activeEffect = null;
    const effectQueue = new Set();

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

    // Change listeners storage
    const changeListeners = new Map(); // Map of property paths to arrays of handlers

    // Helper function to notify change listeners
    function notifyChangeListeners(path, oldValue, newValue) {
        const listeners = changeListeners.get(path);
        if (listeners) {
            listeners.forEach(handler => handler(path, oldValue, newValue));
        }
    }

    const stateHandler = {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            if (typeof value === 'object' && value !== null && !value.__isBauxState && property !== '__dependencies' && property !== '__path') {
                // Create nested proxy with path tracking
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
            
            // Build the full path for this property change
            const currentPath = target.__path || '';
            const fullPath = currentPath ? `${currentPath}.${property}` : property;
            
            const result = Reflect.set(target, property, value, receiver);
            
            // Notify change listeners
            notifyChangeListeners(fullPath, oldValue, value);
            
            if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                trigger(target.__dependencies.get(property));
            }
            return result;
        },
        deleteProperty(target, property) {
            const oldValue = Reflect.get(target, property);
            
            // Build the full path for this property deletion
            const currentPath = target.__path || '';
            const fullPath = currentPath ? `${currentPath}.${property}` : property;
            
            const result = Reflect.deleteProperty(target, property);
            
            // Notify change listeners with undefined newValue for deletion
            notifyChangeListeners(fullPath, oldValue, undefined);
            
            if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                trigger(target.__dependencies.get(property));
            }
            return result;
        }
    };

    const state = (initialState) => {
        // Check if already a state to avoid double-wrapping
        if (initialState && typeof initialState === 'object') {
            if(initialState.__isBauxState) return initialState;
            Object.defineProperty(initialState, '__isBauxState', { value: true, enumerable: false });
            // Initialize path tracking for root object
            Object.defineProperty(initialState, '__path', { value: '', enumerable: false, configurable: true });
        }
        return new Proxy(initialState, stateHandler);
    };
    const states = new Map(); // Will store { name: reactive proxy }

    state.register = (name, object) => {
        // Add hidden name property to the object
        if (object && typeof object === 'object') {
            Object.defineProperty(object, '__name', { value: name, enumerable: false });
        }
        const reactiveState = state(object);
        states.set(name, reactiveState);
        return reactiveState;
    };

    state.get = (name) => {
        return states.get(name);
    };

    // Add change listener management functions
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
        
        // Return a function to remove the listener
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
            // Remove all listeners for all paths
            changeListeners.clear();
        } else {
            // Remove all listeners for specific path
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
        f = new (async function () {}).constructor("state",`{ try { with(state||{}) { return \`${template}\`} } catch (e) { return \`${template.replace(/`/g, '\\`')}\`; } }`);
        templates.set(template, f);
        return f;
    }

    // Utility to set state on a node
    const setState = (node, state) => {
        Object.defineProperty(node, "state", {
            value: state,
            enumerable: false,
            configurable: true
        });
        return node;
    }

    // Adapted handleSrc for fetching and rendering content from src
    async function handleSrc(node, src, {state = node.state || {}, render, baseURI} = {}) {
        if (src && ["./", "../", "http"].some(text => src.startsWith(text))) {
            src = baseURI ? new URL(src, baseURI).href : src;
            try {
                const response = await fetch(src);
                const contentType = response.headers.get("content-type");
                if (response.status >= 400) {
                    const msg = `Error ${src} ${response.status}: ${response.statusText}`;
                    node.innerHTML = msg;
                } else if (contentType === "text/html") {
                    const html = await response.text();
                    if (html.includes("<html")) {
                        const fragment = new DOMParser().parseFromString(html, "text/html");
                        node.innerHTML = fragment.body.innerHTML;
                    } else {
                        node.innerHTML = html;
                    }
                } else if (contentType === "application/json") {
                    const data = await response.json();
                    const childNode = await render(data, {state});
                    if (node.contentDocument) {
                        node.contentDocument.childNodes.forEach(n => n.remove());
                        if (childNode instanceof DocumentFragment) {
                            node.contentDocument.append(...childNode.childNodes);
                        } else {
                            node.contentDocument.append(childNode);
                        }
                    } else {
                        node.innerHTML = "";
                        if (childNode instanceof DocumentFragment) {
                            node.append(...childNode.childNodes);
                        } else {
                            node.append(childNode);
                        }
                    }
                }
            } catch (e) {
                console.warn("Baux fetch error:", e);
            }
        }
        return node;
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
                    const refKey = `__BAUX_FUNC_REF__${funcName}__`;
                    registry.set(refKey, funcStr);
                    return refKey;
                }
                
                // For unnamed functions, return a special marker with the function string
                const funcId = `__BAUX_INLINE_FUNC__${Math.random().toString(36).substr(2, 9)}__`;
                registry.set(funcId, funcStr);
                return funcId;
            }
            return value;
        }));
        
        return { registry, processedDescription };
    }

    function generateHydrationScript(options, stateObj, description, states) {
        const clientOptions = { ...options, replaceEl: document.currentScript.previousElementSibling };
        delete clientOptions.state;
        const serializableOptions = { ...clientOptions };
        delete serializableOptions.replaceEl;

        const { registry, processedDescription } = createFunctionRegistry(description);

        // Generate function registry script
        const functionRegistryScript = Array.from(registry.entries()).map(([key, funcStr]) => {
            if (key.startsWith('__BAUX_FUNC_REF__')) {
                const funcName = key.replace('__BAUX_FUNC_REF__', '').replace('__', '');
                return `window.${funcName} = ${funcStr};`;
            } else if (key.startsWith('__BAUX_INLINE_FUNC__')) {
                return `window['${key}'] = ${funcStr};`;
            }
            return '';
        }).filter(Boolean).join('\n');

        // Convert processed description back to proper format for client
        let descriptionStr = JSON.stringify(processedDescription);
        
        // Replace function references with actual function references (unquoted)
        registry.forEach((funcStr, key) => {
            if (key.startsWith('__BAUX_FUNC_REF__')) {
                const funcName = key.replace('__BAUX_FUNC_REF__', '').replace('__', '');
                descriptionStr = descriptionStr.replace(`"${key}"`, funcName);
            } else if (key.startsWith('__BAUX_INLINE_FUNC__')) {
                descriptionStr = descriptionStr.replace(`"${key}"`, `window['${key}']`);
            }
        });

        return '<script>' 
        + `(() => {
            if(baux.debug) debugger;
            ${Array.from(states.entries()).map(([name, state]) => {
                return `baux.state.register(${JSON.stringify(name)}, ${JSON.stringify(state)});`;
            }).join('\n')}
            ${functionRegistryScript}
            const options = ${JSON.stringify(serializableOptions)};
            options.replaceEl = document.currentScript.previousElementSibling;
            ${stateObj ? `options.state = baux.state.get('${stateObj.__name}');` : ''}
            baux.render(${descriptionStr}, options, 'csr');
        })();`
        + '<' + '/script>';
    }

    async function render(description, options = {}, mode) {
        // Set default mode based on env
        if (!mode) {
            mode = isServer ? "ssr-hydrate" : "csr";
        }
        if (!["csr", "ssr-hydrate", "ssr-static", "ssr-dom", "ssr-dom-hydrate"].includes(mode)) {
            throw new Error(`Baux: mode "${mode}" is not supported.`);
        }

        description = await description;
        if (typeof description === "function") description = await description();

        if (typeof description !== 'object' || !description) {
            const stateObj = options.state;
            if (mode.startsWith("ssr") && !mode.includes("dom")) {
                const renderer = description?.includes("${") ? await templateRenderer(description) : () => description;
                const text = await renderer(stateObj);
                return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            } else {
                let node;
                const effect = createEffect(async () => {
                    const renderer = description?.includes("${") ? await templateRenderer(description) : () => description;
                    const newText = await renderer(stateObj);
                    if (!node) {
                        node = document.createTextNode(newText);
                    } else {
                        node.textContent = newText;
                    }
                });
                await effect();
                return node;
            }
        }

        if (typeof Node !== "undefined" && description instanceof Node && description.tagName === 'SCRIPT' && description.type === 'application/json') {
            description = JSON.parse(description.textContent);
        }
        if(typeof HTMLElement !== "undefined" && description instanceof HTMLElement) {
            return description;
        }

        let { tagName, attributes = {}, children = [], shadowRoot } = description;
        const stateObj = options.state;

        if (typeof attributes === "function") attributes = await attributes();
        if (typeof children === "function") children = await Promise.all(children());

        // Handle HTML string generation (for SSR modes)
        if (mode.startsWith("ssr")) {
            if (mode === "ssr-dom" || mode === "ssr-dom-hydrate") {
                // Generate DOM nodes on server (assumes simulated DOM like JSDOM)
                const el = document.createElement(tagName);
                if (stateObj) setState(el, stateObj);

                for (const [key, value] of Object.entries(attributes)) {
                    if(!isNaN(key)) continue;
                    const effect = createEffect(async () => {
                        if (key.startsWith('on') && typeof value === 'function') {
                            // Skip event handlers in DOM mode for server
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

                const contentTarget = shadowRoot ? el.attachShadow({ mode: 'open' }) : el;
                const childNodes = shadowRoot || children;

                for (let child of childNodes) {
                    contentTarget.appendChild(await render(child, { state: stateObj }, mode));
                }

                let html = el.outerHTML;

                if (options.replaceEl && options.replaceEl.innerHTML !== html) {
                        options.replaceEl.innerHTML = html;
                }

                // Add hydration script only for "ssr-dom-hydrate"
                if (mode === "ssr-dom-hydrate") {
                    html += generateHydrationScript(options, stateObj, description, states);
                }

                return html;
            } else {
                // Build HTML string for ssr-hydrate and ssr-static
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

                const childNodes = shadowRoot || children;

                for (let child of childNodes) {
                    html += await render(child, { state: stateObj }, mode);
                }

                html += `</${tagName}>`;

                if (options.replaceEl && options.replaceEl.innerHTML !== html) {
                        options.replaceEl.innerHTML = html;
                }

                // Add hydration script only for "ssr-hydrate"
                if (mode === "ssr-hydrate") {
                    html += generateHydrationScript(options, stateObj, description, states);
                }

                return html;
            }
        }

        // DOM rendering for "csr" or when not on server
        const el = document.createElement(tagName);
        if (stateObj) setState(el, stateObj);

        for (let [key, value] of Object.entries(attributes)) {
            if(!isNaN(key)) continue;
            const effect = createEffect(async () => {
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

        const contentTarget = shadowRoot ? el.attachShadow({ mode: 'open' }) : el;
        const childNodes = shadowRoot || children;

        for (let child of childNodes) {
            contentTarget.appendChild(await render(child, { state: stateObj }, mode));
        }

        if (options.replaceEl && options.replaceEl.innerHTML !== el.innerHTML) {
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

    if(env==="browser") {
        // Override setAttribute to handle src changes
        const oldSetAttribute = HTMLElement.prototype.setAttribute;
        Object.defineProperty(HTMLElement.prototype, "setAttribute", {
            value(name, value) {
                const oldValue = this.getAttribute(name);
                try {
                oldSetAttribute.bind(this)(name, value);
                } catch(e) {
                    console.log(e);
                    throw(e);
                }
                if (name === "src" && oldValue !== value) {
                    if (this.tagName === "IFRAME") {
                        this.dispatchEvent(new Event('change'));
                    }
                    handleSrc(this, value, {render: render, baseURI: document.location});
                }
            },
            enumerable: false,
            configurable: true,
            writable: false
        });

        // Click event handler for handling href attributes
        document.addEventListener("click", (event) => {
            // Skip if clicking on LINK or A elements (let browser handle these)
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
    }


    return { render, state, tags, hydrate };
};
