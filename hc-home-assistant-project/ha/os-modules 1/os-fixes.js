/* Clark Home OS - refinements layered on the page modules */
(() => {
let seq = 0;
const patch = (tag, fn) => { const key = "__osFix" + (seq++); customElements.whenDefined(tag).then(() => { const P = customElements.get(tag).prototype; if (!P[key]) { P[key] = true; fn(P); } }); };
/* 1. Maps inside person / family pages: re-fit once the card has its real size */
const kickMap = (card) => {
const run = () => { const hm = card && card.shadowRoot && card.shadowRoot.querySelector("ha-map"); if (hm && hm.leafletMap) { hm.leafletMap.invalidateSize(); if (hm.fitMap) hm.fitMap(); } };
[250, 800, 1800, 4000].forEach((t) => setTimeout(run, t));
};
["os-person-page", "os-family-map"].forEach((tag) => patch(tag, (P) => {
const orig = P._mountMap;
P._mountMap = async function () { await orig.apply(this, arguments); kickMap(this._map); };
const conn = P.connectedCallback;
P.connectedCallback = function () { if (conn) conn.apply(this, arguments); if (this._map) kickMap(this._map); };
}));
patch("os-person-page", (P) => {
const b = P._build;
P._build = function () { b.apply(this, arguments); const l = this.shadowRoot.querySelector(".mapw .lbl"); if (l) { l.style.left = "auto"; l.style.right = "12px"; } };
});
/* 2. Media: never open on a speaker that is offline */
patch("os-media-app", (P) => {
const t = P._target, s = P._select;
P._target = function () {
const r = t.apply(this, arguments);
if (r && !this._userSel && this._hass.states[r.id] && this._hass.states[r.id].state === "unavailable") {
const alt = this._players().find((p) => p.kind !== "tv" && this._hass.states[p.id].state !== "unavailable");
if (alt) { this._sel = alt.id; return alt; }
}
return r;
};
P._select = function () { this._userSel = true; return s.apply(this, arguments); };
const g = P._grid;
P._grid = function () { return g.apply(this, arguments).replace(/size=0(?=")/g, "size=256"); };
});
/* 3. Radar: clean Esri dark canvas instead of CARTO, and a simple time label instead of the legend */
const swap = (L) => {
if (!L || L.__osFix || !L.tileLayer) return;
L.__osFix = true;
const tl = L.tileLayer;
L.tileLayer = function (url, opts) {
if (typeof url === "string" && url.includes("dark_nolabels")) { url = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"; opts = Object.assign({}, opts, { subdomains: "", detectRetina: false, maxZoom: 16 }); }
else if (typeof url === "string" && url.includes("dark_only_labels")) { url = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"; opts = Object.assign({}, opts, { subdomains: "", opacity: 1, maxZoom: 16 }); }
return tl.call(this, url, opts);
};
};
let cur = window.L;
if (cur) swap(cur);
try { Object.defineProperty(window, "L", { configurable: true, get() { return cur; }, set(v) { cur = v; swap(v); } }); } catch (e) {}
patch("os-radar", (P) => {
const b = P._build;
P._build = function () { b.apply(this, arguments); const lg = this.shadowRoot.querySelector(".legend"); if (lg) { lg.classList.remove("legend"); lg.textContent = "Past 2 hours"; } };
});
/* 4. Weather: show the expected rain amount when the forecast has no rain chance */
patch("os-weather-page", (P) => {
const r = P._renderStats;
P._renderStats = function () {
r.apply(this, arguments);
const d0 = (this._daily || [])[0];
if (!d0 || d0.precipitation_probability != null || d0.precipitation == null || !this.shadowRoot) return;
const tile = this.shadowRoot.querySelectorAll("#stats .st")[3];
if (!tile) return;
const amt = parseFloat(d0.precipitation) || 0;
const unit = (this._hass.states[this._c.entity].attributes.precipitation_unit) || "in";
tile.querySelector(".v").innerHTML = `${amt === 0 ? "0" : amt < 0.1 ? amt.toFixed(2) : amt.toFixed(1)}<small>${unit}</small>`;
tile.querySelector(".s").textContent = amt === 0 ? "None today" : "Today";
this._statsHtml = null;
};
});
/* 5. Map: give every person a fixed colour and use it for their trail, marker ring and name */
const setCols = (el, list) => list.forEach((c, i) => { if (c) { el.style.setProperty("--graph-color-" + (i + 1), c); el.style.setProperty("--color-" + (i + 1), c); } });
patch("os-family-map", (P) => {
const b = P._build, r = P._render;
P._build = function () { b.apply(this, arguments); setCols(this, (this._c.people || []).map((p) => p.color)); };
P._render = function () {
r.apply(this, arguments);
const by = {}; (this._c.people || []).forEach((p) => { by[p.path || ""] = p.color; });
this.shadowRoot.querySelectorAll(".row").forEach((row) => {
const c = by[row.dataset.path || ""]; if (!c) return;
const n = row.querySelector(".n"), av = row.querySelector(".av");
if (n) n.style.color = c;
if (av) av.style.boxShadow = `0 0 0 3px #121214, 0 0 0 5px ${c}`;
});
};
});
patch("os-person-page", (P) => {
const b = P._build;
P._build = function () { b.apply(this, arguments); if (this._c.color) setCols(this, [this._c.color]); };
});
/* 6. Faster family updates: reload Places every minute, and ask Life360 for a fresh fix when a page opens */
const askL360 = (h, ids) => {
const now = Date.now(); window.__osL360 = window.__osL360 || {};
const go = ids.filter((id) => id && h.states[id] && h.states[id].state !== "home" && now - (window.__osL360[id] || 0) > 120000);
if (!go.length) return; go.forEach((id) => { window.__osL360[id] = now; });
h.connection.sendMessagePromise({ type: "call_service", domain: "life360", service: "update_location", target: { entity_id: go } }).catch(() => {});
};
const l360Of = (h, pid) => { const p = pid && h.states[pid]; return ((p && p.attributes.device_trackers) || []).filter((t) => t.includes("life360")); };
patch("os-person-page", (P) => {
const c = P.connectedCallback, d = P.disconnectedCallback;
P.connectedCallback = function () {
if (c) c.apply(this, arguments);
clearInterval(this._fast); this._fast = setInterval(() => { if (this._hass) this._loadPlaces(); }, 60000);
setTimeout(() => { if (this._hass && this._c) askL360(this._hass, l360Of(this._hass, this._c.entity || this._c.person)); }, 400);
};
P.disconnectedCallback = function () { clearInterval(this._fast); if (d) d.apply(this, arguments); };
});
patch("os-family-map", (P) => {
const c = P.connectedCallback;
P.connectedCallback = function () {
if (c) c.apply(this, arguments);
setTimeout(() => { const h = this._hass; if (h) askL360(h, Object.keys(h.states).filter((id) => id.startsWith("device_tracker.life360_"))); }, 400);
};
});
/* 7. Media: clear, friendly messages instead of Home Assistant's raw error, and hide favorites mixes until there are favorites */
patch("os-media-app", (P) => {
const pl = P._play, g2 = P._grid;
P._grid = function (items) {
if (window.__osFav === undefined && this._hass) {
window.__osFav = null;
this._call("get_library", { media_type: "track", favorite: true, limit: 1 }).then((r) => { window.__osFav = !!(r && r.items && r.items.length); if (window.__osFav) { this._cache = {}; } }).catch(() => { window.__osFav = undefined; });
}
if (!window.__osFav) items = (items || []).filter((i) => !(i.media_type === "playlist" && /favorit/i.test(i.name || "")));
return g2.call(this, items);
};
P._play = async function (it) {
const t = this._target();
if (!t || t.kind === "tv" || t.kind === "alexa") return pl.apply(this, arguments);
it.classList.add("busy"); setTimeout(() => it.classList.remove("busy"), 1400);
const d = it.dataset;
try {
await this._hass.connection.sendMessagePromise({ type: "call_service", domain: "music_assistant", service: "play_media", service_data: { media_id: d.uri, media_type: d.type }, target: { entity_id: t.id } });
this._toast(`Playing ${d.name} on ${t.name}`);
} catch (e) {
const m = String((e && (e.message || e.code)) || "");
this._toast(/nothing to play/i.test(m) ? "Your music library is offline right now" : `Couldn't play on ${t.name}`);
}
};
});
/* 8. At a Glance: package alert, and the latest Amazon delivery (tap opens every order) */
const GL_CSS = `.r.x-pkg{grid-template-columns:36px minmax(0,1fr) auto;}
.r.x-pkg .i{background:rgba(255,159,10,0.18);color:#ff9f0a;}
.r.x-amz .i.pic{background:#fff;overflow:hidden;}
.r.x-amz .i.pic img{width:100%;height:100%;object-fit:contain;padding:5px;box-sizing:border-box;display:block;}
.clr{height:32px;padding:0 14px;border-radius:999px;border:none;background:rgba(255,255,255,0.10);color:#f5f5f7;font:600 14px var(--os-font,system-ui);cursor:pointer;-webkit-tap-highlight-color:transparent;}
.clr:active{transform:scale(0.94);background:rgba(255,255,255,0.18);}`;
const ago = (d) => { const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + " min ago" : s < 86400 ? Math.floor(s / 3600) + " hr ago" : Math.floor(s / 86400) + " days ago"; };
const AMZ = window.__osAmz = window.__osAmz || { items: null, subs: new Set(), on: false };
const amzStart = (h, ent) => {
if (AMZ.on || !h || !h.connection) return; AMZ.on = true;
const set = (list) => { AMZ.items = Array.isArray(list) ? list : []; AMZ.subs.forEach((el) => { if (!el.isConnected) { AMZ.subs.delete(el); return; } try { el._render(); } catch (e) {} }); };
if (!h.states[ent]) { AMZ.items = []; AMZ.on = false; return; }
h.connection.subscribeMessage((m) => set(m && m.items), { type: "todo/item/subscribe", entity_id: ent })
.catch(() => h.connection.sendMessagePromise({ type: "todo/item/list", entity_id: ent }).then((r) => set(r && r.items)).catch(() => set([])));
};
const AMZ_IMG = /^https:\/\/([a-z0-9-]+\.)*(media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com)\//i;
const AMZ_COL = { out: "#0a84ff", delayed: "#ff9f0a", delivered: "#30d158" };
const aDay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const aTs = (s) => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d : null; };
const aDiff = (d) => { const x = new Date(d), n = new Date(); x.setHours(0, 0, 0, 0); n.setHours(0, 0, 0, 0); return Math.round((x - n) / 864e5); };
const aWhen = (d) => { const n = aDiff(d); return n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n > 1 && n < 7 ? d.toLocaleDateString(undefined, { weekday: "long" }) : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); };
const amzPick = (list) => {
const os = (list || []).map((it) => {
let j = {}; try { j = JSON.parse(it.description || "{}") || {}; } catch (e) { j = {}; }
const items = (Array.isArray(j.items) ? j.items : []).filter((x) => x && String(x.n || "").trim());
let s = String(j.s || "").toLowerCase();
if (!["ordered", "shipped", "out", "delivered", "delayed", "cancelled", "return"].includes(s)) s = it.status === "completed" ? "delivered" : "ordered";
const hh = j.h || {}, eta = aDay(j.eta || it.due), by = String(j.eta_txt || "").trim();
const dl = aTs(hh.delivered), upd = aTs(j.upd) || dl || aTs(hh.out) || aTs(hh.shipped) || aTs(hh.ordered);
const n = items.length ? String(items[0].n).trim() : "Amazon order";
let line;
if (s === "delivered") line = dl ? `Delivered ${aWhen(dl)}, ${dl.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "Delivered";
else if (s === "out") line = `Out for delivery${by ? " · Arriving " + by : ""}`;
else if (s === "delayed") line = eta ? `Running late · Now ${aWhen(eta)}${by ? " " + by : ""}` : "Running late";
else if (s === "cancelled" || s === "return") line = s === "cancelled" ? "Cancelled" : "Return in progress";
else line = eta ? `Arriving ${aWhen(eta)}${by ? " " + by : ""}` : s === "shipped" ? "Shipped" : "Ordered";
if (items.length > 1) line += ` · ${items.length} items`;
const img = items.length && AMZ_IMG.test(String(items[0].img || "")) ? String(items[0].img) : "";
return { s, eta, upd, name: n, line, img };
});
const rank = { out: 0, delayed: 1, shipped: 2, ordered: 3 };
const act = os.filter((o) => o.s in rank).sort((x, y) => (x.s === "out") !== (y.s === "out") ? (x.s === "out" ? -1 : 1) : ((x.eta ? x.eta.getTime() : 9e15) - (y.eta ? y.eta.getTime() : 9e15)) || rank[x.s] - rank[y.s]);
if (act.length) return act[0];
const recent = os.filter((o) => o.s === "delivered" && o.upd && Date.now() - o.upd.getTime() < 7 * 864e5).sort((x, y) => y.upd - x.upd);
return recent[0] || null;
};
const mkRow = (cls, icon, a, b, nav, color) => {
const r = document.createElement("div"); r.className = "r " + cls; if (nav) r.dataset.nav = nav;
r.innerHTML = `<div class="i"${color ? ` style="color:${color}"` : ""}><ha-icon icon="${icon}"></ha-icon></div><div style="min-width:0"><div class="a"></div><div class="b"></div></div>`;
r.querySelector(".a").textContent = a; r.querySelector(".b").textContent = b; return r;
};
patch("os-glance", (P) => {
const r0 = P._render;
P._render = function () {
r0.apply(this, arguments);
const h = this._hass, c = this._c || {}, sr = this.shadowRoot; if (!h || !sr) return;
const rows = sr.getElementById("rows"); if (!rows) return;
if (!sr.getElementById("glx")) { const st = document.createElement("style"); st.id = "glx"; st.textContent = GL_CSS; sr.appendChild(st); }
rows.querySelectorAll(".r:not(.x-pkg):not(.x-amz)").forEach((n) => { const ic = n.querySelector("ha-icon"); if (ic && ic.getAttribute("icon") === "mdi:wifi") n.remove(); });
const pk = h.states[c.package || "input_boolean.front_door_package"];
let pr = rows.querySelector(".x-pkg");
if (pk && pk.state === "on") {
const nt = h.states[c.package_note || "input_text.front_door_package_note"];
const note = (nt && nt.state && nt.state !== "unknown") ? nt.state + " · " : "";
if (!pr || pr.dataset.k !== note + pk.last_changed) {
if (pr) pr.remove();
pr = mkRow("x-pkg", "mdi:package-variant-closed", "Package at the front door", "", c.cameras_path); pr.dataset.k = note + pk.last_changed;
const b = document.createElement("button"); b.className = "clr"; b.textContent = "Got it";
const row = pr;
b.addEventListener("click", (e) => { e.stopPropagation(); row.remove(); rows.querySelectorAll(".r").forEach((n, i) => { n.style.display = i < 4 ? "" : "none"; }); h.callService("input_boolean", "turn_off", { entity_id: pk.entity_id }); });
pr.appendChild(b);
}
if (rows.firstElementChild !== pr) rows.prepend(pr);
const bt = note + ago(pk.last_changed); if (pr.querySelector(".b").textContent !== bt) pr.querySelector(".b").textContent = bt;
} else if (pr) pr.remove();
const ar = rows.querySelector(".x-amz");
const ent = c.orders || "todo.amazon_orders";
AMZ.subs.add(this); amzStart(h, ent);
if (AMZ.items !== null) {
const o = amzPick(AMZ.items);
const nav = c.orders_path || (location.pathname.indexOf("/mobile-dashboard") === 0 ? "/mobile-dashboard/orders" : "/claude-test-dashboard/orders");
const v = o ? { a: o.name, b: o.line, img: o.img, ic: o.s === "delivered" ? "mdi:package-variant-closed-check" : "mdi:package-variant-closed", col: AMZ_COL[o.s] || "" }
: { a: "Amazon", b: "No orders on the way", img: "", ic: "mdi:package-variant", col: "" };
const k = [v.a, v.b, v.img, v.ic, v.col, nav].join("|");
let nr = ar;
if (!nr || nr.dataset.k !== k) {
nr = mkRow("x-amz", v.ic, v.a, v.b, nav, v.col); nr.dataset.k = k;
if (v.img) {
const box = nr.querySelector(".i"), im = document.createElement("img");
im.alt = ""; im.decoding = "async"; im.referrerPolicy = "no-referrer";
im.onerror = () => { box.classList.remove("pic"); box.innerHTML = `<ha-icon icon="${v.ic}"></ha-icon>`; };
im.src = v.img; box.classList.add("pic"); box.innerHTML = ""; box.appendChild(im);
}
if (ar) ar.replaceWith(nr);
}
const sun = [...rows.querySelectorAll(".r")].find((n) => { const ic = n.querySelector("ha-icon"); return ic && /weather-sunset/.test(ic.getAttribute("icon") || ""); });
if (sun ? nr.nextElementSibling !== sun : rows.lastElementChild !== nr) rows.insertBefore(nr, sun || null);
}
rows.querySelectorAll(".r").forEach((n, i) => { n.style.display = i < 4 ? "" : "none"; });
};
});
/* 9. os-switch: optional periodic re-check (for time-based cases) and a LIVE badge while a case is showing */
patch("os-switch", (P) => {
const cc = P.connectedCallback, dc = P.disconnectedCallback, sw = P._swap;
const hd = Object.getOwnPropertyDescriptor(P, "hass");
const arm = (el) => { const s = el._c && el._c.recheck; if (s && !el._rc && el.isConnected) el._rc = setInterval(() => { if (el._hass) el.hass = el._hass; }, s * 1000); };
Object.defineProperty(P, "hass", { configurable: true, get() { return this._hass; }, set(v) { hd.set.call(this, v); arm(this); } });
P.connectedCallback = function () { if (cc) cc.apply(this, arguments); arm(this); };
P.disconnectedCallback = function () { clearInterval(this._rc); this._rc = null; if (dc) dc.apply(this, arguments); };
P._swap = async function (i) {
await sw.apply(this, arguments);
if (!this._c || !this._c.badge || i < 0 || this._cur !== i || this.querySelector(".os-badge")) return;
const b = document.createElement("div"); b.className = "os-badge";
b.style.cssText = "position:absolute;top:14px;right:14px;z-index:3;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,0.45);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);color:#fff;font:600 12px var(--os-font,system-ui);letter-spacing:0.04em;";
const dot = document.createElement("span"); dot.style.cssText = "width:7px;height:7px;border-radius:50%;background:#ff453a;display:inline-block;";
b.appendChild(dot); b.appendChild(document.createTextNode(this._c.badge));
this.style.position = "relative"; this.appendChild(b);
};
});
})();
