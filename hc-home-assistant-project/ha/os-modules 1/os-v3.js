/* Clark Home OS - v3: fast thermostat, camera recordings timeline, persistent phone tab bar, light map trails */
(() => {
window.__osV3 = true;
const FONT = 'var(--os-font, -apple-system, "SF Pro Text", Inter, system-ui, Roboto, sans-serif)';
const FONT_D = 'var(--os-font-display, -apple-system, "SF Pro Display", Inter, system-ui, Roboto, sans-serif)';
const T1 = "var(--os-text, #f5f5f7)", T2 = "var(--os-text-2, #a1a1a6)", T3 = "var(--os-text-3, #6e6e73)";
const EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const haptic = (el, t) => el.dispatchEvent(new CustomEvent("haptic", { detail: t || "light", bubbles: true, composed: true }));
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const nav = (path) => { history.pushState(null, "", path); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); };
const createCard = async (conf) => {
const helpers = await window.loadCardHelpers();
const tag = conf.type.startsWith("custom:") ? conf.type.slice(7) : `hui-${conf.type}-card`;
if (!customElements.get(tag)) { helpers.createCardElement(conf); await Promise.race([customElements.whenDefined(tag), new Promise((r) => setTimeout(r, 5000))]); }
return helpers.createCardElement(conf);
};
const deepFind = (root, sel, depth) => {
if (!root || depth > 12) return null;
const hit = root.querySelector && root.querySelector(sel); if (hit) return hit;
const all = root.querySelectorAll ? root.querySelectorAll("*") : [];
for (const n of all) { if (n.shadowRoot) { const r = deepFind(n.shadowRoot, sel, (depth || 0) + 1); if (r) return r; } }
return null;
};

/* ------------------------------------------------------------------ thermostat */
const SEND_TEMP_MS = 2000, SEND_MODE_MS = 700, HOLD_MS = 25000;
class OsThermo extends HTMLElement {
setConfig(c) { if (!c || !c.entity) throw new Error("entity required"); this._c = c; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 2; }
set hass(h) { this._hass = h; this._settle(); this._render(); }
disconnectedCallback() { if (this._timer && this._p) { clearTimeout(this._timer); this._send(); } }
_build() {
const k = this._c.compact;
const B = k ? 34 : 40, TW = k ? 44 : 50, FS = k ? 26 : 28;
this.shadowRoot.innerHTML = `<style>
:host{display:block !important;width:100% !important;max-width:none !important;height:${this._c.height || "100%"};box-sizing:border-box;font-family:${FONT};color:${T1};-webkit-font-smoothing:antialiased;text-align:left;}
.card{height:100%;box-sizing:border-box;border-radius:18px;padding:${k ? "12px 14px" : "10px 14px 10px 16px"};display:grid;grid-template-rows:auto 1fr;row-gap:${k ? 8 : 6}px;
background:var(--os-glass-bg, #121214);-webkit-backdrop-filter:var(--os-glass-filter, none);backdrop-filter:var(--os-glass-filter, none);
box-shadow:var(--os-glass-shadow, none);border:1px solid var(--os-hairline, rgba(255,255,255,0.07));transition:border-color 400ms ease;position:relative;overflow:hidden;}
.tint{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 400ms ease;}
.tint.h{background:radial-gradient(130% 170% at 0% 0%, rgba(255,159,10,var(--a)) 0%, rgba(255,159,10,0.05) 50%, transparent 75%);}
.tint.c{background:radial-gradient(130% 170% at 0% 0%, rgba(41,151,255,var(--a)) 0%, rgba(41,151,255,0.05) 50%, transparent 75%);}
.tint.c2{background:radial-gradient(110% 160% at 100% 100%, rgba(41,151,255,var(--a)) 0%, transparent 60%);}
.card[data-m="heat"]{border-color:rgba(255,159,10,0.35);} .card[data-m="heat"] .tint.h{opacity:1;}
.card[data-m="cool"]{border-color:rgba(41,151,255,0.35);} .card[data-m="cool"] .tint.c{opacity:1;}
.card[data-m="heat_cool"] .tint.h,.card[data-m="heat_cool"] .tint.c2{opacity:1;}
.top,.row{display:flex;align-items:center;position:relative;z-index:1;min-width:0;}
.info{flex:1;min-width:0;}
.n{font-size:17px;font-weight:600;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s{font-size:13px;color:${T2};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.modes{display:flex;gap:${k ? 3 : 4}px;flex:none;}
button{font:inherit;color:inherit;border:none;margin:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;display:flex;align-items:center;justify-content:center;
transition:transform 120ms ${EASE},background-color 180ms ${EASE},color 180ms ${EASE};}
button:active{transform:scale(0.9);}
.m{width:${B}px;height:${k ? 32 : 36}px;border-radius:999px;background:var(--os-glass-inner, rgba(255,255,255,0.06));color:${T2};}
.m ha-icon{--mdc-icon-size:${k ? 18 : 20}px;width:${k ? 18 : 20}px;height:${k ? 18 : 20}px;display:flex;}
.m.on[data-m="off"]{background:var(--os-on, #f5f5f7);color:var(--os-on-text, #1d1d1f);}
.m.on[data-m="heat"]{background:#ff9f0a;color:#fff;}
.m.on[data-m="cool"]{background:var(--os-accent, #2997ff);color:#fff;}
.m.on[data-m="heat_cool"]{background:var(--os-on, #f5f5f7);color:var(--os-on-text, #1d1d1f);}
.row{gap:${k ? 3 : 4}px;}
.set{display:flex;align-items:center;gap:${k ? 3 : 4}px;}
.b{width:${B}px;height:${B}px;border-radius:50%;background:var(--os-w-08, rgba(255,255,255,0.08));color:${T1};}
.b ha-icon{--mdc-icon-size:20px;width:20px;height:20px;display:flex;}
.t{width:${TW}px;text-align:center;font-family:${FONT_D};font-size:${FS}px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;line-height:${B}px;}
.t span{color:${T2};font-weight:200;}
.t.h b{color:#ff9f0a;font-weight:300;} .t.c b{color:var(--os-accent, #2997ff);font-weight:300;}
.t.bump b{display:inline-block;animation:bump 160ms ${EASE};}
@keyframes bump{50%{transform:scale(1.14);}}
.hint{flex:1;text-align:right;font-size:13px;font-weight:600;color:${T2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 6px;}
.off{font-size:15px;font-weight:600;color:${T2};}
[hidden]{display:none !important;}
</style>
<div class="card" id="card"><div class="tint h"></div><div class="tint c"></div><div class="tint c2"></div>
<div class="top"><div class="info"><div class="n" id="n"></div><div class="s" id="s"></div></div>
<div class="modes" id="modes">
<button class="m" data-m="off"><ha-icon icon="mdi:power"></ha-icon></button>
<button class="m" data-m="heat"><ha-icon icon="mdi:fire"></ha-icon></button>
<button class="m" data-m="cool"><ha-icon icon="mdi:snowflake"></ha-icon></button>
<button class="m" data-m="heat_cool"><ha-icon icon="mdi:sun-snowflake-variant"></ha-icon></button></div></div>
<div class="row">
<div class="set" id="s1"><button class="b" data-w="a" data-d="-1"><ha-icon icon="mdi:minus"></ha-icon></button><div class="t" id="t1"></div><button class="b" data-w="a" data-d="1"><ha-icon icon="mdi:plus"></ha-icon></button></div>
<div class="off" id="off" hidden></div>
<div class="hint" id="hint"></div>
<div class="set" id="s2"><button class="b" data-w="b" data-d="-1"><ha-icon icon="mdi:minus"></ha-icon></button><div class="t c" id="t2"></div><button class="b" data-w="b" data-d="1"><ha-icon icon="mdi:plus"></ha-icon></button></div>
</div></div>`;
const sr = this.shadowRoot;
sr.getElementById("modes").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) this._mode(b.dataset.m); });
sr.querySelector(".row").addEventListener("click", (e) => { const b = e.target.closest("button.b"); if (b) this._bump(b.dataset.w, parseInt(b.dataset.d, 10)); });
}
_ent() { return this._hass && this._hass.states[this._c.entity]; }
_eff() {
const e = this._ent(); if (!e) return null;
const a = e.attributes, p = this._p || {};
const mode = p.mode != null ? p.mode : e.state;
const stale = p.mode != null && p.mode !== e.state;
return { mode, stale, t: p.t != null ? p.t : a.temperature, lo: p.lo != null ? p.lo : a.target_temp_low, hi: p.hi != null ? p.hi : a.target_temp_high,
cur: a.current_temperature, act: a.hvac_action, min: a.min_temp != null ? a.min_temp : 50, max: a.max_temp != null ? a.max_temp : 95 };
}
_arm() {
const p = this._p; clearTimeout(this._timer); clearTimeout(this._hold);
this._timer = setTimeout(() => this._send(), p.dT ? SEND_TEMP_MS : SEND_MODE_MS);
}
_mode(m) {
const e = this._ent(); if (!e) return;
const p = this._p = this._p || {};
if ((p.mode != null ? p.mode : e.state) === m) return;
p.mode = m; p.dM = true; delete p.t; delete p.lo; delete p.hi; p.dT = false;
haptic(this, "selection"); this._arm(); this._render();
}
_bump(w, d) {
const v = this._eff(); if (!v) return;
const p = this._p = this._p || {};
const cl = (x) => Math.max(v.min, Math.min(v.max, x));
if (v.mode === "heat_cool") {
let lo = v.lo != null ? v.lo : 68, hi = v.hi != null ? v.hi : 76;
if (w === "a") lo = Math.min(cl(lo + d), hi - 2); else hi = Math.max(cl(hi + d), lo + 2);
p.lo = lo; p.hi = hi;
} else if (v.mode === "heat" || v.mode === "cool") p.t = cl((v.t != null ? v.t : 72) + d);
else return;
p.dT = true; haptic(this, "light"); this._arm(); this._render(w);
}
async _send() {
const p = this._p, h = this._hass; this._timer = null; if (!p || !h) return;
const id = this._c.entity, dM = p.dM, dT = p.dT; p.dM = p.dT = false; p.sent = Date.now();
clearTimeout(this._hold); this._hold = setTimeout(() => { if (this._p && !this._timer) { this._p = null; this._render(); } }, HOLD_MS);
this._render();
try {
if (dM) await h.callService("climate", "set_hvac_mode", { entity_id: id, hvac_mode: p.mode });
if (dT) await h.callService("climate", "set_temperature", p.lo != null ? { entity_id: id, target_temp_low: p.lo, target_temp_high: p.hi } : { entity_id: id, temperature: p.t });
} catch (err) { this._p = null; this._render(); }
}
_settle() {
const p = this._p, e = this._ent(); if (!p || !e || this._timer || !p.sent) return;
const a = e.attributes;
const ok = (p.mode == null || p.mode === e.state) && (p.t == null || a.temperature === p.t) && (p.lo == null || (a.target_temp_low === p.lo && a.target_temp_high === p.hi));
if (ok) { this._p = null; clearTimeout(this._hold); }
}
_render(bumped) {
const v = this._eff(), sr = this.shadowRoot; if (!sr) return;
const $ = (id) => sr.getElementById(id);
if (!v) { $("n").textContent = this._c.label || ""; $("s").textContent = "Unavailable"; return; }
const heating = v.act === "heating", cooling = v.act === "cooling";
const card = $("card"); card.dataset.m = v.mode; card.style.setProperty("--a", heating || cooling ? "0.34" : "0.2");
const waiting = this._p && (this._timer || this._p.sent);
const st = v.mode === "off" ? "Off" : heating ? "Heating" : cooling ? "Cooling" : "Idle";
const sig = [v.mode, v.t, v.lo, v.hi, v.cur, st, !!waiting, !!this._timer, v.stale].join("|");
if (sig === this._sig) return; this._sig = sig;
$("n").textContent = this._c.label || "";
$("s").textContent = (v.cur != null ? `${Math.round(v.cur)}° now · ` : "") + (waiting && this._p.sent && !this._timer ? "Updating…" : st);
sr.querySelectorAll(".m").forEach((b) => b.classList.toggle("on", b.dataset.m === v.mode));
const dual = v.mode === "heat_cool", single = v.mode === "heat" || v.mode === "cool";
const have = dual ? v.lo != null && v.hi != null : v.t != null;
const show1 = (dual || single) && have, show2 = dual && have;
$("s1").hidden = !show1; $("s2").hidden = !show2;
const off = $("off"); off.hidden = show1; off.textContent = v.mode === "off" ? "System is off" : v.stale ? "Switching…" : "";
const t1 = $("t1"), t2 = $("t2");
if (show1) { t1.className = "t " + (dual || v.mode === "heat" ? "h" : "c") + (bumped === "a" ? " bump" : ""); t1.innerHTML = `<b>${Math.round(dual ? v.lo : v.t)}</b><span>°</span>`; }
if (show2) { t2.className = "t c" + (bumped === "b" ? " bump" : ""); t2.innerHTML = `<b>${Math.round(v.hi)}</b><span>°</span>`; }
$("hint").textContent = dual ? "" : v.mode === "heat" ? "Heat to" : v.mode === "cool" ? "Cool to" : "";
}
}

