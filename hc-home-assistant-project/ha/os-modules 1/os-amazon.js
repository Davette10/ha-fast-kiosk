/* Clark Home OS - Amazon orders (tablet and phone), in the style of Apple Wallet order tracking.
   Reads the Local To-do list that the email automation fills (default todo.amazon_orders).
   Each to-do item is one order: summary = order number, description = JSON written by the automation:
   {"items":[{"n":"Item name","img":"https://m.media-amazon.com/..."}],"s":"shipped","eta":"2026-10-18",
    "eta_txt":"by 10 PM","total":"$24.99","carrier":"Amazon","h":{"ordered":"ISO","shipped":"ISO","out":"ISO","delivered":"ISO"},"upd":"ISO"}
   Statuses: ordered, shipped, out, delivered, delayed, cancelled, return.
   Config: entity, fill (tablet: card fills its cell and never scrolls; three columns, extras fold into "N more"), compact (phone). */
(() => {
if (customElements.get("os-amazon")) return;
const FONT = 'var(--os-font, -apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif)';
const FONT_D = 'var(--os-font-display, -apple-system, "SF Pro Display", Inter, system-ui, "Segoe UI", Roboto, sans-serif)';
const SPRING = "cubic-bezier(0.2, 0.9, 0.25, 1)";
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ORDER_RE = /^\d{3}-\d{7}-\d{7}$/;
const IMG_OK = /^https:\/\/([a-z0-9-]+\.)*(media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com)\//i;
const STEPS = ["ordered", "shipped", "out", "delivered"];
const LABEL = { ordered: "Ordered", shipped: "Shipped", out: "Out for Delivery", delivered: "Delivered", delayed: "Running Late", cancelled: "Cancelled", return: "Return" };
const STEP_LABEL = { ordered: "Ordered", shipped: "Shipped", out: "Out for Delivery", delivered: "Delivered" };
const ACCENT_DK = { out: "10,132,255", delivered: "48,209,88", delayed: "255,159,10", cancelled: "142,142,147", return: "142,142,147" };
const ACCENT_LT = { out: "0,113,227", delivered: "36,138,61", delayed: "201,52,0", cancelled: "110,110,115", return: "110,110,115" };
let ACCENT = ACCENT_DK;
const WEEK = 7 * 864e5;

const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const parseDay = (s) => { if (!s) return null; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (!m) return null; return new Date(+m[1], +m[2] - 1, +m[3]); };
const parseTs = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };
const dayDiff = (d) => Math.round((dayStart(d) - dayStart(new Date())) / 864e5);
const fmtDay = (d) => {
const n = dayDiff(d);
if (n === 0) return "Today"; if (n === 1) return "Tomorrow"; if (n === -1) return "Yesterday";
if (n > 1 && n < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const fmtWhen = (d) => { const n = dayDiff(d); const t = fmtTime(d); if (n === 0) return `Today, ${t}`; if (n === -1) return `Yesterday, ${t}`; return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${t}`; };

/* one to-do item -> one order object */
const toOrder = (it) => {
let j = {};
try { j = JSON.parse(it.description || "{}") || {}; } catch (e) { j = {}; }
const items = (Array.isArray(j.items) ? j.items : []).map((x) => ({ n: String((x && x.n) || "").trim(), img: x && IMG_OK.test(String(x.img || "")) ? String(x.img) : "" })).filter((x) => x.n);
let s = String(j.s || "").toLowerCase();
if (!LABEL[s]) s = it.status === "completed" ? "delivered" : "ordered";
const num = String(it.summary || "").trim();
const h = {}; Object.keys(j.h || {}).forEach((k) => { const d = parseTs(j.h[k]); if (d) h[k] = d; });
return {
uid: it.uid, num, valid: ORDER_RE.test(num), items, s, h,
eta: parseDay(j.eta || it.due), eta_txt: String(j.eta_txt || "").trim(),
total: String(j.total || "").trim(), carrier: String(j.carrier || "").trim(),
upd: parseTs(j.upd) || h.delivered || h.out || h.shipped || h.ordered || null,
};
};
const title = (o) => { if (!o.items.length) return o.valid ? `Order ${o.num}` : o.num || "Amazon order"; const f = o.items[0].n; return o.items.length > 1 ? `${f}` : f; };
const more = (o) => (o.items.length > 1 ? `and ${o.items.length - 1} more item${o.items.length > 2 ? "s" : ""}` : "");
const active = (o) => !["delivered", "cancelled", "return"].includes(o.s);
const today = (o) => active(o) && (o.s === "out" || (o.eta && dayDiff(o.eta) <= 0));
/* the sentence under the item name */
const line = (o) => {
if (o.s === "delivered") return o.h.delivered ? `Delivered ${fmtWhen(o.h.delivered).replace(/^Today/, "today").replace(/^Yesterday/, "yesterday")}` : "Delivered";
if (o.s === "cancelled") return "Cancelled";
if (o.s === "return") return "Return or refund in progress";
const when = o.eta ? fmtDay(o.eta) : "";
const by = o.eta_txt ? ` ${o.eta_txt}` : "";
if (o.s === "out") return `Out for delivery · Arriving today${by}`;
if (o.s === "delayed") return when ? `Running late · Now arriving ${when.toLowerCase() === "today" || when.toLowerCase() === "tomorrow" ? when.toLowerCase() : when}${by}` : "Running late";
if (!when) return o.s === "shipped" ? "Shipped" : "Ordered";
const w = /^(Today|Tomorrow)$/.test(when) ? when.toLowerCase() : when;
return `Arriving ${w}${by}`;
};
const stepIdx = (o) => (o.s === "delayed" ? (o.h.shipped ? 1 : 0) : STEPS.indexOf(o.s));
const isLight = () => { const l = document.documentElement.getAttribute("data-os-mode") === "light"; ACCENT = l ? ACCENT_LT : ACCENT_DK; return l; };
const haptic = (el, kind) => { try { el.dispatchEvent(new CustomEvent("haptic", { detail: kind || "light", bubbles: true, composed: true })); } catch (e) {} };

const SHARED = `
*{box-sizing:border-box;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
ha-icon{display:inline-flex;flex:none;}
.thumb{flex:none;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;}
.thumb img{width:100%;height:100%;object-fit:contain;padding:6px;}
.thumb.no{background:var(--os-glass-inner,rgba(255,255,255,0.08));color:var(--os-text-3,#6e6e73);}
.thumb .ct{position:absolute;right:4px;bottom:4px;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:rgba(29,29,31,0.82);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums;}
.trk{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;}
.trk i{display:block;height:4px;border-radius:2px;background:var(--os-glass-inner,rgba(255,255,255,0.12));transition:background-color 400ms ease;}
.trk i.on{background:var(--os-text,#f5f5f7);}
.trk i.now{background:rgb(var(--ac,245,245,247));}
`;

class OsAmazon extends HTMLElement {
setConfig(c) {
this._c = Object.assign({ entity: "todo.amazon_orders", fill: false, compact: false }, c || {});
this._orders = null; this._hidden = new Set();
if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
}
getCardSize() { return 8; }
getGridOptions() { return { columns: "full", rows: "auto" }; }
set hass(h) {
const first = !this._hass;
this._hass = h;
this.classList.toggle("lt", isLight());
const st = h.states[this._c.entity];
if (first || this._subFor !== this._c.entity || (st && !this._unsub)) this._subscribe();
else if (!st && this._orders !== null) { this._drop(); this._orders = null; this._render(); }
}
connectedCallback() {
this._tick = setInterval(() => { this.classList.toggle("lt", isLight()); if (this._orders) this._render(); }, 60000);
if (this._hass && !this._unsub) this._subscribe();
this._ro = this._ro || new ResizeObserver(() => { const n = this.clientWidth < 700, hh = this.clientHeight; if (n !== this._narrow || (!n && this._c.fill && Math.abs(hh - (this._hh || 0)) > 4)) { this._narrow = n; this._hh = hh; this._render(); } });
this._ro.observe(this);
}
disconnectedCallback() {
clearInterval(this._tick);
if (this._ro) this._ro.disconnect();
this._drop();
if (this._sheet) this._sheet.close(true);
}
_drop() { const u = this._unsub; this._unsub = null; this._subFor = null; if (u) Promise.resolve(u).then((f) => { try { f && f(); } catch (e) {} }).catch(() => {}); }
_subscribe() {
const h = this._hass; if (!h || !h.connection) return;
this._drop();
this._subFor = this._c.entity;
if (!h.states[this._c.entity]) { this._orders = null; this._render(); return; }
try {
this._unsub = h.connection.subscribeMessage((m) => { this._orders = ((m && m.items) || []).map(toOrder); this._render(); },
{ type: "todo/item/subscribe", entity_id: this._c.entity });
this._unsub.catch(() => this._poll());
} catch (e) { this._poll(); }
}
async _poll() {
const h = this._hass; if (!h) return;
try { const r = await h.callWS({ type: "todo/item/list", entity_id: this._c.entity }); this._orders = ((r && r.items) || []).map(toOrder); } catch (e) { this._orders = []; }
this._render();
}

/* ---------- layout ---------- */
_build() {
this.shadowRoot.innerHTML = `<style>
:host{display:block;font-family:${FONT};color:var(--os-text,#f5f5f7);-webkit-font-smoothing:antialiased;text-align:left;user-select:none;-webkit-user-select:none;}
:host([fill]){height:100%;}
${SHARED}
#wrap{display:flex;flex-direction:column;gap:28px;}
:host([fill]) #wrap{height:100%;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:24px;
-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent);}
:host([fill]) #wrap::-webkit-scrollbar{display:none;}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.stat{border-radius:22px;padding:20px 22px;min-height:118px;display:flex;flex-direction:column;justify-content:space-between;
background:var(--os-glass-bg,rgba(255,255,255,0.07));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.08));-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);}
.stat .k{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--os-text-2,#a1a1a6);letter-spacing:-0.01em;}
.stat .k ha-icon{--mdc-icon-size:20px;width:20px;height:20px;}
.stat .v{font-family:${FONT_D};font-size:48px;font-weight:300;line-height:1;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;}
.stat.hot .v{color:rgb(10,132,255);}
.sum{font-family:${FONT_D};font-size:17px;line-height:1.35;color:var(--os-text-2,#a1a1a6);letter-spacing:-0.01em;margin-top:-12px;}
.sum b{color:var(--os-text,#f5f5f7);font-weight:600;}
.grp{display:flex;flex-direction:column;gap:12px;}
.gh{display:flex;align-items:baseline;gap:8px;padding:0 4px;}
.gh h2{margin:0;font-family:${FONT_D};font-size:21px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;}
.gh span{font-size:15px;color:var(--os-text-2,#a1a1a6);font-variant-numeric:tabular-nums;}
.list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
:host(.nar) .list{grid-template-columns:minmax(0,1fr);gap:10px;}
.o{position:relative;display:grid;grid-template-columns:76px minmax(0,1fr) 20px;grid-template-rows:auto auto;column-gap:16px;row-gap:14px;align-items:center;
width:100%;padding:16px 16px 16px 16px;border-radius:22px;text-align:left;
background:var(--os-glass-bg,rgba(255,255,255,0.07));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.08));-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);
transition:transform 220ms ${SPRING},opacity 260ms ease;}
.o:active{transform:scale(0.98);transition-duration:90ms;}
.o .thumb{width:76px;height:76px;grid-row:1;}
.o .tx{min-width:0;grid-row:1;}
.o .ti{font-family:${FONT_D};font-size:17px;font-weight:600;letter-spacing:-0.015em;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.o .mo{font-size:13px;color:var(--os-text-3,#8e8e93);margin-top:2px;}
.o .st{display:flex;align-items:center;gap:6px;font-size:15px;color:var(--os-text-2,#a1a1a6);margin-top:5px;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}
.o .st b{font-weight:600;color:rgb(var(--ac,245,245,247));}
.o .st .dot{width:7px;height:7px;border-radius:50%;background:rgb(var(--ac,245,245,247));flex:none;}
.o .chev{grid-row:1;color:var(--os-text-3,#6e6e73);--mdc-icon-size:20px;}
.o .trk{grid-column:1 / -1;grid-row:2;}
.o.done{opacity:0.72;}
.o.done .trk{display:none;}
.o.done{grid-template-rows:auto;}
.o.gone{opacity:0;transform:scale(0.96);}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:64px 24px;border-radius:24px;
background:var(--os-glass-bg,rgba(255,255,255,0.07));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.08));-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);}
:host([fill]) .empty{flex:1;}
.empty ha-icon{--mdc-icon-size:44px;width:44px;height:44px;color:var(--os-text-3,#6e6e73);margin-bottom:6px;}
.empty h3{margin:0;font-family:${FONT_D};font-size:21px;font-weight:600;letter-spacing:-0.01em;}
.empty p{margin:0;font-size:15px;line-height:1.45;color:var(--os-text-2,#a1a1a6);max-width:420px;}
.toast{position:sticky;bottom:12px;align-self:center;display:flex;align-items:center;gap:14px;height:48px;padding:0 8px 0 20px;border-radius:24px;font-size:15px;font-weight:500;
background:var(--os-lens-bg,rgba(44,44,46,0.92));color:#f5f5f7;box-shadow:0 8px 30px rgba(0,0,0,0.35);-webkit-backdrop-filter:var(--os-pill-filter,blur(20px));backdrop-filter:var(--os-pill-filter,blur(20px));
transition:opacity 220ms ease,transform 260ms ${SPRING};}
.toast.hide{opacity:0;transform:translateY(12px);pointer-events:none;}
.toast button{height:36px;padding:0 16px;border-radius:18px;background:rgba(255,255,255,0.16);font-weight:600;}
:host(.lt) .thumb.no{background:rgba(0,0,0,0.05);}
:host(.lt) .o .st b,:host(.lt) .o .st .dot{filter:saturate(1.1) brightness(0.92);}
:host(.nar) .stats{display:none;}
:host(:not(.nar)) .sum{display:none;}
:host(.nar) #wrap{gap:24px;}
:host(.nar) .o{grid-template-columns:64px minmax(0,1fr) 16px;column-gap:14px;padding:14px;border-radius:18px;}
:host(.nar) .o .thumb{width:64px;height:64px;border-radius:10px;}
:host(.nar) .o .ti{font-size:16px;}
:host(.nar) .o .st{font-size:14px;white-space:normal;display:block;line-height:1.35;}
:host(.nar) .o .st .dot{display:inline-block;margin:0 6px 1px 0;vertical-align:middle;}
:host([fill]:not(.nar)) #wrap{overflow:hidden;-webkit-mask-image:none;mask-image:none;padding-bottom:0;}
.lanes{flex:1;min-height:0;height:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.lane{min-height:0;display:flex;flex-direction:column;gap:10px;}
.lh{flex:none;display:flex;align-items:flex-end;gap:12px;height:64px;padding:0 6px 8px;}
.lh .v{font-family:${FONT_D};font-size:52px;font-weight:300;line-height:0.9;letter-spacing:-0.035em;font-variant-numeric:tabular-nums;}
.lh .k{font-size:17px;font-weight:600;letter-spacing:-0.01em;color:var(--os-text-2,#a1a1a6);padding-bottom:3px;}
.lane.hot .lh .v{color:rgb(var(--hot,10,132,255));}
.lb{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px;overflow:hidden;}
.lanes .o{height:110px;padding:14px;column-gap:14px;row-gap:12px;grid-template-columns:64px minmax(0,1fr) 16px;border-radius:20px;}
.lanes .o .thumb{width:64px;height:64px;border-radius:12px;}
.lanes .o .ti{font-size:16px;-webkit-line-clamp:1;white-space:nowrap;text-overflow:ellipsis;display:block;}
.lanes .o .mo{margin-top:1px;}
.lanes .o .st{font-size:14px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3;margin-top:3px;}
.lanes .o .st .dot{display:inline-block;margin:0 6px 1px 0;vertical-align:middle;}
.lanes .o.done{height:84px;}
.lanes .o.done .thumb{width:56px;height:56px;}
.lanes .o.done{grid-template-columns:56px minmax(0,1fr) 16px;}
.mr{flex:none;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:var(--os-text-2,#a1a1a6);
background:var(--os-glass-inner,rgba(255,255,255,0.06));transition:transform 200ms ${SPRING};}
.mr:active{transform:scale(0.97);transition-duration:90ms;}
.mr ha-icon{--mdc-icon-size:18px;}
.ln{flex:1;min-height:120px;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:20px;
color:var(--os-text-3,#6e6e73);font-size:15px;box-shadow:inset 0 0 0 1px var(--os-hairline,rgba(255,255,255,0.07));}
.ln ha-icon{--mdc-icon-size:30px;width:30px;height:30px;opacity:0.8;}
.lanes + .toast{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);}
.lanes + .toast.hide{transform:translate(-50%,12px);}
:host([fill]) #wrap{position:relative;}
@media (prefers-reduced-motion: reduce){.o,.toast{transition:opacity 180ms ease !important;}.o:active{transform:none;}}
</style><div id="wrap"></div>`;
this._wrap = this.shadowRoot.getElementById("wrap");
this._wrap.addEventListener("click", (e) => {
const b = e.target.closest(".o"); if (b) { haptic(this, "light"); this._open(b.dataset.uid, b); return; }
if (e.target.closest("#undo")) { this._undo(); return; }
const m = e.target.closest(".mr"); if (m) { haptic(this, "light"); this._more(m.dataset.lane); }
});
if (this._c.fill) this.setAttribute("fill", ""); else this.removeAttribute("fill");
}
_render() {
if (!this._wrap) return;
if (this._c.fill) this.setAttribute("fill", ""); else this.removeAttribute("fill");
isLight();
const nar = this._c.compact || this._narrow || this.clientWidth && this.clientWidth < 700;
this.classList.toggle("nar", !!nar);
const h = this._hass;
if (!h) return;
if (!h.states[this._c.entity]) {
this._wrap.innerHTML = this._empty("mdi:email-outline", "Connect your email", "Amazon orders show up here once Home Assistant can read Amazon's order emails.");
return;
}
if (this._orders === null) { this._wrap.innerHTML = ""; return; }
const now = Date.now();
const all = this._orders.filter((o) => !this._hidden.has(o.uid));
const act = all.filter(active);
const tod = act.filter(today).sort((a, b) => (a.s === "out" ? -1 : 0) - (b.s === "out" ? -1 : 0));
const way = act.filter((o) => !today(o)).sort((a, b) => (a.eta ? +a.eta : 9e15) - (b.eta ? +b.eta : 9e15));
const recent = all.filter((o) => !active(o) && (!o.upd || now - o.upd < WEEK)).sort((a, b) => (b.upd || 0) - (a.upd || 0));
const del = recent.filter((o) => o.s === "delivered");
if (!nar && this._c.fill) { this._lanes(tod, way, recent, del); return; }
let html = "";
html += `<div class="stats">
${this._stat("mdi:truck-fast-outline", "Arriving Today", tod.length, tod.length > 0)}
${this._stat("mdi:package-variant-closed", "On the Way", way.length)}
${this._stat("mdi:check-circle-outline", "Delivered This Week", del.length)}
</div>`;
const parts = [];
if (tod.length) parts.push(`<b>${tod.length} ${tod.length === 1 ? "package" : "packages"}</b> arriving today`);
if (way.length) parts.push(`${way.length} on the way`);
if (!parts.length && del.length) parts.push(`${del.length} delivered this week`);
if (parts.length) html += `<div class="sum">${parts.join(" · ")}</div>`;
if (!tod.length && !way.length && !recent.length) {
html += this._empty("mdi:package-variant-closed", "No orders on the way", "New Amazon orders appear here automatically, a minute or two after Amazon's email arrives.");
} else {
if (tod.length) html += this._group("Arriving Today", tod);
if (way.length) html += this._group("On the Way", way);
if (recent.length) html += this._group("Delivered", recent, true);
}
html += `<div class="toast ${this._last ? "" : "hide"}"><span>Order removed</span><button id="undo">Undo</button></div>`;
this._wrap.innerHTML = html;
if (this._sheet && this._sheet.uid) { const o = this._orders.find((x) => x.uid === this._sheet.uid); if (o) this._sheet.update(o); }
}
/* tablet: three columns that always fit the screen; extra orders fold into "+N more" */
_lanes(tod, way, recent, del) {
if (!tod.length && !way.length && !recent.length) {
this._wrap.innerHTML = this._empty("mdi:package-variant-closed", "No orders on the way", "New Amazon orders appear here automatically, a minute or two after Amazon's email arrives.") + this._toast();
return;
}
this._laneData = { tod, way, rec: recent };
const L = [["tod", "Arriving Today", tod, tod.length, "mdi:truck-fast-outline", "Nothing arriving today"],
["way", "On the Way", way, way.length, "mdi:package-variant-closed", "Nothing else on the way"],
["rec", "Delivered", recent, recent.length, "mdi:check-circle-outline", "No deliveries this week"]];
this._wrap.innerHTML = `<div class="lanes">${L.map(([k, name, , n]) => `<section class="lane ${k === "tod" && n ? "hot" : ""}" data-k="${k}"><div class="lh"><span class="v">${n}</span><span class="k">${esc(name)}</span></div><div class="lb"></div></section>`).join("")}</div>${this._toast()}`;
L.forEach(([k, , list, , ic, none]) => {
const lb = this._wrap.querySelector(`.lane[data-k="${k}"] .lb`);
if (!list.length) { lb.innerHTML = `<div class="ln"><ha-icon icon="${ic}"></ha-icon>${esc(none)}</div>`; return; }
const done = k === "rec", ch = done ? 84 : 110, gap = 10, H = lb.clientHeight || 560;
let cap = Math.max(1, Math.floor((H + gap) / (ch + gap)));
let show = list.length;
if (list.length > cap) { show = Math.max(0, Math.floor((H - 52) / (ch + gap))); }
lb.innerHTML = list.slice(0, show).map((o) => this._card(o, done)).join("") +
(list.length > show ? `<button class="mr" data-lane="${k}">${show ? `${list.length - show} more` : `See all ${list.length}`}<ha-icon icon="mdi:chevron-right"></ha-icon></button>` : "");
});
}
_toast() { return `<div class="toast ${this._last ? "" : "hide"}"><span>Order removed</span><button id="undo">Undo</button></div>`; }
_more(k) {
const d = this._laneData || {}; const list = d[k] || [];
const name = { tod: "Arriving Today", way: "On the Way", rec: "Delivered" }[k];
if (!this._sheet) this._sheet = new Sheet(this);
this._sheet.showList(name, list);
}
_stat(ic, k, v, hot) { return `<div class="stat ${hot ? "hot" : ""}"><div class="k"><ha-icon icon="${ic}"></ha-icon>${esc(k)}</div><div class="v">${v}</div></div>`; }
_group(name, list, done) {
return `<section class="grp"><div class="gh"><h2>${esc(name)}</h2><span>${list.length}</span></div><div class="list">${list.map((o) => this._card(o, done)).join("")}</div></section>`;
}
_thumb(o, size) {
const im = o.items.find((x) => x.img);
const ct = o.items.length > 1 ? `<span class="ct">${o.items.length}</span>` : "";
if (im) return `<div class="thumb"><img src="${esc(im.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('no');this.remove()">${ct}</div>`;
return `<div class="thumb no"><ha-icon icon="mdi:package-variant-closed" style="--mdc-icon-size:${size || 30}px"></ha-icon>${ct}</div>`;
}
_card(o, done) {
const ac = ACCENT[o.s] || "245,245,247";
const ix = stepIdx(o);
const trk = STEPS.map((_, i) => `<i class="${i < ix ? "on" : i === ix ? (ACCENT[o.s] ? "now" : "on") : ""}"></i>`).join("");
const ln = esc(line(o));
const stTxt = ACCENT[o.s] && !done ? `<span class="dot"></span>${ln}` : ln;
return `<button class="o ${done ? "done" : ""}" data-uid="${esc(o.uid)}" style="--ac:${ac}" aria-label="${esc(title(o))}, ${ln}">
${this._thumb(o)}
<div class="tx"><div class="ti">${esc(title(o))}</div>${more(o) ? `<div class="mo">${esc(more(o))}</div>` : ""}<div class="st">${stTxt}</div></div>
<ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
<div class="trk" aria-hidden="true">${trk}</div></button>`;
}
_empty(ic, t, p) { return `<div class="empty"><ha-icon icon="${ic}"></ha-icon><h3>${esc(t)}</h3><p>${esc(p)}</p></div>`; }

/* ---------- detail sheet ---------- */
_open(uid, from) {
const o = (this._orders || []).find((x) => x.uid === uid); if (!o) return;
if (!this._sheet) this._sheet = new Sheet(this);
this._sheet.show(o, from);
}
_remove(o) {
this._hidden.add(o.uid);
clearTimeout(this._lastT);
this._last = o;
this._render();
this._lastT = setTimeout(() => this._commit(), 5000);
}
_undo() { if (!this._last) return; clearTimeout(this._lastT); this._hidden.delete(this._last.uid); this._last = null; this._render(); }
async _commit() {
const o = this._last; this._last = null;
if (!o) return;
try { await this._hass.callService("todo", "remove_item", { item: o.uid }, { entity_id: this._c.entity }); }
catch (e) { this._hidden.delete(o.uid); }
this._render();
}
}

/* The sheet lives in home-assistant's shadow root so blurred ancestors can't trap position:fixed,
   and so it still inherits the dashboard's colour tokens. It rises from the bottom and leaves the same way;
   drag the grabber or the top of the sheet down to dismiss (follows the finger, with momentum). */
class Sheet {
constructor(card) {
this.card = card;
const host = document.createElement("os-amazon-sheet");
const sr = host.attachShadow({ mode: "open" });
sr.innerHTML = `<style>
:host{position:fixed;inset:0;z-index:20;display:block;font-family:${FONT};color:var(--os-text,#f5f5f7);-webkit-font-smoothing:antialiased;pointer-events:none;text-align:left;}
:host(.open){pointer-events:auto;}
${SHARED}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,0.5);opacity:0;transition:opacity 320ms ease;}
:host(.open) .scrim{opacity:1;}
.sh{position:absolute;left:50%;bottom:0;width:min(600px,100%);max-height:88%;display:flex;flex-direction:column;border-radius:28px 28px 0 0;
background:var(--os-glass-bg-strong,rgba(36,36,38,0.82));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.1)),0 -10px 50px rgba(0,0,0,0.4);
-webkit-backdrop-filter:var(--os-glass-filter-strong,blur(44px) saturate(160%));backdrop-filter:var(--os-glass-filter-strong,blur(44px) saturate(160%));
transform:translate(-50%,105%);transition:transform 420ms ${SPRING};will-change:transform;touch-action:none;}
:host(.wide) .sh{bottom:auto;top:50%;border-radius:28px;max-height:86%;}
:host(.open) .sh{transform:translate(-50%,0);}
:host(.wide) .sh{transform:translate(-50%,calc(-50% + 60vh));}
:host(.wide.open) .sh{transform:translate(-50%,-50%);}
:host(.lt) .scrim{background:rgba(0,0,0,0.28);}
:host(.lt) .sh{background:var(--os-glass-bg-strong,rgba(255,255,255,0.86));box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06),0 -10px 50px rgba(0,0,0,0.18);}
.grab{flex:none;height:28px;display:flex;align-items:center;justify-content:center;cursor:grab;}
.grab i{width:40px;height:5px;border-radius:3px;background:var(--os-text-3,#6e6e73);opacity:0.6;}
.bd{overflow-y:auto;padding:4px 28px 28px;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:none;}
.bd::-webkit-scrollbar{display:none;}
.top{display:flex;align-items:flex-start;gap:18px;}
.top .thumb{width:96px;height:96px;border-radius:16px;}
.top h2{margin:0;font-family:${FONT_D};font-size:22px;font-weight:600;line-height:1.22;letter-spacing:-0.02em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
@media (max-width:600px){.top h2{font-size:20px;-webkit-line-clamp:2;}.top .thumb{width:80px;height:80px;}.bd{padding:4px 20px 24px;}}
.top .st{margin-top:6px;font-size:16px;font-weight:600;color:rgb(var(--ac,245,245,247));letter-spacing:-0.01em;}
.x{flex:none;margin-left:auto;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--os-glass-inner,rgba(255,255,255,0.1));color:var(--os-text-2,#a1a1a6);}
.x ha-icon{--mdc-icon-size:20px;}
.tl{margin:26px 0 6px;display:flex;flex-direction:column;}
.step{display:grid;grid-template-columns:24px 1fr auto;column-gap:14px;align-items:center;min-height:44px;position:relative;}
.step .b{width:14px;height:14px;border-radius:50%;justify-self:center;background:var(--os-glass-inner,rgba(255,255,255,0.14));position:relative;z-index:1;}
.step.on .b{background:var(--os-text,#f5f5f7);}
.step.now .b{background:rgb(var(--ac,245,245,247));box-shadow:0 0 0 5px rgba(var(--ac,245,245,247),0.22);}
.step:not(:last-child)::after{content:"";position:absolute;left:11px;top:29px;width:2px;height:calc(100% - 14px);border-radius:1px;background:var(--os-glass-inner,rgba(255,255,255,0.14));}
.step.on:not(:last-child)::after{background:var(--os-text,#f5f5f7);opacity:0.5;}
.step .n{font-size:16px;font-weight:600;letter-spacing:-0.01em;}
.step:not(.on):not(.now) .n{color:var(--os-text-3,#6e6e73);font-weight:500;}
.step .t{font-size:14px;color:var(--os-text-2,#a1a1a6);font-variant-numeric:tabular-nums;}
.box{margin-top:18px;border-radius:18px;background:var(--os-glass-inner,rgba(255,255,255,0.07));overflow:hidden;}
.row{display:flex;align-items:center;gap:14px;min-height:52px;padding:10px 16px;}
.row + .row{box-shadow:inset 0 1px 0 var(--os-hairline,rgba(255,255,255,0.08));}
.row .l{font-size:15px;color:var(--os-text-2,#a1a1a6);}
.row .r{margin-left:auto;font-size:15px;font-weight:500;text-align:right;font-variant-numeric:tabular-nums;}
.it{display:flex;align-items:center;gap:14px;min-height:64px;padding:8px 16px;}
.it + .it{box-shadow:inset 0 1px 0 var(--os-hairline,rgba(255,255,255,0.08));}
.it .thumb{width:48px;height:48px;border-radius:10px;}
.it .thumb img{padding:4px;}
.it span{font-size:15px;line-height:1.35;letter-spacing:-0.01em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.it.li{width:100%;text-align:left;}
:host(.wide.lst) .sh{width:min(900px,100%);}
:host(.wide.lst) .box.lg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;background:none;border-radius:0;}
:host(.wide.lst) .box.lg .it{min-width:0;box-shadow:none;border-radius:14px;background:var(--os-glass-inner,rgba(255,255,255,0.07));}
.it .lt2{display:flex;flex-direction:column;gap:2px;min-width:0;-webkit-line-clamp:unset;}
.it .lt2 b{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.it .lt2 small{font-size:13px;color:var(--os-text-2,#a1a1a6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bk{display:inline-flex;align-items:center;gap:2px;height:36px;margin:0 0 10px -8px;padding:0 10px 0 4px;border-radius:18px;font-size:16px;font-weight:500;color:var(--os-text-2,#a1a1a6);}
.bk ha-icon{--mdc-icon-size:22px;}
.acts{display:flex;gap:10px;margin-top:22px;}
.acts button{flex:1;height:52px;border-radius:16px;font-size:16px;font-weight:600;letter-spacing:-0.01em;display:flex;align-items:center;justify-content:center;gap:8px;
background:var(--os-glass-inner,rgba(255,255,255,0.1));transition:transform 200ms ${SPRING},background-color 200ms ease;}
.acts button:active{transform:scale(0.97);transition-duration:90ms;}
.acts .pri{background:var(--os-text,#f5f5f7);color:var(--os-bg-solid,#000);}
:host(.lt) .acts .pri{background:#1d1d1f;color:#fff;}
.acts .rm{color:#ff453a;flex:0 0 auto;padding:0 20px;}
.acts ha-icon{--mdc-icon-size:20px;}
@media (prefers-reduced-motion: reduce){.sh{transition:opacity 220ms ease !important;opacity:0;}:host(.open) .sh{opacity:1;}
:host(.wide) .sh,:host(.wide.open) .sh{transform:translate(-50%,-50%) !important;}:host(:not(.wide)) .sh,:host(:not(.wide).open) .sh{transform:translate(-50%,0) !important;}}
</style><div class="scrim"></div><div class="sh" role="dialog" aria-modal="true"><div class="grab"><i></i></div><div class="bd"></div></div>`;
this.host = host; this.sr = sr;
this.sh = sr.querySelector(".sh"); this.bd = sr.querySelector(".bd");
sr.querySelector(".scrim").addEventListener("click", () => this.close());
this.bd.addEventListener("click", (e) => {
const b = e.target.closest("button"); if (!b) return;
if (b.classList.contains("li")) { const o = (this.listing && this.listing.list.find((x) => x.uid === b.dataset.uid)); if (o) { this.back = this.listing; this.update(o); this.bd.scrollTop = 0; } return; }
if (b.classList.contains("bk") && this.back) { const l = this.back; this.back = null; this.renderList(l.name, l.list); return; }
if (b.classList.contains("x")) this.close();
else if (b.classList.contains("pri") && this.o && this.o.valid) { window.open(`https://www.amazon.com/gp/your-account/order-details?orderID=${encodeURIComponent(this.o.num)}`, "_blank", "noopener"); }
else if (b.classList.contains("rm") && this.o) { const o = this.o; this.close(); this.card._remove(o); }
});
this._keys = (e) => { if (e.key === "Escape") this.close(); };
this._drag();
}
mount() {
const ha = document.querySelector("home-assistant");
const root = (ha && ha.shadowRoot) || document.body;
if (this.host.parentNode !== root) root.appendChild(this.host);
}
show(o, from) {
this.back = null;
this.mount();
this.from = from;
this.host.classList.toggle("lt", isLight());
this.host.classList.toggle("wide", window.innerWidth >= 900);
this.update(o);
this.bd.scrollTop = 0;
this.sh.style.transform = ""; this.sh.style.transition = "";
void this.sh.offsetWidth;
this.host.classList.add("open");
document.addEventListener("keydown", this._keys);
}
close(now) {
this.uid = null;
document.removeEventListener("keydown", this._keys);
this.sh.style.transform = ""; this.sh.style.transition = "";
this.host.classList.remove("open");
if (now) this.host.remove();
}
showList(name, list) {
this.mount();
this.host.classList.toggle("lt", isLight());
this.host.classList.toggle("wide", window.innerWidth >= 900);
this.renderList(name, list);
this.sh.style.transform = ""; this.sh.style.transition = "";
void this.sh.offsetWidth;
this.host.classList.add("open");
document.addEventListener("keydown", this._keys);
}
renderList(name, list) {
this.o = null; this.uid = null; this.listing = { name, list };
this.host.classList.add("lst");
this.sh.style.setProperty("--ac", "245,245,247");
this.bd.scrollTop = 0;
this.bd.innerHTML = `<div class="top"><div style="min-width:0;flex:1"><h2>${esc(name)}</h2><div class="st" style="color:var(--os-text-2,#a1a1a6);font-weight:500">${list.length} ${list.length === 1 ? "order" : "orders"}</div></div><button class="x" aria-label="Close"><ha-icon icon="mdi:close"></ha-icon></button></div>
<div class="box lg">${list.map((o) => { const ac = ACCENT[o.s]; return `<button class="it li" data-uid="${esc(o.uid)}">${this.card._thumb(o, 22)}<span class="lt2"><b>${esc(title(o))}</b><small style="${ac && o.s !== "delivered" ? `color:rgb(${ac})` : ""}">${esc(line(o))}</small></span><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px;color:var(--os-text-3,#6e6e73);margin-left:auto"></ha-icon></button>`; }).join("")}</div>`;
}
update(o) {
this.o = o; this.uid = o.uid; this.listing = null;
this.host.classList.remove("lst");
const ac = ACCENT[o.s] || "245,245,247";
this.sh.style.setProperty("--ac", ac);
const ix = stepIdx(o);
const ended = o.s === "cancelled" || o.s === "return";
const steps = ended ? "" : STEPS.map((k, i) => {
const d = o.h[k];
let t = d ? fmtWhen(d) : "";
if (!d && k === "delivered" && o.eta) t = `Expected ${fmtDay(o.eta)}${o.eta_txt ? " " + o.eta_txt : ""}`;
const cls = i < ix ? "on" : i === ix ? (ACCENT[o.s] ? "now" : "on") : "";
const nm = o.s === "delayed" && i === ix + 1 ? `${STEP_LABEL[k]} · Running late` : STEP_LABEL[k];
return `<div class="step ${cls}"><span class="b"></span><span class="n">${esc(nm)}</span><span class="t">${esc(t)}</span></div>`;
}).join("");
const rows = [];
if (o.valid || o.num) rows.push(["Order", o.num]);
if (o.total) rows.push(["Total", o.total]);
if (o.carrier) rows.push(["Carrier", o.carrier]);
if (o.h.ordered) rows.push(["Ordered", fmtWhen(o.h.ordered)]);
const items = o.items.length > 1 ? `<div class="box">${o.items.map((x) => `<div class="it">${x.img ? `<div class="thumb"><img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('no');this.remove()"></div>` : `<div class="thumb no"><ha-icon icon="mdi:package-variant-closed" style="--mdc-icon-size:22px"></ha-icon></div>`}<span>${esc(x.n)}</span></div>`).join("")}</div>` : "";
this.bd.innerHTML = `${this.back ? `<button class="bk"><ha-icon icon="mdi:chevron-left"></ha-icon>${esc(this.back.name)}</button>` : ""}<div class="top">${this.card._thumb(o, 36)}<div style="min-width:0;flex:1"><h2>${esc(title(o))}</h2><div class="st">${esc(LABEL[o.s])}${o.s !== "delivered" && !ended && o.eta ? ` · ${esc(fmtDay(o.eta))}` : ""}</div></div><button class="x" aria-label="Close"><ha-icon icon="mdi:close"></ha-icon></button></div>
${steps ? `<div class="tl">${steps}</div>` : ""}
${items}
${rows.length ? `<div class="box">${rows.map((r) => `<div class="row"><span class="l">${esc(r[0])}</span><span class="r">${esc(r[1])}</span></div>`).join("")}</div>` : ""}
<div class="acts">${o.valid ? `<button class="pri"><ha-icon icon="mdi:open-in-new"></ha-icon>View on Amazon</button>` : ""}<button class="rm" aria-label="Remove from list"><ha-icon icon="mdi:trash-can-outline"></ha-icon>Remove</button></div>`;
}
/* drag down to dismiss: 1:1 tracking, rubber band upward, momentum projection on release */
_drag() {
let y0 = 0, dy = 0, hist = [], on = false, id = null;
const H = () => this.sh.getBoundingClientRect().height || 600;
const base = () => (this.host.classList.contains("wide") ? "translate(-50%,-50%)" : "translate(-50%,0)");
const rub = (x, d) => (x * d * 0.55) / (d + 0.55 * Math.abs(x));
const start = (e) => {
if (e.button > 0) return;
const inGrab = e.target.closest(".grab");
if (!inGrab && (this.bd.scrollTop > 0 || e.target.closest("button"))) return;
on = true; id = e.pointerId; y0 = e.clientY; dy = 0; hist = [[e.timeStamp, e.clientY]];
this.decided = !!inGrab;
};
const move = (e) => {
if (!on || e.pointerId !== id) return;
const d = e.clientY - y0;
if (!this.decided) { if (Math.abs(d) < 10) return; if (d < 0) { on = false; return; } this.decided = true; try { this.sh.setPointerCapture(id); } catch (x) {} }
dy = d > 0 ? d : rub(d, H());
hist.push([e.timeStamp, e.clientY]); if (hist.length > 6) hist.shift();
this.sh.style.transition = "none";
this.sh.style.transform = `${base()} translateY(${dy}px)`;
};
const end = (e) => {
if (!on || e.pointerId !== id) return;
on = false;
if (!this.decided) return;
const a = hist[0], b = hist[hist.length - 1];
const v = b && a && b[0] > a[0] ? ((b[1] - a[1]) / (b[0] - a[0])) * 1000 : 0;
const proj = dy + ((v / 1000) * 0.99) / (1 - 0.99);
this.sh.style.transition = `transform 420ms ${SPRING}`;
if (proj > H() * 0.4) { haptic(this.card, "light"); this.sh.style.transform = `${base()} translateY(${H() + 40}px)`; setTimeout(() => this.close(), 240); }
else this.sh.style.transform = base();
};
this.sh.addEventListener("pointerdown", start);
this.sh.addEventListener("pointermove", move);
this.sh.addEventListener("pointerup", end);
this.sh.addEventListener("pointercancel", end);
}
}

customElements.define("os-amazon", OsAmazon);
window.customCards = window.customCards || [];
window.customCards.push({ type: "os-amazon", name: "OS Amazon Orders", description: "Amazon orders and deliveries from Amazon's emails" });
})();
