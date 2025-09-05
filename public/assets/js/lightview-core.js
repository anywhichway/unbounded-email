(() => {
    // Shared state management function
    let localWatchAsString = "";
    function state(data = {}) {
        // Use WeakMap for automatic cleanup when nodes are garbage collected
        const nodeWatchers = new WeakMap();
        const propWatchers = new Map(); // property -> Set of {node, fn} pairs

        const locals = {
            watch(node, props = [], fn) {
                if (!node || props.length === 0) return node;

                props.forEach(prop => {
                    if (!propWatchers.has(prop)) {
                        propWatchers.set(prop, new Set());
                    }
                    propWatchers.get(prop).add({node, fn});
                });

                // Track what properties this node watches
                if (!nodeWatchers.has(node)) {
                    nodeWatchers.set(node, new Set());
                }
                props.forEach(prop => nodeWatchers.get(node).add(prop));
            },
            update(property) {
                const watchers = propWatchers.get(property);
                if (!watchers) return;

                // Clean up disconnected nodes while iterating
                const toRemove = [];
                watchers.forEach(({ node, fn }) => {
                    if (!node.isConnected) {
                        toRemove.push({ node, fn });
                    } else {
                        fn();
                    }
                });

                // Remove disconnected watchers
                toRemove.forEach(({ node, fn }) => {
                    watchers.delete({ node, fn });
                    // Clean up from propWatchers for this node
                    const nodeProps = nodeWatchers.get(node);
                    if (nodeProps) {
                        nodeProps.forEach(prop => {
                            const propSet = propWatchers.get(prop);
                            if (propSet) {
                                // Remove all watchers for this node from this property
                                propSet.forEach(watcher => {
                                    if (watcher.node === node) {
                                        propSet.delete(watcher);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }

        localWatchAsString ||= locals.watch+"";
        if(data.watch+""===localWatchAsString) {
            return data;
        }

        const lv = this;

        const state = new Proxy(data, {
            set(target, prop, value) {
                target[prop] = value;
                if (typeof prop === "symbol") return true;
                locals.update(prop);
                return true;
            },
            get(target, prop) {
                const local = locals[prop];
                if(local) return local;
                if (typeof prop === "symbol") return Reflect.get(target, prop);
                lv.found.add(prop);
                if (lv.__currentNode__ && !lv.__currentNode__.state) {
                    setState(lv.__currentNode__,state);
                }
                return target[prop];
            },
            deleteProperty(target, prop) {
                Reflect.deleteProperty(target, prop);
                locals.update(prop);
                return true;
            }
        });
        return state;
    }

    // Template caching and rendering
    const templates = new Map();
    const templateRenderer = (template) => {
        let f = templates.get(template);
        if(f) return f;
        f = new (async function () {}).constructor("state",`{ with(state||{}) {  return \`${template}\`} }`);
        templates.set(template, f);
        return f;
    }

    // Utility function to handle src attributes and fetch content
    async function handleSrc(node,src,{state=node.state||{},render,nonce,baseURI}={})  {
        if (src && ["./", "../", "http"].some(text => src.startsWith(text))) {
            src = baseURI ? new URL(src,baseURI).href : src ;
            try {
                const response = await fetch(src);
                const contentType = response.headers.get("content-type");
                if(response.status>=400) {
                    const msg = `Error ${src} ${response.status}: ${response.statusText}`;
                    if(typeof node==="string") {
                        return msg;
                    }
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
                    const childNode = await render( await response.json(), {state,nonce});
                    if(typeof node==="string") { // this happens when called from lvHTML
                        return childNode || node;
                    }
                    if(node.contentDocument) {
                        node.contentDocument.childNodes.forEach(node => node.remove());
                        childNode instanceof DocumentFragment ? node.contentDocument.append(...childNode.childNodes) : node.append(childNode);
                    } else {
                        node.innerHTML = "";
                        childNode instanceof DocumentFragment ? node.append(...childNode.childNodes) : node.append(childNode);
                    }
                    
                }
            } catch (e) {
                console.warn("lvDOM fetch error:", e);
            }
        }
        return node;
    }

    // Utility for converting camelCase to kebab-case
    const camelToSlug = (str) => str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
            .toLowerCase()
            .replace(/^-/, '');

    // Utility to set state on a node
    const setState = (node, state) => {
        Object.defineProperty(node, "state", {
            value: state,
            enumerable: false,
            configurable: true
        });
        return node;
    }



    // Export shared utilities
    globalThis.LightviewCore = {
        state,
        templateRenderer,
        handleSrc,
        camelToSlug,
        setState,
        templates
    };
})();
