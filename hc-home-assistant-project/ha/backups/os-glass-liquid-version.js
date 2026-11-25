/* Clark Home OS - Liquid Glass material (wall tablet + phone dashboards) */
(() => {
const SCOPES = ["/claude-test-dashboard", "/mobile-dashboard"];
const WALL = "radial-gradient(85% 65% at 12% 0%, rgba(92,112,168,0.26), rgba(92,112,168,0) 62%), radial-gradient(75% 65% at 100% 100%, rgba(110,96,150,0.17), rgba(110,96,150,0) 62%), radial-gradient(55% 45% at 80% 12%, rgba(150,170,200,0.08), rgba(150,170,200,0) 60%), linear-gradient(165deg, #07080b 0%, #0b0c11 55%, #030304 100%)";
const RIM = "linear-gradient(135deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.10) 22%, rgba(255,255,255,0.035) 50%, rgba(255,255,255,0.07) 78%, rgba(255,255,255,0.24) 100%) border-box";
const SHEEN = "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0.012) 100%) padding-box";
const TOKENS = {
"--os-wallpaper": WALL,
"--os-bg": WALL,
"--lovelace-background": WALL,
"--view-background": WALL,
"--os-glass-bg": `${SHEEN}, linear-gradient(rgba(22,24,30,0.40), rgba(22,24,30,0.40)) padding-box, ${RIM}`,
"--os-glass-bg-strong": `${SHEEN}, linear-gradient(rgba(30,32,40,0.46), rgba(30,32,40,0.46)) padding-box, ${RIM}`,
"--os-glass-inner": "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.045))",
"--os-glass-filter": "blur(20px) saturate(170%)",
"--os-glass-filter-strong": "blur(28px) saturate(190%)",
"--os-glass-shadow": "inset 0 1px 1px rgba(255,255,255,0.14), inset 0 -1px 1px rgba(255,255,255,0.04), inset 0 0 24px rgba(255,255,255,0.03), 0 20px 44px -18px rgba(0,0,0,0.65)",
"--os-glass-border": "1px solid transparent",
"--os-lens-bg": "rgba(12,12,16,0.22)",
"--os-lens-shadow": "inset 0 1px 0 rgba(255,255,255,0.38), inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 -6px 12px -8px rgba(255,255,255,0.25), 0 6px 18px rgba(0,0,0,0.28)",
"--ha-card-background": `${SHEEN}, linear-gradient(rgba(22,24,30,0.40), rgba(22,24,30,0.40)) padding-box, ${RIM}`,
"--ha-card-box-shadow": "inset 0 1px 1px rgba(255,255,255,0.14), inset 0 -1px 1px rgba(255,255,255,0.04), 0 20px 44px -18px rgba(0,0,0,0.65)",
"--ha-card-border-color": "transparent",
};
const inScope = () => SCOPES.some((s) => location.pathname.startsWith(s));
let on = null; const seen = {};
const apply = () => {
const ha = document.querySelector("home-assistant"); if (!ha) return;
const want = inScope();
Object.entries(TOKENS).forEach(([k, v]) => { if (want) { if (ha.style.getPropertyValue(k) !== seen[k]) { ha.style.setProperty(k, v); seen[k] = ha.style.getPropertyValue(k); } } else if (on) { ha.style.removeProperty(k); seen[k] = undefined; } });
on = want;
};
const later = () => [0, 60, 400].forEach((t) => setTimeout(apply, t));
window.addEventListener("location-changed", later);
window.addEventListener("popstate", later);
const boot = setInterval(() => { if (document.querySelector("home-assistant")) { clearInterval(boot); later(); } }, 150);
setInterval(apply, 3000);
/* lens: bends what is behind small glass pills near their edges (Chromium only; others fall back to blur) */
const map = (dir, c1, c2) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="${dir ? 0 : 1}" y2="${dir ? 1 : 0}"><stop offset="0" stop-color="${c1}"/><stop offset="0.24" stop-color="${c2}"/><stop offset="0.76" stop-color="${c2}"/><stop offset="1" stop-color="#000000"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`)}`;
const LENS = `<svg class="os-lens-defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><filter id="os-lens" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feImage href="${map(0, "#ff0000", "#800000")}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="r"/><feImage href="${map(1, "#00ff00", "#008000")}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="g"/><feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="0.16" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;
window.osLensDefs = LENS;
const LENS_DECL = "background:var(--os-lens-bg)!important;box-shadow:var(--os-lens-shadow)!important;-webkit-backdrop-filter:blur(10px) saturate(160%) brightness(0.7)!important;backdrop-filter:url(#os-lens) blur(2.5px) saturate(160%) brightness(0.68)!important;text-shadow:0 1px 2px rgba(0,0,0,0.35);";
/* glass for the custom page components (their panels all use .card) */
const CSS = `.card{background:var(--os-glass-bg)!important;border:1px solid transparent!important;box-shadow:var(--os-glass-shadow)!important;-webkit-backdrop-filter:var(--os-glass-filter);backdrop-filter:var(--os-glass-filter);}
.st,.stop,.search{background:var(--os-glass-inner)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),inset 0 0 0 1px rgba(255,255,255,0.05)!important;}
.mapw{border-color:rgba(255,255,255,0.12)!important;background:transparent!important;}
.seg,.mapw .lbl{${LENS_DECL}}`;
const dress = (el) => {
const sr = el.shadowRoot; if (!sr || sr.getElementById("osg")) return;
const st = document.createElement("style"); st.id = "osg"; st.textContent = CSS; sr.appendChild(st);
if (!sr.querySelector(".os-lens-defs")) { const t = document.createElement("template"); t.innerHTML = LENS; sr.appendChild(t.content); }
};
["os-glance", "os-lights", "os-cam-panel", "os-media-app", "os-weather-page", "os-radar", "os-person-page", "os-family-map", "os-ma-browser"].forEach((tag) => {
customElements.whenDefined(tag).then(() => {
const P = customElements.get(tag).prototype; if (P.__osGlass) return; P.__osGlass = true;
["_build", "setConfig"].forEach((m) => { const f = P[m]; if (typeof f !== "function") return; P[m] = function () { const r = f.apply(this, arguments); dress(this); return r; }; });
const cc = P.connectedCallback; P.connectedCallback = function () { if (cc) cc.apply(this, arguments); dress(this); };
});
});
})();