/* ------------------------------------------------------------------ camera with recordings timeline */
const KEEP_DAYS = 7, MAX_CLIPS = 240;
const urlCache = new Map();
const resolveUrl = async (hass, id) => {
const c = urlCache.get(id); if (c && Date.now() - c.at < 6 * 3600e3) return c.url;
const r = await hass.callWS({ type: "media_source/resolve_media", media_content_id: id });
const url = hass.hassUrl ? hass.hassUrl(r.url) : r.url; urlCache.set(id, { url, at: Date.now() }); return url;
};
const parseTs = (name) => { const m = /^(\d{4})(\d\d)(\d\d)_(\d\d)(\d\d)(\d\d)\.(mp4|jpg)$/.exec(name || ""); return m ? { t: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime(), ext: m[7] } : null; };
const dayKey = (t) => { const d = new Date(t); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); };
const dayName = (t) => { const k = dayKey(t), n = Date.now(); return k === dayKey(n) ? "Today" : k === dayKey(n - 86400e3) ? "Yesterday" : new Date(t).toLocaleDateString("en-US", { weekday: "long" }); };
const clock = (t) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const ago = (t) => { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return "just now"; if (s < 3600) return Math.round(s / 60) + " min ago"; if (s < 86400) { const h = Math.floor(s / 3600); return h + (h === 1 ? " hour ago" : " hours ago"); } const d = Math.floor(s / 86400); return d + (d === 1 ? " day ago" : " days ago"); };
const mmss = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
class OsCam extends HTMLElement {
setConfig(c) { if (!c || !c.entity) throw new Error("entity required"); this._c = c; this._clips = []; this._idx = -1; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 6; }
set hass(h) {
const first = !this._hass; this._hass = h;
if (this._live) this._live.hass = h;
if (first) { this._mountLive(); this._load(); }
const m = this._c.motion && h.states[this._c.motion];
if (m && m.state !== this._ms) { const was = this._ms; this._ms = m.state; if (was && m.state === "on") { clearTimeout(this._mt); this._mt = setTimeout(() => this._load(), 42000); } }
}
connectedCallback() { this._iv = setInterval(() => { this._load(); this._label(); }, 30000); if (this._hass) this._load(); this._gest = () => this._wantSound(); window.addEventListener("pointerdown", this._gest, { passive: true }); this._mv = setInterval(() => this._muteUi(), 1500); }
disconnectedCallback() { clearInterval(this._iv); clearInterval(this._mv); clearTimeout(this._mt); window.removeEventListener("pointerdown", this._gest); const v = this.shadowRoot.getElementById("vid"); if (v) v.pause(); }
_build() {
const c = this._c;
this.shadowRoot.innerHTML = `<style>
:host{display:block !important;width:100% !important;max-width:none !important;height:100%;font-family:${FONT};color:#fff;-webkit-font-smoothing:antialiased;text-align:left;}
.wrap{height:100%;display:flex;flex-direction:column;border-radius:var(--os-cam-radius, 18px);overflow:hidden;background:#000;}
.stage{position:relative;background:#000;overflow:hidden;${c.ratio ? `aspect-ratio:${c.ratio};` : "flex:1;min-height:0;"}}
#live,#poster,#vid{position:absolute;inset:0;width:100%;height:100%;}
#live > *{display:block;height:100%;}
#poster,#vid{object-fit:cover;background:#000;}
#poster{transition:opacity 160ms ease;}
.hide{opacity:0;pointer-events:none;}
.gone{display:none !important;}
.pill{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:-0.01em;color:#fff;white-space:nowrap;
background:var(--os-lens-bg, rgba(0,0,0,0.42));box-shadow:var(--os-lens-shadow, inset 0 0 0 1px rgba(255,255,255,0.14));-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);}
.top{position:absolute;left:10px;right:10px;top:10px;display:flex;align-items:center;gap:6px;z-index:3;pointer-events:none;}
.top .sp{flex:1;}
.top button{pointer-events:auto;}
button{font:inherit;border:none;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform 120ms ${EASE},opacity 160ms ease;}
button:active{transform:scale(0.92);}
.dot{width:7px;height:7px;border-radius:50%;background:#ff453a;}
.rnd{width:30px;padding:0;justify-content:center;}
.rnd ha-icon{--mdc-icon-size:17px;width:17px;height:17px;display:flex;}
.ctl{position:absolute;left:10px;right:10px;bottom:10px;z-index:3;display:flex;align-items:center;gap:10px;height:40px;padding:0 14px 0 6px;border-radius:999px;
background:rgba(0,0,0,0.46);-webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12);}
.pp{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.16);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;flex:none;}
.pp ha-icon{--mdc-icon-size:20px;width:20px;height:20px;display:flex;}
.bar{flex:1;height:40px;display:flex;align-items:center;touch-action:none;cursor:pointer;}
.trk{position:relative;width:100%;height:5px;border-radius:999px;background:rgba(255,255,255,0.24);}
.fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:#fff;width:0;}
.knob{position:absolute;top:50%;width:15px;height:15px;margin:-7.5px 0 0 -7.5px;border-radius:50%;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,0.5);left:0;transition:transform 120ms ease;}
.bar.drag .knob{transform:scale(1.35);}
.tm{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(255,255,255,0.9);flex:none;min-width:66px;text-align:right;}
.tl{position:relative;flex:none;height:${c.compact ? 74 : 86}px;background:var(--os-cam-tl, rgba(18,18,20,0.96));}
.when{position:absolute;left:0;right:0;top:6px;text-align:center;font-size:12px;font-weight:600;color:rgba(255,255,255,0.92);letter-spacing:-0.01em;pointer-events:none;z-index:2;white-space:nowrap;}
.when span{color:rgba(255,255,255,0.55);font-weight:500;}
.strip{position:absolute;left:0;right:0;bottom:6px;height:${c.compact ? 44 : 54}px;display:flex;align-items:stretch;gap:3px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;
scroll-snap-type:x proximity;overscroll-behavior-x:contain;}
.pad{flex:none;width:50%;margin:0 -2px;}
.strip::-webkit-scrollbar{display:none;}
.c{flex:none;width:${c.compact ? 62 : 76}px;border-radius:7px;overflow:hidden;background:#1c1c1e;position:relative;scroll-snap-align:center;cursor:pointer;opacity:0.62;transition:opacity 160ms ease,transform 160ms ease;}
.c.on{opacity:1;box-shadow:0 0 0 2px #fff;}
.c img{width:100%;height:100%;object-fit:cover;display:block;}
.c .tt{position:absolute;left:0;right:0;bottom:0;padding:8px 4px 2px;font-size:9.5px;font-weight:700;text-align:center;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,0.75));font-variant-numeric:tabular-nums;}
.c.live{background:linear-gradient(160deg,#3a3a3c,#1c1c1e);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11px;font-weight:700;}
.c.live ha-icon{--mdc-icon-size:18px;width:18px;height:18px;display:flex;}
.day{flex:none;align-self:center;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:rgba(255,255,255,0.6);padding:0 8px;white-space:nowrap;}
.head{position:absolute;left:50%;bottom:2px;width:2px;margin-left:-1px;height:${c.compact ? 52 : 62}px;border-radius:2px;background:#ffd60a;z-index:2;pointer-events:none;box-shadow:0 0 6px rgba(0,0,0,0.6);}
.none{position:absolute;left:0;right:0;bottom:22px;text-align:center;font-size:12px;color:rgba(255,255,255,0.5);pointer-events:none;}
</style>
<div class="wrap"><div class="stage" id="stage">
<div id="live"></div><img id="poster" class="hide" alt=""><video id="vid" class="gone" playsinline webkit-playsinline preload="auto"></video>
<div class="top"><span class="pill" id="name"></span><span class="sp"></span>
<button class="pill rnd gone" id="mute"><ha-icon icon="mdi:volume-off"></ha-icon></button>
<button class="pill" id="golive"><i class="dot"></i>LIVE</button></div>
<div class="ctl gone" id="ctl"><button class="pp" id="pp"><ha-icon icon="mdi:pause"></ha-icon></button><div class="bar" id="bar"><div class="trk"><div class="fill" id="fill"></div><div class="knob" id="knob"></div></div></div><div class="tm" id="tm">0:00</div></div>
</div>
<div class="tl"><div class="when" id="when">Live</div><div class="head"></div><div class="strip" id="strip"></div><div class="none gone" id="none">Motion clips will appear here</div></div></div>`;
const sr = this.shadowRoot, $ = (id) => sr.getElementById(id);
$("name").textContent = c.name || "";
const strip = $("strip"), vid = $("vid");
strip.addEventListener("scroll", () => { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this._onScroll(); }); }, { passive: true });
strip.addEventListener("click", (e) => { const t = e.target.closest(".c"); if (t) this._center(t, true); });
$("golive").addEventListener("click", () => { const l = strip.querySelector(".c.live"); if (l) this._center(l, true); });
$("mute").addEventListener("click", () => { const v = this._liveVideo(); if (v) { v.muted = !v.muted; this._userMute = v.muted; if (!v.muted) v.play().catch(() => {}); this._muteUi(); } });
$("pp").addEventListener("click", () => { if (vid.paused) vid.play().catch(() => {}); else vid.pause(); });
vid.addEventListener("play", () => $("pp").firstElementChild.setAttribute("icon", "mdi:pause"));
vid.addEventListener("pause", () => $("pp").firstElementChild.setAttribute("icon", "mdi:play"));
vid.addEventListener("timeupdate", () => { if (!this._drag) this._prog(); });
vid.addEventListener("loadedmetadata", () => this._prog());
vid.addEventListener("playing", () => $("poster").classList.add("hide"));
vid.addEventListener("ended", () => this._next());
const bar = $("bar");
const seek = (e) => { const r = bar.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); const d = this._dur(); if (d) { vid.currentTime = f * d; this._prog(f * d); } };
bar.addEventListener("pointerdown", (e) => { this._drag = true; this._wasPlaying = !vid.paused; vid.pause(); bar.classList.add("drag"); bar.setPointerCapture(e.pointerId); seek(e); });
bar.addEventListener("pointermove", (e) => { if (this._drag) seek(e); });
const up = () => { if (!this._drag) return; this._drag = false; bar.classList.remove("drag"); if (this._wasPlaying) vid.play().catch(() => {}); };
bar.addEventListener("pointerup", up); bar.addEventListener("pointercancel", up);
this._io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { this._io.unobserve(en.target); this._thumb(en.target); } }), { root: strip, rootMargin: "0px 400px" });
}
_dur() { const v = this.shadowRoot.getElementById("vid"); return isFinite(v.duration) && v.duration > 0 ? v.duration : 0; }
_prog(at) {
const sr = this.shadowRoot, v = sr.getElementById("vid"), d = this._dur(), t = at != null ? at : v.currentTime, f = d ? Math.min(1, t / d) : 0;
sr.getElementById("fill").style.width = f * 100 + "%"; sr.getElementById("knob").style.left = f * 100 + "%";
sr.getElementById("tm").textContent = d ? `${mmss(t)} / ${mmss(d)}` : mmss(t);
}
async _mountLive() {
if (this._liveP) return; this._liveP = true;
const c = this._c;
const card = await createCard({ type: "custom:advanced-camera-card", cameras: [{ camera_entity: c.entity, dimensions: { layout: { fit: c.fit || "cover" } } }], view: { default: "live" },
live: { auto_play: ["selected", "visible"], auto_unmute: c.sound ? ["selected", "visible"] : [], auto_mute: ["unselected", "hidden"], lazy_unload: ["hidden"] },
menu: { style: "none" }, status_bar: { style: "none" }, dimensions: { aspect_ratio_mode: "unconstrained" } });
card.hass = this._hass;
card.style.setProperty("--advanced-camera-card-background", "#000"); card.style.setProperty("--advanced-camera-card-exterior", "#000");
card.style.setProperty("--ha-card-border-radius", "0"); card.style.setProperty("--ha-card-border-width", "0"); card.style.setProperty("--ha-card-box-shadow", "none"); card.style.setProperty("--ha-card-background", "#000");
this._live = card; this.shadowRoot.getElementById("live").appendChild(card);
let n = 0; const fix = () => { const sr = card.shadowRoot; if (sr && sr.querySelector("ha-card")) { if (!sr.querySelector("style[data-os]")) { const st = document.createElement("style"); st.dataset.os = "1"; st.textContent = "ha-card{height:100% !important;border:none !important;border-radius:0 !important;background:#000 !important;box-shadow:none !important;overflow:hidden !important;}"; sr.appendChild(st); } return; } if (n++ < 40) setTimeout(fix, 150); }; fix();
}
_liveVideo() { return this._live ? deepFind(this._live.shadowRoot, "video", 0) : null; }
_wantSound() { if (!this._c.sound || this._userMute || this._idx !== -1) return; const v = this._liveVideo(); if (v && v.muted) { v.muted = false; v.play().catch(() => { v.muted = true; }); setTimeout(() => this._muteUi(), 200); } }
_muteUi() {
const b = this.shadowRoot.getElementById("mute"); const isLive = this._idx === -1; const v = isLive ? this._liveVideo() : null;
b.classList.toggle("gone", !v);
if (v) { const ic = v.muted ? "mdi:volume-off" : "mdi:volume-high"; if (b.firstElementChild.getAttribute("icon") !== ic) b.firstElementChild.setAttribute("icon", ic); }
}
async _load() {
const h = this._hass, c = this._c; if (!h || !c.dir || this._busy || !this.isConnected) return; this._busy = true;
try {
const r = await h.callWS({ type: "media_source/browse_media", media_content_id: `media-source://media_source/local/${c.dir}` });
const by = new Map(); const now = Date.now();
(r.children || []).forEach((ch) => { const p = parseTs(ch.title); if (!p) return; const o = by.get(p.t) || { t: p.t }; o[p.ext] = ch.media_content_id; by.set(p.t, o); });
const all = [...by.values()].sort((a, b) => a.t - b.t);
this._prune(all);
const clips = all.filter((o) => o.mp4 && now - o.t > 40000 && now - o.t < KEEP_DAYS * 86400e3).slice(-MAX_CLIPS);
const sig = clips.map((o) => o.t + (o.jpg ? "j" : "")).join(",");
if (sig !== this._listSig) { this._listSig = sig; this._strip(clips); }
} catch (e) { if (this._listSig == null) { this._listSig = ""; this._strip([]); } }
this._busy = false;
}
async _prune(all) {
const h = this._hass; if (!h.user || !h.user.is_admin) return;
const key = "os-cam-prune-" + this._c.dir; if (Date.now() - parseInt(lsGet(key) || "0", 10) < 3 * 3600e3) return; lsSet(key, String(Date.now()));
const old = all.filter((o) => Date.now() - o.t > KEEP_DAYS * 86400e3);
for (const o of old) for (const id of [o.mp4, o.jpg]) { if (id) { try { await h.callWS({ type: "media_source/local_source/remove", media_content_id: id }); } catch (e) {} } }
}
_strip(clips) {
const sr = this.shadowRoot, strip = sr.getElementById("strip");
const curT = this._idx >= 0 && this._clips[this._idx] ? this._clips[this._idx].t : null;
this._clips = clips;
const frag = document.createDocumentFragment(); let lastDay = null;
const padA = document.createElement("div"); padA.className = "pad"; frag.appendChild(padA);
clips.forEach((o, i) => {
const dk = dayKey(o.t);
if (dk !== lastDay) { lastDay = dk; const d = document.createElement("div"); d.className = "day"; d.textContent = dayName(o.t); frag.appendChild(d); }
const el = document.createElement("div"); el.className = "c"; el.dataset.i = i;
el.innerHTML = `<div class="tt">${clock(o.t)}</div>`; frag.appendChild(el);
});
const live = document.createElement("div"); live.className = "c live"; live.dataset.i = -1; live.innerHTML = `<ha-icon icon="mdi:access-point"></ha-icon>Live`; frag.appendChild(live);
const padB = document.createElement("div"); padB.className = "pad"; frag.appendChild(padB);
strip.replaceChildren(frag);
strip.querySelectorAll(".c:not(.live)").forEach((el) => this._io.observe(el));
sr.getElementById("none").classList.toggle("gone", clips.length > 0);
const idx = curT != null ? clips.findIndex((o) => o.t === curT) : -1;
this._idx = idx; this._quiet = true;
requestAnimationFrame(() => { const t = strip.querySelector(`.c[data-i="${idx}"]`) || live; this._center(t, false); this._mark(); this._open(); setTimeout(() => { this._quiet = false; }, 120); });
}
async _thumb(el) {
const o = this._clips[+el.dataset.i]; if (!o || !o.jpg) return;
try { const url = await resolveUrl(this._hass, o.jpg); o.thumb = url; const img = new Image(); img.decoding = "async"; img.loading = "lazy"; img.src = url; img.onload = () => { if (el.isConnected) el.prepend(img); }; } catch (e) {}
}
_center(el, smooth) { const strip = this.shadowRoot.getElementById("strip"); const x = el.offsetLeft + el.offsetWidth / 2 - strip.clientWidth / 2; strip.scrollTo({ left: x, behavior: smooth ? "smooth" : "auto" }); }
_onScroll() {
if (this._quiet) return;
const strip = this.shadowRoot.getElementById("strip"); const mid = strip.scrollLeft + strip.clientWidth / 2;
let best = null, bd = 1e9;
strip.querySelectorAll(".c").forEach((el) => { const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = el; } });
if (!best) return; const i = +best.dataset.i;
if (i !== this._idx) { this._idx = i; this._mark(); this._peek(); haptic(this, "selection"); }
clearTimeout(this._openT); this._openT = setTimeout(() => this._open(), 260);
}
_mark() { const sr = this.shadowRoot; sr.querySelectorAll(".c").forEach((el) => el.classList.toggle("on", +el.dataset.i === this._idx)); this._label(); sr.getElementById("golive").classList.toggle("gone", this._idx === -1); }
_label() {
const w = this.shadowRoot.getElementById("when"); if (!w) return; const o = this._clips[this._idx];
if (!o) { w.innerHTML = `<i class="dot" style="display:inline-block;margin-right:6px;vertical-align:1px"></i>Live`; return; }
w.innerHTML = `${dayName(o.t)} ${clock(o.t)} <span>· ${ago(o.t)}</span>`;
}
_peek() {
const sr = this.shadowRoot, o = this._clips[this._idx], poster = sr.getElementById("poster"), vid = sr.getElementById("vid");
if (!o) return;
vid.pause(); sr.getElementById("live").classList.add("gone"); sr.getElementById("mute").classList.add("gone");
if (o.thumb) { poster.src = o.thumb; poster.classList.remove("hide"); }
else if (o.jpg) { resolveUrl(this._hass, o.jpg).then((u) => { o.thumb = u; if (this._clips[this._idx] === o) { poster.src = u; poster.classList.remove("hide"); } }).catch(() => {}); }
}
async _open() {
const sr = this.shadowRoot, vid = sr.getElementById("vid"), ctl = sr.getElementById("ctl"), live = sr.getElementById("live"), poster = sr.getElementById("poster");
const o = this._clips[this._idx];
if (!o) {
if (this._showing === -1) return; this._showing = -1;
vid.pause(); vid.removeAttribute("src"); vid.load(); vid.classList.add("gone"); ctl.classList.add("gone"); poster.classList.add("hide"); live.classList.remove("gone"); this._muteUi(); setTimeout(() => this._wantSound(), 600); return;
}
if (this._showing === o.t) { if (vid.paused && !vid.ended) vid.play().catch(() => {}); return; }
this._showing = o.t;
try {
const url = await resolveUrl(this._hass, o.mp4); if (this._clips[this._idx] !== o) return;
live.classList.add("gone"); vid.classList.remove("gone"); ctl.classList.remove("gone");
vid.src = url; this._prog(0); vid.muted = false;
vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
} catch (e) { this._showing = null; }
}
_next() { const strip = this.shadowRoot.getElementById("strip"); const n = strip.querySelector(`.c[data-i="${this._idx + 1 < this._clips.length ? this._idx + 1 : -1}"]`); if (n) this._center(n, true); }
}

