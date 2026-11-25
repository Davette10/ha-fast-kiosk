/* Clark Home OS - family map. Our own Leaflet map for the Map tab and the person pages: bubble pins with profile pictures,
   coloured trails, light/dark basemap. Replaces Home Assistant's map card, whose internals changed in HA 2026.10
   (no more leafletMap / Leaflet on ha-map, so the old trail and picture hooks stopped working). */
(() => {
if (window.__osMapV) return; window.__osMapV = 1;
const LJS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
const LCSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
/* Private copy of Leaflet, shared with the weather radar; window.L is put back the way it was. */
const loadL = () => {
if (window.__osRadarL) return Promise.resolve(window.__osRadarL);
if (window.__osLeafletP) return window.__osLeafletP;
window.__osLeafletP = new Promise((res, rej) => {
const before = window.L, s = document.createElement("script");
s.src = LJS; s.async = true;
s.onload = () => { const mine = window.L; try { window.L = before; } catch (e) {} window.__osRadarL = mine; res(mine); };
s.onerror = (e) => { window.__osLeafletP = null; rej(e); };
document.head.appendChild(s);
});
return window.__osLeafletP;
};
const mode = () => (document.documentElement.getAttribute("data-os-mode") === "light" ? "light" : "dark");
/* Esri Canvas basemaps: monochrome, no API key (CARTO now asks for one). */
const ESRI = (m, kind) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${m === "light" ? "Light" : "Dark"}_Gray_${kind}/MapServer/tile/{z}/{y}/{x}`;
const hex = (c) => { const m = String(c || "").match(/#[0-9a-f]{3,8}/i); return m ? m[0] : "#2997ff"; };
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nav = (path) => { history.pushState(null, "", path); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); };
const BAD = ["unknown", "unavailable", ""];
const unavail = (h, pid) => {
if (window.__osLocUnavail) { try { return window.__osLocUnavail(h, pid); } catch (e) {} }
const p = h.states[pid]; return !p || BAD.includes(p.state);
};
const distM = (a, b) => { const r = Math.PI / 180, x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r), y = (b[0] - a[0]) * r; return Math.sqrt(x * x + y * y) * 6371000; };
const trailCache = new Map();
const loadTrails = async (hass, ids, hours) => {
const key = ids.join(",") + "|" + hours, c = trailCache.get(key);
if (c && Date.now() - c.at < 120000) return c.data;
const r = await hass.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - hours * 3600e3).toISOString(), entity_ids: ids, minimal_response: false, no_attributes: false, significant_changes_only: false });
const minD = hours <= 24 ? 30 : hours <= 72 ? 70 : 140, data = {};
ids.forEach((id) => {
let pts = [], last = null;
((r && r[id]) || []).forEach((x) => {
const a = x.a || x.attributes || {}, la = parseFloat(a.latitude), lo = parseFloat(a.longitude);
if (isNaN(la) || isNaN(lo)) return;
const p = [la, lo]; if (last && distM(last, p) < minD) return; pts.push(p); last = p;
});
if (pts.length > 600) { const st = Math.ceil(pts.length / 600), e = pts[pts.length - 1]; pts = pts.filter((_, i) => i % st === 0); pts.push(e); }
data[id] = pts;
});
trailCache.set(key, { at: Date.now(), data });
return data;
};
const CSS = `
:host{position:absolute;inset:0;display:block;z-index:0;isolation:isolate;overflow:hidden;border-radius:inherit;background:var(--osm-bg,#0b0b0c);}
:host([data-mode=light]){--osm-bg:#eceef2;}
#m{position:absolute;inset:0;background:var(--osm-bg,#0b0b0c);}
.leaflet-container{background:var(--osm-bg,#0b0b0c);font:inherit;-webkit-tap-highlight-color:transparent;}
.leaflet-control-attribution{background:transparent!important;font-size:9px;opacity:0.45;padding:0 8px 2px!important;}
.leaflet-control-attribution a{color:inherit!important;}
:host([data-mode=dark]) .leaflet-control-attribution{color:#a1a1a6;}
.pin{position:relative;width:100%;height:100%;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.pin .bub{position:absolute;left:0;right:0;top:0;height:56px;box-sizing:border-box;padding:6px;border-radius:16px;display:flex;gap:4px;
background:var(--osm-pin,#fff);box-shadow:0 6px 18px rgba(0,0,0,0.22),0 1px 3px rgba(0,0,0,0.12);transition:transform 160ms ease;}
.pin:active .bub{transform:scale(0.94);}
.pin .tail{position:absolute;left:50%;top:44px;width:18px;height:18px;margin-left:-9px;background:var(--osm-pin,#fff);transform:rotate(45deg);border-radius:0 0 3px 0;box-shadow:3px 3px 6px rgba(0,0,0,0.10);}
.pin .dot{position:absolute;left:50%;top:74px;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--c,#2997ff);box-shadow:0 0 0 2.5px var(--osm-pin,#fff),0 1px 4px rgba(0,0,0,0.35);}
.pin .av{position:relative;flex:none;width:44px;height:44px;border-radius:12px;overflow:hidden;background:var(--c);display:flex;align-items:center;justify-content:center;
font:700 19px/1 -apple-system,"SF Pro Text",Inter,system-ui,sans-serif;color:#fff;box-shadow:inset 0 0 0 2.5px var(--c);}
.pin .av img{position:absolute;inset:2.5px;width:calc(100% - 5px);height:calc(100% - 5px);border-radius:9.5px;object-fit:cover;}
.pin .av.off{filter:grayscale(1);opacity:0.5;}
:host([data-mode=dark]){--osm-pin:#2c2c2e;}
.hm{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);}
:host([data-mode=dark]) .hm{background:rgba(44,44,46,0.92);}
.hm svg{width:16px;height:16px;fill:none;stroke:#1d1d1f;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
:host([data-mode=dark]) .hm svg{stroke:#f5f5f7;}
.fit{position:absolute;right:12px;bottom:14px;z-index:800;width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;
background:rgba(255,255,255,0.78);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);
box-shadow:0 4px 14px rgba(0,0,0,0.18),inset 0 0 0 1px rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:center;transition:transform 140ms ease;}
:host([data-mode=dark]) .fit{background:rgba(28,28,30,0.72);box-shadow:0 4px 14px rgba(0,0,0,0.4),inset 0 0 0 1px rgba(255,255,255,0.08);}
.fit:active{transform:scale(0.9);}
.fit svg{width:22px;height:22px;fill:none;stroke:#1d1d1f;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
:host([data-mode=dark]) .fit svg{stroke:#f5f5f7;}
.err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8e8e93;font-size:15px;pointer-events:none;}
`;
const HOUSE = '<svg viewBox="0 0 24 24"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/></svg>';
const LOCATE = '<svg viewBox="0 0 24 24"><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/><circle cx="12" cy="12" r="5.5"/></svg>';
class OsLeafletMap extends HTMLElement {
constructor() {
super();
this.attachShadow({ mode: "open" });
this.shadowRoot.innerHTML = `<link rel="stylesheet" href="${LCSS}"><style>${CSS}</style><div id="m"></div><button class="fit" id="fit" aria-label="Show everyone">${LOCATE}</button><div class="err" id="err"></div>`;
this._hours = 24; this._mode = mode();
this.shadowRoot.getElementById("fit").addEventListener("click", () => this.fit(true));
}
setConfig(c) { this._c = c; this._hours = c.hours != null ? c.hours : 24; }
set hass(h) { this._hass = h; if (this._map) this._update(); else if (this.isConnected) this._init(); }
get hass() { return this._hass; }
connectedCallback() {
this._mode = mode(); this.dataset.mode = this._mode;
if (this._hass && !this._map) this._init();
if (this._map) setTimeout(() => this._map.invalidateSize(), 60);
clearInterval(this._tick);
this._tick = setInterval(() => {
const m = mode(); if (m !== this._mode) this._setMode(m);
if (this._hours > 1 && Date.now() - (this._trailAt || 0) > 120000) this._trails(false);
}, 4000);
}
disconnectedCallback() { clearInterval(this._tick); }
setRange(h) { this._hours = h; this._userMoved = false; this._trails(true); }
async _init() {
if (this._initing || !this._c) return; this._initing = true;
let L;
try { L = await loadL(); } catch (e) { this.shadowRoot.getElementById("err").textContent = "Map unavailable"; this._initing = false; return; }
this._L = L;
const h = this._hass, home = h.states["zone.home"];
const hl = home ? [home.attributes.latitude, home.attributes.longitude] : [h.config.latitude, h.config.longitude];
const map = L.map(this.shadowRoot.getElementById("m"), { zoomControl: false, attributionControl: true, zoomSnap: 1, zoomDelta: 1, minZoom: 3, maxZoom: 18, worldCopyJump: true });
map.attributionControl.setPrefix(false);
this._fitting = true;
map.setView(hl, 13);
this._map = map;
this._tiles = L.tileLayer(ESRI(this._mode, "Base"), { maxNativeZoom: 16, maxZoom: 19, attribution: "Esri, HERE, Garmin, © OpenStreetMap" }).addTo(map);
map.createPane("labels"); map.getPane("labels").style.zIndex = 450; map.getPane("labels").style.pointerEvents = "none";
this._labels = L.tileLayer(ESRI(this._mode, "Reference"), { pane: "labels", maxNativeZoom: 16, maxZoom: 19 }).addTo(map);
this._home = L.marker(hl, { interactive: false, keyboard: false, zIndexOffset: -1000, icon: L.divIcon({ className: "", html: `<div class="hm">${HOUSE}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map);
this._trailGrp = L.layerGroup().addTo(map);
map.on("dragstart zoomstart", (e) => { if (!this._fitting) this._userMoved = true; });
map.on("zoomend", () => this._spread());
new ResizeObserver(() => { map.invalidateSize(); if (!this._userMoved) this.fit(false); }).observe(this);
this._update();
this.fit(false);
this._trails(true);
}
_setMode(m) {
this._mode = m; this.dataset.mode = m;
if (this._tiles) this._tiles.setUrl(ESRI(m, "Base"));
if (this._labels) this._labels.setUrl(ESRI(m, "Reference"));
if (this._trailData) this._drawTrails();
}
_people() { return (this._c && this._c.people) || []; }
/* Each person: where they are, their photo and colour. Drawing happens in _layout(). */
_update() {
const h = this._hass; if (!this._L || !h) return;
let changed = false;
const pos = this._pos || (this._pos = {});
this._people().forEach((p) => {
const s = h.states[p.id], t = p.tracker && h.states[p.tracker];
const la = s && parseFloat(s.attributes.latitude), lo = s && parseFloat(s.attributes.longitude);
if (isNaN(la) || isNaN(lo)) { if (pos[p.id]) { delete pos[p.id]; changed = true; } return; }
const v = { la, lo, pic: (t && t.attributes.entity_picture) || s.attributes.entity_picture || "", off: unavail(h, p.id), c: hex(p.color),
ini: (p.initial || (p.name || "?")[0] || "?").toUpperCase(), path: p.path || "" };
const o = pos[p.id];
if (!o || o.la !== v.la || o.lo !== v.lo || o.pic !== v.pic || o.off !== v.off) { pos[p.id] = v; changed = true; }
});
if (changed) this._layoutSoon();
}
_layoutSoon() { clearTimeout(this._spT); this._spT = setTimeout(() => this._layout(), 30); }
_spread() { this._layout(); }
/* One bubble pin per person; people close together on screen share one pin (like Home Assistant's own grouped pins). */
_layout() {
const L = this._L, map = this._map; if (!L || !map || !this._pos) return;
const ids = this._people().map((p) => p.id).filter((id) => this._pos[id]);
const pts = {}; ids.forEach((id) => { pts[id] = map.latLngToContainerPoint([this._pos[id].la, this._pos[id].lo]); });
const groups = [], seen = new Set();
ids.forEach((id) => {
if (seen.has(id)) return;
const g = [id]; seen.add(id);
for (let k = 0; k < g.length; k++) ids.forEach((o) => { if (!seen.has(o) && pts[g[k]].distanceTo(pts[o]) < 64) { g.push(o); seen.add(o); } });
groups.push(g);
});
const disp = this._disp || (this._disp = {}), keep = new Set();
groups.forEach((g) => {
const key = g.join(","); keep.add(key);
const items = g.map((id) => this._pos[id]);
const live = items.filter((v) => !v.off), lead = live[0] || items[0];
const cx = g.reduce((a, id) => a + pts[id].x, 0) / g.length, cy = g.reduce((a, id) => a + pts[id].y, 0) / g.length;
const ll = g.length === 1 ? L.latLng(lead.la, lead.lo) : map.containerPointToLatLng([cx, cy]);
const w = 12 + g.length * 44 + (g.length - 1) * 4;
const sig = items.map((v) => v.pic + v.off + v.c).join("|");
let d = disp[key];
if (!d) {
const m = L.marker(ll, { keyboard: false, riseOnHover: true, icon: L.divIcon({ className: "", html: "" }) }).addTo(map);
m.on("click", (e) => {
const el = e.originalEvent && e.originalEvent.target, av = el && el.closest && el.closest("[data-path]");
const path = av ? av.dataset.path : (g.length === 1 ? this._pos[g[0]] && this._pos[g[0]].path : "");
if (path) nav(path);
});
d = disp[key] = { m, sig: null };
}
if (d.sig !== sig) {
d.sig = sig;
const avs = g.map((id) => { const v = this._pos[id];
return `<div class="av ${v.off ? "off" : ""}" style="--c:${v.c}" data-path="${esc(v.path)}">${esc(v.ini)}${v.pic ? `<img src="${esc(v.pic)}" alt="" onerror="this.remove()">` : ""}</div>`; }).join("");
d.m.setIcon(L.divIcon({ className: "", iconSize: [w, 82], iconAnchor: [w / 2, 74],
html: `<div class="pin" style="--c:${lead.c}"><div class="tail"></div><div class="bub">${avs}</div><div class="dot"></div></div>` }));
d.m.setZIndexOffset(live.length ? 0 : -500);
}
d.m.setLatLng(ll);
});
Object.keys(disp).forEach((k) => { if (!keep.has(k)) { disp[k].m.remove(); delete disp[k]; } });
}
async _trails(refit) {
if (!this._map || !this._hass) return;
const tok = (this._tt = (this._tt || 0) + 1);
this._trailAt = Date.now();
if (this._hours <= 1) { this._trailData = null; this._trailGrp.clearLayers(); if (refit) this.fit(false); return; }
try {
const ids = this._people().map((p) => p.id);
const data = await loadTrails(this._hass, ids, this._hours);
if (tok !== this._tt) return;
this._trailData = data; this._drawTrails();
} catch (e) {}
if (refit) this.fit(false);
}
_drawTrails() {
const L = this._L, grp = this._trailGrp; if (!L || !grp) return;
grp.clearLayers();
const light = this._mode === "light", rend = this._rend || (this._rend = L.canvas({ padding: 0.5 }));
this._people().forEach((p) => {
const pts = (this._trailData || {})[p.id] || []; if (pts.length < 2) return;
L.polyline(pts, { color: light ? "#ffffff" : "#000000", weight: 7, opacity: light ? 0.9 : 0.45, lineCap: "round", lineJoin: "round", interactive: false, smoothFactor: 1.5, renderer: rend }).addTo(grp);
L.polyline(pts, { color: hex(p.color), weight: 4, opacity: 0.95, lineCap: "round", lineJoin: "round", interactive: false, smoothFactor: 1.5, renderer: rend }).addTo(grp);
});
}
fit(user) {
const L = this._L, map = this._map; if (!L || !map) return;
if (user) this._userMoved = false;
let pts = Object.values(this._pos || {}).map((v) => L.latLng(v.la, v.lo));
if (this._trailData) this._people().forEach((p) => { pts = pts.concat(((this._trailData[p.id]) || []).map((x) => L.latLng(x[0], x[1]))); });
if (!pts.length) { this._fitting = false; return; }
this._fitting = true;
const opts = { paddingTopLeft: [60, 90], paddingBottomRight: [60, 40], maxZoom: 16, animate: !!user };
if (pts.length === 1) map.setView(pts[0], 15, { animate: !!user }); else map.fitBounds(L.latLngBounds(pts), opts);
setTimeout(() => { this._fitting = false; this._spread(); }, user ? 400 : 50);
}
}
if (!customElements.get("os-leaflet-map")) customElements.define("os-leaflet-map", OsLeafletMap);

/* ---- plug it into the Map tab (os-family-map) and the person pages (os-person-page) ---- */
const mountFamily = async function () {
if (this._map && this._map.tagName === "OS-LEAFLET-MAP") { this._map.setRange(this._hours); return; }
if (this._map) { try { this._map.remove(); } catch (e) {} this._map = null; }
const el = document.createElement("os-leaflet-map");
el.setConfig({ hours: this._hours, people: this._c.people.map((p) => ({ id: p.person, tracker: p.tracker, color: p.color, name: p.name, initial: p.initial, path: p.path })) });
this._map = el;
const w = this.shadowRoot.getElementById("mapw"); w.insertBefore(el, this.shadowRoot.getElementById("seg"));
el.hass = this._hass;
this._mapP = false;
};
const mountPerson = async function () {
if (this._map && this._map.tagName === "OS-LEAFLET-MAP") return;
if (this._map) { try { this._map.remove(); } catch (e) {} this._map = null; }
const c = this._c, el = document.createElement("os-leaflet-map");
const hrs = this._hours || parseInt((() => { try { return localStorage.getItem("os-person-hours"); } catch (e) { return null; } })() || "24", 10);
el.setConfig({ hours: hrs, people: [{ id: c.person, tracker: c.tracker, color: c.color, name: c.name, initial: c.initial }] });
this._map = el;
const w = this.shadowRoot.getElementById("mapw"); w.insertBefore(el, w.firstChild);
el.hass = this._hass;
this._mapP = false;
if (!this.__osSegHook) {
this.__osSegHook = true;
this.shadowRoot.addEventListener("click", (e) => {
const b = e.target.closest && e.target.closest("#seg button"); if (!b) return;
const hv = parseInt(b.dataset.h, 10); setTimeout(() => { if (this._map && this._map.setRange) this._map.setRange(hv); }, 0);
});
}
};
const lock = (P, fn) => { try { Object.defineProperty(P, "_mountMap", { configurable: true, get: () => fn, set: () => {} }); } catch (e) { P._mountMap = fn; } };
const deep = (root, sel, out = []) => { root.querySelectorAll("*").forEach((el) => { if (el.matches(sel)) out.push(el); if (el.shadowRoot) deep(el.shadowRoot, sel, out); }); return out; };
const remount = (tag) => { try { deep(document, tag).forEach((el) => { if (el._hass && el._c && !(el._map && el._map.tagName === "OS-LEAFLET-MAP")) { el._mapP = false; el._mountMap(); } }); } catch (e) {} };
[["os-family-map", mountFamily], ["os-person-page", mountPerson]].forEach(([tag, fn]) => {
customElements.whenDefined(tag).then(() => setTimeout(() => { lock(customElements.get(tag).prototype, fn); [0, 1500, 4000].forEach((t) => setTimeout(() => remount(tag), t)); }, 0));
});
})();
