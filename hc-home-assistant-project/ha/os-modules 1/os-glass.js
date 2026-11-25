/* Clark Home OS - Frosted glass material with automatic day (light) / night (dark, AMOLED) modes */
(() => {
const SCOPES = ["/claude-test-dashboard", "/mobile-dashboard"];
const MODE_ENTITY = "input_select.dashboard_appearance";
const DARK_WALL = "radial-gradient(60% 55% at 14% 8%, rgba(122,140,186,0.26), rgba(122,140,186,0) 70%), radial-gradient(55% 60% at 92% 88%, rgba(146,132,186,0.16), rgba(146,132,186,0) 70%), radial-gradient(42% 38% at 72% 18%, rgba(205,212,228,0.08), rgba(205,212,228,0) 70%), radial-gradient(50% 45% at 28% 92%, rgba(92,112,140,0.14), rgba(92,112,140,0) 70%), linear-gradient(160deg, #06070a 0%, #08090d 50%, #000000 100%)";
const LIGHT_WALL = "radial-gradient(60% 55% at 14% 8%, rgba(160,184,235,0.50), rgba(160,184,235,0) 70%), radial-gradient(55% 60% at 92% 88%, rgba(205,190,240,0.42), rgba(205,190,240,0) 70%), radial-gradient(45% 40% at 72% 18%, rgba(255,255,255,0.75), rgba(255,255,255,0) 70%), radial-gradient(50% 45% at 28% 92%, rgba(170,205,220,0.38), rgba(170,205,220,0) 70%), linear-gradient(160deg, #eceef4 0%, #e4e7ee 50%, #f2f2f6 100%)";
const HEX = ["f5f5f7", "f4f5f7", "1d1d1f", "a1a1a6", "6e6e73", "121214", "1c1c1e", "2c2c2e", "0b0b0c", "2997ff"];
const HEX_LIGHT = { f5f5f7: "#1d1d1f", f4f5f7: "#1d1d1f", "1d1d1f": "#ffffff", a1a1a6: "#6e6e73", "6e6e73": "#8e8e93", "121214": "rgba(255,255,255,0.62)", "1c1c1e": "rgba(0,0,0,0.045)", "2c2c2e": "rgba(0,0,0,0.06)", "0b0b0c": "#e9eaef", "2997ff": "#007aff" };
const W_KEYS = new Set(["045", "05", "06", "07", "08", "10", "12", "14", "55", "85", "92"]);
const G_KEYS = new Set(["72"]);
const D_KEYS = new Set(["6"]);
const wLight = (k) => { const a = parseFloat("0." + k); return `rgba(0,0,0,${(a >= 0.4 ? a * 0.9 : a * 0.75).toFixed(3)})`; };
const common = {
"--os-glass-border": "1px solid transparent",
"--os-lens-bg": "rgba(0,0,0,0.32)",
"--os-lens-shadow": "inset 0 0 0 1px rgba(255,255,255,0.14)",
"--os-pill-filter": "blur(18px) saturate(160%)",
"--ha-card-border-color": "transparent",
};
const ctl = (loud, loudH, loudA, onLoud, n, nh, na, onN, q, form, formH) => ({
"--ha-color-fill-primary-loud-resting": loud, "--ha-color-fill-primary-loud-hover": loudH, "--ha-color-fill-primary-loud-active": loudA, "--ha-color-on-primary-loud": onLoud,
"--ha-color-fill-primary-normal-resting": n, "--ha-color-fill-primary-normal-hover": nh, "--ha-color-fill-primary-normal-active": na, "--ha-color-on-primary-normal": onN,
"--ha-color-fill-primary-quiet-resting": q, "--ha-color-on-primary-quiet": onN,
"--wa-color-brand-fill-loud": loud, "--wa-color-brand-on-loud": onLoud, "--wa-color-brand-fill-normal": n, "--wa-color-brand-on-normal": onN, "--wa-color-brand-fill-quiet": q, "--wa-color-brand-on-quiet": onN,
"--ha-color-form-background": form, "--ha-color-form-background-hover": formH,
});
const txt = (a, b) => ({ "--ha-color-text-primary": a, "--ha-color-text-secondary": b, "--wa-color-text-normal": a, "--wa-color-text-quiet": b, "--mdc-theme-text-primary-on-background": a, "--mdc-theme-text-secondary-on-background": b });
const MODES = {
dark: Object.assign({}, common, txt("#f5f5f7", "#a1a1a6"), ctl("#f5f5f7", "#e8e8ed", "#d2d2d7", "#1d1d1f", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.16)", "#f5f5f7", "rgba(255,255,255,0.05)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0.10)"), {
"--os-wallpaper": DARK_WALL, "--os-bg": DARK_WALL, "--lovelace-background": DARK_WALL, "--view-background": DARK_WALL,
"--os-mappill-bg": "rgba(0,0,0,0.32)", "--os-mappill-shadow": "inset 0 0 0 1px rgba(255,255,255,0.14)",
"--os-glass-bg": "linear-gradient(rgba(255,255,255,0.08), rgba(255,255,255,0.055))",
"--os-glass-bg-strong": "linear-gradient(rgba(255,255,255,0.11), rgba(255,255,255,0.08))",
"--os-glass-inner": "rgba(255,255,255,0.06)",
"--os-glass-filter": "blur(36px) saturate(150%)",
"--os-glass-filter-strong": "blur(44px) saturate(160%)",
"--os-glass-shadow": "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 32px -8px rgba(0,0,0,0.45)",
"--ha-card-background": "linear-gradient(rgba(255,255,255,0.08), rgba(255,255,255,0.055))",
"--ha-card-box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 32px -8px rgba(0,0,0,0.45)",
"--os-text": "#f5f5f7", "--os-text-2": "#a1a1a6", "--os-text-3": "#6e6e73", "--os-accent": "#2997ff", "--os-hairline": "rgba(255,255,255,0.07)",
"--os-surface": "#121214", "--os-surface-2": "#1c1c1e", "--os-surface-3": "#2c2c2e", "--os-on": "#f5f5f7", "--os-on-text": "#1d1d1f", "--os-on-text-2": "rgba(29,29,31,0.6)",
"--primary-text-color": "#f5f5f7", "--secondary-text-color": "#a1a1a6", "--disabled-text-color": "#6e6e73", "--state-icon-color": "#a1a1a6", "--paper-item-icon-color": "#a1a1a6", "--state-inactive-color": "#6e6e73",
"--primary-background-color": "#000000", "--divider-color": "rgba(255,255,255,0.08)", "--outline-color": "rgba(255,255,255,0.12)", "--primary-color": "#2997ff", "--accent-color": "#2997ff", "--rgb-primary-color": "41, 151, 255", "--rgb-accent-color": "41, 151, 255", "--rgb-primary-text-color": "245, 245, 247",
"color-scheme": "dark",
}),
light: Object.assign({}, common, txt("#1d1d1f", "#6e6e73"), ctl("#1d1d1f", "#3a3a3c", "#48484a", "#ffffff", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.11)", "#1d1d1f", "rgba(0,0,0,0.035)", "rgba(0,0,0,0.045)", "rgba(0,0,0,0.07)"), {
"--os-wallpaper": LIGHT_WALL, "--os-bg": LIGHT_WALL, "--lovelace-background": LIGHT_WALL, "--view-background": LIGHT_WALL,
"--os-mappill-bg": "rgba(255,255,255,0.74)", "--os-mappill-shadow": "inset 0 0 0 1px rgba(255,255,255,0.8), 0 4px 14px rgba(0,0,0,0.12)",
"--os-glass-bg": "linear-gradient(rgba(255,255,255,0.64), rgba(255,255,255,0.50))",
"--os-glass-bg-strong": "linear-gradient(rgba(255,255,255,0.74), rgba(255,255,255,0.60))",
"--os-glass-inner": "rgba(0,0,0,0.035)",
"--os-glass-filter": "blur(30px) saturate(180%)",
"--os-glass-filter-strong": "blur(36px) saturate(190%)",
"--os-glass-shadow": "inset 0 0 0 1px rgba(255,255,255,0.65), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(0,0,0,0.04), 0 12px 32px -10px rgba(40,50,80,0.22)",
"--ha-card-background": "linear-gradient(rgba(255,255,255,0.64), rgba(255,255,255,0.50))",
"--ha-card-box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.65), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(0,0,0,0.04), 0 12px 32px -10px rgba(40,50,80,0.22)",
"--os-text": "#1d1d1f", "--os-text-2": "#6e6e73", "--os-text-3": "#8e8e93", "--os-accent": "#007aff", "--os-hairline": "rgba(0,0,0,0.08)",
"--os-surface": "rgba(255,255,255,0.62)", "--os-surface-2": "rgba(0,0,0,0.045)", "--os-surface-3": "rgba(0,0,0,0.06)", "--os-on": "#1d1d1f", "--os-on-text": "#ffffff", "--os-on-text-2": "rgba(255,255,255,0.7)",
"--primary-text-color": "#1d1d1f", "--secondary-text-color": "#6e6e73", "--disabled-text-color": "#aeaeb2", "--state-icon-color": "#3a3a3c", "--paper-item-icon-color": "#3a3a3c", "--state-inactive-color": "#8e8e93",
"--primary-background-color": "#eceef4", "--card-background-color": "#ffffff", "--divider-color": "rgba(0,0,0,0.08)", "--outline-color": "rgba(0,0,0,0.12)", "--primary-color": "#007aff", "--accent-color": "#007aff", "--rgb-primary-color": "0, 122, 255", "--rgb-accent-color": "0, 122, 255", "--rgb-primary-text-color": "29, 29, 31",
"color-scheme": "light",
}),
};
const paletteLight = () => {
const t = {};
HEX.forEach((h) => { t["--os-c-" + h] = HEX_LIGHT[h]; });
W_KEYS.forEach((k) => { t["--os-w-" + k] = wLight(k); });
G_KEYS.forEach((k) => { t["--os-g-" + k] = `rgba(255,255,255,${parseFloat("0." + k)})`; });
D_KEYS.forEach((k) => { t["--os-d-" + k] = `rgba(255,255,255,${parseFloat("0." + k)})`; });
return t;
};
const inScope = () => SCOPES.some((s) => location.pathname.startsWith(s));
const modeNow = (ha) => {
if (window.__osModeOverride) return window.__osModeOverride;
const st = ha && ha.hass && ha.hass.states;
const pick = st && st[MODE_ENTITY] && st[MODE_ENTITY].state;
if (pick === "Light") return "light";
if (pick === "Dark") return "dark";
const sun = st && st["sun.sun"];
return sun && sun.state === "above_horizon" ? "light" : "dark";
};
let on = false, mode = null, pal = null; const seen = {}, wanted = {}, orig = {}, themeSet = {};
const setVar = (ha, k, v) => { if (wanted[k] !== v || ha.style.getPropertyValue(k) !== seen[k]) { if (!(k in orig)) orig[k] = ha.style.getPropertyValue(k); ha.style.setProperty(k, v); seen[k] = ha.style.getPropertyValue(k); wanted[k] = v; } };
const unset = (ha, k) => { if (orig[k]) ha.style.setProperty(k, orig[k]); else ha.style.removeProperty(k); delete seen[k]; delete wanted[k]; delete orig[k]; };
/* flip the dark theme's own fixed neutrals (tile colors, headings, markers...) while in light mode */
const swapVal = (v) => {
const t = v.trim().toLowerCase();
let h = /^#([0-9a-f]{6}|[0-9a-f]{3})$/.exec(t);
if (h) { h = h[1].length === 3 ? h[1].replace(/./g, "$&$&") : h[1]; if (HEX_LIGHT[h]) return HEX_LIGHT[h]; if (h === "000000") return "#eceef4"; return null; }
if (/^245,\s*245,\s*247$/.test(t)) return "29, 29, 31";
const w = /^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.(\d+)\s*\)$/.exec(t);
if (w) return wLight(w[1]);
return null;
};
const themeFlip = (ha, light) => {
if (light) {
for (let i = 0; i < ha.style.length; i++) {
const k = ha.style[i]; if (!k.startsWith("--") || k.startsWith("--os-") || k in wanted) continue;
const cur = ha.style.getPropertyValue(k).trim(); if (themeSet[k] && cur === themeSet[k].to) continue;
const nv = swapVal(cur); if (nv) { themeSet[k] = { from: cur, to: nv }; ha.style.setProperty(k, nv); }
}
} else Object.keys(themeSet).forEach((k) => { if (ha.style.getPropertyValue(k).trim() === themeSet[k].to) ha.style.setProperty(k, themeSet[k].from); delete themeSet[k]; });
};
const apply = () => {
const ha = document.querySelector("home-assistant"); if (!ha) return;
const want = inScope();
if (!want) {
if (on) { themeFlip(ha, false); Object.keys(seen).forEach((k) => unset(ha, k)); document.body.style.backgroundImage = ""; document.body.style.backgroundAttachment = ""; document.documentElement.style.backgroundColor = ""; document.body.style.backgroundColor = ""; document.documentElement.removeAttribute("data-os-mode"); }
on = false; mode = null; pal = null; return;
}
on = true;
const m = modeNow(ha);
const toks = MODES[m];
Object.entries(toks).forEach(([k, v]) => setVar(ha, k, v));
const p = m === "light" ? paletteLight() : null;
if (p) Object.entries(p).forEach(([k, v]) => setVar(ha, k, v));
Object.keys(wanted).forEach((k) => { if (!(k in toks) && !(p && k in p)) unset(ha, k); });
pal = p;
themeFlip(ha, m === "light");
const base = m === "light" ? "#eceef4" : "#000000";
if (document.body.style.backgroundImage !== toks["--os-bg"]) { document.body.style.backgroundImage = toks["--os-bg"]; document.body.style.backgroundAttachment = "fixed"; document.body.style.backgroundSize = "cover"; }
if (document.body.style.backgroundColor !== base) document.body.style.backgroundColor = base;
if (document.documentElement.style.backgroundColor !== base) document.documentElement.style.backgroundColor = base;
if (mode !== m) { document.documentElement.setAttribute("data-os-mode", m); mode = m; }
syncMaps(m);
};
const tracked = new Set();
const syncMaps = (m) => {
tracked.forEach((el) => {
if (!el.isConnected) { tracked.delete(el); return; }
const mp = el._map; if (!mp) return;
if (el.tagName === "OS-RADAR" && mp.eachLayer) {
const from = m === "light" ? "World_Dark_Gray" : "World_Light_Gray", to = m === "light" ? "World_Light_Gray" : "World_Dark_Gray";
mp.eachLayer((l) => { if (l._url && l._url.includes(from) && l.setUrl) l.setUrl(l._url.replace(from, to)); });
} else if (mp._config && mp._config.theme_mode !== m && mp.requestUpdate) {
mp._config = Object.assign({}, mp._config, { theme_mode: m, dark_mode: m === "dark" }); mp.requestUpdate();
}
});
};
const later = () => [0, 60, 400].forEach((t) => setTimeout(apply, t));
window.addEventListener("location-changed", later);
window.addEventListener("popstate", later);
const boot = setInterval(() => { if (document.querySelector("home-assistant")) { clearInterval(boot); later(); } }, 150);
setInterval(apply, 3000);
window.osGlassApply = apply;
/* rewrite fixed neutral colors inside component styles into mode-aware variables */
const HEX_RE = new RegExp("#(" + HEX.join("|") + ")(?![0-9a-fA-F])", "gi");
const W_RE = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.(\d+)\s*\)/g;
const G_RE = /rgba\(\s*28\s*,\s*28\s*,\s*30\s*,\s*0?\.(\d+)\s*\)/g;
const D_RE = /rgba\(\s*29\s*,\s*29\s*,\s*31\s*,\s*0?\.(\d+)\s*\)/g;
const tokenize = (css) => css
.replace(HEX_RE, (m0, h) => `var(--os-c-${h.toLowerCase()},#${h})`)
.replace(W_RE, (m0, k) => { W_KEYS.add(k); return `var(--os-w-${k},${m0})`; })
.replace(G_RE, (m0, k) => { G_KEYS.add(k); return `var(--os-g-${k},${m0})`; })
.replace(D_RE, (m0, k) => { D_KEYS.add(k); return `var(--os-d-${k},${m0})`; });
const PILL = "background:var(--os-mappill-bg)!important;box-shadow:var(--os-mappill-shadow)!important;-webkit-backdrop-filter:var(--os-pill-filter)!important;backdrop-filter:var(--os-pill-filter)!important;";
const CSS = `.card{background:var(--os-glass-bg)!important;border:1px solid transparent!important;box-shadow:var(--os-glass-shadow)!important;-webkit-backdrop-filter:var(--os-glass-filter);backdrop-filter:var(--os-glass-filter);}
.st:not(.on),.stop,.search{background:var(--os-glass-inner)!important;box-shadow:inset 0 0 0 1px var(--os-w-06,rgba(255,255,255,0.06))!important;}
.mapw{border-color:var(--os-w-12,rgba(255,255,255,0.12))!important;background:transparent!important;}
.seg,.mapw .lbl{${PILL}}
[style*="background:#f5f5f7"],[style*="background: #f5f5f7"]{background:var(--os-c-f5f5f7,#f5f5f7)!important;}[style*="color:#f5f5f7"],[style*="color: #f5f5f7"]{color:var(--os-c-f5f5f7,#f5f5f7)!important;}[style*="background:#1d1d1f"],[style*="background: #1d1d1f"]{background:var(--os-c-1d1d1f,#1d1d1f)!important;}[style*="color:#1d1d1f"],[style*="color: #1d1d1f"]{color:var(--os-c-1d1d1f,#1d1d1f)!important;}[style*="background:#a1a1a6"],[style*="background: #a1a1a6"]{background:var(--os-c-a1a1a6,#a1a1a6)!important;}[style*="color:#a1a1a6"],[style*="color: #a1a1a6"]{color:var(--os-c-a1a1a6,#a1a1a6)!important;}[style*="background:#2c2c2e"],[style*="background: #2c2c2e"]{background:var(--os-c-2c2c2e,#2c2c2e)!important;}[style*="color:#2c2c2e"],[style*="color: #2c2c2e"]{color:var(--os-c-2c2c2e,#2c2c2e)!important;}`;
const dress = (el) => {
if (/^OS-(RADAR|PERSON-PAGE|FAMILY-MAP)$/.test(el.tagName)) tracked.add(el);
const sr = el.shadowRoot; if (!sr) return;
sr.querySelectorAll("style:not([data-osr])").forEach((s) => { if (s.id !== "osg") s.textContent = tokenize(s.textContent); s.setAttribute("data-osr", ""); });
if (!sr.getElementById("osg")) { const st = document.createElement("style"); st.id = "osg"; st.setAttribute("data-osr", ""); st.textContent = CSS; sr.appendChild(st); }
};
["os-glance", "os-lights", "os-cam-panel", "os-routines", "os-media-app", "os-weather-page", "os-radar", "os-person-page", "os-family-map", "os-ma-browser", "os-clock", "os-forecast"].forEach((tag) => {
customElements.whenDefined(tag).then(() => {
const P = customElements.get(tag).prototype; if (P.__osGlass) return; P.__osGlass = true;
["_build", "setConfig", "_render"].forEach((m) => { const f = P[m]; if (typeof f !== "function") return; P[m] = function () { const r = f.apply(this, arguments); if (r && typeof r.then === "function") { r.then(() => dress(this)); } else dress(this); return r; }; });
const cc = P.connectedCallback; P.connectedCallback = function () { if (cc) cc.apply(this, arguments); dress(this); };
});
});
})();
