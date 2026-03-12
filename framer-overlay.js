/**
 * Framer SEO Overlay Script — V6.6.1 (Clean Sweep)
 * ─────────────────────────────────────────────────────────────────
 */

const SEO_OVERRIDES_URL = 'https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json';

(function () {
    "use strict";

    if (window.__framer_importFromPackage || window.location.hostname === "framer.com") return;

    // GLOBAL CSS STEALH: Kill ALL H1s and ALL previous SEO tags by default.
    const stealthStyle = document.createElement('style');
    stealthStyle.id = 'seo-stealth-patch';
    stealthStyle.innerHTML = `
        h1, seo-h1, .seo-ghost { 
            opacity: 0 !important; 
            pointer-events: none !important; 
            visibility: hidden !important; 
            display: none !important; 
        }
        seo-hero, seo-hero h1 { 
            opacity: 1 !important; 
            pointer-events: auto !important; 
            visibility: visible !important; 
            display: block !important; 
        }
    `;
    document.head.appendChild(stealthStyle);

    let overrides = [];

    async function loadConfig() {
        try {
            const res = await fetch(SEO_OVERRIDES_URL + "?t=" + Date.now(), { cache: "no-store", mode: 'cors' });
            if (!res.ok) return;
            const data = await res.json();
            overrides = data.overrides || [];
            apply();
        } catch (e) { console.error("[SEO Agent] Config load error:", e); }
    }

    function getConfig() {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        return (overrides || []).find(o => (o.urlPattern.replace(/\/+$/, '') || '/') === path);
    }

    function apply() {
        const config = getConfig();
        if (!config) return;

        // Cleanup old versions
        document.querySelectorAll("seo-h1").forEach(e => e.remove());

        if (config.title && document.title !== config.title) document.title = config.title;
        if (config.metaDescription) {
            let m = document.querySelector('meta[name="description"]');
            if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
            m.content = config.metaDescription;
        }

        if (config.h1) {
            const allH1s = Array.from(document.querySelectorAll("h1"));
            
            // Step 1: Find the largest H1 in the center (Hero)
            let hero = null;
            let maxArea = -1;

            allH1s.forEach(h => {
                if (h.closest('seo-hero')) return;
                const rect = h.getBoundingClientRect();
                const area = rect.width * rect.height;
                // Hero is never at y < 150 on this site
                if (rect.top > 150 && area > maxArea) {
                    maxArea = area;
                    hero = h;
                }
                // Sync text for all H1s (SEO)
                if (h.textContent !== config.h1) h.textContent = config.h1;
            });

            // Step 2: Inject single <seo-hero>
            if (hero && !document.querySelector('seo-hero')) {
                const cs = window.getComputedStyle(hero);
                const container = hero.parentElement;
                
                const wrapper = document.createElement("seo-hero");
                wrapper.style.display = "block";
                wrapper.style.width = "100%";
                
                const shadow = wrapper.attachShadow({ mode: "open" });
                const span = hero.querySelector('span');
                const spanCs = span ? window.getComputedStyle(span) : cs;

                shadow.innerHTML = `
                    <h1 style="
                        font-family: ${spanCs.fontFamily};
                        font-size: ${spanCs.fontSize};
                        font-weight: ${spanCs.fontWeight};
                        color: ${spanCs.color};
                        line-height: ${spanCs.lineHeight};
                        text-align: ${spanCs.textAlign || 'center'};
                        margin: 0; padding: 0;
                        display: block;
                    ">${config.h1}</h1>
                `;

                container.insertBefore(wrapper, hero);
            }
        }
        
        // Link injection omitted for brevity in Clean Sweep (or keep it if it was working)
    }

    loadConfig();
    setInterval(apply, 1000);
})();