/* ------------------------------------------------------------------ persistent phone tab bar */
const TABS = [["home", "Home", "mdi:home-outline"], ["rooms", "Rooms", "mdi:view-grid-outline"], ["cameras", "Cameras", "mdi:cctv"], ["media", "Media", "mdi:music-note-outline"], ["more", "More", "mdi:dots-horizontal-circle-outline"]];
const TAB_ROOT = "/mobile-dashboard";
const activeTab = () => { const seg = location.pathname.split("/").pop() || "home"; if (seg === "mobile-dashboard") return "home"; if (seg.startsWith("room-") || seg === "customize") return "rooms"; if (/^(weather|calendar|map|person-)/.test(seg)) return "more"; return seg; };
class OsTabbar extends HTMLElement {
connectedCallback() {
if (this.shadowRoot) return; this.attachShadow({ mode: "open" });
this.shadowRoot.innerHTML = `<style>
:host{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom, 0px) + 10px);z-index:6;display:none;pointer-events:none;font-family:${FONT};-webkit-font-smoothing:antialiased;}
:host([show]){display:block;}
.bar{pointer-events:auto;max-width:520px;margin:0 auto;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));column-gap:2px;padding:5px;border-radius:24px;
background:var(--os-glass-bg-strong, linear-gradient(rgba(255,255,255,0.11), rgba(255,255,255,0.08))), color-mix(in srgb, var(--primary-background-color, #000) 78%, transparent);
-webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%);box-shadow:var(--os-glass-shadow, inset 0 0 0 1px rgba(255,255,255,0.10)), 0 10px 30px rgba(0,0,0,0.28);}
button{font:inherit;border:none;margin:0;background:transparent;height:54px;border-radius:16px;padding:7px 0 6px;display:grid;grid-template-rows:1fr auto;justify-items:center;align-items:center;cursor:pointer;
color:${T2};-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform 140ms ${EASE},background-color 160ms ${EASE},color 160ms ${EASE};}
button:active{transform:scale(0.9);}
button.on{color:${T1};background:var(--os-w-14, rgba(255,255,255,0.14));box-shadow:inset 0 0 0 1px var(--os-w-10, rgba(255,255,255,0.10));}
ha-icon{--mdc-icon-size:24px;width:24px;height:24px;display:flex;}
span{font-size:11px;font-weight:600;letter-spacing:0.01em;}
</style><div class="bar">${TABS.map(([k, n, ic]) => `<button data-k="${k}"><ha-icon icon="${ic}"></ha-icon><span>${n}</span></button>`).join("")}</div>`;
this.shadowRoot.querySelector(".bar").addEventListener("click", (e) => {
const b = e.target.closest("button"); if (!b) return; const k = b.dataset.k;
this._paint(k); haptic(this, "selection");
if (location.pathname !== `${TAB_ROOT}/${k}`) requestAnimationFrame(() => nav(`${TAB_ROOT}/${k}`)); else window.scrollTo({ top: 0, behavior: "smooth" });
});
this.sync();
}
_paint(k) { this.shadowRoot.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.k === k)); }
sync() { const on = location.pathname.startsWith(TAB_ROOT) && !/[?&]edit=1/.test(location.search); this.toggleAttribute("show", on); if (on && this.shadowRoot) this._paint(activeTab()); }
}
const mountTabbar = () => {
const ha = document.querySelector("home-assistant"); if (!ha || !ha.shadowRoot) return setTimeout(mountTabbar, 300);
let bar = ha.shadowRoot.querySelector("os-tabbar");
if (!bar) { bar = document.createElement("os-tabbar"); ha.shadowRoot.appendChild(bar); }
const sync = () => bar.sync();
window.addEventListener("location-changed", () => setTimeout(sync, 0)); window.addEventListener("popstate", () => setTimeout(sync, 0));
setInterval(sync, 2000);
};

