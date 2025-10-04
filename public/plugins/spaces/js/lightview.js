/**
 * Lightview.js Browser Version - Lightweight DOM rendering with reactivity
 * @license MIT
 * @version 1.0.0
 */
const Lightview = () => {
    let activeEffect = null;
    const effectQueue = new Set();
    let currentChangeSrc = null;  // For preventing update loops

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
            try {
                await fn();
            } finally {
                activeEffect = oldActiveEffect;
            }
        };
        return effect;
    }

    function track(dependencies) {
        if (activeEffect) {
            dependencies.add(activeEffect);
        }
    }

    function trigger(dependencies) {
        dependencies.forEach(effect => {
            effectQueue.add(effect);
        });
        scheduleUpdate();
    }

    // Change to Map for ID-based caching (string keys)
    const proxyIdCache = new Map();

    // Helper to generate unique IDs for proxies
    function generateProxyId() {
        return Math.random().toString(36).slice(2, 15) + Date.now().toString(36);
    }

// Define mutating Date methods for wrapping
const dateMutatingMethods = [
  'setDate', 'setFullYear', 'setHours', 'setMilliseconds', 'setMinutes', 
  'setMonth', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear', 
  'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth', 
  'setUTCSeconds', 'setYear'
];

    // Helper to recursively create proxies for nested objects
    function recursiveState(obj, publishFn = null) {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (obj._id && proxyIdCache.has(obj._id)) return proxyIdCache.get(obj._id);
        
        // Handle Date objects: Return as-is (no proxy) to avoid incompatibility
        if (obj instanceof Date) return obj;
        
        // Reuse existing _id if present, otherwise generate
        if (!obj._id) {
            Object.defineProperty(obj, '_id', { value: generateProxyId(), enumerable: false, configurable: true });
        }
        
        // Propagate __publish if provided
        if (publishFn) {
            Object.defineProperty(obj, '__publish', { value: publishFn, enumerable: false, configurable: true });
        }
        
        const proxy = new Proxy(obj, stateHandler);
        proxyIdCache.set(obj._id, proxy);
        
        // Recursively proxy nested objects
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null && !key.startsWith('__') && typeof obj[key] !== 'function') {
                obj[key] = recursiveState(obj[key], publishFn);
            }
        }
        
        return proxy;
    }

    const stateHandler = {
        get(target, property, receiver) {
            if (property === "__isStateProxy") return true; // Internal flag to identify proxies
            const value = Reflect.get(target, property, receiver);
            if (typeof value === "function)") return value;
            // Track dependency for this property (moved here to cover all cases)
            // Skip tracking for internal properties to avoid proxy conflicts
            if (property !== '__dependencies' && property !== '_id' && property !== '__publish') {
                if (!target.hasOwnProperty('__dependencies')) {
                    Object.defineProperty(target, '__dependencies', { value: new Map(), enumerable: false, writable: true, configurable: true });
                }
                if (!target.__dependencies.has(property)) {
                    const deps = new Set();
                    target.__dependencies.set(property, deps);
                }
                track(target.__dependencies.get(property));
            }
            
            if (typeof value === 'object' && value !== null && property !== '__dependencies' && property !== '_id' && property !== '__publish') {
                // Check cache first to avoid creating duplicate proxies
                let nestedProxy = proxyIdCache.get(value._id);
                if (!nestedProxy) {
                    // For non-Date objects, create proxy
                    if (!(value instanceof Date)) {
                      nestedProxy = recursiveState(value, target.__publish);
                    } else {
                      // For Date objects, return as-is (already handled in recursiveState)
                      nestedProxy = value;
                    }
                }
                return nestedProxy;
            }
            
            return value;
        },
        set(target, property, value, receiver) {
            const oldValue = Reflect.get(target, property, receiver);
            if (Object.is(oldValue, value)) {
                return true;
            }
            
            // Proxy new object values recursively
            let setValue = value;
            if (typeof value === 'object' && value !== null) {
                setValue = recursiveState(value, target.__publish);
            }
            
            const result = Reflect.set(target, property, setValue, receiver);
            const type = typeof value;
            if (property.startsWith("__") || ["function", "symbol"].includes(type)) return result; // Skip internal properties
            
            // If the set value is a Date, wrap its mutating methods to trigger reactivity
            if (setValue instanceof Date) {
              const deps = target.__dependencies?.get(property);
              for (const method of dateMutatingMethods) {
                const original = setValue[method];
                setValue[method] = function(...args) {
                  const result = original.apply(this, args);
                  if (deps) trigger(deps);
                  return result;
                };
              }
            }
            
            // Publish changes if __publish is set (for exported/imported objects)
            if (target.__publish) {
                target.__publish(target._id, property, value);
            }
            
            if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                trigger(target.__dependencies.get(property));
            }
            return result;
        },
        deleteProperty(target, property) {
            const oldValue = Reflect.get(target, property);
            const result = Reflect.deleteProperty(target, property);
            if (target.hasOwnProperty('__dependencies') && target.__dependencies.has(property)) {
                trigger(target.__dependencies.get(property));
            }
            return result;
        }
    };

    const state = (initialState, publishFn = null) => {
        if (initialState && typeof initialState === 'object') {
            return recursiveState(initialState, publishFn);
        }
        return new Proxy(initialState, stateHandler);  // For non-objects, still proxy if needed
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

        let { tagName, attributes = {}, children = [], innerHTML } = description;
        const stateObj = options.state;

        if (typeof attributes === "function") attributes = await attributes();
        if(typeof innerHTML==="function") innerHTML = await innerHTML();
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

        if(innerHTML) {
            el.innerHTML = innerHTML;
            return el;
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
    // Utility function to handle src attributes and fetch content
    async function handleSrc(node,src,{state=node.state||{},nonce}={})  {
        if (src && ["./", "../", "http"].some(text => src.startsWith(text))) {
            src = new URL(src,document.baseURI).href;
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
                    if(node.contentDocument) {
                        node.contentDocument.childNodes.forEach(node => node.remove());
                        childNode instanceof DocumentFragment ? node.contentDocument.append(...childNode.childNodes) : node.append(childNode);
                    } else {
                        node.innerHTML = "";
                        childNode instanceof DocumentFragment ? node.append(...childNode.childNodes) : node.append(childNode);
                    }
                    
                }
            } catch (e) {
                console.error('Error fetching src:', e);
            }
        }
        return node;
    }
    const oldSetAttribute = HTMLElement.prototype.setAttribute;
    Object.defineProperty(HTMLElement.prototype, "setAttribute", {
        value(name, value) {
            const oldValue = this.getAttribute(name);
            oldSetAttribute.bind(this)(name, value);
            
            if (name === "src" && oldValue !== value) {
                if (this.tagName === "IFRAME") {
                    this.dispatchEvent(new Event('change'));
                } else {
                    handleSrc(node,value)
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

  const NS = 'lightview';            // message-namespace
  const exports   = new Map();      // href → {desc,obj}
  const pendings  = new Map();      // nonce → {resolve,reject}

  /* -------------------------------------------------- */
  /* 1.  EXPORT                                         */
  /* -------------------------------------------------- */
  const subscribers = new Map();      // srcHref -> Set<targetHref>

  /* -------------------------------------------------- */
  /* 1.  EXPORT                                         */
  /* -------------------------------------------------- */
  function export_(obj, options) {
    options ||= exports.get(location.href) || {};
    if(!options.originalObj) { // export already created
        obj = state(obj); // Ensure it's a state proxy and has an _id
        // Use the object's own _id for export, don't generate a new one.
        const _id = obj._id;
        
        const { publish, subscribe } = options;
        
        if (publish) {
            
            // Set __publish function for direct publishing
            Object.defineProperty(obj, '__publish', { 
                value: (_id, property, value) => {
                    const subs = subscribers.get(location.href);
                    if (subs) {
                        const nonce = Math.random().toString(36).slice(2);
                        for (const subHref of subs) {
                            if (subHref === currentChangeSrc) continue;  // Skip notifying the sender to prevent loop
                            post(subHref, { type: 'change', _id, property, value, nonce, srcHref: location.href });
                        }
                    }
                }, 
                enumerable: false, 
                configurable: true 
            });
        }
        if(subscribe){
            

        }

        // Removed: serializableObj creation and storage
        // Now always store the reactive obj as obj

        exports.set(location.href, { _id, obj, publish, subscribe });
    }
    const nonce = Math.random().toString(36).slice(2);
    broadcast({type:'setParent',nonce,srcHref:location.href});
}

  /* -------------------------------------------------- */
  /* 2.  IMPORT                                         */
  /* -------------------------------------------------- */
  async function import_(src, options = {}) {
    const { subscribe, publish } = options;
    

    const nonce = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
        pendings.set(nonce, { resolve, reject, subscribe, publish });
        post('/', { type: 'wantExport', nonce, srcHref: location.href, desc: { subscribe, publish } });
        setTimeout(() => {
            if (pendings.has(nonce)) {
                pendings.delete(nonce); // Clean up on timeout
                reject(new Error('Import timeout'));
            }
        }, 5000);
    });
}


  function makeSerializable(obj) {
    if (typeof obj === 'function') return undefined;
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(item => makeSerializable(item));

    const out = {};
    if(obj._id!==undefined) {
        out._id = obj._id;
    }
    for (const k of Object.keys(obj)) {
      // Skip internal properties and functions
      if (k==="_id" || k.startsWith('__') || typeof obj[k] === 'function') continue;
      out[k] = makeSerializable(obj[k]);
    }
    return out;
  }
    
  function post(targetHref, payload) {
    payload = {...payload,targetHref};
    if (targetHref === '/') {
      if(window !== window.parent) {
        setTimeout(() => {
          try {
            window.parent.postMessage({ [NS]: payload }, '*');
          } catch {
            console.error('Error posting message to parent', payload);
          }
        },500);
      }
    } else {
      // Try to find the iframe with matching href
      const targetUrl = new URL(targetHref,location.href)
      const iframes = document.querySelectorAll('iframe');
      let found
      for(const iframe of iframes) {
        try {
          const frameUrl = new URL(iframe.src,location.href);
          if (iframe.contentWindow && frameUrl.href===targetUrl.href) {
            found = true;
            setTimeout(() => {
              try {
                iframe.contentWindow.postMessage({ [NS]: payload }, targetUrl.origin);
              } catch(e) {
                console.error(`Error posting message to iframe ${frameUrl.href}`, e,payload);
              }
            },500); 
            return;
          }
        } catch(e) {
          // Removed debug logging
        }
      }
      if(!found) {
        if(window !== window.parent) {
            setTimeout(() => {
            try {
                window.parent.postMessage({ [NS]: payload }, '*');
            } catch {
                // Removed debug logging
            }
            },500);
        }
      }
    }
  }

  function broadcast(payload) {
    const iframes = [...document.querySelectorAll('iframe')];
    iframes.forEach(iframe => {
      const url = new URL(iframe.src,location.href);
      post(url.href,payload)
    });
  }


  const seen = [];
  window.addEventListener('message', e => {
    const msg = e.data?.[NS];
    if (!msg || !msg.type || seen.includes(msg.nonce)) return;
    
    if(msg.type==='navigate' && msg.url) {
        const iframes = document.querySelectorAll(`iframe`);
        iframes.forEach(iframe => {
            if(iframe.src === msg.srcHref && iframe.src !== msg.url) {
                iframe.src = msg.url;
            }
        });
    }

    if(msg.nonce) seen.push(msg.nonce);
    if(seen.length>10) seen.shift();
    (async () => {
      let currentWindow;
      if(window.location.href===msg.srcHref) {
        for(let i=0;i<window.frames.length;i++) {
          const frame = window.frames[i];
          if(frame.location.href===msg.targetHref) {
            currentWindow = frame;
            break;
          }
        }
        if(!currentWindow) {
          // Removed debug logging
        }
      } else {
        currentWindow = window;
      }

      if(!currentWindow) {
        return;
      }

      switch (msg.type) {
        case 'setParent': {
          currentWindow.parentHref = msg.srcHref;
          break;
        }
        case 'wantExport': {
            const ours = exports.get(location.href);
            if (ours) {
                const { subscribe, publish } = msg.desc;
                
                if (subscribe) {
                    

                    if (!subscribers.has(location.href)) {
                        subscribers.set(location.href, new Set());
                    }
                    subscribers.get(location.href).add(msg.srcHref);
                }
                const canPublish = !!(ours.subscribe && publish);
                

                                if (canPublish) {
                    // Removed debug logging
                    ours.obj = state(ours.obj);  // Ensure reactivity (though it should already be reactive)
                }
                
                // Removed debug logging
                const objToSend = makeSerializable(ours.obj);  // Always serialize the reactive obj
                post(msg.srcHref, { type:'exportStaticReply', nonce: msg.nonce, _id: ours.obj._id, obj: objToSend, canPublish, srcHref:location.href });
            }
            break;
        }
        case 'exportStaticReply': {
            const entry = pendings.get(msg.nonce);
            if (!entry) return;
            const { resolve, publish } = entry;
            pendings.delete(msg.nonce);
            let resolvedObj = msg.obj;
            
            // Create a reactive proxy if subscribing or publishing
            if (entry.subscribe || (publish && msg.canPublish)) {
                const publishFn = (publish && msg.canPublish) ? (_id, property, value) => {
                    const nonce = Math.random().toString(36).slice(2);
                    const srcHref = currentWindow.parentHref === msg.srcHref ? '/' : msg.srcHref || e.href;
                    post(srcHref, { type: 'set', _id, property, value, nonce, srcHref: location.href });
                } : null;
                const desc = Object.getOwnPropertyDescriptor(msg.obj, "_id");
                desc.enumerable = false;
                Object.defineProperty(msg.obj, "_id", desc);
                resolvedObj = state(msg.obj, publishFn);
            }
            
            // Removed debug logging
            resolve(resolvedObj);
            break;
        }
        case 'change': {
          const { _id, property, value, srcHref } = msg;
          currentChangeSrc = srcHref;  // Set the source before updating
          const targetProxy = proxyIdCache.get(_id);
          if (targetProxy) {
            targetProxy[property] = value;
          }
          currentChangeSrc = null;  // Reset after updating
          break;
        }
        case 'set': {
          const { _id, property, value, srcHref } = msg;
          const exported = exports.get(location.href);
          if (exported && exported.subscribe) {
            currentChangeSrc = srcHref;  // Set the source before updating
            const targetProxy = proxyIdCache.get(_id);
            if (targetProxy) {
              targetProxy[property] = value;
            }
            currentChangeSrc = null;  // Reset after updating
          }
          break;
        }
      }
    })();
    
  });

  function navigate(url, baseUrl = null) {
    // Resolve URL relative to baseUrl if provided, otherwise use current location
    const resolvedUrl = baseUrl ? new URL(url, baseUrl).href : url;
    post('/', { type: 'navigate', url: resolvedUrl, srcHref: location.href });
  }


    return { render, state, tags, hydrate, export: export_, import: import_, navigate };
};
