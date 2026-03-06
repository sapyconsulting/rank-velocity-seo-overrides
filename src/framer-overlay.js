/**
 * framer-overlay.js — Rank Velocity Agent
 * Paste this entire script into Framer:
 *   Project Settings → General → Custom Code → End of <body>
 *
 * What it does:
 *  - Fetches seo-overrides.json from GitHub Pages on every page load
 *  - Matches the current URL to an override entry
 *  - Swaps <title>, H1, meta description, canonical tag
 *  - Injects internal links into specified containers
 *  - Uses MutationObserver to survive Framer React rehydration
 */
(function () {
  const SEO_JSON_URL =
    'https://sapyconsulting.github.io/rank-velocity-seo-overrides/seo-overrides.json';

  // Normalize URL for matching (strip trailing slash, lowercase)
  function normalizeUrl(url) {
    return url.replace(/\/$/, '').toLowerCase().split('?')[0].split('#')[0];
  }

  // Apply a single override object to the DOM
  function applyOverride(fix) {
    // 1. Page <title>
    if (fix.title) {
      document.title = fix.title;
    }

    // 2. Meta description
    if (fix.meta_desc) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = fix.meta_desc;
    }

    // 3. Canonical tag
    if (fix.canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = fix.canonical;
    }

    // 4. H1 override
    if (fix.h1) {
      const h1 = document.querySelector('h1');
      if (h1) h1.textContent = fix.h1;
    }

    // 5. Inject internal links
    if (fix.inject_links && fix.inject_links.length > 0) {
      fix.inject_links.forEach(function (linkDef) {
        // linkDef: { selector: '.some-class', anchor_text: 'Click here', href: '/target' }
        const targets = document.querySelectorAll(linkDef.selector);
        targets.forEach(function (el) {
          if (!el.querySelector('a[data-rv-injected]')) {
            const a = document.createElement('a');
            a.href = linkDef.href;
            a.textContent = linkDef.anchor_text;
            a.setAttribute('data-rv-injected', 'true');
            el.appendChild(a);
          }
        });
      });
    }
  }

  // Main runner
  async function runOverlay() {
    try {
      // Cache-bust to always get the latest JSON
      const res = await fetch(SEO_JSON_URL + '?t=' + Date.now(), {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();

      const currentUrl = normalizeUrl(window.location.href);
      const fix = data.overrides.find(function (o) {
        return normalizeUrl(o.url) === currentUrl;
      });

      if (!fix) return; // No override for this page

      // Apply immediately
      applyOverride(fix);

      // Re-apply after Framer React rehydration wipes the DOM
      const observer = new MutationObserver(function () {
        applyOverride(fix);
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Stop observing after 5s to avoid performance overhead
      setTimeout(function () { observer.disconnect(); }, 5000);

    } catch (e) {
      // Silent fail — never break the page
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runOverlay);
  } else {
    runOverlay();
  }
})();