/* ------------------------------------------------------------------ map trails (one light line per person instead of a marker per point) */
const RANGES = [[1, "Now"], [24, "Today"], [72, "3 Days"], [168, "Week"]];
const trailCache = new Map();
const distM = (a, b) => { const r = Math.PI / 180, x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r), y = (b[0] - a[0]) * r; return Math.sqrt(x * x + y * y) * 6371000; };
const loadTrails = async (hass, ids, hours) => {
const key = ids.join(",") + "|" + hours; const c = trailCache.get(key); if (c && Date.now() - c.at < 120000) return c.data;
const r = await hass.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - hours * 3600e3).toISOString(), entity_ids: ids, minimal_response: false, no_attributes: false, significant_changes_only: false });
const minD = hours <= 24 ? 30 : hours <= 72 ? 70 : 140; const data = {};
ids.forEach((id) => {
let pts = [], last = null;
((r && r[id]) || []).forEach((x) => { const a = x.a || x.attributes || {}; const la = parseFloat(a.latitude), lo = parseFloat(a.longitude); if (isNaN(la) || isNaN(lo)) return; const p = [la, lo]; if (last && distM(last, p) < minD) return; pts.push(p); last = p; });
if (pts.length > 600) { const st = Math.ceil(pts.length / 600), endp = pts[pts.length - 1]; pts = pts.filter((_, i) => i % st === 0); pts.push(endp); }
data[id] = pts;
});
trailCache.set(key, { at: Date.now(), data }); return data;
};
const mapReady = async (card) => { for (let i = 0; i < 60; i++) { const hm = card.shadowRoot && card.shadowRoot.querySelector("ha-map"); if (hm && hm.leafletMap && hm.Leaflet) return hm; await new Promise((r) => setTimeout(r, 120)); } return null; };
const drawTrails = async (host, people, hours) => {
const card = host._map, hass = host._hass; if (!card || !hass) return;
const hm = await mapReady(card); if (!hm || host._map !== card) return;
const L = hm.Leaflet, map = hm.leafletMap;
if (card.__osTrail) { card.__osTrail.remove(); card.__osTrail = null; }
const now = () => { const b = []; people.forEach((p) => { const s = hass.states[p.id]; if (s && s.attributes.latitude != null) b.push([s.attributes.latitude, s.attributes.longitude]); }); return b; };
let all = now();
const fit = () => { if (!all.length) return; if (all.length === 1) map.setView(all[0], 15); else map.fitBounds(L.latLngBounds(all), { padding: [44, 44], maxZoom: 16 }); };
hm.fitMap = fit;
if (hours > 1) {
try {
const data = await loadTrails(hass, people.map((p) => p.id), hours); if (host._map !== card) return;
const grp = L.layerGroup(); const rend = L.canvas({ padding: 0.4 });
people.forEach((p) => { const pts = data[p.id] || []; if (pts.length < 2) return; all = all.concat(pts);
L.polyline(pts, { color: p.color || "#2997ff", weight: 3.5, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false, smoothFactor: 1.5, renderer: rend }).addTo(grp); });
grp.addTo(map); card.__osTrail = grp;
} catch (e) {}
}
map.invalidateSize(); fit();
};
const segHtml = (cur) => RANGES.map(([h, n]) => `<button data-h="${h}" class="${h === cur ? "on" : ""}">${n}</button>`).join("");
const fillMapV3 = (card) => {
card.style.display = "block"; card.style.height = "100%"; let n = 0;
const go = () => { const sr = card.shadowRoot; if (sr && sr.querySelector("ha-card")) { if (!sr.querySelector("style[data-os]")) { const st = document.createElement("style"); st.dataset.os = "1";
st.textContent = "ha-card{height:100% !important;border-radius:18px !important;overflow:hidden !important;border:none !important;background:var(--os-c-0b0b0c, #0b0b0c) !important;}#root{height:100% !important;padding-bottom:0 !important;}ha-map{height:100% !important;}ha-icon-button{display:none !important;}"; sr.appendChild(st); } return; } if (n++ < 40) setTimeout(go, 150); };
go();
};
const patchMaps = () => {
customElements.whenDefined("os-family-map").then(() => {
const P = customElements.get("os-family-map").prototype; if (P.__osV3) return; P.__osV3 = true;
P._mountMap = async function () {
const ppl = this._c.people.map((p) => ({ id: p.person, color: p.color }));
if (this._map) { drawTrails(this, ppl, this._hours); return; }
this._mapP = true;
const card = await createCard({ type: "map", entities: this._c.people.map((p) => ({ entity: p.person })), hours_to_show: 0, theme_mode: "dark", auto_fit: false, fit_zones: false, default_zoom: 14 });
card.hass = this._hass; this._map = card;
this.shadowRoot.getElementById("mapw").insertBefore(card, this.shadowRoot.getElementById("seg"));
fillMapV3(card); this._mapP = false;
drawTrails(this, ppl, this._hours);
};
});
customElements.whenDefined("os-person-page").then(() => {
const P = customElements.get("os-person-page").prototype; if (P.__osV3) return; P.__osV3 = true;
const b = P._build;
P._build = function () {
b.apply(this, arguments);
this._hours = parseInt(lsGet("os-person-hours") || "24", 10);
const sr = this.shadowRoot, lbl = sr.querySelector(".mapw .lbl"); if (lbl) lbl.remove();
const st = document.createElement("style");
st.textContent = `.seg{position:absolute;top:12px;right:12px;z-index:500;display:flex;padding:3px;border-radius:999px;background:var(--os-mappill-bg, rgba(28,28,30,0.78));box-shadow:var(--os-mappill-shadow, none);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
.seg button{height:32px;padding:0 13px;border-radius:999px;border:none;background:transparent;color:${T2};font-size:13px;font-weight:600;cursor:pointer;transition:background-color 200ms ease,color 200ms ease;touch-action:manipulation;}
.seg button.on{background:var(--os-on, #f5f5f7);color:var(--os-on-text, #1d1d1f);}
@media (max-width:700px){.seg button{height:30px;padding:0 11px;}}`;
sr.appendChild(st);
const seg = document.createElement("div"); seg.className = "seg"; seg.id = "seg"; seg.innerHTML = segHtml(this._hours); sr.getElementById("mapw").appendChild(seg);
seg.addEventListener("click", (e) => { const x = e.target.closest("button"); if (!x) return; this._hours = parseInt(x.dataset.h, 10); lsSet("os-person-hours", String(this._hours)); seg.innerHTML = segHtml(this._hours);
drawTrails(this, [{ id: this._c.person, color: this._c.color }], this._hours); });
};
P._mountMap = async function () {
this._mapP = true; const c = this._c;
const card = await createCard({ type: "map", entities: [{ entity: c.person }], hours_to_show: 0, theme_mode: "dark", default_zoom: 14, auto_fit: false, fit_zones: false });
card.hass = this._hass; this._map = card;
const mw = this.shadowRoot.getElementById("mapw"); mw.insertBefore(card, mw.firstChild);
fillMapV3(card);
drawTrails(this, [{ id: c.person, color: c.color }], this._hours || 24);
};
});
};
customElements.whenDefined("os-cam-panel").then(() => {
const P = customElements.get("os-cam-panel").prototype; if (P.__osV3) return; P.__osV3 = true; const b = P._build;
P._build = function () { b.apply(this, arguments); if (!this._c.dense) return; const st = document.createElement("style");
st.textContent = `.card{padding:14px 18px !important;gap:10px !important;}.big{font-size:22px !important;}.sub{margin-top:2px !important;}.grid{grid-template-columns:repeat(${this._c.cols || 4},minmax(0,1fr)) !important;gap:8px !important;}.st{padding:9px 12px !important;gap:3px !important;}.st .v{font-size:16px !important;}`; this.shadowRoot.appendChild(st); };
});
Object.entries({ "os-thermo": OsThermo, "os-cam": OsCam, "os-tabbar": OsTabbar }).forEach(([n, k]) => { if (!customElements.get(n)) customElements.define(n, k); });
patchMaps();
mountTabbar();
})();
