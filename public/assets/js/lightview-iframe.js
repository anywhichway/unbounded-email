/*  lvIFrame.js  – put this in every frame (parent & iframes) */
(() => {
  const NS = 'lvIFrame';            // message-namespace
  const exports   = new Map();      // href → {desc,obj}
  const pendings  = new Map();      // nonce → {resolve,reject}

  /* -------------------------------------------------- */
  /* 1.  EXPORT                                         */
  /* -------------------------------------------------- */
  function export_(obj) {
    const desc = describe(obj);
    exports.set(location.href, { desc, obj });
    const nonce = Math.random().toString(36).slice(2);
    broadcast({type:'setParent',nonce,srcHref:location.href});
  }

  /* -------------------------------------------------- */
  /* 2.  IMPORT                                         */
  /* -------------------------------------------------- */
  async function import_(src = './') {
    const nonce = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      pendings.set(nonce, { resolve, reject });
      post('/', { type:'wantExport', nonce, srcHref: location.href });
      setTimeout(() => {
        pendings.delete(nonce); // Clean up on timeout
        reject(new Error('Import timeout'));
      }, 5000);
    });
  }
 

  /* -------------------------------------------------- */
  /* 3.  PROXY BUILDER                                  */
  /* -------------------------------------------------- */
  function createProxy(shape, href, pathPrefix = '') {
    const target = Array.isArray(shape.value) ? [] : Object.create(null);
    const proxy = new Proxy(target, {
      get(_, key) {
        if (key === 'then') return;           // keep Promise checks working

        if(key==='__localValue__') {
          return shape;
        }

        const node = shape.value[key]

        if (node==null) return node;

        const fullPath = pathPrefix
          ? `${pathPrefix}.${String(key)}`
          : String(key);

        if (node.type === 'object') {
          return createProxy(node, href, fullPath);
        }
        if (node.type === 'function') {
          return (...args) => requestValue(href, fullPath + '()', args);
        }
        return requestValue(href, fullPath);
      },
      ownKeys(_) {
        const keys = Object.keys(shape.value);
        return keys;
      },
      getOwnPropertyDescriptor(_, key) {
        if (key in shape.value) {
          return {
            enumerable: true,
            configurable: true,
            value: this.get(_, key) // or just return a placeholder
          };
        }
        return undefined;
      }
    });
    return proxy;
  }

  /* -------------------------------------------------- */
  /* 4.  DESCRIBE (shape without data)                  */
  /* -------------------------------------------------- */
  function describe(obj) {
    if (typeof obj === 'function') return { type:'function' };
    if (obj === null || typeof obj !== 'object') return { type:'value', value:obj };

    const out = Array.isArray(obj) ? [] : {};
    for (const k of Object.keys(obj)) out[k] = describe(obj[k]);
    return { type:'object', value: out };
  }

  /* -------------------------------------------------- */
  /* 5.  VALUE REQUEST                                  */
  /* -------------------------------------------------- */
  function requestValue(href, path, args = []) {
    const nonce = Math.random().toString(36).slice(2);
    return new Promise(resolve => {
      pendings.set(nonce, { resolve });
      post(href, { type:'get', path, args, nonce, srcHref: location.href });
      setTimeout(() => {
        if(pendings.has(nonce)) {
          pendings.delete(nonce); // Clean up on timeout
          console.warn(`Resolving ${href} ${path} timed out`);
        }
        resolve(undefined);
      }, 5000);
    });
  }

  /* -------------------------------------------------- */
  /* 6.  POST / BROADCAST HELPERS                       */
  /* -------------------------------------------------- */
  function post(targetHref, payload) {
    payload = {...payload,targetHref};
    if (targetHref === '/') {
      if(window !== window.parent) {
        try {
          window.parent.postMessage({ [NS]: payload }, '*');
        } catch {
          console.error('Error posting message')
        }
      }
    } else {
      // Try to find the iframe with matching href
      const targetUrl = new URL(targetHref,location.href)
      const iframes = document.querySelectorAll('iframe');
      for(const iframe of iframes) {
        try {
          const frameUrl = new URL(iframe.src,location.href);
          if (iframe.contentWindow && frameUrl.href===targetUrl.href) {
            iframe.contentWindow.postMessage({ [NS]: payload }, targetUrl.origin);
            return;
          }
        } catch {
          console.error('Error posting message')
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

  /* -------------------------------------------------- */
  /* 7.  MESSAGE HANDLER                                */
  /* -------------------------------------------------- */
  const seen = [];
  window.addEventListener('message', e => {
    const msg = e.data?.[NS];
    if (!msg || !msg.type || seen.includes(msg.nonce)) return;
    seen.push(msg.nonce);
    if(seen.length>10) seen.shift();
    setTimeout(async () => {
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
          console.warn(`${msg.targetHref} not found in ${window.location.href}`)
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
            // Fixed: Send reply to the requesting href
            post(msg.srcHref, { type:'exportReply', nonce: msg.nonce, desc: ours.desc, srcHref:currentWindow.location.href });
          }
          break;
        }
        case 'exportReply': {
          const entry = pendings.get(msg.nonce);
          if (!entry) return;
          const { resolve } = entry;
          pendings.delete(msg.nonce);
          const srcHref = currentWindow.parentHref === msg.srcHref ? '/' : msg.srcHref || e.href;
          const proxy = createProxy(msg.desc, srcHref);
          resolve(proxy);
          break;
        }
        case 'get': {
          const { obj } = exports.get(location.href) || {};
          if (!obj) return;

          // Fixed: Better path parsing for function calls
          let isFunction = msg.path.endsWith('()');
          const cleanPath = isFunction ? msg.path.slice(0, -2) : msg.path;
          const pathParts = cleanPath.split('.').filter(p => p);
          
          let target = obj;
          for (const k of pathParts) {
            target = target?.[k];
            if (target === undefined) break;
          }

          let value;
          try {
            value = isFunction && typeof target === 'function'
              ? await target(...msg.args)
              : target;
          } catch (err) { 
            console.warn('lvIFrame execution error:', err);
            value = undefined; 
          }

          // Fixed: Reply to the requesting href
          post(msg.srcHref, { type:'valueReply', nonce: msg.nonce, value, srcHref:currentWindow.location.href });
          break;
        }
        case 'valueReply': {
          const entry = pendings.get(msg.nonce);
          if (!entry) return;
          const { resolve } = entry;
          pendings.delete(msg.nonce);
          resolve(msg.value);
          break;
        }
        case 'navigate': {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    // Normalize URLs to absolute form for comparison
                    const frameUrl = new URL(iframe.src, location.href).href;
                    const msgUrl = new URL(msg.srcHref, location.href).href;
                    if (frameUrl === msgUrl) {
                        iframe.src = new URL(msg.url, msg.srcHref).href;
                        return;
                    }
                } catch (e) {
                    console.error('Error during navigation', e);
                }
            }
            console.warn(`Iframe with src ${msg.srcHref} not found for navigation.`);
            break;
        }
      }
    },500)
    
  });

  function navigate(url, baseUrl = null) {
    // Resolve URL relative to baseUrl if provided, otherwise use current location
    const resolvedUrl = baseUrl ? new URL(url, baseUrl).href : url;
    post('/', { type: 'navigate', url: resolvedUrl, srcHref: location.href });
  }

  const localize = ({value},proxy) => {
    const object = Array.isArray(value) ? [] : {};
    Object.entries(value).forEach(([key,{type,value}]) => {
      if(type==="object") {
        object[key] = localize({value},proxy[key]);
      } else if(type==="function") {
        object[key] = proxy[key];
      } else {
        object[key] = value;
      }
    });
    return object;
  }

  async function local(promise) {
    const value = await promise;
    if(value?.__localValue__) {
      return localize(value?.__localValue__,value)
    }
    return value;
  }

  /* -------------------------------------------------- */
  /* 9.  PUBLIC API – leaves window.import untouched    */
  /* -------------------------------------------------- */
  window.lvIFrame = { export: export_, import: import_, local, navigate };
})();
