/* Clark Home OS - lights panel (tap to turn off, slide to dim, hold for details) */
(() => {
const FONT_TEXT = '-apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EXCLUDE = ["browser_mod", "_led_ring", "fu_zhi_bkn"];
const tint = (s) => {
const a = s.attributes;
if (a.rgb_color && a.color_mode && !/color_temp|brightness|onoff/.test(a.color_mode)) {
const [r, g, b] = a.rgb_color, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
if (mx - mn > 40) return `${r},${g},${b}`;
}
const k = a.color_temp_kelvin;
if (k && k >= 5200) return "214,228,255";
if (k && k >= 3800) return "255,226,176";
return "255,196,112";
};
const iconFor = (id, name, s) => {
if (s.attributes.icon) return s.attributes.icon;
const n = (name + " " + id).toLowerCase();
if (/lamp/.test(n)) return "mdi:lamp-outline";
if (/led|strip/.test(n)) return "mdi:led-strip-variant";
if (/bed/.test(n)) return "mdi:bed-outline";
if (/ceiling/.test(n)) return "mdi:ceiling-light-outline";
return "mdi:lightbulb-outline";
};
class OsLights extends HTMLElement {
setConfig(c) { this._c = c || {}; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 4; }
set hass(h) { this._hass = h; if (!this._drag) this._render(); }
_ids() {
const h = this._hass, ex = this._c.exclude || EXCLUDE;
return Object.keys(h.states).filter((id) => id.startsWith("light.") && h.states[id].state === "on" && !ex.some((x) => id.includes(x)))
.sort((a, b) => this._name(a).localeCompare(this._name(b)));
}
_name(id) {
const m = (this._c.names || {})[id];
if (m) return m;
const s = this._hass.states[id];
let n = (s && s.attributes.friendly_name) || id;
n = n.replace(/\b(nanoleaf|smart|wi-?fi|bulb|a19\/?a60)\b/gi, "").replace(/\s+/g, " ").trim();
return n || "Light";
}
_build() {
this.shadowRoot.innerHTML = `<style>
:host{display:block;height:100%;font-family:var(--os-font,${FONT_TEXT});color:#f5f5f7;-webkit-font-smoothing:antialiased;text-align:left;}
.card{height:100%;box-sizing:border-box;padding:16px 16px 12px 20px;display:flex;flex-direction:column;gap:12px;background:#121214;border:1px solid rgba(255,255,255,0.07);border-radius:18px;}
.hd{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.t{font-family:var(--os-font-display,system-ui);font-size:21px;font-weight:600;letter-spacing:-0.01em;}
.m{font-size:15px;color:#a1a1a6;margin-left:8px;}
.off{height:38px;padding:0 16px 0 12px;border-radius:999px;border:none;background:rgba(255,255,255,0.10);color:#f5f5f7;font:600 15px var(--os-font,system-ui);display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:transform 140ms ease,background-color 200ms ease;-webkit-tap-highlight-color:transparent;}
.off:active{transform:scale(0.94);background:rgba(255,255,255,0.18);}
.off ha-icon{--mdc-icon-size:18px;width:18px;height:18px;display:inline-flex;}
.grid{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:78px;gap:10px;align-content:start;}
.grid::-webkit-scrollbar{display:none;}
.tile{position:relative;overflow:hidden;border-radius:16px;padding:12px 12px 14px;display:grid;grid-template-columns:40px minmax(0,1fr);column-gap:10px;align-items:center;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none;
background:linear-gradient(145deg,rgba(var(--c),0.24),rgba(var(--c),0.07) 65%,rgba(255,255,255,0.02));box-shadow:inset 0 0 0 1px rgba(var(--c),0.26);transition:transform 160ms ease,opacity 260ms ease;}
.tile:active{transform:scale(0.97);}
.tile.gone{opacity:0;transform:scale(0.94);}
.ic{width:40px;height:40px;border-radius:50%;background:rgb(var(--c));color:#1d1d1f;display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(var(--c),0.45);}
.ic ha-icon{--mdc-icon-size:22px;width:22px;height:22px;display:inline-flex;}
.n{font-size:15px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.b{font-size:13px;color:rgba(255,255,255,0.72);margin-top:2px;font-variant-numeric:tabular-nums;}
.bar{position:absolute;left:12px;right:12px;bottom:7px;height:3px;border-radius:2px;background:rgba(255,255,255,0.12);}
.bar i{display:block;height:100%;border-radius:2px;background:rgb(var(--c));}
.tile.drag{transform:scale(1.02);}
.hint{font-size:12px;color:#6e6e73;}
</style><div class="card"><div class="hd"><div><span class="t">${esc(this._c.title || "Lights")}</span><span class="m" id="m"></span></div>
<button class="off" id="off"><ha-icon icon="mdi:power"></ha-icon>All Off</button></div>
<div class="grid" id="grid"></div><div class="hint">Tap to turn off · Slide to dim · Hold for more</div></div>`;
const $ = (id) => this.shadowRoot.getElementById(id);
$("off").addEventListener("click", () => {
const ids = this._ids(); if (!ids.length) return;
this.shadowRoot.querySelectorAll(".tile").forEach((t) => t.classList.add("gone"));
this._hass.callService("light", "turn_off", { entity_id: ids });
});
const grid = $("grid");
grid.addEventListener("pointerdown", (e) => {
const t = e.target.closest(".tile"); if (!t) return;
const s = this._hass.states[t.dataset.id]; if (!s) return;
const bri = s.attributes.brightness != null ? Math.round((s.attributes.brightness / 255) * 100) : 100;
this._p = { t, id: t.dataset.id, x: e.clientX, y: e.clientY, bri, val: bri, w: t.getBoundingClientRect().width, moved: false, long: false };
this._p.timer = setTimeout(() => { if (this._p && !this._p.moved) { this._p.long = true; this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: t.dataset.id }, bubbles: true, composed: true })); } }, 550);
});
grid.addEventListener("pointermove", (e) => {
const p = this._p; if (!p) return;
const dx = e.clientX - p.x, dy = e.clientY - p.y;
if (!p.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { p.moved = true; this._drag = true; clearTimeout(p.timer); p.t.classList.add("drag"); try { p.t.setPointerCapture(e.pointerId); } catch (x) {} }
if (!p.moved && Math.abs(dy) > 10) { clearTimeout(p.timer); this._p = null; return; }
if (!p.moved) return;
p.val = Math.max(1, Math.min(100, Math.round(p.bri + (dx / p.w) * 100)));
p.t.querySelector(".bar i").style.width = p.val + "%";
p.t.querySelector(".b").textContent = p.val + "%";
});
const end = () => {
const p = this._p; this._p = null; if (!p) return;
clearTimeout(p.timer); p.t.classList.remove("drag");
if (p.moved) { this._drag = false; this._hass.callService("light", "turn_on", { entity_id: p.id, brightness_pct: p.val }); return; }
if (p.long) return;
p.t.classList.add("gone");
this._hass.callService("light", "turn_off", { entity_id: p.id });
};
grid.addEventListener("pointerup", end);
grid.addEventListener("pointercancel", () => { if (this._p) { clearTimeout(this._p.timer); this._p.t.classList.remove("drag"); } this._p = null; this._drag = false; });
}
_render() {
const h = this._hass; if (!h || !this.shadowRoot) return;
const ids = this._ids();
const html = ids.map((id) => {
const s = h.states[id], nm = this._name(id);
const bri = s.attributes.brightness != null ? Math.round((s.attributes.brightness / 255) * 100) : null;
return `<div class="tile" data-id="${id}" style="--c:${tint(s)}"><div class="ic"><ha-icon icon="${iconFor(id, nm, s)}"></ha-icon></div>
<div style="min-width:0"><div class="n">${esc(nm)}</div><div class="b">${bri != null ? bri + "%" : "On"}</div></div>
<div class="bar"><i style="width:${bri != null ? bri : 100}%"></i></div></div>`;
}).join("");
const meta = ids.length ? `${ids.length} on` : "All off";
if (html + meta === this._sig) return;
this._sig = html + meta;
this.shadowRoot.getElementById("grid").innerHTML = html;
this.shadowRoot.getElementById("m").textContent = meta;
}
}
if (!customElements.get("os-lights")) customElements.define("os-lights", OsLights);
})();
