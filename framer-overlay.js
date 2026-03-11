// Rank Velocity Agent V3: Hydration-Safe SEO Overlay
// Hosted at: https://sapyconsulting.github.io/rank-velocity-seo-overrides/framer-overlay.js

const SEO_OVERRIDES_URL = "https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json";

(function () {
    "use strict";

    // Disable in Framer Editor
    if (window.__framer_importFromPackage || window.location.hostname === "framer.com") return;

    let overrides = [];

    async function loadConfig() {
        try {
            const res = await fetch(SEO_OVERRIDES_URL + "?t=" + Date.now(), { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            overrides = data.overrides || [];
            apply();
        } catch (e) { console.error("[SEO Agent] Config load error:", e); }
    }

    function getConfig() {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        return overrides.find(o => (o.urlPattern.replace(/\/+$/, '') || '/') === path);
    }

    function apply() {
        const config = getConfig();
        if (!config) return;

        console.log("[SEO Agent] Applying overrides for", window.location.pathname);

        // ─── 1. Title & Meta (lightweight, always safe to re-apply) ───
        if (config.title && document.title !== config.title) {
            document.title = config.title;
        }

        if (config.metaDescription) {
            let m = document.querySelector('meta[name="description"]');
            if (!m) {
                m = document.createElement("meta");
                m.name = "description";
                document.head.appendChild(m);
            }
            if (m.content !== config.metaDescription) m.content = config.metaDescription;
        }

        // ─── 2. H1 Override (direct DOM mutation, defended by observer below) ───
        if (config.h1) {
            const h1 = document.querySelector("h1");
            if (h1 && h1.textContent !== config.h1) {
                h1.textContent = config.h1;
                h1.setAttribute("data-seo-override", "h1");
            }
        }

        // ─── 3. Internal Links (Shadow DOM — hydration-safe) ───
        if (config.injectLinks?.length && !document.querySelector("seo-nav")) {
            const anchor = findAnchorParagraph();
            if (anchor && anchor.parentNode) {
                const el = document.createElement("seo-nav");
                const shadow = el.attachShadow({ mode: "open" });
                shadow.innerHTML = `
                    <nav style="margin:24px 0;padding:16px;border-top:1px solid rgba(0,0,0,0.1);border-bottom:1px solid rgba(0,0,0,0.1);">
                        <p style="font-weight:600;margin-bottom:8px;font-size:14px;opacity:0.7;">Related Resources</p>
                        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:12px;">
                            ${config.injectLinks.map(l =>
                    `<li><a href="${l.href}" style="color:inherit;text-decoration:underline;text-underline-offset:3px;font-size:14px;">${l.anchorText}</a></li>`
                ).join("")}
                        </ul>
                    </nav>`;
                anchor.parentNode.insertBefore(el, anchor.nextSibling);
            }
        }

        // ─── 4. Content Blocks (Shadow DOM — hydration-safe) ───
        if (config.injectContent?.length && !document.querySelector("seo-content")) {
            const anchor = findAnchorParagraph();
            if (anchor && anchor.parentNode) {
                const el = document.createElement("seo-content");
                const shadow = el.attachShadow({ mode: "open" });
                shadow.innerHTML = config.injectContent.map(c =>
                    `<div style="margin:16px 0;line-height:1.6;font-size:16px;color:inherit;font-family:inherit;">${c.html}</div>`
                ).join("");
                // Insert after seo-nav if it exists, otherwise after anchor
                const navEl = document.querySelector("seo-nav");
                const insertAfter = navEl || anchor;
                insertAfter.parentNode.insertBefore(el, insertAfter.nextSibling);
            }
        }
    }

    /**
     * Find a suitable paragraph in the main content area to anchor injections.
     * Avoids nav, footer, header elements.
     */
    function findAnchorParagraph() {
        const paragraphs = document.querySelectorAll("p");
        for (const p of paragraphs) {
            if (p.textContent.trim().length > 40 && !p.closest("nav, footer, header")) {
                return p;
            }
        }
        return null;
    }

    /**
     * HYDRATION DEFENSE
     * 
     * Strategy:
     * - Shadow DOM elements (<seo-nav>, <seo-content>) survive React hydration
     *   because React doesn't own those custom elements.
     * - H1 text and Title/Meta DO get wiped by hydration, so we use a 
     *   MutationObserver that specifically watches for our overrides being reverted.
     * - We debounce re-applications to prevent infinite loops.
     */
    let applyTimer = null;
    let lastUrl = window.location.pathname;

    const observer = new MutationObserver(() => {
        const config = getConfig();
        if (!config) return;

        // Check if any of our overrides got wiped
        const titleWiped = config.title && document.title !== config.title;
        const h1El = document.querySelector("h1");
        const h1Wiped = config.h1 && h1El && h1El.textContent !== config.h1;
        const urlChanged = window.location.pathname !== lastUrl;

        if (titleWiped || h1Wiped || urlChanged) {
            if (urlChanged) {
                lastUrl = window.location.pathname;
                // Remove Shadow DOM elements on route change so they get re-created for new page
                document.querySelectorAll("seo-nav, seo-content").forEach(el => el.remove());
            }

            clearTimeout(applyTimer);
            applyTimer = setTimeout(() => {
                apply();
            }, 200);
        }
    });

    // ─── INITIALIZATION ───
    loadConfig();

    // Start observer once body exists
    function startObserver() {
        if (document.body) {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        } else {
            requestAnimationFrame(startObserver);
        }
    }
    startObserver();

    // SPA navigation handler
    window.addEventListener("popstate", loadConfig);

    // Safety net: re-apply after React's typical hydration window (2-4 seconds)
    setTimeout(() => {
        apply();
    }, 3500);
})();
