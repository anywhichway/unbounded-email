(() => {
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

    // Export the handler for potential programmatic use
    globalThis.LightviewHrefHandler = {
        handleClick: (event) => {
            // Same logic as above, but can be called programmatically
            if(["LINK", "A"].includes(event.target.tagName)) {
                return false;
            }
            
            const href = event.target.getAttribute("href");
            if(!href) return false;
            
            const target = event.target.getAttribute("target") || "_self";
            
            if(["_self", "::innerHTML"].includes(target)) {
                event.target.setAttribute("src", href);
                return true;
            }
            
            const targetEls = document.querySelectorAll(target);
            targetEls.forEach(target => target.setAttribute("src", href));
            return true;
        }
    };
})();
