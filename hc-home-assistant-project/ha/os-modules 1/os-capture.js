/* Clark Home OS - screenshot engine offset */
(() => {
if (navigator.webdriver || /Headless/i.test(navigator.userAgent)) {
const TOP = 56;
const dq = (root, sel, d) => { if (!root || (d || 0) > 8) return null; const hit = root.querySelector(sel); if (hit) return hit; for (const n of root.querySelectorAll("*")) { if (n.shadowRoot) { const r = dq(n.shadowRoot, sel, (d || 0) + 1); if (r) return r; } } return null; };
let hr = null;
setInterval(() => {
if (!hr || !hr.isConnected) hr = dq(document, "hui-root"); const sr = hr && hr.shadowRoot; if (!sr) return;
const hd = sr.querySelector(".header"), v = sr.querySelector("#view") || sr.querySelector("hui-view-container");
const hidden = !hd || hd.offsetHeight === 0;
document.documentElement.style.setProperty("--os-top", hidden ? TOP + "px" : "0px");
if (v) { if (hidden) v.style.setProperty("padding-top", TOP + "px", "important"); else v.style.removeProperty("padding-top"); }
}, 300);
}
})();
