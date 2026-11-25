/* Clark Home OS - Apple Calendar style month view, day panel and New/Edit Event sheet (tablet Calendar tab) */
(() => {
const CALS = [
{ entity: "calendar.clarkcalendar1613_gmail_com", name: "Family", color: "var(--os-accent, #2997ff)" },
{ entity: "calendar.birthdays", name: "Birthdays", color: "var(--os-text, #f5f5f7)" },
{ entity: "calendar.holidays_in_united_states", name: "Holidays", color: "var(--os-text-3, #6e6e73)" },
];
const S = window.__osCalStore || (window.__osCalStore = { sel: null, ev: new Map(), loading: new Set(), subs: new Set(), cals: CALS, hass: null });
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const same = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const pD = (o) => { if (o.dateTime) return new Date(o.dateTime); const [y, m, d] = String(o.date).split("-").map(Number); return new Date(y, m - 1, d); };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tm = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const emit = () => S.subs.forEach((f) => { try { f(); } catch (e) {} });
const mk = (y, m) => y * 12 + m;
if (!S.sel) S.sel = day0(new Date());
const load = async (y, m, force) => {
const h = S.hass, k = mk(y, m); if (!h) return; if (!force && (S.ev.has(k) || S.loading.has(k))) return; S.loading.add(k);
const f = new Date(y, m, 1), a = addD(f, -f.getDay()), b = addD(a, 42), out = [];
await Promise.all(S.cals.filter((c) => h.states[c.entity]).map(async (c) => {
try {
const r = await h.callApi("GET", `calendars/${c.entity}?start=${encodeURIComponent(a.toISOString())}&end=${encodeURIComponent(b.toISOString())}`);
(r || []).forEach((e) => out.push({ cal: c, title: e.summary || "New Event", s: pD(e.start), e: pD(e.end), allDay: !e.start.dateTime, loc: e.location || "", desc: e.description || "", uid: e.uid, rid: e.recurrence_id, rrule: e.rrule }));
} catch (err) {}
}));
S.ev.set(k, out); S.loading.delete(k); emit();
};
const reloadAll = () => { const ks = [...S.ev.keys()]; S.ev.clear(); ks.forEach((k) => load(Math.floor(k / 12), k % 12, true)); };
const on = (d) => {
const a = day0(d), b = addD(a, 1), seen = new Set(), out = [];
S.ev.forEach((list) => list.forEach((e) => { if (e.s < b && e.e > a) { const id = e.cal.entity + "|" + (e.uid || e.title) + "|" + e.s.getTime(); if (!seen.has(id)) { seen.add(id); out.push(e); } } }));
const multi = (e) => (e.e - e.s > 86400000 + 3600000 ? 1 : 0);
return out.sort((x, y) => (multi(y) - multi(x)) || (multi(x) && (x.s - y.s)) || (y.allDay - x.allDay) || (x.s - y.s) || x.title.localeCompare(y.title));
};
/* Edit = update in place when the calendar supports it (feature 4); otherwise (Google) save a new copy, then remove the old one */
const feat = (ent) => (S.hass && S.hass.states[ent] && S.hass.states[ent].attributes.supported_features) || 0;
const canEdit = (e) => !!e.uid && ((feat(e.cal.entity) & 4) || ((feat(e.cal.entity) & 1) && (feat(e.cal.entity) & 2)));
const mode = () => (document.documentElement.getAttribute("data-os-mode") === "light" ? "light" : "dark");
const haptic = (el) => { try { el.dispatchEvent(new CustomEvent("haptic", { detail: "light", bubbles: true, composed: true })); } catch (e) {} };

/* ---------------------------------------------------------------- month grid */
class OsCalendar extends HTMLElement {
setConfig(c) { this._c = c || {}; if (c && c.calendars) S.cals = c.calendars; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 8; }
set hass(h) { const first = !S.hass; S.hass = h; if (first || !this._loaded) { this._loaded = true; this._show(S.sel.getFullYear(), S.sel.getMonth()); } }
connectedCallback() { this._sub = () => { if (S.jump) { S.jump = false; if (S.sel && (S.sel.getMonth() !== this._m || S.sel.getFullYear() !== this._y)) { this._show(S.sel.getFullYear(), S.sel.getMonth()); return; } } this._render(); }; S.subs.add(this._sub); this._iv = setInterval(() => { reloadAll(); }, 300000); if (S.hass) this._render(); }
disconnectedCallback() { S.subs.delete(this._sub); clearInterval(this._iv); }
_build() {
this.shadowRoot.innerHTML = `<style>
:host{display:block;height:100%;}
.card{height:100%;box-sizing:border-box;display:flex;flex-direction:column;border-radius:22px;background:var(--os-glass-bg,#1c1c1e);box-shadow:var(--os-glass-shadow,none);-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);color:var(--os-text,#f5f5f7);padding:18px 20px 14px;overflow:hidden;font-family:var(--os-font-text,-apple-system,"SF Pro Text",Inter,system-ui,sans-serif);user-select:none;-webkit-user-select:none;}
.hd{display:flex;align-items:center;gap:10px;flex:none;padding:0 4px 10px;}
.ttl{font-family:var(--os-font-display,-apple-system,"SF Pro Display",Inter,system-ui,sans-serif);font-size:32px;letter-spacing:-0.025em;line-height:1;white-space:nowrap;}
.ttl b{font-weight:700;} .ttl span{font-weight:400;color:var(--os-text-2,#a1a1a6);}
.sp{flex:1;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.pill{height:40px;padding:0 18px;border-radius:999px;background:var(--os-surface-3,rgba(255,255,255,0.1));font-size:16px;font-weight:600;transition:transform 140ms ease,background 160ms ease;}
.rnd{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--os-surface-3,rgba(255,255,255,0.1));transition:transform 140ms ease;}
.rnd ha-icon{--mdc-icon-size:24px;width:24px;height:24px;display:flex;}
.add{background:var(--os-on,#f5f5f7);color:var(--os-on-text,#1d1d1f);}
button:active{transform:scale(0.93);}
.wd{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));flex:none;padding:0 0 6px;border-bottom:1px solid var(--os-hairline,rgba(255,255,255,0.08));}
.wd div{font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--os-text-2,#a1a1a6);padding:0 10px;}
.wd div.we{color:var(--os-text-3,#6e6e73);}
.grid{flex:1;min-height:0;display:grid;touch-action:pan-y;transition:opacity 160ms ease,transform 220ms cubic-bezier(0.2,0.8,0.2,1);}
.wk{position:relative;min-height:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-bottom:1px solid var(--os-hairline,rgba(255,255,255,0.08));}
.d{position:relative;min-width:0;min-height:0;height:100%;text-align:left;display:flex;align-items:flex-start;padding:6px 6px 4px;border-radius:0;}
.d:not(:nth-child(7)){box-shadow:inset -1px 0 0 var(--os-hairline,rgba(255,255,255,0.08));}
.d:active{transform:none;background:var(--os-surface-2,rgba(255,255,255,0.05));border-radius:14px;}
.n{flex:none;width:34px;height:34px;padding:0;box-sizing:border-box;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:19px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-0.04em;margin:-1px 0 0 -3px;transition:background 160ms ease,color 160ms ease;}
.d.out .n{color:var(--os-text-3,#6e6e73);font-weight:500;}
.d.we:not(.out) .n{color:var(--os-text-2,#a1a1a6);}
.d.sel .n{background:var(--os-surface-3,rgba(255,255,255,0.16));color:var(--os-text,#f5f5f7) !important;}
.d.today .n{background:var(--os-on,#f5f5f7);color:var(--os-on-text,#1d1d1f) !important;}
.lay{position:absolute;left:0;right:0;top:40px;bottom:2px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:22px;row-gap:3px;pointer-events:none;overflow:hidden;}
.ev{min-width:0;margin:0 4px;padding:1px 6px;box-sizing:border-box;border-radius:8px;font-size:14px;font-weight:500;letter-spacing:-0.01em;line-height:20px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:var(--l,1);word-break:break-word;align-self:start;max-height:calc(var(--l,1) * 20px + 2px);}
.ev i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:6px;vertical-align:1px;}
.ev.ad{background:var(--os-surface-3,rgba(255,255,255,0.12));box-shadow:inset 3px 0 0 var(--c);font-weight:600;padding-left:9px;}
.ev.cl{margin-left:0;border-top-left-radius:0;border-bottom-left-radius:0;box-shadow:none;padding-left:8px;}
.ev.cr{margin-right:0;border-top-right-radius:0;border-bottom-right-radius:0;}
.ev.out{opacity:0.45;}
.more{align-self:center;padding:0 8px;font-size:13px;font-weight:600;color:var(--os-text-2,#a1a1a6);white-space:nowrap;overflow:hidden;}
</style>
<div class="card"><div class="hd"><div class="ttl" id="ttl"></div><div class="sp"></div>
<button class="pill" id="today">Today</button>
<button class="rnd" id="prev" aria-label="Previous month"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
<button class="rnd" id="next" aria-label="Next month"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
<button class="rnd add" id="add" aria-label="New event"><ha-icon icon="mdi:plus"></ha-icon></button></div>
<div class="wd">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => `<div class="${i === 0 || i === 6 ? "we" : ""}">${d}</div>`).join("")}</div>
<div class="grid" id="grid"></div></div>`;
const $ = (id) => this.shadowRoot.getElementById(id);
$("prev").addEventListener("click", () => this._step(-1));
$("next").addEventListener("click", () => this._step(1));
$("today").addEventListener("click", () => { S.sel = day0(new Date()); this._show(S.sel.getFullYear(), S.sel.getMonth()); emit(); });
$("add").addEventListener("click", () => openSheet(S.sel));
const g = $("grid");
g.addEventListener("click", (e) => { const b = e.target.closest(".d"); if (!b || this._swiped) return; const [y, m, d] = b.dataset.d.split("-").map(Number); S.sel = new Date(y, m - 1, d); haptic(this); if (m - 1 !== this._m || y !== this._y) this._show(y, m - 1); emit(); });
let x0 = null, y0 = null;
g.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; this._swiped = false; });
g.addEventListener("pointerup", (e) => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { this._swiped = true; this._step(dx < 0 ? 1 : -1); setTimeout(() => { this._swiped = false; }, 50); } });
if (window.ResizeObserver) { this._ro = new ResizeObserver(() => { const h = g.clientHeight; if (h && h !== this._gh) { this._gh = h; this._render(); } }); this._ro.observe(g); }
}
_step(n) { const d = new Date(this._y, this._m + n, 1); const g = this.shadowRoot.getElementById("grid"); g.style.opacity = "0"; g.style.transform = `translateX(${n * -24}px)`; setTimeout(() => { this._show(d.getFullYear(), d.getMonth()); g.style.transition = "none"; g.style.transform = `translateX(${n * 24}px)`; requestAnimationFrame(() => { g.style.transition = ""; g.style.opacity = "1"; g.style.transform = "none"; }); }, 140); }
_show(y, m) { this._y = y; this._m = m; load(y, m); load(new Date(y, m + 1, 1).getFullYear(), (m + 1) % 12); this._render(); }
_render() {
const sr = this.shadowRoot; if (!sr || this._y == null) return;
const y = this._y, m = this._m, today = day0(new Date());
sr.getElementById("ttl").innerHTML = `<b>${MONTHS[m]}</b> <span>${y}</span>`;
const f = new Date(y, m, 1), start = addD(f, -f.getDay()), dim = new Date(y, m + 1, 0).getDate();
const weeks = Math.ceil((f.getDay() + dim) / 7), g = sr.getElementById("grid");
g.style.gridTemplateRows = `repeat(${weeks}, minmax(0, 1fr))`;
const cellH = (g.clientHeight || 480) / weeks, colW = (g.clientWidth || 800) / 7;
const L = Math.max(1, Math.floor((cellH - 42 + 3) / 25));
const cv = this._cv || (this._cv = document.createElement("canvas").getContext("2d"));
const fam = getComputedStyle(sr.querySelector(".card")).fontFamily;
const textW = (t, bold) => { cv.font = `${bold ? 600 : 500} 14px ${fam}`; return cv.measureText(t).width; };
const span = (a, b) => Math.round((day0(b) - day0(a)) / 86400000);
let html = "";
for (let w = 0; w < weeks; w++) {
const ws = addD(start, w * 7), we = addD(ws, 7), seen = new Set(), list = [];
S.ev.forEach((arr) => arr.forEach((e) => { if (e.s < we && e.e > ws) { const id = e.cal.entity + "|" + (e.uid || e.title) + "|" + e.s.getTime(); if (!seen.has(id)) { seen.add(id); list.push(e); } } }));
const items = list.map((e) => {
const last = e.allDay ? addD(day0(e.e), -1) : day0(new Date(e.e.getTime() - 1));
const c1 = Math.max(0, span(ws, e.s)), c2 = Math.min(6, Math.max(c1, span(ws, last)));
return { e, c1, c2, n: c2 - c1 + 1, bar: e.allDay || c2 > c1, cl: day0(e.s) < ws, cr: last >= we };
}).sort((a, b) => (a.c1 - b.c1) || (b.n - a.n) || (b.bar - a.bar) || (a.e.s - b.e.s) || a.e.title.localeCompare(b.e.title));
items.forEach((it) => { const avail = it.n * colW - (it.cl ? 0 : 4) - (it.cr ? 0 : 4) - 15 - (it.bar ? 0 : 14); it.need = Math.min(3, Math.max(1, Math.ceil(textW(it.e.title, it.bar) / Math.max(20, avail * 0.88)))); });
let cap = [L, L, L, L, L, L, L], occ, hid;
const fits = (it, l) => { for (let c = it.c1; c <= it.c2; c++) if (l >= cap[c] || (occ[l] && occ[l][c])) return false; return true; };
const take = (it, l) => { occ[l] = occ[l] || []; for (let c = it.c1; c <= it.c2; c++) occ[l][c] = true; };
const alloc = (tall) => { occ = []; hid = [0, 0, 0, 0, 0, 0, 0]; items.forEach((it) => { it.lane = -1; it.h = 1; for (let h = tall ? it.need : 1; h >= 1 && it.lane < 0; h--) for (let l = 0; l + h <= L; l++) { let ok = true; for (let k = 0; k < h; k++) if (!fits(it, l + k)) { ok = false; break; } if (ok) { it.lane = l; it.h = h; for (let k = 0; k < h; k++) take(it, l + k); break; } } if (it.lane < 0) for (let c = it.c1; c <= it.c2; c++) hid[c]++; }); return hid.reduce((a, b) => a + b, 0); };
const run = (tall) => { cap = [L, L, L, L, L, L, L]; alloc(tall); for (let pass = 0; pass < 3; pass++) { let ch = false; for (let c = 0; c < 7; c++) if (hid[c] && cap[c] === L) { cap[c] = L - 1; ch = true; } if (!ch) break; alloc(tall); } return hid.reduce((a, b) => a + b, 0); };
const base = run(false);
if (run(true) > base) run(false);
items.forEach((it) => { if (it.lane < 0) return; for (let k = it.h; k < it.need; k++) { const l = it.lane + k; if (!fits(it, l)) break; take(it, l); it.h++; } });
let cells = "", lay = "";
for (let c = 0; c < 7; c++) {
const d = addD(ws, c), dow = d.getDay(), cnt = on(d).length;
const cls = ["d", d.getMonth() !== m ? "out" : "", dow === 0 || dow === 6 ? "we" : "", same(d, today) ? "today" : "", same(d, S.sel) ? "sel" : ""].join(" ");
cells += `<button class="${cls}" data-d="${ymd(d)}" aria-label="${WD[dow]} ${MONTHS[d.getMonth()]} ${d.getDate()}, ${cnt} events"><span class="n">${d.getDate()}</span></button>`;
if (hid[c]) lay += `<div class="more" style="grid-column:${c + 1};grid-row:${Math.max(1, cap[c] + 1)}">${hid[c]} more</div>`;
}
items.forEach((it) => {
if (it.lane < 0) return;
const out = addD(ws, it.c1).getMonth() !== m && addD(ws, it.c2).getMonth() !== m;
lay += `<div class="ev ${it.bar ? "ad" : ""} ${it.cl ? "cl" : ""} ${it.cr ? "cr" : ""} ${out ? "out" : ""}" style="--c:${it.e.cal.color};--l:${it.h};grid-column:${it.c1 + 1} / span ${it.n};grid-row:${it.lane + 1} / span ${it.h}">${it.bar ? "" : "<i></i>"}${esc(it.e.title)}</div>`;
});
html += `<div class="wk">${cells}<div class="lay">${lay}</div></div>`;
}
g.innerHTML = html;
}
}

