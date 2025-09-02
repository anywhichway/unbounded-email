(() => {
    // Ensure all modules are loaded
    if (!globalThis.LightviewCore) {
        throw new Error("LightviewCore not loaded. Ensure lightview-core.js is loaded first.");
    }
    if (!globalThis.lvHTML) {
        throw new Error("lvHTML not loaded. Ensure lightview-html.js is loaded.");
    }
    if (!globalThis.lvDOM) {
        throw new Error("lvDOM not loaded. Ensure lightview-dom.js is loaded.");
    }

    // Main Lightview interface
    globalThis.Lightview = {
        render(content, {env = "dom", ...options} = {}) {
            if(env.toLowerCase() === "html") {
                return lvHTML.render(content, options);
            }
            return lvDOM.render(content, options);
        },
        
        state(content, {env = "dom"} = {}) {
            if(env.toLowerCase() === "html") {
                return lvHTML.state(content);
            }
            return lvDOM.state(content);
        }
    };

    // Also expose individual modules for backward compatibility
    globalThis.lvHTML = globalThis.lvHTML;
    globalThis.lvDOM = globalThis.lvDOM;
})();
