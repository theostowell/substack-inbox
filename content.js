(() => {
  const hosts = new Set(["substack.com", "www.substack.com"]);
  if (!hosts.has(location.hostname)) return;

  function isHomePath(path) {
    return path === "/" || path === "/home" || path === "/home/";
  }

  function inboxUrl(fromUrl) {
    const u = new URL(fromUrl, location.origin);
    return "/inbox" + u.search + u.hash;
  }

  function redirectIfHome() {
    if (!isHomePath(location.pathname)) return false;
    location.replace(inboxUrl(location.href));
    return true;
  }

  const pageScript = document.createElement("script");
  pageScript.src = chrome.runtime.getURL("page.js");
  pageScript.async = false;
  const parent = document.documentElement;
  parent.appendChild(pageScript);
  pageScript.addEventListener("load", () => pageScript.remove());

  if (redirectIfHome()) return;

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  function coerceUrl(url) {
    if (url == null || url === "") return null;
    try {
      return new URL(String(url), location.origin);
    } catch (_) {
      return null;
    }
  }

  function rewriteHistory(orig, state, title, url) {
    const u = coerceUrl(url);
    if (u && hosts.has(u.hostname) && isHomePath(u.pathname)) {
      location.replace(inboxUrl(u));
      return;
    }
    const result = orig(state, title, url);
    if (isHomePath(location.pathname)) location.replace(inboxUrl(location.href));
    return result;
  }

  history.pushState = (state, title, url) =>
    rewriteHistory(origPush, state, title, url);
  history.replaceState = (state, title, url) =>
    rewriteHistory(origReplace, state, title, url);

  window.addEventListener("popstate", redirectIfHome);

  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const el = event.target && event.target.closest
        ? event.target.closest("a, button")
        : null;
      if (!el) return;

      const href = el.getAttribute("href") || el.getAttribute("data-href") || "";
      if (!href) return;

      let u;
      try {
        u = new URL(href, location.origin);
      } catch (_) {
        return;
      }
      if (!hosts.has(u.hostname) || !isHomePath(u.pathname)) return;

      event.preventDefault();
      event.stopPropagation();
      location.assign(inboxUrl(u));
    },
    true
  );

  setInterval(redirectIfHome, 50);

  function isRelatedNotesHeading(node) {
    if (!node || node.tagName !== "H3") return false;
    return node.textContent.replace(/\s+/g, " ").trim().toLowerCase() === "related notes";
  }

  function hideRelatedNotes() {
    const headings = document.querySelectorAll("h3");
    for (const heading of headings) {
      if (!isRelatedNotesHeading(heading)) continue;
      const headerWrap = heading.parentElement;
      const section = headerWrap && headerWrap.parentElement;
      if (!section) continue;
      if (section.getAttribute("data-substack-inbox") === "related-notes") continue;
      section.setAttribute("data-substack-inbox", "related-notes");
    }
  }

  let relatedNotesQueued = false;
  function queueHideRelatedNotes() {
    if (relatedNotesQueued) return;
    relatedNotesQueued = true;
    requestAnimationFrame(() => {
      relatedNotesQueued = false;
      hideRelatedNotes();
    });
  }

  hideRelatedNotes();
  new MutationObserver(queueHideRelatedNotes).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
