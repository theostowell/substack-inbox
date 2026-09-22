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

  function coerceUrl(url) {
    if (url == null || url === "") return null;
    try {
      return new URL(String(url), location.origin);
    } catch (_) {
      return null;
    }
  }

  function bounceHome(fromUrl) {
    const u = coerceUrl(fromUrl) || new URL(location.href);
    if (!hosts.has(u.hostname) || !isHomePath(u.pathname)) return false;
    location.replace(inboxUrl(u));
    return true;
  }

  if (bounceHome(location.href)) return;

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  function wrapHistory(orig, state, title, url) {
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
    wrapHistory(origPush, state, title, url);
  history.replaceState = (state, title, url) =>
    wrapHistory(origReplace, state, title, url);

  window.addEventListener("popstate", () => bounceHome(location.href));

  if (window.navigation && typeof window.navigation.addEventListener === "function") {
    window.navigation.addEventListener("navigate", (event) => {
      let u;
      try {
        u = new URL(event.destination.url);
      } catch (_) {
        return;
      }
      if (!hosts.has(u.hostname) || !isHomePath(u.pathname)) return;
      if (event.cancelable) event.preventDefault();
      location.replace(inboxUrl(u));
    });
  }
})();