/* ---------------------------------------------------------------- week panel (tag kept as os-calendar-day) */
const M3 = (d) => MONTHS[d.getMonth()].slice(0, 3);
class OsCalendarDay extends HTMLElement {
setConfig(c) { this._c = c || {}; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 4; }
set hass(h) { S.hass = h; if (!this._did) { this._did = true; this._load(); this._render(); } }
connectedCallback() { this._sub = () => { this._load(); this._render(); }; S.subs.add(this._sub); this._t = setInterval(() => this._render(), 60000); this._render(); }
disconnectedCallback() { S.subs.delete(this._sub); clearInterval(this._t); }
_ws() { return addD(day0(S.sel), -S.sel.getDay()); }
_load() { if (!S.hass || !S.sel) return; const ws = this._ws(), we = addD(ws, 6); load(ws.getFullYear(), ws.getMonth()); load(we.getFullYear(), we.getMonth()); }
_build() {
this.shadowRoot.innerHTML = `<style>
:host{display:block;height:100%;}
.card{height:100%;box-sizing:border-box;display:flex;flex-direction:column;border-radius:22px;background:var(--os-glass-bg,#1c1c1e);box-shadow:var(--os-glass-shadow,none);-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);color:var(--os-text,#f5f5f7);padding:16px 16px 6px 18px;overflow:hidden;font-family:var(--os-font-text,-apple-system,"SF Pro Text",Inter,system-ui,sans-serif);user-select:none;-webkit-user-select:none;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.hd{display:flex;align-items:center;gap:8px;flex:none;}
.hl{min-width:0;flex:1;}
.wk{font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--os-text-2,#a1a1a6);}
.wk.now{color:var(--os-text,#f5f5f7);}
.dt{font-family:var(--os-font-display,-apple-system,"SF Pro Display",Inter,system-ui,sans-serif);font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;margin-top:2px;white-space:nowrap;}
.rnd{flex:none;width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--os-surface-3,rgba(255,255,255,0.1));transition:transform 140ms ease;}
.rnd.add{background:var(--os-on,#f5f5f7);color:var(--os-on-text,#1d1d1f);}
.rnd ha-icon{--mdc-icon-size:24px;width:24px;height:24px;display:flex;}
button:active{transform:scale(0.95);}
.strip{flex:none;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:12px 0 8px;}
.sd{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0 7px;border-radius:16px;transition:background 160ms ease,color 160ms ease;}
.sd .l{font-size:12px;font-weight:600;letter-spacing:0.04em;color:var(--os-text-3,#6e6e73);}
.sd .n{font-size:19px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;line-height:1.2;}
.sd .p{width:5px;height:5px;border-radius:50%;background:var(--os-text-2,#a1a1a6);opacity:0;}
.sd.has .p{opacity:1;}
.sd.td .n{color:var(--os-accent,#2997ff);}
.sd.sel{background:var(--os-on,#f5f5f7);color:var(--os-on-text,#1d1d1f);}
.sd.sel .l{color:var(--os-on-text,#1d1d1f);opacity:0.6;}
.sd.sel .n{color:var(--os-on-text,#1d1d1f);}
.sd.sel .p{background:var(--os-on-text,#1d1d1f);}
.list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;margin-right:-8px;padding:0 8px 8px 0;}
.list::-webkit-scrollbar{display:none;}
.dh{display:flex;align-items:baseline;gap:8px;padding:10px 2px 6px;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--os-text-2,#a1a1a6);}
.dh.td{color:var(--os-text,#f5f5f7);}
.none{padding:4px 2px 8px;font-size:15px;color:var(--os-text-3,#6e6e73);}
.e{display:grid;grid-template-columns:4px minmax(0,1fr);column-gap:12px;width:100%;text-align:left;padding:10px 12px;margin-bottom:6px;border-radius:14px;background:var(--os-surface-3,rgba(255,255,255,0.06));box-sizing:border-box;}
.bar{grid-row:1 / span 3;border-radius:2px;background:var(--c);}
.t{font-size:17px;font-weight:600;letter-spacing:-0.015em;line-height:1.3;}
.w{font-size:14px;color:var(--os-text-2,#a1a1a6);margin-top:2px;}
.x{display:none;margin-top:8px;font-size:15px;color:var(--os-text-2,#a1a1a6);line-height:1.4;white-space:pre-wrap;}
.e.open .x{display:block;}
.cal{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--os-text-2,#a1a1a6);}
.cal i{width:8px;height:8px;border-radius:50%;background:var(--c);}
.acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
.edt{display:inline-flex;height:36px;padding:0 18px;align-items:center;gap:6px;border-radius:999px;font-size:15px;font-weight:600;color:var(--os-on-text,#1d1d1f);background:var(--os-on,#f5f5f7);}
.edt ha-icon{--mdc-icon-size:18px;width:18px;height:18px;display:flex;}
.del{display:inline-flex;height:36px;padding:0 16px;align-items:center;border-radius:999px;font-size:15px;font-weight:600;color:#ff453a;background:color-mix(in srgb,#ff453a 14%,transparent);}
.del.arm{background:#ff453a;color:#fff;}
.empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--os-text-3,#6e6e73);font-size:19px;font-weight:600;letter-spacing:-0.01em;}
.empty button{font-size:16px;font-weight:600;color:var(--os-accent,#2997ff);}
</style><div class="card"><div class="hd"><div class="hl"><div class="wk" id="wk"></div><div class="dt" id="dt"></div></div>
<button class="rnd" id="prev" aria-label="Previous week"><ha-icon icon="mdi:chevron-left"></ha-icon></button><button class="rnd" id="next" aria-label="Next week"><ha-icon icon="mdi:chevron-right"></ha-icon></button><button class="rnd add" id="add" aria-label="New event"><ha-icon icon="mdi:plus"></ha-icon></button></div>
<div class="strip" id="strip"></div><div class="list" id="list"></div></div>`;
const sr = this.shadowRoot;
sr.getElementById("add").addEventListener("click", () => openSheet(S.sel));
const step = (n) => { haptic(this); S.sel = addD(S.sel, n * 7); S.jump = true; this._scrollTo = true; emit(); };
sr.getElementById("prev").addEventListener("click", () => step(-1));
sr.getElementById("next").addEventListener("click", () => step(1));
sr.getElementById("strip").addEventListener("click", (ev) => { const b = ev.target.closest(".sd"); if (!b) return; haptic(this); const [y, m, d] = b.dataset.d.split("-").map(Number); S.sel = new Date(y, m - 1, d); S.jump = true; this._scrollTo = true; emit(); });
sr.getElementById("list").addEventListener("click", (ev) => {
const nb = ev.target.closest(".newb"); if (nb) { openSheet(S.sel); return; }
const ed = ev.target.closest(".edt");
if (ed) { ev.stopPropagation(); const e = this._evs[+ed.dataset.i]; if (e) { haptic(this); openSheet(e.s, e); } return; }
const del = ev.target.closest(".del");
if (del) { ev.stopPropagation(); this._delete(del); return; }
const r = ev.target.closest(".e"); if (!r) return; const was = r.classList.contains("open");
sr.querySelectorAll(".e.open").forEach((x) => x.classList.remove("open")); if (!was) r.classList.add("open"); this._open = was ? null : r.dataset.k;
});
}
async _delete(btn) {
if (!btn.classList.contains("arm")) { btn.classList.add("arm"); btn.textContent = "Tap again to delete"; clearTimeout(this._arm); this._arm = setTimeout(() => { btn.classList.remove("arm"); btn.textContent = "Delete Event"; }, 4000); return; }
const e = this._evs[+btn.dataset.i]; if (!e || !S.hass) return;
btn.textContent = "Deleting…";
try {
const msg = { type: "calendar/event/delete", entity_id: e.cal.entity, uid: e.uid }; if (e.rid) { msg.recurrence_id = e.rid; }
await S.hass.callWS(msg); this._open = null; reloadAll();
} catch (err) { btn.textContent = "Couldn't delete"; btn.classList.remove("arm"); }
}
_render() {
const sr = this.shadowRoot; if (!sr || !S.sel) return;
const ws = this._ws(), we = addD(ws, 6), today = day0(new Date()), thisWeek = today >= ws && today <= we;
const wkEl = sr.getElementById("wk"); wkEl.textContent = thisWeek ? "This Week" : "Week"; wkEl.classList.toggle("now", thisWeek);
sr.getElementById("dt").textContent = ws.getMonth() === we.getMonth() ? `${M3(ws)} ${ws.getDate()} – ${we.getDate()}` : `${M3(ws)} ${ws.getDate()} – ${M3(we)} ${we.getDate()}`;
const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addD(ws, i));
const per = days.map((d) => on(d));
sr.getElementById("strip").innerHTML = days.map((d, i) => `<button class="sd ${same(d, S.sel) ? "sel" : ""} ${same(d, today) ? "td" : ""} ${per[i].length ? "has" : ""}" data-d="${ymd(d)}" aria-label="${WD[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}"><span class="l">${WD[d.getDay()].slice(0, 1)}</span><span class="n">${d.getDate()}</span><span class="p"></span></button>`).join("");
const list = sr.getElementById("list"), shown = new Set(), evs = (this._evs = []);
const loading = [ws, we].some((d) => !S.ev.has(mk(d.getFullYear(), d.getMonth())));
let html = "";
days.forEach((d, i) => {
const items = per[i].filter((e) => { const k = e.cal.entity + "|" + (e.uid || e.title) + "|" + e.s.getTime(); if (shown.has(k)) return false; shown.add(k); return true; });
const isSel = same(d, S.sel);
if (!items.length && !isSel) return;
const lab = same(d, today) ? "Today" : same(d, addD(today, 1)) ? "Tomorrow" : WD[d.getDay()];
html += `<div class="dh ${same(d, today) ? "td" : ""}" data-d="${ymd(d)}">${lab}<span>${M3(d)} ${d.getDate()}</span></div>`;
if (!items.length) { html += `<div class="none">${loading ? "Loading…" : "No events"}</div>`; return; }
items.forEach((e) => {
const k = e.cal.entity + "|" + (e.uid || e.title) + "|" + e.s.getTime(), idx = evs.push(e) - 1;
let when;
if (e.allDay) { const n = Math.round((day0(e.e) - day0(e.s)) / 86400000), last = addD(e.e, -1); when = n > 1 ? `All-day · ${M3(e.s)} ${e.s.getDate()} – ${M3(last)} ${last.getDate()}` : "All-day"; }
else when = same(e.s, new Date(e.e.getTime() - 1)) ? `${tm(e.s)} – ${tm(e.e)}` : `${M3(e.s)} ${e.s.getDate()} ${tm(e.s)} – ${M3(e.e)} ${e.e.getDate()} ${tm(e.e)}`;
const canDel = S.hass && S.hass.states[e.cal.entity] && (S.hass.states[e.cal.entity].attributes.supported_features & 2) && e.uid;
html += `<button class="e ${this._open === k ? "open" : ""}" data-k="${esc(k)}" style="--c:${e.cal.color}"><div class="bar"></div><div class="t">${esc(e.title)}</div><div class="w">${esc(when)}${e.loc ? " · " + esc(e.loc.split(",")[0]) : ""}</div>
<div class="x"><span class="cal"><i></i>${esc(e.cal.name)}</span>${e.loc ? `<div>${esc(e.loc)}</div>` : ""}${e.desc ? `<div>${esc(e.desc)}</div>` : ""}${canEdit(e) || canDel ? `<div class="acts">${canEdit(e) ? `<span class="edt" role="button" data-i="${idx}"><ha-icon icon="mdi:pencil-outline"></ha-icon>Edit</span>` : ""}${canDel ? `<span class="del" role="button" data-i="${idx}">Delete Event</span>` : ""}</div>` : ""}</div></button>`;
});
});
if (!html) html = `<div class="empty">${loading ? "Loading…" : "No Events This Week"}${loading ? "" : '<button class="newb">Add an event</button>'}</div>`;
const key = ymd(ws), st = list.scrollTop;
list.innerHTML = html;
const sk = ymd(S.sel);
if (this._scrollTo || this._wk !== key || this._sk !== sk) { const h = list.querySelector(`.dh[data-d="${sk}"]`); list.scrollTop = h ? h.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop : 0; this._scrollTo = false; } else list.scrollTop = st;
this._wk = key; this._sk = sk;
}
}

