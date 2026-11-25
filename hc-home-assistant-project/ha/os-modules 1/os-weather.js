/* Clark Home OS - weather page, radar, coloured forecast icons */
(() => {
const FONT_TEXT = '-apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
const BASE_CSS = `
:host { display:block; font-family: var(--os-font, ${FONT_TEXT}); color: #f5f5f7;
-webkit-font-smoothing: antialiased; font-feature-settings: "ss03", "cv11"; }
`;
const WX = {
"clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline",
fog: "mdi:weather-fog", hail: "mdi:weather-hail", lightning: "mdi:weather-lightning",
"lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy",
pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
"snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy",
"windy-variant": "mdi:weather-windy-variant",
};
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtClock = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtHour = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric" }).replace(" ", "");
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const CARD_CSS = `
.card { background: #121214; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; box-sizing: border-box; min-width: 0; min-height: 0; }
.kicker { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #a1a1a6; }
.kicker ha-icon { --mdc-icon-size: 15px; width: 15px; height: 15px; display: inline-flex; }
button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
`;
const WXC = {
sunny: "#ffd60a", "clear-night": "#b9b4ff", partlycloudy: "#ffe28a", cloudy: "#c7c7cc", fog: "#98989d",
rainy: "#64d2ff", pouring: "#0a84ff", lightning: "#ffd60a", "lightning-rainy": "#ffcc00",
snowy: "#e6f4ff", "snowy-rainy": "#9ad7ff", hail: "#9ad7ff", windy: "#8ee6d3", "windy-variant": "#8ee6d3",
exceptional: "#ff453a",
};
const sunInfo = (hass) => {
const s = hass && hass.states["sun.sun"];
if (!s) return null;
const r = new Date(s.attributes.next_rising), st = new Date(s.attributes.next_setting);
return { rise: r.getHours() * 60 + r.getMinutes(), set: st.getHours() * 60 + st.getMinutes(), riseAt: r, setAt: st, up: s.state === "above_horizon" };
};
const isNight = (d, sun) => {
const x = new Date(d);
if (!sun) return x.getHours() < 7 || x.getHours() >= 19;
const m = x.getHours() * 60 + x.getMinutes();
return m < sun.rise || m >= sun.set;
};
const wxIcon = (c, night) => {
if (night && (c === "sunny" || c === "clear-night")) return "mdi:weather-night";
if (night && c === "partlycloudy") return "mdi:weather-night-partly-cloudy";
return WX[c] || "mdi:weather-cloudy";
};
const wxColor = (c, night) => {
if (night && (c === "sunny" || c === "clear-night")) return WXC["clear-night"];
if (night && c === "partlycloudy") return "#cfccf7";
return WXC[c] || "#c7c7cc";
};
const wxText = (c) => ({
"clear-night": "Clear", cloudy: "Cloudy", exceptional: "Severe Weather", fog: "Foggy", hail: "Hail", lightning: "Thunderstorms",
"lightning-rainy": "Thunderstorms", partlycloudy: "Partly Cloudy", pouring: "Heavy Rain", rainy: "Rain", snowy: "Snow",
"snowy-rainy": "Sleet", sunny: "Sunny", windy: "Windy", "windy-variant": "Windy",
}[c] || (c || "").replace(/-/g, " "));
window.osWeatherColor = (c) => wxColor(c, false);
const TSTOPS = [[10, "#5e5ce6"], [32, "#0a84ff"], [45, "#64d2ff"], [58, "#30d158"], [68, "#ffd60a"], [80, "#ff9f0a"], [95, "#ff453a"]];
const tempColor = (t) => {
if (t <= TSTOPS[0][0]) return TSTOPS[0][1];
for (let i = 1; i < TSTOPS.length; i++) if (t <= TSTOPS[i][0]) return (t - TSTOPS[i - 1][0]) / (TSTOPS[i][0] - TSTOPS[i - 1][0]) < 0.5 ? TSTOPS[i - 1][1] : TSTOPS[i][1];
return TSTOPS[TSTOPS.length - 1][1];
};
const bearing = (b) => {
const n = num(b);
if (n == null) return typeof b === "string" ? b : "";
return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(n / 45) % 8];
};
const subForecast = (hass, entity, type, cb) => {
let unsub = null, dead = false;
hass.connection.subscribeMessage((ev) => cb(ev.forecast || []), { type: "weather/subscribe_forecast", entity_id: entity, forecast_type: type })
.then((u) => { if (dead) u(); else unsub = u; }).catch(() => {});
return () => { dead = true; if (unsub) unsub(); };
};
class OsWeatherPage extends HTMLElement {
setConfig(c) {
if (!c || !c.entity) throw new Error("entity required");
this._c = c;
if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
}
getCardSize() { return 12; }
set hass(h) {
this._hass = h;
window.__osSunUp = h.states["sun.sun"] ? h.states["sun.sun"].state === "above_horizon" : true;
if (this.isConnected && !this._subs) this._subscribe();
if (this._radar) this._radar.hass = h;
this._renderNow(); this._renderStats();
}
connectedCallback() { if (this._hass && !this._subs) this._subscribe(); }
disconnectedCallback() { (this._subs || []).forEach((u) => u()); this._subs = null; }
_subscribe() {
const h = this._hass, e = this._c.entity;
this._subs = [
subForecast(h, e, "daily", (f) => { this._daily = f; this._renderNow(); this._renderDaily(); this._renderStats(); }),
subForecast(h, e, "hourly", (f) => { this._hourly = f; this._renderHourly(); }),
];
}
_build() {
this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}
:host{height:100%;}
.page{display:grid;height:100%;gap:16px;grid-template-columns:380px minmax(0,1fr);
grid-template-rows:214px minmax(0,1fr) 104px;grid-template-areas:"now hourly" "daily radar" "daily stats";}
.now{grid-area:now;padding:20px 24px;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto 1fr auto auto;}
.now .temp{font-family:var(--os-font-display,system-ui);font-size:92px;font-weight:200;letter-spacing:-0.05em;line-height:1;grid-row:2;align-self:center;}
.now .ic{grid-row:1 / 3;grid-column:2;}
.now .ic ha-icon{--mdc-icon-size:64px;width:64px;height:64px;display:block;}
.now .cond{grid-column:1 / 3;font-size:21px;font-weight:600;letter-spacing:-0.01em;}
.now .hl{grid-column:1 / 3;font-size:15px;color:#a1a1a6;margin-top:4px;display:flex;gap:14px;}
.now .hl b{color:#f5f5f7;font-weight:600;}
.hourly{grid-area:hourly;padding:16px 0 12px;display:flex;flex-direction:column;min-width:0;}
.hourly .kicker,.daily .kicker{padding:0 20px;}
.sum{font-size:15px;font-weight:600;letter-spacing:-0.01em;padding:6px 20px 10px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.strip{flex:1;display:flex;overflow-x:auto;scrollbar-width:none;padding:0 12px;scroll-snap-type:x proximity;}
.strip::-webkit-scrollbar{display:none;}
.hr{flex:0 0 64px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;scroll-snap-align:start;padding:2px 0;}
.hr .l{font-size:14px;font-weight:600;color:#a1a1a6;}
.hr.first .l{color:#f5f5f7;}
.hr ha-icon{--mdc-icon-size:26px;width:26px;height:26px;display:block;}
.hr .pp{font-size:12px;font-weight:600;color:#64d2ff;min-height:14px;line-height:14px;}
.hr .v{font-size:19px;font-weight:600;font-variant-numeric:tabular-nums;}
.hr.sun .v{font-size:13px;color:#a1a1a6;}
.daily{grid-area:daily;padding:16px 0 8px;display:flex;flex-direction:column;}
.rows{flex:1;display:flex;flex-direction:column;padding:4px 20px 0;min-height:0;}
.day{flex:1;display:grid;grid-template-columns:62px 44px 34px 1fr 34px;align-items:center;column-gap:10px;border-top:1px solid rgba(255,255,255,0.07);min-height:0;}
.day:first-child{border-top:none;}
.day .dn{font-size:17px;font-weight:600;letter-spacing:-0.01em;}
.day .di{display:flex;flex-direction:column;align-items:center;line-height:1;}
.day .di ha-icon{--mdc-icon-size:24px;width:24px;height:24px;display:block;}
.day .di span{font-size:11px;font-weight:700;color:#64d2ff;margin-top:2px;}
.day .lo{font-size:17px;color:#6e6e73;text-align:right;font-variant-numeric:tabular-nums;}
.day .hi{font-size:17px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;}
.rng{position:relative;height:5px;border-radius:3px;background:rgba(255,255,255,0.10);}
.rng i{position:absolute;top:0;bottom:0;border-radius:3px;}
.rng b{position:absolute;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px #121214;}
.radar{grid-area:radar;overflow:hidden;position:relative;}
.radar os-radar{display:block;height:100%;}
.stats{grid-area:stats;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;}
.st{padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;}
.st .v{font-size:26px;font-weight:600;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap;}
.st .v small{font-size:15px;font-weight:600;color:#a1a1a6;margin-left:2px;}
.st .s{font-size:13px;color:#a1a1a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.empty{color:#6e6e73;font-size:15px;padding:20px;}
</style>
<div class="page">
<div class="card now" id="now"></div>
<div class="card hourly"><div class="kicker"><ha-icon icon="mdi:clock-outline"></ha-icon>Hourly Forecast</div><div class="sum" id="sum">&nbsp;</div><div class="strip" id="strip"><div class="empty">Loading…</div></div></div>
<div class="card daily"><div class="kicker"><ha-icon icon="mdi:calendar-blank-outline"></ha-icon><span id="dk">10-Day Forecast</span></div><div class="rows" id="rows"><div class="empty">Loading…</div></div></div>
<div class="card radar" id="radarw"></div>
<div class="stats" id="stats"></div>
</div>`;
const r = document.createElement("os-radar");
r.setConfig(Object.assign({ label: "Radar" }, this._c.radar || {}));
this._radar = r;
this.shadowRoot.getElementById("radarw").appendChild(r);
}
_tempNow() {
const h = this._hass, w = h.states[this._c.entity];
const t = this._c.temperature_entity && h.states[this._c.temperature_entity];
const v = t && num(t.state) != null ? num(t.state) : w && num(w.attributes.temperature);
return v == null ? null : Math.round(v);
}
_renderNow() {
const h = this._hass; if (!h || !this.shadowRoot) return;
const w = h.states[this._c.entity]; if (!w) return;
const sun = sunInfo(h), night = sun ? !sun.up : false;
const d0 = (this._daily || [])[0];
const feels = num(w.attributes.apparent_temperature);
const html = `
<div class="kicker">${this._c.name || "Now"}</div>
<div class="ic"><ha-icon icon="${wxIcon(w.state, night)}" style="color:${wxColor(w.state, night)}"></ha-icon></div>
<div class="temp">${this._tempNow() ?? "--"}°</div>
<div class="cond">${wxText(w.state)}</div>
<div class="hl">${d0 ? `<span>H <b>${Math.round(d0.temperature)}°</b></span><span>L <b>${Math.round(d0.templow)}°</b></span>` : ""}${feels != null ? `<span>Feels like <b>${Math.round(feels)}°</b></span>` : ""}</div>`;
if (html !== this._nowHtml) { this._nowHtml = html; this.shadowRoot.getElementById("now").innerHTML = html; }
}
_renderHourly() {
const h = this._hass, f = (this._hourly || []).slice(0, 24);
if (!f.length) return;
const sun = sunInfo(h);
const cols = f.map((x, i) => ({ t: new Date(x.datetime), x, i }));
const extra = [];
if (sun) {
const end = cols[cols.length - 1].t.getTime();
[[sun.riseAt, "Sunrise", "mdi:weather-sunset-up", "#ffd60a"], [sun.setAt, "Sunset", "mdi:weather-sunset-down", "#ff9f0a"]].forEach(([d, n, ic, col]) => {
if (d.getTime() > Date.now() && d.getTime() < end) extra.push({ t: d, sun: { n, ic, col } });
});
}
const all = cols.concat(extra).sort((a, b) => a.t - b.t);
const html = all.map((c) => {
if (c.sun) return `<div class="hr sun"><div class="l">${fmtClock(c.t).replace(" ", "")}</div><ha-icon icon="${c.sun.ic}" style="color:${c.sun.col}"></ha-icon><div class="pp"></div><div class="v">${c.sun.n}</div></div>`;
const n = isNight(c.t, sun), x = c.x, pp = num(x.precipitation_probability);
return `<div class="hr ${c.i === 0 ? "first" : ""}"><div class="l">${c.i === 0 ? "Now" : fmtHour(c.t)}</div>
<ha-icon icon="${wxIcon(x.condition, n)}" style="color:${wxColor(x.condition, n)}"></ha-icon>
<div class="pp">${pp != null && pp >= 20 ? Math.round(pp) + "%" : ""}</div><div class="v">${Math.round(x.temperature)}°</div></div>`;
}).join("");
this.shadowRoot.getElementById("strip").innerHTML = html;
const wet = f.find((x) => (num(x.precipitation_probability) || 0) >= 50 || ["rainy", "pouring", "lightning-rainy", "snowy", "snowy-rainy", "hail"].includes(x.condition));
let sum;
if (wet && f.indexOf(wet) === 0) sum = `${wxText(wet.condition)} now. Keep an umbrella handy.`;
else if (wet) sum = `${wxText(wet.condition === "cloudy" || wet.condition === "partlycloudy" ? "rainy" : wet.condition)} likely around ${fmtHour(wet.datetime)}.`;
else {
const temps = f.slice(0, 12).map((x) => x.temperature);
sum = `${wxText(f[0].condition)} conditions. Temperatures ${Math.round(Math.min(...temps))}° to ${Math.round(Math.max(...temps))}° over the next 12 hours.`;
}
this.shadowRoot.getElementById("sum").textContent = sum;
}
_renderDaily() {
const f = (this._daily || []).slice(0, 10);
if (!f.length) return;
this.shadowRoot.getElementById("dk").textContent = `${f.length}-Day Forecast`;
const lo = Math.min(...f.map((x) => x.templow ?? x.temperature)), hi = Math.max(...f.map((x) => x.temperature));
const span = Math.max(1, hi - lo), now = this._tempNow();
const rows = f.map((x, i) => {
const d = new Date(x.datetime);
const name = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
const l = x.templow ?? x.temperature, t = x.temperature;
const a = ((l - lo) / span) * 100, b = ((t - lo) / span) * 100;
const pp = num(x.precipitation_probability);
const dot = i === 0 && now != null ? `<b style="left:${Math.min(100, Math.max(0, ((now - lo) / span) * 100))}%"></b>` : "";
return `<div class="day"><div class="dn">${name}</div>
<div class="di"><ha-icon icon="${wxIcon(x.condition, false)}" style="color:${wxColor(x.condition, false)}"></ha-icon>${pp != null && pp >= 20 ? `<span>${Math.round(pp)}%</span>` : ""}</div>
<div class="lo">${Math.round(l)}°</div>
<div class="rng"><i style="left:${a}%;right:${100 - b}%;background:linear-gradient(90deg, ${tempColor(l)}, ${tempColor(t)})"></i>${dot}</div>
<div class="hi">${Math.round(t)}°</div></div>`;
}).join("");
this.shadowRoot.getElementById("rows").innerHTML = rows;
}
_renderStats() {
const h = this._hass, c = this._c, w = h.states[c.entity]; if (!w || !this.shadowRoot) return;
const a = w.attributes, st = (e) => e && h.states[e];
const hum = st(c.humidity_entity) ? num(st(c.humidity_entity).state) : num(a.humidity);
const uv = st(c.uv_entity) ? num(st(c.uv_entity).state) : num(a.uv_index);
const uvTxt = uv == null ? "" : uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : uv < 11 ? "Very High" : "Extreme";
const sun = sunInfo(h);
const dew = num(a.dew_point);
const d0 = (this._daily || [])[0];
const d0pp = d0 ? num(d0.precipitation_probability) : null;
const tiles = [
["mdi:water-percent", "Humidity", hum != null ? `${Math.round(hum)}<small>%</small>` : "--", dew != null ? `Dew point ${Math.round(dew)}°` : ""],
["mdi:weather-windy", "Wind", num(a.wind_speed) != null ? `${Math.round(a.wind_speed)}<small>${a.wind_speed_unit || "mph"}</small>` : "--", [bearing(a.wind_bearing), num(a.wind_gust_speed) != null ? `Gusts ${Math.round(a.wind_gust_speed)}` : ""].filter(Boolean).join(" · ")],
["mdi:white-balance-sunny", "UV Index", uv != null ? `${Math.round(uv)}` : "--", uvTxt],
["mdi:umbrella-outline", "Rain", d0pp != null ? `${Math.round(d0pp)}<small>%</small>` : "--", d0pp != null ? (d0pp >= 50 ? "Likely today" : d0pp >= 20 ? "Chance today" : "Unlikely today") : ""],
["mdi:weather-sunset-up", "Sunrise", sun ? fmtClock(sun.riseAt).replace(" ", "<small>") + "</small>" : "--", sun ? (sun.riseAt.toDateString() === new Date().toDateString() ? "Today" : "Tomorrow") : ""],
["mdi:weather-sunset-down", "Sunset", sun ? fmtClock(sun.setAt).replace(" ", "<small>") + "</small>" : "--", sun ? (sun.setAt.toDateString() === new Date().toDateString() ? "Today" : "Tomorrow") : ""],
];
const html = tiles.map(([ic, l, v, s]) => `<div class="card st"><div class="kicker"><ha-icon icon="${ic}"></ha-icon>${l}</div><div class="v">${v}</div><div class="s">${s || "&nbsp;"}</div></div>`).join("");
if (html !== this._statsHtml) { this._statsHtml = html; this.shadowRoot.getElementById("stats").innerHTML = html; }
}
}
const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
let leafletP = null;
/* The radar uses its own private copy of Leaflet 1.9.4. It never borrows or replaces window.L, so Home Assistant's
   own maps (family map, person pages) and any patched global Leaflet can't change how the radar draws, and vice versa.
   (HA's global Leaflet requested fractional-zoom tiles like 7.5/71/50, which drew the wrong part of the world.) */
const loadLeaflet = () => {
if (window.__osRadarL) return Promise.resolve(window.__osRadarL);
if (leafletP) return leafletP;
leafletP = new Promise((res, rej) => {
const before = window.L;
const s = document.createElement("script");
s.src = LEAFLET_JS; s.async = true;
s.onload = () => {
const mine = window.L;
try { window.L = before; } catch (e) {}
window.__osRadarL = mine; res(mine);
};
s.onerror = (e) => { leafletP = null; rej(e); };
document.head.appendChild(s);
});
return leafletP;
};
const ESRI = (m, kind) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${m === "light" ? "Light" : "Dark"}_Gray_${kind}/MapServer/tile/{z}/{y}/{x}`;
class OsRadar extends HTMLElement {
setConfig(c) { this._c = c || {}; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 6; }
set hass(h) { this._hass = h; if (this.isConnected && !this._map) this._init(); }
connectedCallback() {
if (this._hass && !this._map) this._init();
if (this._map) { setTimeout(() => this._map.invalidateSize(), 60); this._play(); }
}
disconnectedCallback() { clearInterval(this._timer); clearInterval(this._refresh); this._timer = this._refresh = null; }
_build() {
this.shadowRoot.innerHTML = `<link rel="stylesheet" href="${LEAFLET_CSS}"><style>${BASE_CSS}
:host{display:block;height:100%;position:relative;border-radius:inherit;overflow:hidden;background:#0b0b0c;}
#map{position:absolute;inset:0;background:#0b0b0c;}
.leaflet-container{background:#0b0b0c;font:inherit;}
.top{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;pointer-events:none;z-index:800;}
.pill{height:30px;padding:0 12px;border-radius:999px;background:rgba(28,28,30,0.72);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);
display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#f5f5f7;border:1px solid rgba(255,255,255,0.08);}
.pill ha-icon{--mdc-icon-size:16px;width:16px;height:16px;display:inline-flex;}
.ctl{position:absolute;left:12px;right:12px;bottom:12px;z-index:800;display:flex;align-items:center;gap:12px;height:44px;padding:0 14px 0 6px;
border-radius:999px;background:rgba(28,28,30,0.72);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1px solid rgba(255,255,255,0.08);}
.ctl button{width:34px;height:34px;border-radius:50%;border:none;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none;transition:transform 140ms ease;}
.ctl button:active{transform:scale(0.9);}
.ctl button ha-icon{--mdc-icon-size:20px;width:20px;height:20px;display:inline-flex;}
.tl{flex:1;display:flex;gap:3px;align-items:center;height:100%;cursor:pointer;}
.tl i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.18);transition:background-color 200ms ease;}
.tl i.past{background:rgba(255,255,255,0.45);}
.tl i.on{background:#f5f5f7;height:8px;}
.tl i.fut{background:rgba(41,151,255,0.35);}
.tl i.fut.past{background:rgba(41,151,255,0.7);}
.time{font-size:13px;font-weight:600;color:#f5f5f7;min-width:64px;text-align:right;font-variant-numeric:tabular-nums;}
.legend{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#a1a1a6;}
.legend .g{width:70px;height:6px;border-radius:3px;background:linear-gradient(90deg,#9fe7ff,#1a8cff,#19c16a,#ffe21c,#ff8a00,#ff2d2d,#d84dff);}
.err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6e6e73;font-size:15px;z-index:900;pointer-events:none;}
.home-dot{width:14px;height:14px;border-radius:50%;background:#2997ff;border:3px solid #fff;box-sizing:border-box;box-shadow:0 0 0 6px rgba(41,151,255,0.25);}
</style>
<div id="map"></div>
<div class="top"><span class="pill"><ha-icon icon="mdi:radar"></ha-icon>${esc(this._c.label || "Radar")}</span><span class="pill legend">Light<span class="g"></span>Heavy</span></div>
<div class="ctl"><button id="pp" aria-label="Play or pause"><ha-icon icon="mdi:pause"></ha-icon></button><div class="tl" id="tl"></div><div class="time" id="time"></div></div>
<div class="err" id="err"></div>`;
this.shadowRoot.getElementById("pp").addEventListener("click", () => { this._paused = !this._paused; this._ppIcon(); });
this.shadowRoot.getElementById("tl").addEventListener("click", (e) => {
if (!this._list) return;
const r = e.currentTarget.getBoundingClientRect();
const i = Math.min(this._list.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * this._list.length)));
this._paused = true; this._ppIcon(); this._show(i);
});
}
_ppIcon() { const b = this.shadowRoot.querySelector("#pp ha-icon"); if (b) b.setAttribute("icon", this._paused ? "mdi:play" : "mdi:pause"); }
async _init() {
if (this._initing) return; this._initing = true;
let L;
try { L = await loadLeaflet(); } catch (e) { this.shadowRoot.getElementById("err").textContent = "Radar unavailable"; this._initing = false; return; }
const h = this._hass, c = this._c;
const home = h.states["zone.home"];
const lat = c.latitude ?? (home ? home.attributes.latitude : h.config.latitude);
const lon = c.longitude ?? (home ? home.attributes.longitude : h.config.longitude);
const el = this.shadowRoot.getElementById("map");
const map = L.map(el, { zoomControl: false, attributionControl: false, zoomSnap: 1, minZoom: 4, maxZoom: 11, worldCopyJump: true });
map.setView([lat, lon], Math.round(c.zoom || 7));
const md = document.documentElement.getAttribute("data-os-mode") === "light" ? "light" : "dark";
L.tileLayer(ESRI(md, "Base"), { maxZoom: 16 }).addTo(map);
map.createPane("labels");
map.getPane("labels").style.zIndex = 650;
map.getPane("labels").style.pointerEvents = "none";
L.tileLayer(ESRI(md, "Reference"), { pane: "labels", maxZoom: 16 }).addTo(map);
L.marker([lat, lon], { pane: "labels", interactive: false, icon: L.divIcon({ className: "", html: '<div class="home-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(map);
this._map = map; this._L = L; this._layers = {};
new ResizeObserver(() => map.invalidateSize()).observe(this);
await this._frames();
this._play();
this._refresh = setInterval(() => this._frames(), 10 * 60 * 1000);
}
async _frames() {
try {
const r = await fetch("https://api.rainviewer.com/public/weather-maps.json", { cache: "no-store" }).then((x) => x.json());
const past = (r.radar && r.radar.past) || [], cast = (r.radar && r.radar.nowcast) || [];
this._host = r.host;
this._list = past.concat(cast);
this._nowIdx = past.length - 1;
const keep = new Set(this._list.map((f) => f.path));
Object.keys(this._layers).forEach((p) => { if (!keep.has(p)) { this._map.removeLayer(this._layers[p]); delete this._layers[p]; } });
this.shadowRoot.getElementById("tl").innerHTML = this._list.map((f, i) => `<i class="${i > this._nowIdx ? "fut" : ""}"></i>`).join("");
this.shadowRoot.getElementById("err").textContent = "";
this._show(this._nowIdx);
} catch (e) {
this.shadowRoot.getElementById("err").textContent = this._list ? "" : "Radar unavailable right now";
}
}
_layer(i) {
const f = this._list[i]; if (!f) return null;
if (!this._layers[f.path]) {
this._layers[f.path] = this._L.tileLayer(`${this._host}${f.path}/256/{z}/{x}/{y}/${this._c.color ?? 2}/1_1.png`,
{ opacity: 0, zIndex: 10, maxNativeZoom: this._c.max_native_zoom ?? 7, maxZoom: 19, tileSize: 256, className: "rv" }).addTo(this._map);
}
return this._layers[f.path];
}
_show(i) {
if (!this._list || !this._list.length) return;
const prev = this._layer(this._idx);
const cur = this._layer(i);
if (prev && prev !== cur) prev.setOpacity(0);
if (cur) cur.setOpacity(this._c.opacity ?? 0.8);
this._layer((i + 1) % this._list.length);
this._idx = i;
const f = this._list[i];
this.shadowRoot.getElementById("time").textContent = i === this._nowIdx ? "Now" : fmtClock(f.time * 1000).replace(" ", "");
this.shadowRoot.querySelectorAll(".tl i").forEach((el, k) => { el.classList.toggle("on", k === i); el.classList.toggle("past", k < i); });
}
_play() {
clearInterval(this._timer);
let hold = 0;
this._timer = setInterval(() => {
if (this._paused || !this._list || !this._list.length) return;
if (this._idx === this._list.length - 1 && hold++ < 3) return;
hold = 0;
this._show(this._idx >= this._list.length - 1 ? 0 : this._idx + 1);
}, 550);
}
}
const patchForecast = () => {
const F = customElements.get("os-forecast");
if (!F || F.prototype.__osColored) return !!F;
const orig = F.prototype._render;
const rev = {}; Object.entries(WX).forEach(([k, v]) => { if (!rev[v]) rev[v] = k; });
F.prototype._render = function () {
orig.apply(this, arguments);
const sr = this.shadowRoot; if (!sr) return;
sr.querySelectorAll(".cell ha-icon").forEach((ic) => { const c = rev[ic.getAttribute("icon")]; if (c) ic.style.color = wxColor(c, false); });
};
F.prototype.__osColored = true;
return true;
};
if (!patchForecast()) customElements.whenDefined("os-forecast").then(patchForecast);
Object.entries({ "os-weather-page": OsWeatherPage, "os-radar": OsRadar }).forEach(([n, k]) => { if (!customElements.get(n)) customElements.define(n, k); });
})();
