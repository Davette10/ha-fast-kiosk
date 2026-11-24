/* ha-fast-kiosk: View Assist guard (optional). Add as a Dashboard resource (JavaScript module) in Home Assistant.

   Why: when View Assist's "home" points at /local/fast-kiosk/index.html, View Assist also tells the normal HA frontend
   to "navigate" there. Inside the HA frontend that path is not a dashboard, so it falls through to your default dashboard.
   If the kiosk device is ever showing the HA frontend (for example right after you change settings, before it reloads),
   this keeps it on your kiosk dashboard instead.

   Only runs inside the View Assist Companion App (VACA) on Android, never in normal browsers. Edit DASHBOARD below. */
(() => {
  const DASHBOARD = "/my-kiosk/home"; /* the dashboard view to stay on */
  try {
    if (window.__fastKiosk) return;
    if (!/Android/.test(navigator.userAgent) || !window.ViewAssistApp || !window.externalApp) return;
    const onNav = () => {
      const p = location.pathname;
      if (p.startsWith(DASHBOARD.replace(/\/[^/]*$/, "/")) || p === DASHBOARD) return;
      history.replaceState(null, "", DASHBOARD);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: true } }));
    };
    onNav();
    window.addEventListener("location-changed", onNav, true);
  } catch (e) {}
})();