/* ---------------------------------------------------------------- New Event sheet (touch-first: inline month + wheel pickers) */
const IT = 44;
const fmtD = (d) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
const fmtT = (d) => { const h = d.getHours(); return `${h % 12 || 12}:${pad(d.getMinutes())}<small>${h >= 12 ? "PM" : "AM"}</small>`; };
class OsCalSheet extends HTMLElement {
constructor() { super(); this.attachShadow({ mode: "open" }); }
open(date, ev) {
const h = S.hass; this.edit = ev || null;
this._cals = S.cals.filter((c) => h && h.states[c.entity] && ((h.states[c.entity].attributes.supported_features & 1) || (ev && c.entity === ev.cal.entity)));
this._ci = ev ? Math.max(0, this._cals.findIndex((c) => c.entity === ev.cal.entity)) : 0;
const now = new Date(); let s;
if (ev) {
/* All-day ends are exclusive in the calendar; the sheet shows the last day */
if (ev.allDay) { const last = addD(day0(ev.e), -1); s = new Date(ev.s.getFullYear(), ev.s.getMonth(), ev.s.getDate(), 9, 0); this.st = { s, e: new Date(Math.max(last, day0(ev.s))), allDay: true }; this.st.e.setHours(10, 0, 0, 0); }
else { s = new Date(ev.s); this.st = { s, e: new Date(ev.e), allDay: false }; }
this.dur = Math.max(300000, this.st.e - this.st.s); this.openK = null; this.view = null;
} else {
if (same(date, now)) { s = new Date(now); s.setMinutes(0, 0, 0); s.setHours(s.getHours() + 1); } else { s = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0); }
this.st = { s, e: new Date(s.getTime() + 3600000), allDay: false }; this.dur = 3600000; this.openK = null; this.view = null;
}
const md = mode();
const P = { sheet: md === "light" ? "rgba(246,247,250,0.9)" : "var(--os-surface, #121214)", grp: "var(--os-surface-2, #1c1c1e)", txt: "var(--os-text, #f5f5f7)", t2: "var(--os-text-2, #a1a1a6)", t3: "var(--os-text-3, #6e6e73)", hair: "var(--os-hairline, rgba(255,255,255,0.08))", chip: "var(--os-surface-3, #2c2c2e)", on: "var(--os-on, #f5f5f7)", onT: "var(--os-on-text, #1d1d1f)", acc: "var(--os-accent, #2997ff)", red: "#ff453a" };
this.shadowRoot.innerHTML = `<style>
:host{position:fixed;inset:0;z-index:100;display:block;}
.bg{position:absolute;inset:0;background:rgba(0,0,0,0.42);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity 260ms ease;}
.wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}
.sh{pointer-events:auto;width:620px;max-width:calc(100vw - 48px);max-height:calc(var(--os-page-h, 100vh) - 40px);display:flex;flex-direction:column;border-radius:28px;background:${P.sheet};color:${P.txt};color-scheme:${md};box-shadow:0 30px 90px rgba(0,0,0,0.45);-webkit-backdrop-filter:blur(40px) saturate(160%);backdrop-filter:blur(40px) saturate(160%);overflow:hidden;font-family:var(--os-font-text,-apple-system,"SF Pro Text",Inter,system-ui,sans-serif);transform:translateY(40px) scale(0.98);opacity:0;transition:transform 420ms cubic-bezier(0.2,0.9,0.25,1),opacity 260ms ease;user-select:none;-webkit-user-select:none;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.nav{flex:none;display:grid;grid-template-columns:56px 1fr 56px;align-items:center;padding:16px 18px 10px;}
.nav b{text-align:center;font-size:19px;font-weight:600;letter-spacing:-0.02em;}
.cir{width:52px;height:52px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:${P.chip};color:${P.txt};transition:transform 140ms ease,background 200ms ease,color 200ms ease;}
.cir ha-icon{--mdc-icon-size:28px;width:28px;height:28px;display:flex;}
.cir.ok{background:${P.on};color:${P.onT};}
.cir.ok:disabled{background:${P.chip};color:${P.t3};cursor:default;}
button:active{transform:scale(0.95);}
.body{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;padding:6px 0 22px;}
.body::-webkit-scrollbar{display:none;}
.in{position:relative;padding:0 20px 0 36px;}
.vb{position:absolute;left:18px;top:2px;bottom:2px;width:4px;border-radius:2px;background:var(--cc);transition:background 200ms ease;}
.grp{border-radius:22px;background:${P.grp};margin-bottom:14px;overflow:hidden;}
.ti{display:block;width:100%;box-sizing:border-box;height:64px;padding:0 20px;font:inherit;font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${P.txt};background:none;border:none;outline:none;}
.ti::placeholder{color:${P.t3};font-weight:500;}
.row{display:flex;align-items:center;gap:10px;min-height:68px;padding:0 14px 0 20px;font-size:19px;letter-spacing:-0.02em;position:relative;}
.hr{height:0.5px;background:${P.hair};margin-left:20px;}
.lb{flex:1;}
.ch{height:48px;padding:0 16px;border-radius:14px;background:${P.chip};font-size:19px;font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:-0.01em;white-space:nowrap;transition:color 160ms ease,background 160ms ease;}
.ch small{font-size:14px;font-weight:600;margin-left:3px;}
.ch.act{color:${P.acc};}
.ch.bad{text-decoration:line-through;color:${P.red};}
.pk{display:grid;grid-template-rows:0fr;transition:grid-template-rows 320ms cubic-bezier(0.2,0.9,0.25,1);}
.pk.open{grid-template-rows:1fr;}
.pk > div{min-height:0;overflow:hidden;}
.mp{padding:6px 14px 12px;}
.mh{display:flex;align-items:center;height:52px;padding:0 6px 0 8px;}
.mh b{font-size:19px;font-weight:700;letter-spacing:-0.02em;}
.mh .sp{flex:1;}
.ar{width:48px;height:48px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:${P.txt};}
.ar ha-icon{--mdc-icon-size:28px;width:28px;height:28px;display:flex;}
.mw,.mg{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;}
.mw div{font-size:13px;font-weight:600;letter-spacing:0.04em;color:${P.t3};padding:4px 0 6px;}
.mg button,.mg span{height:50px;display:flex;align-items:center;justify-content:center;}
.mg button i{font-style:normal;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:500;font-variant-numeric:tabular-nums;transition:background 160ms ease,color 160ms ease;}
.mg button.td i{color:${P.acc};font-weight:700;}
.mg button.sel i{background:${P.on};color:${P.onT};font-weight:700;}
.mg button:disabled{opacity:0.28;cursor:default;}
.wh{position:relative;display:flex;justify-content:center;gap:4px;height:${IT * 5}px;margin:4px 14px 14px;}
.band{position:absolute;left:0;right:0;top:${IT * 2}px;height:${IT}px;border-radius:12px;background:${P.chip};pointer-events:none;}
.col{position:relative;width:88px;height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none;touch-action:pan-y;-webkit-mask-image:linear-gradient(transparent,#000 30%,#000 70%,transparent);mask-image:linear-gradient(transparent,#000 30%,#000 70%,transparent);}
.col::-webkit-scrollbar{display:none;}
.pd{height:${IT * 2}px;}
.it{height:${IT}px;line-height:${IT}px;text-align:center;scroll-snap-align:center;font-size:24px;font-weight:500;font-variant-numeric:tabular-nums;cursor:pointer;will-change:transform,opacity;}
.sw{position:relative;flex:none;width:64px;height:38px;border-radius:19px;background:${P.chip};transition:background 220ms ease;}
.sw::after{content:"";position:absolute;top:3px;left:3px;width:32px;height:32px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,0.15),0 1px 1px rgba(0,0,0,0.16);transition:transform 260ms cubic-bezier(0.3,1.4,0.5,1);}
.sw.on{background:#34c759;} .sw.on::after{transform:translateX(26px);}
.cals{display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px 14px 20px;}
.cc{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 18px;border-radius:999px;background:transparent;color:${P.t2};font-size:17px;font-weight:600;box-shadow:inset 0 0 0 1.5px ${P.hair};transition:background 160ms ease,color 160ms ease;}
.cc i{width:10px;height:10px;border-radius:50%;background:var(--c);}
.cc.on{background:${P.chip};color:${P.txt};box-shadow:none;}
.cl{font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${P.t2};padding:16px 20px 0;}
textarea{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:18px;letter-spacing:-0.02em;color:${P.txt};background:none;border:none;outline:none;resize:none;min-height:60px;padding:18px 20px;line-height:1.35;}
textarea::placeholder{color:${P.t3};}
.err{margin:0 4px 10px;color:${P.red};font-size:15px;}
.note{margin:-4px 6px 14px;color:${P.t2};font-size:15px;line-height:1.4;}
.hide{display:none !important;}
</style>
<div class="bg" id="bg"></div><div class="wrap"><div class="sh" role="dialog" aria-label="${ev ? "Edit Event" : "New Event"}">
<div class="nav"><button class="cir" id="cancel" aria-label="Cancel"><ha-icon icon="mdi:close"></ha-icon></button><b>${ev ? "Edit Event" : "New Event"}</b><button class="cir ok" id="save" aria-label="${ev ? "Save changes" : "Add event"}" disabled><ha-icon icon="mdi:check"></ha-icon></button></div>
<div class="body" id="body"><div class="in"><div class="vb" id="vb"></div>
<div class="grp"><input id="title" class="ti" placeholder="Title" autocomplete="off" enterkeyhint="done" value="${ev ? esc(ev.title) : ""}"></div>
${ev && (ev.rid || ev.rrule) ? `<div class="note">This is a repeating event. Changes apply to this one only.</div>` : ""}
<div class="grp">
<div class="row"><span class="lb">Starts</span><button class="ch" id="sd"></button><button class="ch tmc" id="stt"></button></div>
<div class="pk" id="pk-s"><div></div></div>
<div class="hr"></div>
<div class="row"><span class="lb">Ends</span><button class="ch" id="ed"></button><button class="ch tmc" id="ett"></button></div>
<div class="pk" id="pk-e"><div></div></div>
<div class="hr"></div>
<div class="row"><span class="lb">All-day</span><button class="sw" id="allday" role="switch" aria-checked="false" aria-label="All-day"></button></div>
</div>
<div class="grp${this._cals.length > 1 ? "" : " hide"}"><div class="cl">Calendar</div><div class="cals" id="cals">${this._cals.map((c, i) => `<button class="cc${i === this._ci ? " on" : ""}" data-i="${i}" style="--c:${c.color}"><i></i>${esc(c.name)}</button>`).join("")}</div></div>
<div class="grp"><textarea id="notes" rows="1" placeholder="Notes (optional)">${ev ? esc(ev.desc) : ""}</textarea></div>
<div class="err hide" id="err"></div>
</div></div></div></div>`;
const $ = (id) => this.shadowRoot.getElementById(id);
this.$ = $;
const title = $("title"), save = $("save");
title.addEventListener("input", () => this._valid());
$("cals").addEventListener("click", (ev) => { const b = ev.target.closest(".cc"); if (!b) return; haptic(this); this._ci = +b.dataset.i; this.shadowRoot.querySelectorAll(".cc").forEach((x) => x.classList.toggle("on", x === b)); this._bar(); });
[["sd", "sd"], ["stt", "st"], ["ed", "ed"], ["ett", "et"]].forEach(([id, k]) => $(id).addEventListener("click", () => { haptic(this); this._toggle(k); }));
$("allday").addEventListener("click", () => {
const on = !this.st.allDay; this.st.allDay = on; haptic(this); const sw = $("allday"); sw.classList.toggle("on", on); sw.setAttribute("aria-checked", on);
this.shadowRoot.querySelectorAll(".tmc").forEach((x) => x.classList.toggle("hide", on));
if (on && (this.openK === "st" || this.openK === "et")) this._toggle(null);
this._chips();
});
const notes = $("notes"); notes.addEventListener("input", () => { notes.style.height = "auto"; notes.style.height = notes.scrollHeight + "px"; });
$("cancel").addEventListener("click", () => this.close());
$("bg").addEventListener("click", () => this.close());
save.addEventListener("click", () => this._save());
if (ev && ev.allDay) { const sw = $("allday"); sw.classList.add("on"); sw.setAttribute("aria-checked", "true"); this.shadowRoot.querySelectorAll(".tmc").forEach((x) => x.classList.add("hide")); }
if (ev) requestAnimationFrame(() => { notes.style.height = "auto"; notes.style.height = notes.scrollHeight + "px"; });
this._bar(); this._chips();
requestAnimationFrame(() => requestAnimationFrame(() => this._on(true)));
this._esc = (ev) => { if (ev.key === "Escape") this.close(); }; window.addEventListener("keydown", this._esc);
}
_bar() { const c = this._cals[this._ci]; this.$("vb").style.setProperty("--cc", c ? c.color : "var(--os-accent, #2997ff)"); }
_ok() { const { s, e, allDay } = this.st; return allDay ? day0(e) >= day0(s) : e > s; }
_valid() { this.$("save").disabled = !this.$("title").value.trim() || !this._ok(); }
_chips() {
const $ = this.$, { s, e } = this.st, bad = !this._ok();
$("sd").textContent = fmtD(s); $("stt").innerHTML = fmtT(s); $("ed").textContent = fmtD(e); $("ett").innerHTML = fmtT(e);
$("ed").classList.toggle("bad", day0(e) < day0(s)); $("ett").classList.toggle("bad", bad && !this.st.allDay);
["sd", "st", "ed", "et"].forEach((k) => $(k === "st" ? "stt" : k === "et" ? "ett" : k).classList.toggle("act", this.openK === k));
this._valid();
}
_toggle(k) {
const $ = this.$, prev = this.openK; this.openK = prev === k ? null : k; this.view = null;
const side = (x) => (x === "sd" || x === "st" ? "s" : "e");
["s", "e"].forEach((sd) => { const pk = $("pk-" + sd), want = this.openK && side(this.openK) === sd; if (want) { this._fill(pk.firstElementChild, this.openK); pk.classList.add("open"); } else if (pk.classList.contains("open")) { pk.classList.remove("open"); const inner = pk.firstElementChild; setTimeout(() => { if (!pk.classList.contains("open")) inner.innerHTML = ""; }, 340); } });
this._chips();
if (this.openK) { const pk = $("pk-" + side(this.openK)); setTimeout(() => { try { pk.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }, 340); }
}
_fill(host, k) { if (k === "sd" || k === "ed") this._month(host, k); else this._wheel(host, k); }
_month(host, k) {
const key = k === "sd" ? "s" : "e", sel = this.st[key];
const v = this.view || (this.view = new Date(sel.getFullYear(), sel.getMonth(), 1));
const y = v.getFullYear(), m = v.getMonth(), first = v.getDay(), dim = new Date(y, m + 1, 0).getDate(), today = day0(new Date());
const min = k === "ed" ? day0(this.st.s) : null;
let cells = ""; for (let i = 0; i < first; i++) cells += "<span></span>";
for (let d = 1; d <= dim; d++) { const dt = new Date(y, m, d); const cls = [same(dt, sel) ? "sel" : "", same(dt, today) ? "td" : ""].join(" "); cells += `<button class="${cls}" data-d="${d}" ${min && dt < min ? "disabled" : ""} aria-label="${MONTHS[m]} ${d}"><i>${d}</i></button>`; }
host.innerHTML = `<div class="mp"><div class="mh"><b>${MONTHS[m]} ${y}</b><span class="sp"></span><button class="ar" data-n="-1" aria-label="Previous month"><ha-icon icon="mdi:chevron-left"></ha-icon></button><button class="ar" data-n="1" aria-label="Next month"><ha-icon icon="mdi:chevron-right"></ha-icon></button></div>
<div class="mw">${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => `<div>${d}</div>`).join("")}</div><div class="mg">${cells}</div></div>`;
host.querySelectorAll(".ar").forEach((b) => b.addEventListener("click", () => { haptic(this); this.view = new Date(y, m + +b.dataset.n, 1); this._month(host, k); }));
host.querySelector(".mg").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (!b || b.disabled) return; haptic(this); this._setDate(k, new Date(y, m, +b.dataset.d)); this._month(host, k); });
}
_setDate(k, dt) {
const st = this.st;
if (k === "sd") { st.s = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), st.s.getHours(), st.s.getMinutes()); st.e = new Date(st.s.getTime() + this.dur); }
else { st.e = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), st.e.getHours(), st.e.getMinutes()); if (st.e > st.s) this.dur = st.e - st.s; }
this._chips();
}
_wheel(host, k) {
const d = k === "st" ? this.st.s : this.st.e, hr = d.getHours();
const cols = [
{ vals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], txt: (v) => String(v), idx: (hr % 12 || 12) - 1 },
{ vals: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], txt: pad, idx: Math.min(11, Math.round(d.getMinutes() / 5)) },
{ vals: [0, 1], txt: (v) => (v ? "PM" : "AM"), idx: hr >= 12 ? 1 : 0 },
];
host.innerHTML = `<div class="wh"><div class="band"></div>${cols.map((c) => `<div class="col"><div class="pd"></div>${c.vals.map((v, i) => `<div class="it" data-i="${i}">${c.txt(v)}</div>`).join("")}<div class="pd"></div></div>`).join("")}</div>`;
const els = [...host.querySelectorAll(".col")];
const paint = (col) => { const c = col.scrollTop / IT; col.querySelectorAll(".it").forEach((el, i) => { const dd = Math.min(3, Math.abs(i - c)); el.style.opacity = String(1 - dd * 0.27); el.style.transform = `scale(${1 - dd * 0.09})`; }); };
const commit = () => {
const [ih, im, ia] = els.map((col, i) => Math.max(0, Math.min(cols[i].vals.length - 1, Math.round(col.scrollTop / IT))));
const H = (cols[0].vals[ih] % 12) + (ia ? 12 : 0), M = cols[1].vals[im], st = this.st;
if (k === "st") { const ns = new Date(st.s); ns.setHours(H, M, 0, 0); if (ns.getTime() === st.s.getTime()) return; st.s = ns; st.e = new Date(ns.getTime() + this.dur); }
else { const ne = new Date(st.e); ne.setHours(H, M, 0, 0); if (ne.getTime() === st.e.getTime()) return; st.e = ne; if (ne > st.s) this.dur = ne - st.s; }
haptic(this); this._chips();
};
requestAnimationFrame(() => els.forEach((col, i) => { col.scrollTop = cols[i].idx * IT; paint(col); }));
els.forEach((col) => {
let t, raf;
col.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = null; paint(col); }); clearTimeout(t); t = setTimeout(commit, 140); }, { passive: true });
col.addEventListener("click", (ev) => { const it = ev.target.closest(".it"); if (it) col.scrollTo({ top: +it.dataset.i * IT, behavior: "smooth" }); });
});
}
_on(v) { const r = this.shadowRoot, sh = r.querySelector(".sh"); r.getElementById("bg").style.opacity = v ? "1" : "0"; sh.style.opacity = v ? "1" : "0"; sh.style.transform = v ? "none" : "translateY(40px) scale(0.98)"; }
close() { window.removeEventListener("keydown", this._esc); this._on(false); setTimeout(() => this.remove(), 300); }
async _save() {
const $ = this.$, h = S.hass, save = $("save"), err = $("err");
const c = this._cals[this._ci]; if (!c || !h) { err.textContent = "No calendar can take new events."; err.classList.remove("hide"); return; }
if (this.edit) return this._saveEdit(c);
if (!this._ok()) return;
const { s, e, allDay } = this.st;
const data = { summary: $("title").value.trim() };
const notes = $("notes").value.trim(); if (notes) data.description = notes;
const startDay = day0(s);
if (allDay) { data.start_date = ymd(s); data.end_date = ymd(addD(day0(e), 1)); }
else { const f = (d) => `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`; data.start_date_time = f(s); data.end_date_time = f(e); }
save.disabled = true; err.classList.add("hide");
try {
await h.callService("calendar", "create_event", data, { entity_id: c.entity });
S.sel = startDay; reloadAll(); load(startDay.getFullYear(), startDay.getMonth(), true); emit(); this.close();
} catch (ex) { save.disabled = false; err.textContent = "Couldn't add the event: " + ((ex && ex.message) || "unknown error"); err.classList.remove("hide"); }
}
async _saveEdit(c) {
const $ = this.$, h = S.hass, save = $("save"), err = $("err"), old = this.edit;
if (!this._ok()) return;
const { s, e, allDay } = this.st, title = $("title").value.trim(), notes = $("notes").value.trim();
const endEx = allDay ? addD(day0(e), 1) : e;
const sameTime = allDay ? old.allDay && same(day0(s), day0(old.s)) && same(endEx, day0(old.e)) : !old.allDay && s.getTime() === old.s.getTime() && e.getTime() === old.e.getTime();
if (title === old.title && notes === (old.desc || "").trim() && c.entity === old.cal.entity && sameTime) { this.close(); return; }
const show = (t) => { err.textContent = t; err.classList.remove("hide"); };
const done = () => { S.sel = day0(s); reloadAll(); load(s.getFullYear(), s.getMonth(), true); emit(); this.close(); };
save.disabled = true; err.classList.add("hide");
const iso = (d) => { const o = -d.getTimezoneOffset(), z = `${o >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(o) / 60))}:${pad(Math.abs(o) % 60)}`; return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${z}`; };
/* 1) The calendar can change events in place */
if (c.entity === old.cal.entity && (feat(c.entity) & 4)) {
const event = { summary: title, dtstart: allDay ? ymd(s) : iso(s), dtend: allDay ? ymd(endEx) : iso(e), description: notes };
if (old.loc) event.location = old.loc;
const msg = { type: "calendar/event/update", entity_id: c.entity, uid: old.uid, event }; if (old.rid) msg.recurrence_id = old.rid;
try { await h.callWS(msg); done(); } catch (ex) { save.disabled = false; show("Couldn't save the changes: " + ((ex && ex.message) || "unknown error")); }
return;
}
/* 2) Google calendars can only add and remove: save the changed copy first, then remove the original, so nothing is lost if a step fails */
const data = { summary: title };
if (notes) data.description = notes;
if (old.loc) data.location = old.loc;
if (allDay) { data.start_date = ymd(s); data.end_date = ymd(endEx); }
else { const f = (d) => `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`; data.start_date_time = f(s); data.end_date_time = f(e); }
try { await h.callService("calendar", "create_event", data, { entity_id: c.entity }); }
catch (ex) { save.disabled = false; show("Couldn't save the changes: " + ((ex && ex.message) || "unknown error")); return; }
try {
const msg = { type: "calendar/event/delete", entity_id: old.cal.entity, uid: old.uid }; if (old.rid) msg.recurrence_id = old.rid;
await h.callWS(msg); done();
} catch (ex) {
reloadAll(); emit(); show("Saved the changes, but the old version couldn't be removed. Delete it from the list."); save.classList.add("hide");
}
}
}
const openSheet = (date, ev) => {
if (!customElements.get("os-cal-sheet")) customElements.define("os-cal-sheet", OsCalSheet);
const ha = document.querySelector("home-assistant"), host = (ha && ha.shadowRoot) || document.body;
const old = host.querySelector("os-cal-sheet"); if (old) old.remove();
const el = document.createElement("os-cal-sheet"); host.appendChild(el); el.open(date || S.sel, ev);
};
window.__osCalNewEvent = openSheet;
if (!customElements.get("os-cal-sheet")) customElements.define("os-cal-sheet", OsCalSheet);
if (!customElements.get("os-calendar")) customElements.define("os-calendar", OsCalendar);
if (!customElements.get("os-calendar-day")) customElements.define("os-calendar-day", OsCalendarDay);
})();
