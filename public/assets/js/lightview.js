(() => {
    // Ensure all modules are loaded
    if (!globalThis.LightviewCore) {
        throw new Error("LightviewCore not loaded. Ensure lightview-core.js is loaded first.");
    }
    // Main Lightview interface
    globalThis.Lightview = function(env="dom") {
        if(env.toLowerCase()==="html") {
            if(!globalThis.lvHTML) {
                throw new Error("lvHTML not loaded. Ensure lightview-html.js is loaded for server side use.");
            }
            this.render = lvHTML.render;
            this.state = lvHTML.state.bind(lvHTML);
            this.tags = lvHTML.tags;
        } else {
             if (!globalThis.lvDOM) {
                throw new Error("lvDOM not loaded. Ensure lightview-dom.js is loaded.");
            }
            this.render = lvDOM.render;
            this.state = lvDOM.state.bind(lvDOM);
            this.tags = lvDOM.tags
        }
        return this;
    }
})();
