/**
 * Framer SEO Overlay Script — V6.5 (Nuclear Ghost Eradication)
 * ─────────────────────────────────────────────────────────────────
 *
 * Install in Framer:
 *   Settings → General → Custom Code → End of <body>
 *   <script src="https://sapyconsulting.github.io/rank-velocity-seo-overrides/framer-overlay.js"></script>
 */

const SEO_OVERRIDES_URL = 'https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json';

(function () {
    "use strict";

    if (window.__framer_importFromPackage || window.location.hostname === "framer.com") return;

    let overrides = [];
    let targetText = null;

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

        // 2. Strict Hero-H1 Override (Nuclear Policy)
        if (config.h1) {
            const originalH1s = Array.from(document.querySelectorAll("h1"));
            
            // Find the TRUE Hero H1 candidate
            let heroCandidate = null;
            let maxArea = 0;

            originalH1s.forEach(h => {
                const rect = h.getBoundingClientRect();
                const area = rect.width * rect.height;
                // Hero is usually large and NOT at the very top (y < 100 is almost always a ghost)
                if (rect.top > 100 && area > maxArea) {
                    maxArea = area;
                    heroCandidate = h;
                }
            });

            // If we found a hero, we will replace it.
            // EVERY OTHER H1 on the page (including the ghost at y=32) gets NUKED.
            originalH1s.forEach((h1, index) => {
                const rect = h1.getBoundingClientRect();
                const cs = window.getComputedStyle(h1);
                
                if (h1 !== heroCandidate) {
                    // This is a ghost or secondary tag. 
                    // We update the text for SEO, but FORCE it to be 100% invisible.
                    h1.style.setProperty('display', 'none', 'important');
                    h1.style.setProperty('opacity', '0', 'important');
                    h1.style.setProperty('visibility', 'hidden', 'important');
                    h1.style.setProperty('pointer-events', 'none', 'important');
                    h1.style.setProperty('position', 'absolute', 'important');
                    h1.style.setProperty('top', '-9999px', 'important');
                    
                    if (h1.textContent !== config.h1) {
                        h1.textContent = config.h1;
                    }
                    return;
                }

                // If this IS the Hero Candidate, inject the Shadow DOM replacement
                if (document.querySelector(`seo-h1[data-index="${index}"]`)) return;

                const container = h1.parentElement;
                if (!container) return;

                const el = document.createElement("seo-h1");
                el.setAttribute("data-index", index);
                el.style.display = "flex";
                el.style.width = "100%";
                el.style.flexDirection = "column";
                el.style.alignItems = cs.alignItems || "flex-start";
                el.style.textAlign = cs.textAlign || "inherit";
                
                const shadow = el.attachShadow({ mode: "open" });
                const firstSpan = h1.querySelector('span');
                const spanCs = firstSpan ? window.getComputedStyle(firstSpan) : cs;
                
                const fontSize = spanCs.fontSize || cs.fontSize || '48px';
                const fontWeight = spanCs.fontWeight || cs.fontWeight || '700';
                const fontFamily = spanCs.fontFamily || cs.fontFamily || 'inherit';
                const color = spanCs.color || cs.color || 'inherit';
                const lineHeight = spanCs.lineHeight || cs.lineHeight || '1.2';

                shadow.innerHTML = `
                    <h1 style="
                        font-size: ${fontSize};
                        font-weight: ${fontWeight};
                        font-family: ${fontFamily};
                        color: ${color};
                        line-height: ${lineHeight};
                        margin: 0;
                        padding: 0;
                        text-align: inherit;
                        display: inline-block;
                    ">${config.h1}</h1>
                `;

                container.insertBefore(el, h1);
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

        const urlChanged = window.location.pathname !== lastUrl;
        if (urlChanged) {
            lastUrl = window.location.pathname;
            document.querySelectorAll("seo-h1, seo-nav, seo-content").forEach(e => e.remove());
        }

        clearTimeout(applyTimer);
        applyTimer = setTimeout(apply, 200);
    });

    loadConfig();

    let pollCount = 0;
    const aggressivePoll = setInterval(() => {
        apply();
        pollCount++;
        if (pollCount > 30) clearInterval(aggressivePoll);
    }, 500);

    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    window.addEventListener("popstate", () => {
        loadConfig();
        pollCount = 0;
        clearInterval(aggressivePoll);
        const newPoll = setInterval(() => { apply(); pollCount++; if (pollCount > 20) clearInterval(newPoll); }, 500);
    });
})();
