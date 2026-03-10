// Rank Velocity Agent V2: Smart Overlay
// Hosted version for Framer Custom Code

const SEO_OVERRIDES_URL = "https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json";

(function () {
    "use strict";

    // Disable in Framer Editor
    if (window.__framer_importFromPackage || window.location.hostname === "framer.com") return;

    async function applySEO() {
        try {
            const res = await fetch(SEO_OVERRIDES_URL + "?t=" + Date.now(), { cache: "no-store" });
            if (!res.ok) return;

            const config = await res.json();
            const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";

            const v = config.overrides?.find(x => (x.urlPattern.replace(/\/+$/, "") || "/") === currentPath);
            if (!v) return;

            // 1. Meta & Title
            if (v.title) document.title = v.title;

            if (v.metaDescription) {
                let m = document.querySelector('meta[name="description"]');
                if (!m) {
                    m = document.createElement("meta");
                    m.name = "description";
                    m.setAttribute("data-seo-agent", "1");
                    document.head.appendChild(m);
                }
                m.content = v.metaDescription;
            }

            // 2. H1 Override
            if (v.h1) {
                let h = document.querySelector("h1");
                if (h) {
                    h.textContent = v.h1;
                    h.setAttribute("data-seo-agent", "1");
                } else {
                    let main = document.querySelector("main") || document.body;
                    let nh = document.createElement("h1");
                    nh.textContent = v.h1;
                    nh.setAttribute("data-seo-agent", "1");
                    nh.style.margin = "0 0 16px 0";
                    main.prepend(nh);
                }
            }

            // 3. Related Links
            if (v.injectLinks?.length) {
                let n = document.createElement("nav");
                n.setAttribute("data-seo-agent", "1");
                n.style.cssText = "margin:24px 0;padding:16px;border-top:1px solid rgba(0,0,0,0.1);border-bottom:1px solid rgba(0,0,0,0.1)";
                n.innerHTML = "<p style='font-weight:600;margin-bottom:8px;font-size:14px;opacity:0.7'>Related Resources</p>";

                let u = document.createElement("ul");
                u.style.cssText = "list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:12px";

                for (let l of v.injectLinks) {
                    let li = document.createElement("li"), a = document.createElement("a");
                    a.href = l.href;
                    a.textContent = l.anchorText;
                    a.style.cssText = "color:inherit;text-decoration:underline;text-underline-offset:3px;font-size:14px";
                    li.appendChild(a);
                    u.appendChild(li);
                }
                n.appendChild(u);

                let t = findPos("after-first-paragraph");
                if (t && t.parentNode) t.parentNode.insertBefore(n, t.nextSibling);
                else (document.querySelector("main") || document.body).appendChild(n);
            }

            // 4. Content Blocks
            if (v.injectContent?.length) {
                for (let x of v.injectContent) {
                    let w = document.createElement("div");
                    w.setAttribute("data-seo-agent", "1");
                    w.className = "seo-injected-block";
                    w.style.cssText = "margin:40px auto;padding:32px;max-width:800px;width:100%;background:rgba(255,255,255,0.03);border-radius:16px;border:1px solid rgba(0,0,0,0.05);color:inherit;line-height:1.6;box-sizing:border-box";
                    w.innerHTML = x.html;

                    let t = findPos(x.position || "safe");
                    if (t && t.parentNode) t.parentNode.insertBefore(w, t);
                    else (document.querySelector("main") || document.body).appendChild(w);
                }
            }
        } catch (e) {
            console.warn("[SEO Agent] Error:", e);
        }
    }

    function findPos(p) {
        const s = Array.from(document.querySelectorAll("div,section,article")).filter(e => {
            if (e.closest('nav,footer,header,[data-framer-name*="Nav"],[data-framer-name*="Footer"]')) return false;
            const len = e.textContent.trim().length;
            return len > 300 && len < 5000;
        });

        if (p === "after-first-paragraph") {
            for (let pT of document.querySelectorAll("p")) {
                if (pT.textContent.trim().length > 50 && !pT.closest("nav,footer,header")) return pT.nextSibling || pT;
            }
            return s[0] || document.querySelector("h1")?.parentNode;
        }

        if (s.length > 0) return s[s.length - 1].nextSibling;
        return document.querySelectorAll("h2,h3")[0] || null;
    }

    // Defend against Hydration Wipes
    let isApplying = false, timer = null, lastUrl = window.location.pathname;
    const observer = new MutationObserver(() => {
        if (isApplying) return;

        const hasTags = document.querySelector('[data-seo-agent="1"]') !== null;
        const urlChanged = window.location.pathname !== lastUrl;

        if (!hasTags || urlChanged) {
            if (urlChanged) lastUrl = window.location.pathname;
            clearTimeout(timer);
            timer = setTimeout(async () => {
                isApplying = true;
                await applySEO();
                isApplying = false;
            }, 300);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applySEO);
    else requestAnimationFrame(applySEO);

    setTimeout(applySEO, 3000);
})();
