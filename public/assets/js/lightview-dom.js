(() => {
    // Import shared utilities from lightview-core
    const { state, templateRenderer, handleSrc, setState } = globalThis.LightviewCore || {};

        // Override setAttribute to handle src changes
    const oldSetAttribute = HTMLElement.prototype.setAttribute;
    Object.defineProperty(HTMLElement.prototype,"setAttribute", {
        value(name, value) {
            const oldValue = this.getAttribute(name);
            oldSetAttribute.bind(this)(name, value);
            if(name==="src" && oldValue!==value) {
                if(this.tagName==="IFRAME") {
                    this.dispatchEvent(new Event('change'))
                }
                handleSrc(this,value,{render:lvDOM.render,baseURI:document.location});
            }
        },
        enumerable: false,
        configurable: true,
        writable: false
    });
    
    const lvDOM = {
        found: new Set(),
        watch() { this.found.clear() },
        
        async render(content, {replaceEl, shadow, state: currentState, baseURI = document.baseURI} = {}) {
            const collectProperties = async (node, render) => {
                lvDOM.__currentNode__ = node;
                lvDOM.watch();
                await render();
                return [...lvDOM.found];
            }
            content = await content;
            content = content==null ? {} : content;
            currentState ? currentState = await currentState : currentState;
            let type = typeof content;
            let render = type === "function" ? content : null;
            let properties = [];
            
            if(type === "function") {
                content = await render();
                type = typeof content;
            }
            
            let node;

            if (type !== "object") {
                if(type === "string" && currentState && content.includes('${')) {
                    const f = await templateRenderer(content);
                    render = () => f(currentState);
                    content = await render();
                }
                node = new Text(content);
                if (render) {
                    if(currentState) setState(node, currentState);
                    const props = await collectProperties(node, render);
                    const renderer = async () => {
                        node.textContent = await render();
                        return node;
                    }
                    node.state.watch(node, props, renderer);
                }
            } else if (Array.isArray(content)) {
                node = Object.assign(document.createDocumentFragment(), {
                    append(...args) {
                        DocumentFragment.prototype.append.call(this, ...args);
                    }
                });
                node.append(...await Promise.all(content.map(item => lvDOM.render(item, {state: currentState}))));
            } else if (type === "object") {
                if (content instanceof HTMLElement) {
                    try {
                        content = JSON.parse(content.innerText);
                    } catch(e) {
                        console.error("lvDOM parse error:", e, content);
                        return;
                    }
                }

                const tagName = String(content.tagName || "").toLowerCase();
                node = document.createElement(tagName);
                if(currentState) setState(node, currentState);

                let src;

                const attributes = content.attributes || {};
                for (const [key, value] of Object.entries(attributes)) {
                    let type = typeof value;
                    let render;
                    let properties = [];
                    if(type === "function" && !key.startsWith("on")) {
                        render = value;
                        value = await render();
                        type = typeof value;
                    }
                    if (key === "style" && value && type === "object") {
                        Object.assign(node.style, value);
                    } else if (type === "function") {
                        if (key.startsWith("on")) {
                            node.addEventListener(key.substring(2), value);
                        } else {
                            node[key] = value;
                            if(render) {
                                const renderer = async () => {
                                    node[key] = await render();
                                    return node;
                                }
                                node.state.watch(node, await collectProperties(node, render), renderer);
                            }
                        }
                    } else {
                        if(type === "string" && value.includes('${')) {
                            const f = templateRenderer(value);
                            render = () => f(currentState);
                        }
                        let processedValue = type === "boolean" ? (value ? key : "") :
                            (type === "object" && value ? JSON.stringify(value) : value);
                        if (processedValue != null) {
                            if(render) {
                                const renderer = async () => {
                                    let value = await render();
                                    let type = typeof value;
                                    if(["true","false"].includes(value.trim())) {
                                        value = value.trim();
                                        type = "boolean";
                                    }
                                    const processedValue = type === "boolean" ? (value ? key : "") :
                                        (type === "object" && value ? JSON.stringify(value) : value);
                                    if(processedValue == null) {
                                        node.removeAttribute(key);
                                    } else {
                                        node.setAttribute(key, processedValue);
                                    }
                                    return node;
                                }
                                node.state.watch(node, await collectProperties(node, render), renderer);
                            }
                            if(key == "src") {
                                src = processedValue;
                            }
                            node.setAttribute(key, processedValue);
                        }
                    }
                }

                const children = content.children || [];
                node.append(...await Promise.all(children.map(child => lvDOM.render(child, {state: currentState}))));

                const shadowContent = content.shadowRoot;
                if (shadowContent) {
                    const shadowRoot = node.attachShadow({mode: "open"});
                    shadowRoot.append(...await Promise.all(shadowContent.map(child => lvDOM.render(child, {state: currentState}))));
                }

                await handleSrc(node, src, {state: currentState, render: lvDOM.render, baseURI});
            }

            if (replaceEl) {
                if (shadow) {
                    replaceEl.parentElement.attachShadow({mode: "open"}).append(...(node.childNodes || []));
                }
                replaceEl.replaceWith(node);
            }

            return node;
        }
    };
    
    // Bind state function to lvDOM
    lvDOM.state = state ? state.bind(lvDOM) : function() { 
        throw new Error("LightviewCore not loaded. Ensure lightview-core.js is loaded first.");
    };

    // Export lvDOM
    globalThis.Lightview = lvDOM;
})();
