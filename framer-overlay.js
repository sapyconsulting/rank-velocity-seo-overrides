/**
 * Framer SEO Overlay Script — V6.6 (Final Boss: CSS Stealth Patch)
 * ─────────────────────────────────────────────────────────────────
 */

const SEO_OVERRIDES_URL = 'https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json';

(function () {
    "use strict";

    if (window.__framer_importFromPackage || window.location.hostname === "framer.com") return;

    // GLOBAL CSS STEALH: Force every single H1 on the page to be invisible by default.
    // We only un-hide the one inside our custom <seo-hero> tag.
    const stealthStyle = document.createElement('style');
    stealthStyle.id = 'seo-stealth-patch';
    stealthStyle.innerHTML = `
        h1 { opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }
        seo-hero h1 { opacity: 1 !important; pointer-events: auto !important; visibility: visible !important; display: block !important; }
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

        if (config.title && document.title !== config.title) document.title = config.title;
        if (config.metaDescription) {
            let m = document.querySelector('meta[name="description"]');
            if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
            m.content = config.metaDescription;
        }

        if (config.h1) {
            const allH1s = Array.from(document.querySelectorAll("h1"));
            
            // Step 1: Find the TRUE Hero (the largest one that is NOT at the very top)
            let hero = null;
            let maxScore = -1;

            allH1s.forEach(h => {
                // Ignore elements we already processed
                if (h.closest('seo-hero')) return;

                const rect = h.getBoundingClientRect();
                const area = rect.width * rect.height;
                const score = area * (rect.top > 120 ? 1 : 0.01); // Heavily penalize things at the top

                if (score > maxScore) {
                    maxScore = score;
                    hero = h;
                }

                // While we are here, force text content on every H1 for SEO bots
                if (h.textContent !== config.h1) h.textContent = config.h1;
            });

            // Step 2: Inject the one and only <seo-hero>
            if (hero && !document.querySelector('seo-hero')) {
                const cs = window.getComputedStyle(hero);
                const container = hero.parentElement;
                
                const wrapper = document.createElement("seo-hero");
                wrapper.style.display = "flex";
                wrapper.style.flexDirection = "column";
                wrapper.style.width = "100%";
                wrapper.style.alignItems = cs.alignItems || "center";
                
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
                    ">${config.h1}</h1>
                `;

                container.insertBefore(wrapper, hero);
            }
        }

        // Links & Content
        const anchor = findAnchorParagraph();
        if (config.injectLinks?.length && !document.querySelector("seo-nav") && anchor) {
            const el = document.createElement("seo-nav");
            const shadow = el.attachShadow({ mode: "open" });
            shadow.innerHTML = `
                <nav style="margin:24px 0;padding:16px;border-top:1px solid rgba(0,0,0,0.1);border-bottom:1px solid rgba(0,0,0,0.1);">
                    <p style="font-weight:600;margin-bottom:8px;font-size:14px;opacity:0.7;">Related Resources</p>
                    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:12px;">
                        ${config.injectLinks.map(l => `<li><a href="${l.href}" style="color:inherit;text-decoration:underline;text-underline-offset:3px;font-size:14px;">${l.anchorText}</a></li>`).join("")}
                    </ul>
                </nav>`;
            anchor.parentNode.insertBefore(el, anchor.nextSibling);
        }
    }

    function findAnchorParagraph() {
        const paragraphs = document.querySelectorAll("p");
        for (const p of paragraphs) {
            if (p.textContent.trim().length > 40 && !p.closest("nav, footer, header")) return p;
        }
        return null;
    }

    let applyTimer = null;
    let lastUrl = window.location.pathname;

    const observer = new MutationObserver(() => {
        const urlChanged = window.location.pathname !== lastUrl;
        if (urlChanged) {
            lastUrl = window.location.pathname;
            document.querySelectorAll("seo-hero, seo-nav, seo-content").forEach(e => e.remove());
        }
        clearTimeout(applyTimer);
        applyTimer = setTimeout(apply, 200);
    });

    loadConfig();
    setInterval(apply, 1000);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    window.addEventListener("popstate", () => {
        targetText = null;
        apply();
    });
})();
