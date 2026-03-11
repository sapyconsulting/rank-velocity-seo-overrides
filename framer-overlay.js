/**
 * Framer SEO Overlay Script — V3.2 (Hydration-Safe, Multi-H1 Shadow DOM)
 * ─────────────────────────────────────────────────────────────────
 *
 * Install in Framer:
 *   Settings → General → Custom Code → End of <body>
 *   <script src="https://sapyconsulting.github.io/rank-velocity-seo-overrides/framer-overlay.js"></script>
 *
 * Updates in V3.2:
 * - Targets ALL h1 elements on the page (Framer sometimes splits layout into multiple H1s)
 * - CSS hider expanded to catch .responsive-title and other common Framer heading classes
 * - More resilient MutationObserver to prevent React from wiping the Shadow DOM containers
 */

const SEO_OVERRIDES_URL = 'https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json';

(function () {
    "use strict";

    if (window.__framer_importFromPackage || window.location.hostname === "framer.com") return;

    let overrides = [];

    async function loadConfig() {
        try {
            const res = await fetch(SEO_OVERRIDES_URL + "?t=" + Date.now(), { cache: "no-store", mode: 'cors' });
            if (!res.ok) return;
            const data = await res.json();
            overrides = data.overrides || [];
            apply();
        } catch (e) {
            console.error("[SEO Agent] Config load error:", e);
        }
    }

    function getConfig() {
        if (!Array.isArray(overrides)) return null;
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        return overrides.find(o => (o.urlPattern.replace(/\/+$/, '') || '/') === path);
    }

    function apply() {
        const config = getConfig();
        if (!config) return;

        console.log("[SEO Agent] Applying V3.2 overrides for", window.location.pathname);

        // 1. Title & Meta
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

        // 2. Multi-H1 Override (Shadow DOM)
        if (config.h1) {
            const originalH1s = document.querySelectorAll("h1");

            // Inject global hider style once
            if (!document.querySelector('style[data-seo-agent="h1-hider"]')) {
                const hideStyle = document.createElement("style");
                hideStyle.setAttribute("data-seo-agent", "h1-hider");
                // Catch all common Framer H1 variations 
                hideStyle.textContent = `
                    h1.framer-text, 
                    h1.responsive-title, 
                    h1[data-framer-component-type="RichTextContainer"] h1,
                    .framer-text:has(span) /* Fallback for animated spans outside exact H1 class */
                    { 
                        visibility: hidden !important; 
                        height: 0 !important; 
                        overflow: hidden !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        position: absolute !important;
                    }
                `;
                document.head.appendChild(hideStyle);
            }

            originalH1s.forEach((h1, index) => {
                // Check if this specific H1 already has a shadow replacement next to it
                const container = h1.closest('[data-framer-name]') || h1.parentElement;

                // If container is already handling a shadow DOM, skip
                if (container.querySelector(`seo-h1[data-index="${index}"]`)) return;

                const cs = window.getComputedStyle(h1);

                // Don't replace truly hidden H1s (like mobile/desktop toggles that are completely removed from flow)
                // We don't check cs.visibility here because our own global `h1-hider` style might have just set it to 'hidden'!
                if (cs.display === 'none') return;

                const el = document.createElement("seo-h1");
                el.setAttribute("data-index", index);
                el.style.display = "block";
                const shadow = el.attachShadow({ mode: "open" });

                // Try to extract exact font size/weight/family from the first child span if available (Framer animations)
                const firstSpan = h1.querySelector('span');
                const spanCs = firstSpan ? window.getComputedStyle(firstSpan) : cs;

                // Fallbacks ensures we don't get 'undefined'
                const fontSize = spanCs.fontSize || cs.fontSize || '48px';
                const fontWeight = spanCs.fontWeight || cs.fontWeight || 'bold';
                const fontFamily = spanCs.fontFamily || cs.fontFamily || 'inherit';
                const color = spanCs.color || cs.color || 'inherit';
                const letterSpacing = spanCs.letterSpacing || cs.letterSpacing || 'normal';
                const lineHeight = spanCs.lineHeight || cs.lineHeight || '1.2';
                const textAlign = spanCs.textAlign || cs.textAlign || 'inherit';

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
                console.log(`[SEO Agent] H1 (#${index}) replaced via Shadow DOM`);

                // Hide the original directly as a fallback just in case CSS missed it
                h1.style.setProperty('display', 'none', 'important');
            });
        }

        // 3. Links & Content
        const anchor = findAnchorParagraph();
        if (config.injectLinks?.length && !document.querySelector("seo-nav") && anchor && anchor.parentNode) {
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

        if (config.injectContent?.length && !document.querySelector("seo-content") && anchor && anchor.parentNode) {
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

    function findAnchorParagraph() {
        const paragraphs = document.querySelectorAll("p");
        for (const p of paragraphs) {
            if (p.textContent.trim().length > 40 && !p.closest("nav, footer, header")) {
                return p;
            }
        }
        return null;
    }

    let applyTimer = null;
    let lastUrl = window.location.pathname;

    const observer = new MutationObserver(() => {
        const config = getConfig();
        if (!config) return;

        const titleWiped = config.title && document.title !== config.title;
        const urlChanged = window.location.pathname !== lastUrl;
        const hiderGone = config.h1 && !document.querySelector('style[data-seo-agent="h1-hider"]');

        // Also check if our shadow DOM H1s were mysteriously destroyed by React
        let shadowH1Missing = false;
        if (config.h1) {
            const numH1s = document.querySelectorAll("h1").length;
            const numShadows = document.querySelectorAll("seo-h1").length;
            if (numH1s > 0 && numShadows === 0) shadowH1Missing = true;
        }

        if (titleWiped || urlChanged || hiderGone || shadowH1Missing) {
            if (urlChanged) {
                lastUrl = window.location.pathname;
                document.querySelectorAll("seo-h1, seo-nav, seo-content, style[data-seo-agent]").forEach(e => e.remove());
            }
            clearTimeout(applyTimer);
            applyTimer = setTimeout(apply, 200);
        }
    });

    loadConfig();

    // V3.4 Aggressive Polling: Framer React hydration can be incredibly slow and chaotic.
    // Rather than trusting DOMContentLoaded or a single setTimeout, we forcefully
    // hammer the apply() function every 500ms for the first 10 seconds of the page life.
    let pollCount = 0;
    const aggressivePoll = setInterval(() => {
        apply();
        pollCount++;
        if (pollCount > 20) clearInterval(aggressivePoll); // Stop after 10 seconds
    }, 500);

    if (document.body) {
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
            apply();
        });
    }

    window.addEventListener("popstate", () => {
        loadConfig();
        // Re-trigger aggressive polling on route changes (Framer single-page navigations)
        pollCount = 0;
        clearInterval(aggressivePoll);
        setInterval(() => { apply(); pollCount++; if (pollCount > 20) clearInterval(this); }, 500);
    });
})();
