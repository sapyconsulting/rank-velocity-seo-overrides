/**
 * Framer SEO Overlay Script — V6.4 (Aggressive Ghost Suppression)
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

        // 2. Strict Hero-H1 Override
        if (config.h1) {
            const originalH1s = Array.from(document.querySelectorAll("h1"));
            
            // Pass 1: Identification
            if (!targetText && originalH1s.length > 0) {
                for (const h of originalH1s) {
                    const rect = h.getBoundingClientRect();
                    const text = h.textContent.trim();
                    const cs = window.getComputedStyle(h);
                    
                    // Identify the ACTUAL visual banner (Hero is usually >150px from top)
                    if (text && rect.width >= 5 && rect.height >= 5 && cs.display !== 'none' && rect.top > 120) {
                        targetText = text;
                        break;
                    }
                }
                if (!targetText && originalH1s[0]) targetText = originalH1s[0].textContent.trim();
            }

            // Pass 2: Implementation
            if (targetText && originalH1s.length > 0) {
                originalH1s.forEach((h1, index) => {
                    const text = h1.textContent.trim();
                    if (text !== targetText && !text.includes(config.h1)) return; 

                    const rect = h1.getBoundingClientRect();
                    const cs = window.getComputedStyle(h1);
                    
                    // ANY H1 at the very top (y < 120) is a Ghost/SSR tag. Kill its visibility immediately.
                    const isGhost = rect.top < 120 || rect.width < 10 || rect.height < 10 || cs.display === 'none' || cs.opacity === '0';

                    if (isGhost) {
                        h1.style.setProperty('opacity', '0', 'important');
                        h1.style.setProperty('visibility', 'hidden', 'important');
                        h1.style.setProperty('pointer-events', 'none', 'important');
                        h1.style.setProperty('height', '0', 'important');
                        h1.style.setProperty('overflow', 'hidden', 'important');
                        if (h1.textContent !== config.h1) {
                            h1.textContent = config.h1;
                        }
                        return;
                    }

                    // Otherwise, this is the main VISIBLE Hero H1.
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
                            display: inline-block;
                        ">${config.h1}</h1>
                    `;

                    container.insertBefore(el, h1);
                    h1.style.setProperty('display', 'none', 'important');
                    h1.style.setProperty('opacity', '0', 'important');
                    h1.style.setProperty('visibility', 'hidden', 'important');
                });
            }
        }

        // 3. Links & Content injection
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

        const urlChanged = window.location.pathname !== lastUrl;
        if (urlChanged) {
            lastUrl = window.location.pathname;
            targetText = null;
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
        if (pollCount > 20) clearInterval(aggressivePoll);
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
        pollCount = 0;
        targetText = null;
        clearInterval(aggressivePoll);
        const newPoll = setInterval(() => { apply(); pollCount++; if (pollCount > 20) clearInterval(newPoll); }, 500);
    });
})();
