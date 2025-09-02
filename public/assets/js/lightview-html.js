(() => {
    // Import shared utilities from lightview-core
    const { state, templateRenderer, handleSrc, camelToSlug } = globalThis.LightviewCore || {};

    const lvHTML = {
        async render(content, {state: currentState, nonce, baseURI = typeof document !== "undefined" ? document.baseURI : undefined} = {}) {
            content = await content;
            content = content==null ? {} : content;
            currentState ? currentState = await externalState : currentState;
            const type = typeof content;

            if (type !== "object") {
                if(type === "string"  && currentState && content.includes('${')) {
                    const f = await templateRenderer(content);
                    const render = () => f(currentState);
                    try {
                        content = await render();
                    } catch (e) {
                        console.warn("lightview template error:", e, content);
                    }
                }
                return String(content);
            }

            if (Array.isArray(content)) {
                const results = await Promise.all(content.map(item => lvHTML.render(item, {state: currentState, nonce})));
                return results.join("");
            }

            // Normalize content from Document/HTMLElement
            if (globalThis.HTMLElement && content instanceof HTMLElement) {
                content = JSON.parse(content.innerText);
            }

            const tagName = String(content.tagName || "").toLowerCase();
            let innerHTML = '', attrs = "";
            let src;

            const attributes = content.attributes || {};
            for (const [key, value] of Object.entries(attributes)) {
                const valueType = typeof value;
                if (key === "style" && value && valueType === "object") {
                    attrs += ` style="${Object.entries(value).map(([k, v]) => `${camelToSlug(k)}:${v}`).join(";")}"`;
                } else if (valueType === "function") {
                    if (key.startsWith("on")) {
                        attrs += ` ${key}="${value.toString().replace(/"/g, '"')}"`;
                    } else {
                        innerHTML += `<script ${nonce ? `nonce="${nonce}"` : ''}>` + `document.currentScript.parentElement["${key}"]=${value.toString()};document.currentScript.remove()` + "</" + "script>";
                    }
                } else {
                    let processedValue = valueType === "boolean" ? (value ? key : "") :
                        (valueType === "object" && value ? JSON.stringify(value) : String(value));

                    if (valueType !== "object" && processedValue.includes('${')) {
                        const f = templateRenderer(processedValue);
                        const render = () => f(currentState);
                        try {
                            processedValue = await render();
                        } catch (e) {
                            console.warn("lightview template error:", e, processedValue);
                        }
                    }
                    attrs += ` ${key}='${processedValue}'`;
                    if (key == "src") src = processedValue;
                }
            }

            const children = content.children || [];
            const childResults = await Promise.all(children.map(child => lvHTML.render(child, {state: currentState, nonce, baseURI})));
            innerHTML += childResults.join("");

            const shadowContent = content.shadowRoot;
            if (shadowContent) {
                innerHTML += `<script ${nonce ? `nonce="${nonce}"` : ''}>` +
                    `lvDOM(${JSON.stringify(shadowContent)},` +
                    `{replaceEl:document.currentScript,shadow:true,state:${JSON.stringify(currentState)}})` +
                    "</" + "script>";
            }

            innerHTML = await handleSrc(innerHTML, src, {state: currentState, nonce, render: lvHTML.render, baseURI});
            return tagName ? `<${tagName}${attrs}>${innerHTML}</${tagName}>` : innerHTML;
        }
    };

    // Bind state function to lvHTML
    lvHTML.state = state ? state.bind(lvHTML) : function() { 
        throw new Error("LightviewCore not loaded. Ensure lightview-core.js is loaded first.");
    };

    // Export lvHTML
    globalThis.Lightview = lvHTML;
})();
