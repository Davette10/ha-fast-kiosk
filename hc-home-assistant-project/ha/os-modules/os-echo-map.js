/* os-echo-map: family map pieces for the Echo Show screen (os-echo).
   1) OSEchoMap.pins(): people at the same place are grouped into ONE marker - their Life360 photos stacked
      side by side on a pin that points at the spot (like Find My), instead of being spread across the map.
   2) <os-echo-map>: the full-screen Family panel. Map on the left, people on the right; tap a person (or their pin)
      to see where they are, since when, battery, driving speed, distance from home and when Life360 last updated. */
(() => {
const TILE = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
const lon2x = (lon, z) => ((lon + 180) / 360) * 256 * 2 ** z;
const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 256 * 2 ** z; };
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const css = `
.om-pin{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;z-index:3;cursor:pointer;}
.om-stack{display:flex;align-items:center;padding:.45vh;border-radius:99px;background:#fff;box-shadow:0 .6vh 1.8vh rgba(0,0,0,.45);}
.om-tail{width:0;height:0;border-left:1vh solid transparent;border-right:1vh solid transparent;border-top:1.3vh solid #fff;margin-top:-.2vh;filter:drop-shadow(0 .4vh .4vh rgba(0,0,0,.25));}
.om-av{position:relative;flex:none;width:var(--s,4.8vh);height:var(--s,4.8vh);border-radius:50%;background:var(--c,#8e8e93);overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 .35vh var(--c,#8e8e93);}
.om-av+.om-av{margin-left:-1.2vh;}
.om-av b{font-weight:700;font-size:calc(var(--s,4.8vh)*.46);color:#111;}
.om-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.om-more{margin-left:.5vh;margin-right:.6vh;font-size:2vh;font-weight:700;color:#111;}
.om-pin.sel .om-stack{box-shadow:0 0 0 .4vh #0a84ff,0 .6vh 1.8vh rgba(0,0,0,.45);}
`;
const pic = (h, p) => { const t = h && h.states[p.tracker]; const a = (t && t.attributes) || {}; return a.entity_picture_local || a.entity_picture || ""; };
const av = (p, h, size) => { const u = pic(h, p); return `<span class="om-av" style="--c:${p.color};${size ? `--s:${size}` : ""}"><b>${esc((p.name || "?")[0])}</b>${u ? `<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</span>`; };

/* list: [{...person, x, y}] in box pixels. Returns the marker HTML. */
function pins(list, W, H, padT, padB, h, sel) {
  const groups = [];
  list.forEach((p) => { const g = groups.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 30); if (g) { g.ps.push(p); g.x = g.ps.reduce((s, q) => s + q.x, 0) / g.ps.length; g.y = g.ps.reduce((s, q) => s + q.y, 0) / g.ps.length; } else groups.push({ x: p.x, y: p.y, ps: [p] }); });
  const top = (padT || 0) + innerHeight * 0.07, bot = H - (padB || 0);
  return groups.map((g) => {
    const shown = g.ps.slice(0, 3), more = g.ps.length - shown.length, w = (shown.length * 4.8 - (shown.length - 1) * 1.2 + 1) * innerHeight / 200;
    const x = Math.max(w + 4, Math.min(W - w - 4, g.x)), y = Math.max(top, Math.min(bot - 2, g.y));
    return `<div class="om-pin${sel && g.ps.some((p) => p.person === sel) ? " sel" : ""}" data-people="${g.ps.map((p) => p.person).join(",")}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px"><div class="om-stack">${shown.map((p) => av(p, h)).join("")}${more > 0 ? `<span class="om-more">+${more}</span>` : ""}</div><i class="om-tail"></i></div>`;
  }).join("");
}

const fmtT = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const since = (iso) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return ""; const today = new Date().toDateString() === d.toDateString(); return today ? fmtT(d) : d.toLocaleDateString([], { weekday: "short" }) + " " + fmtT(d); };
const ago = (iso) => { if (!iso) return ""; const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : `${Math.round(m / 1440)} d ago`; };
const miles = (a, b, c, d) => { const R = 3958.8, r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

class OSEchoMapPanel extends HTMLElement {
  setConfig(c) { this._c = c || {}; }
  set hass(h) { this._h = h; if (!this.shadowRoot) this._build(); const now = Date.now(); if (now - (this._t || 0) > 3000) { this._t = now; this._render(); } }
  _build() {
    const r = this.attachShadow({ mode: "open" });
    r.innerHTML = `<style>${css}
:host{display:block;height:100%;font-family:inherit;color:#fff;}
.w{position:relative;height:100%;box-sizing:border-box;padding:0 2.2vw 2vh 0;display:grid;grid-template-columns:minmax(0,1fr) 34%;gap:1.6vw;}
.m{position:relative;overflow:hidden;border-radius:3vh;background:#e9e5dc;}
.m img.t{position:absolute;}
.s{display:flex;flex-direction:column;min-height:0;}
.s h3{margin:.4vh 0 1.6vh;font-size:3.4vh;font-weight:700;}
.ls{display:flex;flex-direction:column;gap:1.2vh;overflow:auto;}
.row{display:flex;align-items:center;gap:1.4vw;padding:1.4vh 1.2vw;border-radius:2.6vh;background:rgba(255,255,255,.07);text-align:left;color:inherit;font:inherit;border:0;}
.row:active{transform:scale(.98);background:rgba(255,255,255,.14);}
.row.hl{box-shadow:inset 0 0 0 2px rgba(10,132,255,.9);}
.row .t{min-width:0;display:flex;flex-direction:column;}
.row b{font-size:2.7vh;font-weight:600;}
.row span{font-size:2.1vh;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.d{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1.2vh;overflow:auto;}
.back{align-self:flex-start;display:flex;align-items:center;gap:.6vw;background:none;border:0;color:#0a84ff;font:inherit;font-size:2.4vh;padding:.4vh 0;}
.d h2{margin:.6vh 0 0;font-size:3.8vh;font-weight:700;}
.d .pl{font-size:2.5vh;color:rgba(255,255,255,.75);}
.chips{display:grid;grid-template-columns:1fr 1fr;gap:1vh;width:100%;margin-top:1vh;}
.chip{padding:1.3vh 1vw;border-radius:2.2vh;background:rgba(255,255,255,.07);text-align:left;}
.chip small{display:block;font-size:1.8vh;color:rgba(255,255,255,.55);}
.chip strong{font-size:2.5vh;font-weight:600;}
</style><div class="w"><div class="m" id="m"></div><div class="s" id="s"></div></div>`;
    r.addEventListener("click", (e) => {
      const pin = e.target.closest(".om-pin"), row = e.target.closest(".row"), back = e.target.closest(".back");
      if (back) { this._sel = null; this._render(true); return; }
      const ids = pin ? pin.dataset.people.split(",") : row ? [row.dataset.p] : null; if (!ids) return;
      if (ids.length > 1 && pin) { this._sel = null; this._hl = ids; this._render(true); return; }
      this._sel = ids[0]; this._hl = null; this._render(true);
    });
    new ResizeObserver(() => this._render(true)).observe(this);
  }
  _people() {
    const h = this._h; return (this._c.people || []).map((p) => { const t = h.states[p.tracker] || h.states[p.person]; const a = (t && t.attributes) || {}; return a.latitude == null ? null : { ...p, a, lat: a.latitude, lon: a.longitude, st: (h.states[p.person] || {}).state }; }).filter(Boolean);
  }
  _where(p) { const s = p.st; if (s === "home") return "Home"; if (s && !["not_home", "unknown", "unavailable"].includes(s)) return s; return (p.a.place && !/^home/i.test(p.a.place) ? p.a.place : p.a.address || "Away").split(",")[0]; }
  _render(force) {
    const h = this._h, r = this.shadowRoot; if (!h || !r) return;
    const box = r.getElementById("m"), side = r.getElementById("s"), ps = this._people();
    const W = box.clientWidth, H = box.clientHeight; if (!W || !H || !ps.length) return;
    const sel = this._sel && ps.find((p) => p.person === this._sel);
    const focus = sel ? [sel] : ps, zmax = sel ? 16 : 16;
    const sx = Math.max(...focus.map((p) => lon2x(p.lon, 0))) - Math.min(...focus.map((p) => lon2x(p.lon, 0)));
    const sy = Math.max(...focus.map((p) => lat2y(p.lat, 0))) - Math.min(...focus.map((p) => lat2y(p.lat, 0)));
    const fx = sx > 0 ? Math.log2((W - 120) / sx) : zmax, fy = sy > 0 ? Math.log2((H - 160) / sy) : zmax;
    const zf = Math.round(Math.max(3, Math.min(zmax, fx, fy)) * 100) / 100, z = Math.floor(zf), T = 256 * 2 ** (zf - z);
    const xs = focus.map((p) => lon2x(p.lon, zf)), ys = focus.map((p) => lat2y(p.lat, zf));
    const x0 = (Math.max(...xs) + Math.min(...xs)) / 2 - W / 2, y0 = (Math.max(...ys) + Math.min(...ys)) / 2 - H / 2 - 20;
    const k = `${zf}|${Math.round(x0)}|${Math.round(y0)}|${W}x${H}`;
    if (box.dataset.k !== k) {
      let t = ""; for (let tx = Math.floor(x0 / T); tx <= Math.floor((x0 + W) / T); tx++) for (let ty = Math.floor(y0 / T); ty <= Math.floor((y0 + H) / T); ty++) t += `<img class="t" src="${TILE(z, tx, ty)}" style="left:${(tx * T - x0).toFixed(1)}px;top:${(ty * T - y0).toFixed(1)}px;width:${Math.ceil(T) + 1}px;height:${Math.ceil(T) + 1}px" alt="">`;
      box.dataset.k = k; box.dataset.t = t;
    }
    box.innerHTML = box.dataset.t + pins(ps.map((p) => ({ ...p, x: lon2x(p.lon, zf) - x0, y: lat2y(p.lat, zf) - y0 })), W, H, 0, 0, h, this._sel);
    if (sel) {
      const a = sel.a, home = h.states["zone.home"], ha = home && home.attributes, d = ha ? miles(ha.latitude, ha.longitude, sel.lat, sel.lon) : null, w = this._where(sel);
      const chips = [
        [w === "Home" ? "Home since" : "Here since", since(a.at_loc_since) || "—"],
        ["Battery", a.battery_level != null ? `${a.battery_level}%${a.battery_charging ? " · charging" : ""}` : "—"],
        [a.driving ? "Driving" : "Moving", a.driving ? `${Math.round(a.speed || 0)} mph` : (a.speed || 0) > 1 ? `${Math.round(a.speed)} mph` : "Not moving"],
        ["From home", d == null ? "—" : d < 0.1 ? "At home" : `${d < 10 ? d.toFixed(1) : Math.round(d)} mi`],
        ["Last update", ago(a.last_seen) || "—"],
        ["Wi-Fi", a.wifi_on === false ? "Off" : "On"],
      ];
      side.innerHTML = `<div class="d"><button class="back">‹ Family</button>${av(sel, h, "14vh")}<h2>${esc(sel.name)}</h2><div class="pl">${esc(w)}${a.address && w !== a.address.split(",")[0] ? ` · ${esc(a.address.split(",")[0])}` : ""}</div><div class="chips">${chips.map(([l, v]) => `<div class="chip"><small>${l}</small><strong>${esc(v)}</strong></div>`).join("")}</div></div>`;
    } else if (force || !side.firstChild || side.dataset.n !== String(ps.length) || Date.now() - (this._lt || 0) > 30000) {
      this._lt = Date.now(); side.dataset.n = ps.length;
      side.innerHTML = `<div class="ls">${ps.map((p) => `<button class="row${this._hl && this._hl.includes(p.person) ? " hl" : ""}" data-p="${p.person}">${av(p, h, "6.4vh")}<div class="t"><b>${esc(p.name)}</b><span>${esc(this._where(p))}${p.a.at_loc_since ? " · since " + esc(since(p.a.at_loc_since)) : ""}</span></div></button>`).join("")}</div>`;
    }
  }
}
if (!customElements.get("os-echo-map")) customElements.define("os-echo-map", OSEchoMapPanel);
window.OSEchoMap = { css, pins, av };
})();
