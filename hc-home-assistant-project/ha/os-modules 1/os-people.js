/* Clark Home OS - family map and person pages */
(() => {
const FONT_TEXT = '-apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
const BASE_CSS = `
:host { display:block; font-family: var(--os-font, ${FONT_TEXT}); color: #f5f5f7;
-webkit-font-smoothing: antialiased; font-feature-settings: "ss03", "cv11"; }
`;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const osNavigate = (path) => {
history.pushState(null, "", path);
window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
};
const fmtClock = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtAgo = (d) => {
const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
if (s < 60) return "Just now";
if (s < 3600) return Math.round(s / 60) + " min ago";
if (s < 86400) { const h = Math.floor(s / 3600); return h + (h === 1 ? " hr ago" : " hrs ago"); }
const dd = Math.floor(s / 86400); return dd + (dd === 1 ? " day ago" : " days ago");
};
const fmtDur = (ms) => {
const m = Math.max(0, Math.round(ms / 60000));
if (m < 60) return m + "m";
const h = Math.floor(m / 60), r = m % 60;
return r ? `${h}h ${r}m` : `${h}h`;
};
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const okState = (s) => s && !["unknown", "unavailable", ""].includes(s.state);
const haversineMi = (a1, o1, a2, o2) => {
const R = 3958.8, r = Math.PI / 180;
const dA = (a2 - a1) * r, dO = (o2 - o1) * r;
const x = Math.sin(dA / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) ** 2;
return 2 * R * Math.asin(Math.sqrt(x));
};
const personStatus = (p, t) => {
const s = p ? p.state : "unknown";
const drv = t && t.attributes && t.attributes.driving;
if (drv) return { cls: "drive", icon: "mdi:car-outline", txt: "Driving" };
if (s === "home") return { cls: "home", icon: "mdi:home-outline", txt: "Home" };
if (/work/i.test(s)) return { cls: "work", icon: "mdi:briefcase-outline", txt: "Work" };
if (/school/i.test(s)) return { cls: "school", icon: "mdi:school-outline", txt: "School" };
if (s === "not_home") return { cls: "away", icon: "mdi:map-marker-outline", txt: "Away" };
if (s === "unknown" || s === "unavailable") return { cls: "away", icon: "mdi:map-marker-question-outline", txt: "Unknown" };
return { cls: "zone", icon: "mdi:map-marker-outline", txt: s };
};
const PILL_CSS = `
.p { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px 0 8px; border-radius: 999px; font-size: 13px; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; }
.p ha-icon { width: 15px; height: 15px; --mdc-icon-size: 15px; display: inline-flex; }
.p.home { background: #f5f5f7; color: #1d1d1f; }
.p.work { background: rgba(41,151,255,0.18); color: #6cb6ff; }
.p.school { background: rgba(191,90,242,0.18); color: #d49bff; }
.p.drive { background: rgba(255,159,10,0.18); color: #ffb340; }
.p.zone { background: rgba(255,255,255,0.10); color: #f5f5f7; }
.p.away { background: transparent; color: #8e8e93; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14); }
`;
const CARD_CSS = `
.card { background: #121214; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; box-sizing: border-box; min-width: 0; min-height: 0; }
.kicker { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #a1a1a6; }
.kicker ha-icon { --mdc-icon-size: 15px; width: 15px; height: 15px; display: inline-flex; }
button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
`;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const createCard = async (conf) => {
const helpers = await window.loadCardHelpers();
const tag = conf.type.startsWith("custom:") ? conf.type.slice(7) : `hui-${conf.type}-card`;
if (!customElements.get(tag)) {
helpers.createCardElement(conf);
await Promise.race([customElements.whenDefined(tag), new Promise((r) => setTimeout(r, 5000))]);
}
return helpers.createCardElement(conf);
};
const fillMap = (card) => {
card.style.display = "block"; card.style.height = "100%";
let n = 0;
const tryIt = () => {
const sr = card.shadowRoot;
if (sr && sr.querySelector("ha-card")) {
if (!sr.querySelector("style[data-os]")) {
const st = document.createElement("style");
st.dataset.os = "1";
st.textContent = `ha-card { height: 100% !important; border-radius: 18px !important; overflow: hidden !important; border: none !important; background: #0b0b0c !important; }
#root { height: 100% !important; padding-bottom: 0 !important; } ha-map { height: 100% !important; }
ha-icon-button { display: none !important; }`;
sr.appendChild(st);
}
return;
}
if (n++ < 40) setTimeout(tryIt, 150);
};
tryIt();
};
const appSensors = (hass, personId) => {
const p = hass.states[personId];
const trackers = (p && p.attributes.device_trackers) || [];
let dev = null;
for (const t of trackers) { const e = hass.entities && hass.entities[t]; if (e && e.platform === "mobile_app") { dev = e.device_id; break; } }
const out = {};
if (!dev) return out;
const keys = ["battery_level", "battery_state", "steps", "activity", "ssid", "connection_type", "walking_running_distance", "watch_battery_level"];
for (const [id, e] of Object.entries(hass.entities)) {
if (e.device_id !== dev) continue;
if (id.startsWith("binary_sensor.") && id.endsWith("_focus")) { out.focus = id; continue; }
if (!id.startsWith("sensor.")) continue;
for (const k of keys) if (id.endsWith("_" + k) && !(k === "battery_level" && id.endsWith("_watch_battery_level")) && !(k === "steps" && id.endsWith("_health_steps"))) out[k] = id;
}
return out;
};
class OsPersonPage extends HTMLElement {
setConfig(c) {
if (!c || !c.person) throw new Error("person required");
this._c = c;
if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
}
getCardSize() { return 12; }
set hass(h) {
this._hass = h;
if (!this._map && !this._mapP) this._mountMap();
if (this._map) this._map.hass = h;
this._render();
if (!this._placesAt || Date.now() - this._placesAt > 300000) this._loadPlaces();
}
connectedCallback() { this._clock = setInterval(() => this._render(true), 30000); if (this._hass) this._loadPlaces(); }
disconnectedCallback() { clearInterval(this._clock); }
_build() {
this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}${PILL_CSS}
:host{display:block;height:100%;}
.page{display:grid;height:100%;grid-template-columns:420px minmax(0,1fr);gap:16px;}
.left{display:grid;grid-template-rows:auto minmax(0,1fr) 76px;gap:14px;min-height:0;}
.hero{padding:20px 22px;display:grid;grid-template-columns:84px minmax(0,1fr);column-gap:18px;align-items:center;}
.av{width:84px;height:84px;border-radius:50%;overflow:hidden;background:#2c2c2e;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:600;}
.av img{width:100%;height:100%;object-fit:cover;}
.av.away{opacity:0.55;filter:grayscale(0.4);}
.nm{font-family:var(--os-font-display,system-ui);font-size:30px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.where{font-size:15px;color:#f5f5f7;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.since{font-size:13px;color:#a1a1a6;margin-top:2px;display:flex;gap:8px;align-items:center;}
.focus{display:inline-flex;align-items:center;gap:4px;color:#bf5af2;font-weight:600;}
.focus ha-icon{--mdc-icon-size:14px;width:14px;height:14px;display:inline-flex;}
.tiles{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,1fr);gap:12px;min-height:0;}
.tile{padding:12px 16px;display:flex;flex-direction:column;justify-content:space-between;min-height:0;overflow:hidden;}
.tile .v{font-size:24px;font-weight:600;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}
.tile .v small{font-size:15px;color:#a1a1a6;font-weight:600;margin-left:2px;}
.tile .s{font-size:13px;color:#a1a1a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tile.ph .v{color:#6e6e73;}
.tile.ph .s{color:#6e6e73;}
.tile.low .v{color:#ff453a;}
.ping{display:grid;grid-template-columns:52px 1fr 24px;align-items:center;gap:14px;padding:0 18px 0 12px;border:none;width:100%;height:100%;cursor:pointer;text-align:left;
border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06));box-shadow:inset 0 0 0 1px rgba(255,255,255,0.10);transition:transform 140ms ease;}
.ping:active{transform:scale(0.97);}
.ping .ring{width:52px;height:52px;border-radius:50%;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;position:relative;}
.ping .ring ha-icon{--mdc-icon-size:26px;width:26px;height:26px;display:inline-flex;}
.ping.go .ring::before,.ping.go .ring::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #f5f5f7;animation:ripple 1.4s ease-out infinite;}
.ping.go .ring::after{animation-delay:0.7s;}
.ping.go .ring ha-icon{animation:shake 0.5s ease-in-out infinite;}
@keyframes ripple{from{transform:scale(1);opacity:0.8;}to{transform:scale(1.7);opacity:0;}}
@keyframes shake{0%,100%{transform:rotate(0);}25%{transform:rotate(-14deg);}75%{transform:rotate(14deg);}}
.ping .pt{font-size:18px;font-weight:600;letter-spacing:-0.01em;}
.ping .ps{font-size:13px;color:#a1a1a6;margin-top:1px;}
.ping > ha-icon{color:#6e6e73;}
.ping.noapp .ring{background:#2c2c2e;color:#a1a1a6;}
.right{display:grid;grid-template-rows:minmax(0,1fr) 208px;gap:16px;min-height:0;}
.mapw{position:relative;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);background:#0b0b0c;}
.mapw .lbl{position:absolute;top:12px;left:12px;z-index:500;height:30px;padding:0 12px;border-radius:999px;background:rgba(28,28,30,0.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,0.08);pointer-events:none;}
.mapw .lbl ha-icon{--mdc-icon-size:16px;width:16px;height:16px;display:inline-flex;}
.places{padding:16px 0 6px;display:flex;flex-direction:column;min-height:0;}
.places .kicker{padding:0 20px 8px;}
.pl{flex:1;overflow-x:auto;display:flex;gap:12px;padding:4px 20px 12px;scrollbar-width:none;}
.pl::-webkit-scrollbar{display:none;}
.stop{flex:0 0 188px;border-radius:14px;background:#1c1c1e;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;position:relative;}
.stop.now{box-shadow:inset 0 0 0 1px rgba(255,255,255,0.18);}
.stop .sn{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.stop .sn i{width:10px;height:10px;border-radius:50%;flex:none;}
.stop .st{font-size:13px;color:#a1a1a6;}
.stop .sd{font-size:22px;font-weight:600;letter-spacing:-0.02em;}
.empty{color:#6e6e73;font-size:15px;padding:16px 0;}
</style>
<div class="page">
<div class="left">
<div class="card hero" id="hero"></div>
<div class="tiles" id="tiles"></div>
<button class="ping" id="ping"></button>
</div>
<div class="right">
<div class="mapw" id="mapw"><span class="lbl"><ha-icon icon="mdi:map-marker-path"></ha-icon>Last 24 hours</span></div>
<div class="card places"><div class="kicker"><ha-icon icon="mdi:timeline-clock-outline"></ha-icon>Places today</div><div class="pl" id="pl"><div class="empty">Loading…</div></div></div>
</div>
</div>`;
this.shadowRoot.getElementById("ping").addEventListener("click", () => this._ping());
}
async _mountMap() {
this._mapP = true;
const c = this._c;
const card = await createCard({ type: "map", entities: [{ entity: c.person }], hours_to_show: c.hours || 24, theme_mode: "dark", default_zoom: 14, auto_fit: true, fit_zones: false });
card.hass = this._hass;
this._map = card;
this.shadowRoot.getElementById("mapw").appendChild(card);
fillMap(card);
}
_render(force) {
const h = this._hass, c = this._c; if (!h) return;
const p = h.states[c.person], t = c.tracker && h.states[c.tracker];
if (!p) return;
const ta = (t && t.attributes) || {}, pa = p.attributes;
const app = appSensors(h, c.person);
const S = (k) => app[k] && okState(h.states[app[k]]) ? h.states[app[k]] : null;
const st = personStatus(p, t);
const away = p.state !== "home";
const pic = ta.entity_picture || pa.entity_picture;
const addr = ta.address || "";
const where = p.state === "home" ? "At home" : st.cls === "work" || st.cls === "school" || st.cls === "zone" ? `At ${p.state}` : addr ? addr.split(",")[0] : "Location unknown";
const since = ta.at_loc_since && p.state !== "not_home" ? `Since ${fmtClock(ta.at_loc_since)}` : ta.last_seen ? `Updated ${fmtAgo(ta.last_seen).toLowerCase()}` : "";
const focusOn = app.focus && h.states[app.focus] && h.states[app.focus].state === "on";
const hero = `<div class="av ${away ? "away" : ""}">${pic ? `<img src="${esc(pic)}">` : esc(c.initial || (c.name || "?")[0])}</div>
<div style="min-width:0"><div class="nm">${esc(c.name || pa.friendly_name)}<span class="p ${st.cls}"><ha-icon icon="${st.icon}"></ha-icon>${esc(st.txt)}</span></div>
<div class="where">${esc(where)}</div>
<div class="since">${esc(since)}${focusOn ? `<span class="focus"><ha-icon icon="mdi:moon-waning-crescent"></ha-icon>Focus on</span>` : ""}</div></div>`;
const tiles = [];
const ph = (icon, label, need) => ({ icon, label, v: "—", s: need, ph: true });
const bl = S("battery_level") ? num(S("battery_level").state) : num(ta.battery_level);
const chg = S("battery_state") ? /charging|full/i.test(S("battery_state").state) && !/not/i.test(S("battery_state").state) : !!ta.battery_charging;
if (bl != null) tiles.push({ icon: chg ? "mdi:battery-charging" : bl < 20 ? "mdi:battery-alert-variant-outline" : bl < 60 ? "mdi:battery-medium" : "mdi:battery-high", label: "Phone battery", v: `${Math.round(bl)}<small>%</small>`, s: chg ? "Charging" : bl < 20 ? "Low battery" : "Not charging", low: bl < 20 && !chg });
else tiles.push(ph("mdi:battery-outline", "Phone battery", "No data yet"));
const home = h.states["zone.home"];
const lat = num(ta.latitude ?? pa.latitude), lon = num(ta.longitude ?? pa.longitude);
if (p.state === "home") tiles.push({ icon: "mdi:home-outline", label: "From home", v: "Home", s: "Right here" });
else if (home && lat != null && lon != null) {
const d = haversineMi(lat, lon, home.attributes.latitude, home.attributes.longitude);
tiles.push({ icon: "mdi:map-marker-distance", label: "From home", v: d < 0.1 ? `${Math.round(d * 5280)}<small>ft</small>` : `${d < 10 ? d.toFixed(1) : Math.round(d)}<small>mi</small>`, s: "Straight line" });
} else tiles.push(ph("mdi:map-marker-distance", "From home", "No location yet"));
const wz = c.waze && h.states[c.waze];
if (p.state === "home") tiles.push({ icon: "mdi:car-outline", label: "Drive home", v: "—", s: "Already home" });
else if (okState(wz)) { const m = Math.round(num(wz.state) || 0); tiles.push({ icon: "mdi:car-outline", label: "Drive home", v: m < 1 ? "<1<small>min</small>" : m >= 60 ? `${Math.floor(m / 60)}<small>h</small> ${m % 60}<small>m</small>` : `${m}<small>min</small>`, s: wz.attributes.route ? `via ${wz.attributes.route}` : "Live traffic" }); }
else tiles.push(ph("mdi:car-outline", "Drive home", "Add a Waze sensor"));
const spd = num(ta.speed);
if (ta.driving) tiles.push({ icon: "mdi:speedometer", label: "Moving", v: spd != null ? `${Math.round(spd)}<small>mph</small>` : "Driving", s: "Driving now" });
else if (S("activity") && !/unknown/i.test(S("activity").state)) tiles.push({ icon: "mdi:walk", label: "Moving", v: S("activity").state.replace("Automotive", "In a car"), s: "Phone motion" });
else tiles.push({ icon: "mdi:speedometer", label: "Moving", v: spd && spd > 1 ? `${Math.round(spd)}<small>mph</small>` : "Still", s: spd && spd > 1 ? "On the move" : "Not moving" });
if (S("steps")) tiles.push({ icon: "mdi:shoe-print", label: "Steps today", v: Math.round(num(S("steps").state) || 0).toLocaleString(), s: S("walking_running_distance") ? `${(num(S("walking_running_distance").state) || 0).toFixed(1)} mi walked` : "From iPhone" });
else tiles.push(ph("mdi:shoe-print", "Steps today", "Needs the HA app"));
if (S("ssid")) { const ss = S("ssid").state; const off = /not connected/i.test(ss); tiles.push({ icon: off ? "mdi:wifi-off" : "mdi:wifi", label: "Wi-Fi", v: off ? "Off" : esc(ss), s: S("connection_type") ? S("connection_type").state : "" }); }
else if (ta.wifi_on != null) tiles.push({ icon: ta.wifi_on ? "mdi:wifi" : "mdi:wifi-off", label: "Wi-Fi", v: ta.wifi_on ? "On" : "Off", s: "From Life360" });
else tiles.push(ph("mdi:wifi", "Wi-Fi", "Needs the HA app"));
if (S("watch_battery_level")) { const w = num(S("watch_battery_level").state); tiles.push({ icon: "mdi:watch-variant", label: "Watch battery", v: `${Math.round(w)}<small>%</small>`, s: "Apple Watch", low: w < 20 }); }
else { const acc = num(ta.gps_accuracy ?? pa.gps_accuracy); tiles.push({ icon: "mdi:crosshairs-gps", label: "Accuracy", v: acc != null ? `±${Math.round(acc * 3.281)}<small>ft</small>` : "—", s: "GPS precision", ph: acc == null }); }
const seen = ta.last_seen || (t && t.last_updated) || p.last_updated;
tiles.push({ icon: "mdi:update", label: "Last update", v: fmtAgo(seen), s: fmtClock(seen) });
const tilesHtml = tiles.map((x) => `<div class="card tile ${x.ph ? "ph" : ""} ${x.low ? "low" : ""}"><div class="kicker"><ha-icon icon="${x.icon}"></ha-icon>${x.label}</div><div class="v">${x.v}</div><div class="s">${esc(x.s || "") || "&nbsp;"}</div></div>`).join("");
const hasApp = !!Object.keys(app).length;
const who = c.name || pa.friendly_name;
const pingHtml = `<div class="ring"><ha-icon icon="${hasApp ? "mdi:bell-ring-outline" : "mdi:cellphone-off"}"></ha-icon></div>
<div><div class="pt">${this._pinging ? "Pinging…" : `Ping ${esc(who)}’s phone`}</div><div class="ps">${this._pinging ? "Sent. It will play a sound" : hasApp ? focusOn ? "Plays a sound, even with Focus on" : "Plays a loud sound so it can be found" : "Needs the Home Assistant app"}</div></div>
<ha-icon icon="mdi:chevron-right"></ha-icon>`;
const sig = hero + tilesHtml + pingHtml;
if (!force && sig === this._sig) return;
this._sig = sig;
const $ = (id) => this.shadowRoot.getElementById(id);
$("hero").innerHTML = hero; $("tiles").innerHTML = tilesHtml;
const pb = $("ping"); pb.innerHTML = pingHtml; pb.classList.toggle("noapp", !hasApp); pb.classList.toggle("go", !!this._pinging);
}
async _ping() {
if (!this._c.ping_script || this._pinging) return;
this._pinging = true; this._render(true);
try { await this._hass.callService("script", "turn_on", { entity_id: this._c.ping_script }); } catch (e) {}
setTimeout(() => { this._pinging = false; this._render(true); }, 5000);
}
async _loadPlaces() {
if (!this._hass || this._placesBusy) return;
this._placesBusy = true; this._placesAt = Date.now();
const id = this._c.person;
const start = new Date(); start.setHours(0, 0, 0, 0);
try {
const r = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false });
const arr = (r && r[id]) || [];
const segs = [];
arr.forEach((x) => {
const s = x.s, ts = ((x.lc ?? x.lu) || 0) * 1000;
if (!s || s === "unknown" || s === "unavailable") return;
const last = segs[segs.length - 1];
if (last && last.s === s) return;
if (last) last.end = ts;
segs.push({ s, start: Math.max(ts, start.getTime()), end: null });
});
const now = Date.now();
const list = segs.filter((g) => (g.end || now) - g.start > 3 * 60000 || !g.end).reverse();
const col = (s) => s === "home" ? "#f5f5f7" : /work/i.test(s) ? "#2997ff" : /school/i.test(s) ? "#bf5af2" : s === "not_home" ? "#ff9f0a" : "#a1a1a6";
const nm = (s) => s === "home" ? "Home" : s === "not_home" ? "Out and about" : s;
const html = list.length ? list.map((g) => `<div class="stop ${!g.end ? "now" : ""}">
<div class="sn"><i style="background:${col(g.s)}"></i>${esc(nm(g.s))}</div>
<div class="sd">${fmtDur((g.end || now) - g.start)}</div>
<div class="st">${fmtClock(g.start)} – ${g.end ? fmtClock(g.end) : "Now"}</div></div>`).join("")
: `<div class="empty">No places recorded yet today.</div>`;
this.shadowRoot.getElementById("pl").innerHTML = html;
} catch (e) {
this.shadowRoot.getElementById("pl").innerHTML = `<div class="empty">History isn't available right now.</div>`;
}
this._placesBusy = false;
}
}
class OsFamilyMap extends HTMLElement {
setConfig(c) {
if (!c || !c.people) throw new Error("people required");
this._c = c;
this._hours = parseInt(lsGet("os-map-hours") || "24", 10);
if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
}
getCardSize() { return 12; }
set hass(h) {
this._hass = h;
if (!this._map && !this._mapP) this._mountMap();
if (this._map) this._map.hass = h;
this._render();
}
connectedCallback() { this._clock = setInterval(() => this._render(true), 30000); }
disconnectedCallback() { clearInterval(this._clock); }
_build() {
this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}${PILL_CSS}
:host{display:block;height:100%;}
.page{display:grid;height:100%;grid-template-columns:380px minmax(0,1fr);gap:16px;}
.list{padding:18px 12px 10px;display:flex;flex-direction:column;min-height:0;}
.hd{display:flex;align-items:baseline;gap:8px;padding:0 10px 10px;}
.hd .t{font-family:var(--os-font-display,system-ui);font-size:24px;font-weight:700;letter-spacing:-0.02em;}
.hd .m{font-size:15px;color:#a1a1a6;}
.rows{flex:1;display:flex;flex-direction:column;gap:4px;overflow-y:auto;scrollbar-width:none;}
.row{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:14px;padding:10px;border-radius:14px;border:none;background:transparent;cursor:pointer;text-align:left;transition:background-color 200ms ease,transform 140ms ease;flex:1;max-height:104px;}
.row:active{transform:scale(0.98);background:rgba(255,255,255,0.06);}
.av{width:56px;height:56px;border-radius:50%;overflow:hidden;background:#2c2c2e;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:600;position:relative;}
.av img{width:100%;height:100%;object-fit:cover;}
.av.away img,.av.away span{opacity:0.5;}
.n{font-size:18px;font-weight:600;letter-spacing:-0.01em;display:flex;align-items:center;gap:8px;}
.s{font-size:13px;color:#a1a1a6;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.b{display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:13px;font-weight:600;color:#a1a1a6;font-variant-numeric:tabular-nums;}
.b ha-icon{--mdc-icon-size:16px;width:16px;height:16px;display:inline-flex;}
.b .bat{display:flex;align-items:center;gap:3px;}
.b .bat.low{color:#ff453a;}
.foot{font-size:12px;color:#6e6e73;padding:8px 10px 0;}
.mapw{position:relative;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);background:#0b0b0c;}
.seg{position:absolute;top:12px;right:12px;z-index:500;display:flex;padding:3px;border-radius:999px;background:rgba(28,28,30,0.78);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);}
.seg button{height:34px;padding:0 16px;border-radius:999px;border:none;background:transparent;color:#a1a1a6;font-size:14px;font-weight:600;cursor:pointer;transition:background-color 200ms ease,color 200ms ease;}
.seg button.on{background:#f5f5f7;color:#1d1d1f;}
</style>
<div class="page">
<div class="card list"><div class="hd"><span class="t">Family</span><span class="m" id="cnt"></span></div><div class="rows" id="rows"></div><div class="foot" id="foot"></div></div>
<div class="mapw" id="mapw"><div class="seg" id="seg">
<button data-h="1">Now</button><button data-h="24">Today</button><button data-h="72">3 Days</button><button data-h="168">Week</button></div></div>
</div>`;
const $ = (id) => this.shadowRoot.getElementById(id);
$("rows").addEventListener("click", (e) => { const r = e.target.closest(".row"); if (r && r.dataset.path) osNavigate(r.dataset.path); });
$("seg").addEventListener("click", (e) => {
const b = e.target.closest("button"); if (!b) return;
this._hours = parseInt(b.dataset.h, 10); lsSet("os-map-hours", String(this._hours));
this._segUi(); this._mountMap();
});
this._segUi();
}
_segUi() { this.shadowRoot.querySelectorAll("#seg button").forEach((b) => b.classList.toggle("on", parseInt(b.dataset.h, 10) === this._hours)); }
async _mountMap() {
this._mapP = true;
const card = await createCard({ type: "map", entities: this._c.people.map((p) => ({ entity: p.person })), hours_to_show: this._hours > 1 ? this._hours : 0,
theme_mode: "dark", auto_fit: true, fit_zones: false, default_zoom: 14 });
card.hass = this._hass;
if (this._map) this._map.remove();
this._map = card;
this.shadowRoot.getElementById("mapw").insertBefore(card, this.shadowRoot.getElementById("seg"));
fillMap(card);
this._mapP = false;
}
_render(force) {
const h = this._hass; if (!h) return;
const ppl = this._c.people;
let home = 0;
const html = ppl.map((cfg) => {
const p = h.states[cfg.person], t = cfg.tracker && h.states[cfg.tracker];
if (!p) return "";
if (p.state === "home") home++;
const ta = (t && t.attributes) || {};
const st = personStatus(p, t);
const pic = ta.entity_picture || p.attributes.entity_picture;
let sub;
if (ta.driving) sub = (ta.address || "On the road").split(",")[0];
else if (p.state === "not_home") sub = (ta.address || "Away").split(",")[0] + (ta.at_loc_since ? ` · since ${fmtClock(ta.at_loc_since)}` : "");
else sub = ta.at_loc_since ? `Since ${fmtClock(ta.at_loc_since)}` : p.state === "home" ? "At home" : `At ${p.state}`;
const bl = num(ta.battery_level);
return `<button class="row" data-path="${esc(cfg.path || "")}">
<div class="av ${p.state !== "home" ? "away" : ""}">${pic ? `<img src="${esc(pic)}">` : `<span>${esc(cfg.initial || cfg.name[0])}</span>`}</div>
<div style="min-width:0"><div class="n">${esc(cfg.name)}</div><div class="s">${esc(sub)}</div></div>
<div class="b"><span class="p ${st.cls}"><ha-icon icon="${st.icon}"></ha-icon>${esc(st.txt)}</span>
${bl != null ? `<span class="bat ${bl < 20 ? "low" : ""}"><ha-icon icon="${ta.battery_charging ? "mdi:battery-charging" : bl < 20 ? "mdi:battery-alert-variant-outline" : "mdi:battery-high"}"></ha-icon>${Math.round(bl)}%</span>` : ""}</div>
</button>`;
}).join("");
const cnt = `${home} of ${ppl.length} home`;
if (!force && html + cnt === this._sig) return;
this._sig = html + cnt;
this.shadowRoot.getElementById("rows").innerHTML = html;
this.shadowRoot.getElementById("cnt").textContent = cnt;
this.shadowRoot.getElementById("foot").textContent = "Tap someone to see their day. Lines on the map show where everyone has been.";
}
}
Object.entries({ "os-person-page": OsPersonPage, "os-family-map": OsFamilyMap }).forEach(([n, k]) => { if (!customElements.get(n)) customElements.define(n, k); });
})();
