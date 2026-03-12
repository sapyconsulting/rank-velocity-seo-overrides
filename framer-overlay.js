/**
 * Framer SEO Overlay Script — V6.7 (The Resurrection)
 * ─────────────────────────────────────────────────────────────────
 * This version fixes the "Invisible Hero" bug by allowing elements
 * to be measured before they are fully suppressed.
 */

const SEO_OVERRIDES_URL = 'https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json';

(function () {
    "use strict";

    if (window.__framer_importFromPackage || window.location.hostname === "framer.com") return;

    // GLOBAL CSS STEALTH:
    // We use opacity: 0 and visibility: hidden. 
    // CRITICAL: No 'display: none' here, otherwise getBoundingClientRect() returns 0.
    const stealthStyle = document.createElement('style');
    stealthStyle.id = 'seo-stealth-patch';
    stealthStyle.innerHTML = `
        h1:not(.seo-visible), seo-h1, .seo-ghost { 
            opacity: 0 !important; 
            pointer-events: none !important; 
            visibility: hidden !important; 
        }
        seo-hero, seo-hero h1, h1.seo-visible { 
            opacity: 1 !important; 
            pointer-events: auto !important; 
            visibility: visible !important; 
            display: block !important; 
        }
    `;
    document.head.appendChild(stealthStyle);

    let overrides = [];
    let heroCandidateFound = false;

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

        // Cleanup any rogue seo-h1 tags from previous broken versions
        document.querySelectorAll("seo-h1").forEach(e => e.remove());

        if (config.title && document.title !== config.title) document.title = config.title;
        if (config.metaDescription) {
            let m = document.querySelector('meta[name="description"]');
            if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
            m.content = config.metaDescription;
        }

        if (config.h1) {
            const allH1s = Array.from(document.querySelectorAll("h1"));
            
            let bestHero = null;
            let maxArea = -1;

            allH1s.forEach(h => {
                if (h.closest('seo-hero')) return;
                
                // Temporarily un-hide to measure if it's already hidden by our style
                const wasHidden = h.style.visibility === 'hidden';
                if (wasHidden) h.style.visibility = 'visible';
                
                const rect = h.getBoundingClientRect();
                const area = rect.width * rect.height;

                // Hero candidate: Large, and NOT at the very top (y < 120 is usually ghost)
                // We also check rect.width > 0 to ensure it's not actually hidden by Framer logic
                if (rect.top > 120 && area > maxArea && rect.width > 0) {
                    maxArea = area;
                    bestHero = h;
                }

                if (wasHidden) h.style.visibility = 'hidden';

                // Sync text content for ALL H1s (even invisible ones) to satisfy SEO bots
                if (h.textContent.trim() !== config.h1) {
                    h.textContent = config.h1;
                }
            });

            // Inject the single visible <seo-hero>
            if (bestHero && !document.querySelector('seo-hero')) {
                const cs = window.getComputedStyle(bestHero);
                const container = bestHero.parentElement;
                
                const wrapper = document.createElement("seo-hero");
                wrapper.style.display = "block";
                wrapper.style.width = "100%";
                
                const shadow = wrapper.attachShadow({ mode: "open" });
                const span = bestHero.querySelector('span');
                const spanCs = span ? window.getComputedStyle(span) : cs;

                shadow.innerHTML = `
                    <h1 style="
                        font-family: ${spanCs.fontFamily || cs.fontFamily};
                        font-size: ${spanCs.fontSize || cs.fontSize};
                        font-weight: ${spanCs.fontWeight || cs.fontWeight};
                        color: ${spanCs.color || cs.color};
                        line-height: ${spanCs.lineHeight || cs.lineHeight};
                        text-align: ${spanCs.textAlign || cs.textAlign || 'center'};
                        margin: 0; padding: 0;
                        display: block;
                    ">${config.h1}</h1>
                `;

                container.insertBefore(wrapper, bestHero);
                heroCandidateFound = true;
            }
        }
    }

    loadConfig();
    
    // Polling handles Framer's dynamic loading
    setInterval(() => {
        apply();
    }, 1000);

    // Re-run on navigation
    let lastUrl = window.location.pathname;
    const observer = new MutationObserver(() => {
        if (window.location.pathname !== lastUrl) {
            lastUrl = window.location.pathname;
            document.querySelectorAll("seo-hero").forEach(e => e.remove());
            heroCandidateFound = false;
            apply();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
