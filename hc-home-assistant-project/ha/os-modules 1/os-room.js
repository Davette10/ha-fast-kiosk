/* Clark Home OS - room page in the style of Apple Home (tablet and phone).
   One card shows a whole room: status chips, lights (tap to toggle, slide to dim, hold for details),
   the thermostat (os-thermo), speakers and TVs, cameras and every other accessory in the area. */
(() => {
const FONT = 'var(--os-font, -apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif)';
const FONT_D = 'var(--os-font-display, -apple-system, "SF Pro Display", Inter, system-ui, "Segoe UI", Roboto, sans-serif)';
const SPRING = "cubic-bezier(0.2, 0.9, 0.25, 1)";
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const SKIP_DOMAINS = ["update", "event", "select", "number", "button", "conversation", "assist_satellite", "stt", "tts", "wake_word", "text", "time", "date", "datetime", "image", "notify", "scene", "script", "automation", "zone", "person", "device_tracker", "remote", "todo", "calendar", "weather", "ai_task"];
const SKIP_IDS = ["_consumption", "_cloud_connection", "_wake_sound", "_mute", "_led_ring", "_do_not_disturb", "_announcements", "_communications", "_shuffle", "_repeat", "_identify", "_restart", "browser_mod", "fu_zhi_bkn", "_snapshot"];
const TOGGLE = ["light", "switch", "input_boolean", "fan"];
const rubber = (x, d, c = 0.55) => (x * d * c) / (d + c * Math.abs(x));
const haptic = (el, kind) => { try { el.dispatchEvent(new CustomEvent("haptic", { detail: kind || "light", bubbles: true, composed: true })); } catch (e) {} };
const tint = (s) => {
const a = (s && s.attributes) || {};
if (a.rgb_color && a.color_mode && !/color_temp|brightness|onoff/.test(a.color_mode)) { const [r, g, b] = a.rgb_color; if (Math.max(r, g, b) - Math.min(r, g, b) > 40) return `${r},${g},${b}`; }
const k = a.color_temp_kelvin;
if (k && k >= 5200) return "214,228,255";
if (k && k >= 3800) return "255,226,176";
return "255,196,112";
};
const ICONS = {
switch: "mdi:power-plug-outline", input_boolean: "mdi:toggle-switch-outline", fan: "mdi:fan", lock: "mdi:lock-outline", cover: "mdi:window-shutter", siren: "mdi:alarm-light-outline",
camera: "mdi:cctv", media_player: "mdi:speaker", climate: "mdi:thermostat", vacuum: "mdi:robot-vacuum", humidifier: "mdi:air-humidifier", water_heater: "mdi:water-boiler", valve: "mdi:valve",
};
const BS_ICON = { motion: "mdi:motion-sensor", occupancy: "mdi:home-account", presence: "mdi:home-account", door: "mdi:door", garage_door: "mdi:garage-variant", window: "mdi:window-closed-variant", opening: "mdi:square-rounded-outline", moisture: "mdi:water-outline", smoke: "mdi:smoke-detector-outline", battery: "mdi:battery-outline", connectivity: "mdi:wifi", sound: "mdi:waveform", vibration: "mdi:vibrate", problem: "mdi:alert-circle-outline" };
const SN_ICON = { temperature: "mdi:thermometer", humidity: "mdi:water-percent", battery: "mdi:battery-outline", illuminance: "mdi:brightness-5", power: "mdi:flash-outline", energy: "mdi:lightning-bolt-outline", signal_strength: "mdi:wifi", timestamp: "mdi:clock-outline" };
const iconFor = (id, s) => {
const a = (s && s.attributes) || {}, d = id.split(".")[0], dc = a.device_class;
if (a.icon) return a.icon;
if (d === "light") { const n = norm(a.friendly_name + " " + id); return /lamp/.test(n) ? "mdi:lamp-outline" : /led|strip/.test(n) ? "mdi:led-strip-variant" : /bed/.test(n) ? "mdi:bed-outline" : /ceiling/.test(n) ? "mdi:ceiling-light-outline" : "mdi:lightbulb-outline"; }
if (d === "binary_sensor") return BS_ICON[dc] || "mdi:radiobox-blank";
if (d === "sensor") return SN_ICON[dc] || "mdi:gauge";
if (d === "media_player") return dc === "tv" || /tv/.test(norm(id)) ? "mdi:television" : "mdi:speaker";
return ICONS[d] || "mdi:circle-outline";
};
const cap = (t) => { t = String(t || "").replace(/_/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };
const BS_TEXT = { motion: ["Motion", "Clear"], occupancy: ["Occupied", "Clear"], presence: ["Home", "Away"], door: ["Open", "Closed"], garage_door: ["Open", "Closed"], window: ["Open", "Closed"], opening: ["Open", "Closed"], moisture: ["Wet", "Dry"], smoke: ["Smoke", "Clear"], battery: ["Low", "Normal"], connectivity: ["Connected", "Offline"], problem: ["Problem", "OK"] };
const fmtNum = (v) => { const n = Number(v); if (!isFinite(n)) return v; return Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10); };

class OsRoom extends HTMLElement {
setConfig(c) {
this._c = Object.assign({ lights: [], media: [], extra: [], exclude: [], names: {} }, c || {});
this._pend = {};
if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
this._sig = null;
}
getCardSize() { return 8; }
getGridOptions() { return { columns: "full", rows: "auto" }; }
set hass(h) {
this._hass = h;
this.classList.toggle("lt", document.documentElement.getAttribute("data-os-mode") === "light");
if (this._thermo) this._thermo.forEach((t) => { t.hass = h; });
if (!this._drag) this._render();
}
connectedCallback() {
this._ro = this._ro || new ResizeObserver(() => this._size());
this._ro.observe(this);
this._camT = setInterval(() => this._refreshCams(), 10000);
/* Cards nested in button-card only get fresh state every few seconds, so follow the app's own state directly */
this._poll = setInterval(() => { const ha = document.querySelector("home-assistant"), h = ha && ha.hass; if (h && h !== this._hass && h.states) this.hass = h; }, 400);
}
disconnectedCallback() { if (this._ro) this._ro.disconnect(); clearInterval(this._camT); clearInterval(this._poll); }
_size() { const nar = this.getBoundingClientRect().width < 700; if (nar !== this._nar) { this._nar = nar; this.shadowRoot.getElementById("wrap").classList.toggle("nar", nar); } }
/* ---------- which entities belong to this room ---------- */
_areaId() {
const h = this._hass, want = this._c.area; if (!want || !h.areas) return null;
if (h.areas[want]) return want;
const n = norm(want), hit = Object.values(h.areas).find((a) => norm(a.name) === n || norm(a.area_id) === n);
return hit ? hit.area_id : null;
}
_pick() {
const h = this._hass, c = this._c, area = this._areaId();
const ex = new Set(c.exclude || []), out = new Set();
if (area && h.entities) {
Object.values(h.entities).forEach((e) => {
const dev = e.device_id && h.devices ? h.devices[e.device_id] : null;
const a = e.area_id || (dev && dev.area_id);
if (a !== area || e.hidden || e.entity_category) return;
out.add(e.entity_id);
});
}
(c.lights || []).forEach((id) => out.add(id));
(c.media || []).forEach((id) => out.add(id));
(c.extra || []).forEach((id) => out.add(id));
const forced = new Set([...(c.lights || []), ...(c.media || []), ...(c.extra || [])]);
const ids = [...out].filter((id) => {
const s = h.states[id]; if (!s || ex.has(id)) return false;
if (forced.has(id)) return true;
const d = id.split(".")[0];
if (SKIP_DOMAINS.includes(d) || d === "climate") return false;
if (SKIP_IDS.some((x) => id.includes(x))) return false;
if (s.state === "unavailable") return false;
if (d === "sensor" && !s.attributes.unit_of_measurement && s.attributes.device_class !== "timestamp") return false;
return true;
});
const by = (d) => ids.filter((id) => id.startsWith(d + "."));
const lights = (c.lights && c.lights.length ? c.lights.filter((id) => h.states[id]) : by("light"));
const media = (c.media && c.media.length ? c.media.filter((id) => h.states[id]) : by("media_player"));
const cams = by("camera");
const rest = ids.filter((id) => !lights.includes(id) && !media.includes(id) && !cams.includes(id));
const order = { switch: 0, fan: 1, input_boolean: 2, lock: 3, cover: 4, siren: 5, binary_sensor: 6, sensor: 7 };
rest.sort((a, b) => ((order[a.split(".")[0]] ?? 5) - (order[b.split(".")[0]] ?? 5)) || this._name(a).localeCompare(this._name(b)));
return { lights, media, cams, rest };
}
_name(id) {
const n = (this._c.names || {})[id], s = this._hass.states[id];
let t = n || (s && s.attributes.friendly_name) || id.split(".")[1].replace(/_/g, " ");
if (!n) t = t.replace(/\b(nanoleaf|smart|wi-?fi|bulb|a19\/?a60)\b/gi, "").replace(/\s+/g, " ").trim();
/* Like Apple Home, drop the room owner's name ("Harper's Light 1" in Harper's room reads "Light 1") */
const own = String(this._c.title || this._c.area || "").match(/^([A-Za-z]+)(?:'s|s)?\b/);
if (own) { const r = t.replace(new RegExp("^" + own[1] + "['’]s\\s+", "i"), ""); if (r && r !== t && !/^room\b/i.test(r)) t = r.charAt(0).toUpperCase() + r.slice(1); }
return t || id;
}
_st(id) {
const s = this._hass.states[id], p = this._pend[id];
if (p && Date.now() < p.until && !(s && s.state === p.state && (p.bri == null || this._bri(s) === p.bri))) return Object.assign({}, s, { state: p.state, _bri: p.bri });
if (p) delete this._pend[id];
return s;
}
_bri(s) { if (!s) return null; if (s._bri != null) return s._bri; return s.state === "on" && s.attributes.brightness != null ? Math.max(1, Math.round((s.attributes.brightness / 255) * 100)) : null; }
_text(id, s) {
const d = id.split(".")[0], a = s.attributes, dc = a.device_class;
if (s.state === "unavailable") return "Not responding";
if (d === "light") { if (s.state !== "on") return "Off"; const b = this._bri(s); return b != null ? b + "%" : "On"; }
if (TOGGLE.includes(d) || d === "siren") return s.state === "on" ? "On" : "Off";
if (d === "binary_sensor") { const t = BS_TEXT[dc]; return t ? t[s.state === "on" ? 0 : 1] : s.state === "on" ? "On" : "Off"; }
if (d === "sensor") { if (dc === "timestamp") { const t = new Date(s.state); return isNaN(t) ? s.state : t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } return `${fmtNum(s.state)}${a.unit_of_measurement === "%" ? "%" : a.unit_of_measurement ? " " + a.unit_of_measurement : ""}`; }
if (d === "lock") return cap(s.state);
if (d === "cover") return cap(s.state);
if (d === "media_player") return s.state === "playing" ? (a.media_title || "Playing") : cap(s.state);
return cap(s.state);
}
_active(id, s) {
const d = id.split(".")[0];
if (s.state === "unavailable") return false;
if (TOGGLE.includes(d) || d === "siren") return s.state === "on";
if (d === "lock") return s.state === "unlocked";
if (d === "cover") return s.state === "open" || s.state === "opening";
if (d === "media_player") return s.state === "playing";
return false;
}
/* ---------- layout ---------- */
_build() {
this.shadowRoot.innerHTML = `<style>
:host{display:block;font-family:${FONT};color:var(--os-text,#f5f5f7);-webkit-font-smoothing:antialiased;text-align:left;user-select:none;-webkit-user-select:none;}
*{box-sizing:border-box;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
ha-icon{display:inline-flex;flex:none;}
.wrap{display:flex;flex-direction:column;gap:20px;padding:4px 0 24px;}
#body{display:flex;flex-direction:column;gap:30px;}
.nar #body{gap:26px;}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:-8px;}
.chip{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px 0 10px;border-radius:999px;background:var(--os-glass-bg,rgba(255,255,255,0.07));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.08));-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);font-size:14px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;max-width:100%;}
.chip ha-icon{--mdc-icon-size:18px;width:18px;height:18px;color:var(--os-text-2,#a1a1a6);}
.chip span{color:var(--os-text-2,#a1a1a6);font-weight:400;overflow:hidden;text-overflow:ellipsis;}
.sec{display:flex;flex-direction:column;gap:12px;}
.sh{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:36px;padding:0 2px;}
.sh h2{margin:0;font-family:${FONT_D};font-size:21px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;}
.sh h2 small{font-family:${FONT};font-size:15px;font-weight:400;color:var(--os-text-2,#a1a1a6);margin-left:8px;letter-spacing:-0.01em;}
.pill{height:36px;padding:0 16px;border-radius:999px;background:var(--os-glass-inner,rgba(255,255,255,0.08));font-size:15px;font-weight:600;letter-spacing:-0.01em;display:inline-flex;align-items:center;gap:6px;transition:transform 200ms ${SPRING},background-color 200ms ease;}
.pill:active{transform:scale(0.95);transition-duration:90ms;}
.pill ha-icon{--mdc-icon-size:18px;width:18px;height:18px;}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:76px;gap:12px;}
.nar .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;grid-auto-rows:72px;}
.big{grid-column:span 2;grid-row:span 2;}
.nar .big{grid-column:span 2;}
/* accessory tile */
.t{position:relative;overflow:hidden;border-radius:18px;padding:0 14px 0 12px;display:grid;grid-template-columns:40px minmax(0,1fr);column-gap:12px;align-items:center;text-align:left;cursor:pointer;touch-action:pan-y;
background:var(--os-glass-bg,rgba(255,255,255,0.07));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.08));-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);
transition:transform 220ms ${SPRING},background-color 240ms ease,color 240ms ease;will-change:transform;}
.t:active{transform:scale(0.97);transition-duration:90ms;}
.t.ro{cursor:default;}
.t.ro:active{transform:none;}
.t .ic{position:relative;z-index:1;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--os-glass-inner,rgba(255,255,255,0.08));color:var(--os-text-2,#a1a1a6);transition:background-color 240ms ease,color 240ms ease;}
.t .ic ha-icon{--mdc-icon-size:22px;width:22px;height:22px;}
.t .tx{position:relative;z-index:1;min-width:0;}
.t .n{font-size:15px;font-weight:600;letter-spacing:-0.01em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.t .s{font-size:13px;color:var(--os-text-2,#a1a1a6);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;letter-spacing:-0.005em;}
.t.on{background:var(--os-on,#f5f5f7);color:var(--os-on-text,#1d1d1f);box-shadow:none;}
.t.on .s{color:var(--os-on-text-2,rgba(29,29,31,0.6));}
.t.on .ic{background:var(--os-accent,#2997ff);color:#fff;}
.t.lt.on .ic{background:rgb(var(--c));color:#1d1d1f;}
.t.dead{opacity:0.45;}
:host(.lt) .t:not(.on){background:rgba(255,255,255,0.4);}
:host(.lt) .t.on{box-shadow:0 8px 22px rgba(0,0,0,0.08);}
:host(.lt) .cb.pp{background:var(--os-text,#1d1d1f);color:#fff;}
.t .lv{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(var(--c),0.32);pointer-events:none;transition:width 260ms ${SPRING};}
.t.drag{transform:scale(1.02);transition:transform 200ms ${SPRING};}
.t.drag .lv{transition:none;}
/* cameras */
.cam{position:relative;overflow:hidden;border-radius:18px;background:#000;cursor:pointer;transition:transform 220ms ${SPRING};}
.cam:active{transform:scale(0.98);transition-duration:90ms;}
.cam img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.cam .lb{position:absolute;left:12px;bottom:12px;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:var(--os-lens-bg,rgba(0,0,0,0.45));-webkit-backdrop-filter:var(--os-pill-filter,blur(20px) saturate(160%));backdrop-filter:var(--os-pill-filter,blur(20px) saturate(160%));color:#fff;font-size:13px;font-weight:600;letter-spacing:-0.01em;}
.cam .lb i{width:7px;height:7px;border-radius:50%;background:#fff;opacity:0.9;}
/* media */
.md{border-radius:18px;padding:14px;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;column-gap:14px;row-gap:10px;
background:var(--os-glass-bg,rgba(255,255,255,0.07));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.08));-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);overflow:hidden;}
.md .art{grid-row:1 / span 2;width:108px;height:108px;align-self:center;border-radius:11px;background:var(--os-glass-inner,rgba(255,255,255,0.08));display:flex;align-items:center;justify-content:center;color:var(--os-text-3,#6e6e73);overflow:hidden;position:relative;}
.nar .md .art{width:84px;height:84px;}
.md .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.md .art ha-icon{--mdc-icon-size:34px;width:34px;height:34px;}
.md .info{min-width:0;align-self:center;}
.md .dv{font-size:13px;font-weight:600;color:var(--os-text-2,#a1a1a6);letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.md .ti{font-family:${FONT_D};font-size:19px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.md .ar{font-size:14px;color:var(--os-text-2,#a1a1a6);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.md .ctl{display:flex;align-items:center;gap:6px;min-width:0;}
.cb{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--os-text,#f5f5f7);flex:none;transition:transform 200ms ${SPRING},background-color 200ms ease;}
.cb:active{transform:scale(0.88);transition-duration:90ms;background:var(--os-glass-inner,rgba(255,255,255,0.08));}
.cb ha-icon{--mdc-icon-size:24px;width:24px;height:24px;}
.cb.pp{background:var(--os-on,#f5f5f7);color:var(--os-on-text,#1d1d1f);}
.cb[disabled]{opacity:0.3;pointer-events:none;}
.vol{flex:1;min-width:60px;height:40px;display:flex;align-items:center;gap:8px;cursor:pointer;touch-action:none;color:var(--os-text-3,#6e6e73);}
.vol ha-icon{--mdc-icon-size:18px;width:18px;height:18px;}
.vol .tr{flex:1;height:6px;border-radius:3px;background:var(--os-glass-inner,rgba(255,255,255,0.12));overflow:hidden;transition:height 200ms ${SPRING};}
.vol.drag .tr{height:10px;}
.vol .tr i{display:block;height:100%;background:var(--os-text,#f5f5f7);border-radius:3px;}
/* thermostat host */
.th{min-width:0;min-height:0;}
.th > *{display:block;height:100%;}
.note{grid-column:1 / -1;font-size:15px;line-height:1.45;color:var(--os-text-2,#a1a1a6);padding:4px 2px;}
@media (prefers-reduced-motion: reduce){.t,.cam,.pill,.cb,.t .lv,.vol .tr{transition:background-color 200ms ease,color 200ms ease,opacity 200ms ease !important;}.t:active,.cam:active,.pill:active,.cb:active,.t.drag{transform:none !important;}}
</style><div class="wrap" id="wrap"><div class="chips" id="chips"></div><div id="body"></div></div>`;
const body = this.shadowRoot.getElementById("body");
body.addEventListener("pointerdown", (e) => this._down(e));
body.addEventListener("pointermove", (e) => this._move(e));
body.addEventListener("pointerup", (e) => this._up(e));
body.addEventListener("pointercancel", () => this._cancel());
body.addEventListener("click", (e) => this._click(e));
body.addEventListener("contextmenu", (e) => { if (e.target.closest(".t,.cam")) e.preventDefault(); });
}
_render() {
const h = this._hass; if (!h || !this.shadowRoot) return;
const c = this._c, g = this._pick();
const sig = JSON.stringify([g, [...g.lights, ...g.media, ...g.cams, ...g.rest].map((id) => { const s = this._st(id); return s ? [s.state, s.attributes.brightness, s.attributes.media_title, s.attributes.media_artist, s.attributes.volume_level, s.attributes.entity_picture, s.attributes.rgb_color, s.attributes.color_temp_kelvin, s._bri] : 0; }), c.climate && h.states[c.climate] ? [h.states[c.climate].attributes.current_temperature, h.states[c.climate].state] : 0]);
if (sig === this._sig) return;
const structure = JSON.stringify([g.lights, g.media, g.cams, g.rest, c.climate]);
this._sig = sig;
this._chips(g);
if (structure !== this._struct) { this._struct = structure; this._layout(g); }
this._paint(g);
}
_chips(g) {
const h = this._hass, c = this._c, out = [];
const cl = c.climate && h.states[c.climate];
if (cl && cl.attributes.current_temperature != null) out.push(`<div class="chip"><ha-icon icon="mdi:thermometer"></ha-icon>${Math.round(cl.attributes.current_temperature)}°<span>Inside</span></div>`);
if (g.lights.length) { const on = g.lights.filter((id) => { const s = this._st(id); return s && s.state === "on"; }).length; out.push(`<div class="chip"><ha-icon icon="mdi:lightbulb-outline"></ha-icon>${on ? `${on} On` : "Off"}<span>${on ? (on === 1 ? "Light" : "Lights") : "Lights"}</span></div>`); }
const pl = g.media.map((id) => h.states[id]).find((s) => s && s.state === "playing");
if (pl) out.push(`<div class="chip"><ha-icon icon="mdi:music-note-outline"></ha-icon>Playing<span>${esc(pl.attributes.media_title || this._name(pl.entity_id))}</span></div>`);
const op = g.rest.filter((id) => { const s = h.states[id]; return s && id.startsWith("binary_sensor.") && s.state === "on" && ["door", "window", "opening", "garage_door"].includes(s.attributes.device_class); }).length;
if (op) out.push(`<div class="chip"><ha-icon icon="mdi:door-open"></ha-icon>${op} Open</div>`);
const html = out.join("");
const el = this.shadowRoot.getElementById("chips");
if (el.innerHTML !== html) el.innerHTML = html;
el.style.display = html ? "" : "none";
}
_layout(g) {
const c = this._c, h = this._hass, body = this.shadowRoot.getElementById("body");
const tile = (id, cls) => `<button class="t ${cls || ""}" data-id="${id}"><div class="lv"></div><div class="ic"><ha-icon></ha-icon></div><div class="tx"><div class="n"></div><div class="s"></div></div></button>`;
let html = "";
if (g.lights.length) html += `<section class="sec"><div class="sh"><h2>Lights<small id="lm"></small></h2><button class="pill" id="all"></button></div><div class="grid">${g.lights.map((id) => tile(id, "lt")).join("")}</div></section>`;
const hasCl = c.climate && h.states[c.climate];
if (hasCl || g.media.length) {
html += `<section class="sec"><div class="sh"><h2>${hasCl && g.media.length ? "Climate and Media" : hasCl ? "Climate" : "Media"}</h2></div><div class="grid">`;
if (hasCl) html += `<div class="big th" id="th"></div>`;
g.media.forEach((id) => { html += `<div class="big md" data-md="${id}"><div class="art"><ha-icon icon="mdi:music-note-outline"></ha-icon></div><div class="info"><div class="dv"></div><div class="ti"></div><div class="ar"></div></div>
<div class="ctl"><button class="cb" data-act="prev" aria-label="Previous"><ha-icon icon="mdi:skip-previous"></ha-icon></button><button class="cb pp" data-act="pp" aria-label="Play or pause"><ha-icon icon="mdi:play"></ha-icon></button><button class="cb" data-act="next" aria-label="Next"><ha-icon icon="mdi:skip-next"></ha-icon></button>
<div class="vol" data-vol="${id}"><ha-icon icon="mdi:volume-low"></ha-icon><div class="tr"><i></i></div></div></div></div>`; });
html += `</div></section>`;
}
if (g.cams.length) html += `<section class="sec"><div class="sh"><h2>Cameras</h2></div><div class="grid">${g.cams.map((id) => `<div class="big cam" data-id="${id}" role="button"><img alt=""><div class="lb"><i></i><span></span></div></div>`).join("")}</div></section>`;
if (g.rest.length) html += `<section class="sec"><div class="sh"><h2>Accessories</h2></div><div class="grid">${g.rest.map((id) => tile(id, TOGGLE.includes(id.split(".")[0]) ? "" : "ro")).join("")}</div></section>`;
if (!g.lights.length && !g.rest.length && !g.cams.length && !g.media.length) html += `<section class="sec"><div class="sh"><h2>Accessories</h2></div><div class="grid"><div class="note">Nothing else is in this room yet. Devices you assign to this area in Home Assistant show up here on their own.</div></div></section>`;
body.innerHTML = html;
const all = body.querySelector("#all"); if (all) all.addEventListener("click", () => this._all(g));
this._thermo = [];
const th = body.querySelector("#th");
if (th) {
const mk = () => { const el = document.createElement("os-thermo"); try { el.setConfig({ entity: c.climate, label: c.climate_label || "", height: "100%", compact: !!this._nar }); } catch (e) { return; } el.hass = this._hass; th.appendChild(el); this._thermo = [el]; };
if (customElements.get("os-thermo")) mk(); else customElements.whenDefined("os-thermo").then(() => { if (th.isConnected && !th.firstChild) mk(); });
}
this._refreshCams(true);
}
_paint(g) {
const h = this._hass, sr = this.shadowRoot;
sr.querySelectorAll(".t[data-id]").forEach((el) => {
const id = el.dataset.id, s = this._st(id); if (!s) return;
const on = this._active(id, s), lt = el.classList.contains("lt");
el.classList.toggle("on", on); el.classList.toggle("dead", s.state === "unavailable");
if (lt) { el.style.setProperty("--c", tint(s)); el.querySelector(".lv").style.width = on && this._bri(s) != null ? this._bri(s) + "%" : "0%"; }
const ic = el.querySelector("ha-icon"), icon = lt && on ? iconFor(id, s).replace("-outline", "") : iconFor(id, s);
if (ic.getAttribute("icon") !== icon) ic.setAttribute("icon", icon);
el.querySelector(".n").textContent = this._name(id);
el.querySelector(".s").textContent = this._text(id, s);
el.setAttribute("aria-label", `${this._name(id)}, ${this._text(id, s)}`);
});
if (g.lights.length) {
const on = g.lights.filter((id) => { const s = this._st(id); return s && s.state === "on"; }).length;
const all = sr.getElementById("all"); if (all) all.innerHTML = on ? `<ha-icon icon="mdi:power"></ha-icon>Turn Off` : `<ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>Turn On`;
const lm = sr.getElementById("lm"); if (lm) lm.textContent = on ? `${on} on` : "All off";
}
sr.querySelectorAll(".md[data-md]").forEach((el) => {
const id = el.dataset.md, s = h.states[id]; if (!s) return;
const a = s.attributes, act = ["playing", "paused", "buffering"].includes(s.state), f = a.supported_features || 0;
const pic = act && (a.entity_picture_local || a.entity_picture);
const art = el.querySelector(".art"), cur = art.dataset.src || "";
if (cur !== (pic || "")) { art.dataset.src = pic || ""; art.innerHTML = pic ? `<img src="${esc(h.hassUrl ? h.hassUrl(pic) : pic)}" alt="" onerror="this.remove()">` : `<ha-icon icon="${iconFor(id, s)}"></ha-icon>`; }
el.querySelector(".dv").textContent = this._name(id);
el.querySelector(".ti").textContent = act ? a.media_title || a.app_name || "Playing" : s.state === "unavailable" ? "Not responding" : "Not Playing";
el.querySelector(".ar").textContent = act ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") : s.state === "off" ? "Off" : "Ready";
const pp = el.querySelector('[data-act="pp"]');
pp.querySelector("ha-icon").setAttribute("icon", s.state === "playing" ? "mdi:pause" : "mdi:play");
pp.toggleAttribute("disabled", s.state === "unavailable" || !(f & (1 | 16384)));
el.querySelector('[data-act="prev"]').toggleAttribute("disabled", !act || !(f & 16));
el.querySelector('[data-act="next"]').toggleAttribute("disabled", !act || !(f & 32));
const vol = el.querySelector(".vol");
vol.style.display = f & 4 && s.state !== "off" && s.state !== "unavailable" ? "" : "none";
if (!vol.classList.contains("drag")) vol.querySelector("i").style.width = Math.round((a.volume_level || 0) * 100) + "%";
});
sr.querySelectorAll(".cam[data-id]").forEach((el) => { el.querySelector("span").textContent = this._name(el.dataset.id).replace(/ live view$/i, ""); });
}
_refreshCams(force) {
const h = this._hass; if (!h || !this.shadowRoot) return;
if (!force && document.hidden) return;
this.shadowRoot.querySelectorAll(".cam[data-id]").forEach((el) => {
const s = h.states[el.dataset.id]; if (!s || !s.attributes.entity_picture) return;
const u = (h.hassUrl ? h.hassUrl(s.attributes.entity_picture) : s.attributes.entity_picture) + "&t=" + Math.floor(Date.now() / 10000);
const img = el.querySelector("img"); if (img.getAttribute("src") !== u) { const n = new Image(); n.onload = () => { img.src = u; }; n.src = u; }
});
}
/* ---------- interaction ---------- */
_more(id) { this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true })); }
_all(g) {
const ids = g.lights, anyOn = ids.some((id) => { const s = this._st(id); return s && s.state === "on"; });
haptic(this, "medium");
const until = Date.now() + 2500; ids.forEach((id) => { this._pend[id] = { state: anyOn ? "off" : "on", until }; });
this._sig = null; this._render();
this._hass.callService("light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
}
_down(e) {
if (e.button > 0) return;
const vol = e.target.closest(".vol");
if (vol) { e.preventDefault(); this._vol = { el: vol, id: vol.dataset.vol }; vol.classList.add("drag"); try { vol.setPointerCapture(e.pointerId); } catch (x) {} this._volSet(e, false); return; }
const t = e.target.closest(".t[data-id],.cam[data-id]"); if (!t) return;
const id = t.dataset.id, s = this._st(id), lt = t.classList.contains("lt");
const w = t.getBoundingClientRect().width;
this._p = { t, id, lt, x: e.clientX, y: e.clientY, w, b0: s && s.state === "on" ? this._bri(s) || 100 : 0, val: null, moved: false, long: false, pid: e.pointerId };
this._p.timer = setTimeout(() => { const p = this._p; if (p && !p.moved) { p.long = true; haptic(this, "medium"); t.classList.remove("drag"); this._more(id); } }, 500);
}
_move(e) {
if (this._vol) { this._volSet(e, false); return; }
const p = this._p; if (!p) return;
const dx = e.clientX - p.x, dy = e.clientY - p.y;
if (!p.moved) {
if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { clearTimeout(p.timer); this._p = null; return; }
if (p.lt && Math.abs(dx) > 10) { p.moved = true; this._drag = true; clearTimeout(p.timer); p.t.classList.add("drag", "on"); try { p.t.setPointerCapture(p.pid); } catch (x) {} p.ox = dx; }
else return;
}
const raw = p.b0 + ((dx - p.ox) / p.w) * 100;
const over = raw > 100 ? raw - 100 : raw < 1 ? raw - 1 : 0;
p.val = Math.round(Math.max(1, Math.min(100, raw)));
p.t.style.transform = `scale(1.02) translateX(${rubber(over * p.w / 100, p.w) * 0.25}px)`;
p.t.querySelector(".lv").style.width = p.val + "%";
p.t.querySelector(".s").textContent = p.val + "%";
}
_up(e) {
if (this._vol) { this._volSet(e, true); this._vol.el.classList.remove("drag"); this._vol = null; return; }
const p = this._p; this._p = null; if (!p) return;
clearTimeout(p.timer);
if (p.moved) {
p.t.classList.remove("drag"); p.t.style.transform = "";
this._drag = false;
this._pend[p.id] = { state: "on", bri: p.val, until: Date.now() + 3000 };
haptic(this, "selection");
this._hass.callService("light", "turn_on", { entity_id: p.id, brightness_pct: p.val });
this._sig = null; this._render();
return;
}
if (p.long) return;
p.tap = true; this._tap = p;
}
_cancel() { const p = this._p; if (p) { clearTimeout(p.timer); p.t.classList.remove("drag"); p.t.style.transform = ""; } this._p = null; this._drag = false; if (this._vol) { this._vol.el.classList.remove("drag"); this._vol = null; } }
_click(e) {
const cb = e.target.closest(".cb[data-act]");
if (cb) { const id = cb.closest(".md").dataset.md, act = cb.dataset.act; haptic(this); this._hass.callService("media_player", act === "pp" ? "media_play_pause" : act === "next" ? "media_next_track" : "media_previous_track", { entity_id: id }); return; }
const p = this._tap; this._tap = null;
const t = e.target.closest(".t[data-id],.cam[data-id]"); if (!t || !p || p.t !== t) return;
const id = t.dataset.id, d = id.split(".")[0], s = this._st(id);
if (t.classList.contains("cam") || !TOGGLE.includes(d) || !s || s.state === "unavailable") { this._more(id); return; }
haptic(this);
const next = s.state === "on" ? "off" : "on";
this._pend[id] = { state: next, until: Date.now() + 2500 };
this._sig = null; this._render();
this._hass.callService(d === "light" ? "light" : "homeassistant", "toggle", { entity_id: id });
}
_volSet(e, commit) {
const v = this._vol; if (!v) return;
const tr = v.el.querySelector(".tr").getBoundingClientRect();
const x = Math.max(0, Math.min(1, (e.clientX - tr.left) / tr.width));
v.el.querySelector("i").style.width = Math.round(x * 100) + "%";
const now = Date.now();
if (commit || !v.at || now - v.at > 250) { v.at = now; this._hass.callService("media_player", "volume_set", { entity_id: v.id, volume_level: Math.round(x * 100) / 100 }); }
}
}
if (!customElements.get("os-room")) customElements.define("os-room", OsRoom);
})();
