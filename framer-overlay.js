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

        // ─── 2. H1 Override (Shadow DOM replacement — hydration-proof) ───
        //
        // Framer's animated H1 wraps each character in individual <span> elements
        // managed by React's virtual DOM. Setting textContent gets wiped instantly
        // by React hydration. Solution: visually hide the original H1 and insert 
        // a Shadow DOM replacement that React cannot touch.
        //
        if (config.h1 && !document.querySelector("seo-h1")) {
            const originalH1 = document.querySelector("h1");
            if (originalH1) {
                // Clone styles from the original H1 for visual consistency
                const computedStyle = window.getComputedStyle(originalH1);
                const fontSize = computedStyle.fontSize;
                const fontWeight = computedStyle.fontWeight;
                const fontFamily = computedStyle.fontFamily;
                const color = computedStyle.color;
                const letterSpacing = computedStyle.letterSpacing;
                const lineHeight = computedStyle.lineHeight;
                const textAlign = computedStyle.textAlign;

                // Hide the original H1 (not display:none — keep layout space, just invisible)
                // We use a CSS class override to avoid React resetting inline styles
                const hideStyle = document.createElement("style");
                hideStyle.setAttribute("data-seo-agent", "h1-hider");
                hideStyle.textContent = `
                    h1.framer-text { 
                        visibility: hidden !important; 
                        height: 0 !important; 
                        overflow: hidden !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                    }
                `;
                document.head.appendChild(hideStyle);

                // Insert Shadow DOM H1 right before the original's container
                const container = originalH1.closest('[data-framer-name="Main Heading"]') || originalH1.parentElement;
                const el = document.createElement("seo-h1");
                el.style.display = "block";
                const shadow = el.attachShadow({ mode: "open" });
                shadow.innerHTML = `
                    <h1 style="
                        font-size: ${fontSize};
                        font-weight: ${fontWeight};
                        font-family: ${fontFamily};
                        color: ${color};
                        letter-spacing: ${letterSpacing};
                        line-height: ${lineHeight};
                        text-align: ${textAlign};
                        margin: 0;
                        padding: 0;
                    ">${config.h1}</h1>
                `;
                container.parentNode.insertBefore(el, container);

                console.log("[SEO Agent] H1 replaced via Shadow DOM:", config.h1);
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
                const navEl = document.querySelector("seo-nav");
                const insertAfter = navEl || anchor;
                insertAfter.parentNode.insertBefore(el, insertAfter.nextSibling);
            }
        }
    }

    /**
     * Find a suitable paragraph in the main content area to anchor injections.
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
     * - Shadow DOM elements (<seo-h1>, <seo-nav>, <seo-content>) survive React hydration
     * - Title/Meta get re-applied by the MutationObserver
     * - We also re-hide the original H1 if React re-shows it
     */
    let applyTimer = null;
    let lastUrl = window.location.pathname;

    const observer = new MutationObserver(() => {
        const config = getConfig();
        if (!config) return;

        const titleWiped = config.title && document.title !== config.title;
        const urlChanged = window.location.pathname !== lastUrl;

        // Check if H1 hider style got removed
        const hiderGone = config.h1 && !document.querySelector('style[data-seo-agent="h1-hider"]');

        if (titleWiped || urlChanged || hiderGone) {
            if (urlChanged) {
                lastUrl = window.location.pathname;
                // Remove all Shadow DOM elements on route change so they get re-created for new page
                document.querySelectorAll("seo-h1, seo-nav, seo-content").forEach(el => el.remove());
                document.querySelectorAll('style[data-seo-agent="h1-hider"]').forEach(el => el.remove());
            }

            clearTimeout(applyTimer);
            applyTimer = setTimeout(() => {
                apply();
            }, 200);
        }
    });

    // ─── INITIALIZATION ───
    loadConfig();

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

    // Safety net: re-apply after React hydration window
    setTimeout(() => { apply(); }, 3500);
})();
