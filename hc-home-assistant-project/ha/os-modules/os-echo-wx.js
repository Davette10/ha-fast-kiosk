/* os-echo-wx: full-screen Weather page for the Echo Show (<os-echo-weather>, opened by os-echo).
   Left: now (big temperature) + 7-day forecast. Right: next 12 hours, a live rain radar (RainViewer, animated over
   the last hour on a dark map centred on home) and four small tiles: wind, humidity, UV and sunrise/sunset. */
(() => {
const WX = { "clear-night": "weather-night", cloudy: "weather-cloudy", exceptional: "alert-circle-outline", fog: "weather-fog", hail: "weather-hail", lightning: "weather-lightning", "lightning-rainy": "weather-lightning-rainy", partlycloudy: "weather-partly-cloudy", pouring: "weather-pouring", rainy: "weather-rainy", snowy: "weather-snowy", "snowy-rainy": "weather-snowy-rainy", sunny: "weather-sunny", windy: "weather-windy", "windy-variant": "weather-windy-variant" };
const WXT = { "clear-night": "Clear", cloudy: "Cloudy", exceptional: "Alert", fog: "Foggy", hail: "Hail", lightning: "Storms", "lightning-rainy": "Thunderstorms", partlycloudy: "Partly cloudy", pouring: "Heavy rain", rainy: "Rain", snowy: "Snow", "snowy-rainy": "Sleet", sunny: "Sunny", windy: "Windy", "windy-variant": "Windy" };
const BASE = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`;
const LBL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/${z}/${y}/${x}`;
const lon2x = (lon, z) => ((lon + 180) / 360) * 256 * 2 ** z;
const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 256 * 2 ** z; };
const r = (x) => Math.round(x);
const icon = (c) => `<ha-icon icon="mdi:${WX[c] || "weather-partly-cloudy"}"></ha-icon>`;
const hm = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const CSS = `
:host{display:block;height:100%;color:#fff;}
*{box-sizing:border-box;}
.g{height:100%;display:grid;grid-template-columns:37% minmax(0,1fr);gap:1.6vh 1.4vw;padding:0 3vw 3vh;}
.c{background:rgba(255,255,255,.14);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:3vh;padding:1.8vh 1.4vw;min-height:0;overflow:hidden;}
.c h4{margin:0 0 1vh;display:flex;align-items:center;gap:.6vw;font-size:1.75vh;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.62);}
.c h4 ha-icon{--mdc-icon-size:2.1vh;}
.L,.R{display:flex;flex-direction:column;gap:1.6vh;min-height:0;}
.now{display:flex;align-items:center;gap:1.4vw;padding:1vh .4vw 0;}
.now>ha-icon{--mdc-icon-size:13vh;}
.now b{display:block;font-size:13vh;font-weight:200;line-height:.95;letter-spacing:-.03em;}
.now .c1{font-size:3vh;font-weight:600;}
.now .c2{font-size:2.3vh;color:rgba(255,255,255,.75);margin-top:.3vh;}
.days{flex:1;display:flex;flex-direction:column;}
.dl{flex:1;display:grid;grid-template-columns:7.5vw 4vh 4vw minmax(0,1fr) 4vw;align-items:center;gap:.6vw;font-size:2.5vh;border-top:1px solid rgba(255,255,255,.1);}
.dl:first-of-type{border-top:0;}
.dl ha-icon{--mdc-icon-size:3.4vh;}
.dl .lo{color:rgba(255,255,255,.55);text-align:right;}
.dl .hi{text-align:right;font-weight:600;}
.bar{position:relative;height:.7vh;border-radius:99px;background:rgba(255,255,255,.18);}
.bar i{position:absolute;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#64d2ff,#ffd60a,#ff9f0a);}
.dl small{display:block;font-size:1.6vh;color:#64d2ff;line-height:1;}
.hrs{display:flex;justify-content:space-between;}
.hr{flex:1;display:flex;flex-direction:column;align-items:center;gap:.5vh;font-size:2vh;color:rgba(255,255,255,.75);}
.hr ha-icon{--mdc-icon-size:3.4vh;color:#fff;}
.hr b{font-size:2.6vh;font-weight:600;color:#fff;}
.hr small{font-size:1.6vh;color:#64d2ff;min-height:1.6vh;}
.rad{flex:1;position:relative;padding:0;}
.rad h4{position:absolute;left:1.4vw;top:1.4vh;z-index:3;margin:0;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.8);}
.rad .ts{position:absolute;right:1.4vw;top:1.3vh;z-index:3;font-size:2vh;font-weight:600;padding:.4vh .9vw;border-radius:99px;background:rgba(0,0,0,.45);}
.rad .lg{position:absolute;left:1.4vw;bottom:1.4vh;z-index:3;display:flex;align-items:center;gap:.6vw;font-size:1.6vh;color:rgba(255,255,255,.8);}
.rad .lg i{width:12vw;height:.8vh;border-radius:99px;background:linear-gradient(90deg,#88ddee,#0099cc,#00aa00,#ffee00,#ff9900,#ff0000,#cc00cc);}
.mp{position:absolute;inset:0;background:#1b1d22;}
.mp img{position:absolute;}
.mp .fr{position:absolute;inset:0;opacity:0;transition:opacity .25s;}
.mp .fr.on{opacity:.8;}
.home{position:absolute;width:1.8vh;height:1.8vh;margin:-.9vh 0 0 -.9vh;border-radius:50%;background:#fff;box-shadow:0 0 0 .5vh rgba(10,132,255,.9),0 0 2vh rgba(10,132,255,.8);z-index:2;}
.tls{display:grid;grid-template-columns:repeat(4,1fr);gap:1.6vh;}
.tl{padding:1.4vh 1.2vw;}
.tl h4{margin-bottom:.6vh;}
.tl b{display:block;font-size:3.4vh;font-weight:600;line-height:1.1;}
.tl span{font-size:1.8vh;color:rgba(255,255,255,.65);white-space:nowrap;}
`;

class OSEchoWeather extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ weather: "weather.forecast_home", sun: "sun.sun" }, c || {}); }
  set hass(h) {
    const first = !this._h; this._h = h;
    if (!this.shadowRoot) { this.attachShadow({ mode: "open" }).innerHTML = `<style>${CSS}</style><div class="g" id="g"></div>`; }
    if (first || !this._subs) this._subscribe();
    const s = h.states[this._c.weather]; const k = s && s.last_updated;
    if (k !== this._k) { this._k = k; this._draw(); }
  }
  connectedCallback() { if (this._h && !this._subs) this._subscribe(); this._radarStart(); }
  disconnectedCallback() { (this._subs || []).forEach((p) => p.then((u) => u && u()).catch(() => {})); this._subs = null; clearInterval(this._rT); clearInterval(this._rRefresh); this._rT = this._rRefresh = null; }
  _subscribe() {
    const h = this._h; if (!h || !h.connection) return;
    this._subs = ["daily", "hourly"].map((t) => h.connection.subscribeMessage((m) => { this["_" + t] = (m && m.forecast) || []; this._draw(); }, { type: "weather/subscribe_forecast", forecast_type: t, entity_id: this._c.weather }));
  }
  _draw() {
    const h = this._h, g = this.shadowRoot && this.shadowRoot.getElementById("g"); if (!h || !g) return;
    const s = h.states[this._c.weather]; if (!s) return;
    const a = s.attributes, t = r(+a.temperature), f = (this._daily || []).slice(0, 7), hr = (this._hourly || []).slice(0, 12);
    const lo = Math.min(...f.map((d) => d.templow)), hi = Math.max(...f.map((d) => d.temperature)), sp = Math.max(1, hi - lo);
    const days = f.map((d, i) => `<div class="dl"><span>${i ? new Date(d.datetime).toLocaleDateString([], { weekday: "short" }) : "Today"}</span>${icon(d.condition)}<span class="lo">${r(d.templow)}°</span><div class="bar"><i style="left:${((d.templow - lo) / sp) * 100}%;right:${100 - ((d.temperature - lo) / sp) * 100}%"></i></div><span class="hi">${r(d.temperature)}°${d.precipitation_probability >= 30 ? `<small>${r(d.precipitation_probability)}%</small>` : ""}</span></div>`).join("");
    const hours = hr.map((x, i) => `<div class="hr"><span>${i ? new Date(x.datetime).toLocaleTimeString([], { hour: "numeric" }) : "Now"}</span>${icon(x.condition)}<b>${r(x.temperature)}°</b><small>${x.precipitation_probability >= 20 ? r(x.precipitation_probability) + "%" : x.precipitation > 0 ? x.precipitation + '"' : ""}</small></div>`).join("");
    const sun = h.states[this._c.sun], sa = (sun && sun.attributes) || {}, up = sun && sun.state === "above_horizon";
    const dir = a.wind_bearing != null ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(a.wind_bearing / 45) % 8] : "";
    const uv = a.uv_index != null ? +a.uv_index : null, uvw = uv == null ? "" : uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : "Very high";
    const tile = (ic, l, v, sub) => `<div class="c tl"><h4><ha-icon icon="${ic}"></ha-icon>${l}</h4><b>${v}</b><span>${sub}</span></div>`;
    const hadRadar = !!this.shadowRoot.getElementById("mp");
    if (!hadRadar) g.innerHTML = `<div class="L"><div class="now" id="now"></div><div class="c days" id="days"></div></div><div class="R"><div class="c"><h4><ha-icon icon="mdi:clock-outline"></ha-icon>Next 12 hours</h4><div class="hrs" id="hrs"></div></div><div class="c rad"><h4><ha-icon icon="mdi:radar"></ha-icon>Rain radar</h4><span class="ts" id="ts"></span><div class="mp" id="mp"></div><div class="lg">Light<i></i>Heavy</div></div><div class="tls" id="tls"></div></div>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    $("now").innerHTML = `${icon(s.state)}<div><b>${isNaN(t) ? "--" : t}°</b><div class="c1">${WXT[s.state] || s.state}</div><div class="c2">${f[0] ? `H ${r(f[0].temperature)}° · L ${r(f[0].templow)}°` : ""}${a.apparent_temperature != null ? ` · Feels ${r(a.apparent_temperature)}°` : ""}</div></div>`;
    $("days").innerHTML = `<h4><ha-icon icon="mdi:calendar-week"></ha-icon>7-day forecast</h4>${days}`;
    $("hrs").innerHTML = hours;
    $("tls").innerHTML = tile("mdi:weather-windy", "Wind", a.wind_speed != null ? `${r(a.wind_speed)} mph` : "--", dir ? `From the ${dir}` : "") +
      tile("mdi:water-percent", "Humidity", a.humidity != null ? `${r(a.humidity)}%` : "--", a.dew_point != null ? `Dew point ${r(a.dew_point)}°` : "") +
      tile("mdi:white-balance-sunny", "UV index", uv == null ? "--" : r(uv), uvw) +
      tile(up ? "mdi:weather-sunset-down" : "mdi:weather-sunset-up", up ? "Sunset" : "Sunrise", sa.next_setting || sa.next_rising ? hm(up ? sa.next_setting : sa.next_rising) : "--", sa.next_rising && sa.next_setting ? `${up ? "Sunrise" : "Sunset"} ${hm(up ? sa.next_rising : sa.next_setting)}` : "");
    if (!hadRadar) this._radarStart(true);
  }
  /* RainViewer radar: frames for the past hour, refreshed every 10 minutes, played as a loop */
  async _radarStart(force) {
    const mp = this.shadowRoot && this.shadowRoot.getElementById("mp"), h = this._h; if (!mp || !h || (this._rT && !force)) return;
    const W = mp.clientWidth, H = mp.clientHeight; if (!W || !H) { setTimeout(() => this._radarStart(true), 300); return; }
    const home = h.states["zone.home"], lat = home ? home.attributes.latitude : 35.6, lon = home ? home.attributes.longitude : -78.7, z = 7;
    const cx = lon2x(lon, z), cy = lat2y(lat, z), x0 = cx - W / 2, y0 = cy - H / 2;
    const grid = (url) => { let t = ""; for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++) for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++) t += `<img src="${url(z, tx, ty)}" style="left:${(tx * 256 - x0).toFixed(1)}px;top:${(ty * 256 - y0).toFixed(1)}px;width:256px;height:256px" alt="" onerror="this.style.visibility='hidden'">`; return t; };
    let frames = [];
    try { const j = await (await fetch("https://api.rainviewer.com/public/weather-maps.json")).json(); frames = ((j.radar && j.radar.past) || []).slice(-6).map((f) => ({ t: f.time, url: (zz, x, y) => `${j.host}${f.path}/256/${zz}/${x}/${y}/2/1_1.png` })); } catch (e) { frames = []; }
    mp.innerHTML = grid(BASE) + frames.map((f, i) => `<div class="fr" data-i="${i}">${grid(f.url)}</div>`).join("") + `<div class="fr on" style="opacity:1">${grid(LBL)}</div><i class="home" style="left:${W / 2}px;top:${H / 2}px"></i>`;
    const ts = this.shadowRoot.getElementById("ts"); clearInterval(this._rT);
    if (!frames.length) { if (ts) ts.textContent = "Radar unavailable"; return; }
    let i = 0; const els = [...mp.querySelectorAll(".fr[data-i]")];
    const step = () => { els.forEach((e, k) => e.classList.toggle("on", k === i)); if (ts) ts.textContent = i === frames.length - 1 ? "Now" : new Date(frames[i].t * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); i = (i + 1) % frames.length; };
    /* hold on the latest frame a little longer before looping */
    let hold = 0; step(); this._rT = setInterval(() => { if (i === 0 && hold++ < 2) return; hold = 0; step(); }, 700);
    clearInterval(this._rRefresh); this._rRefresh = setInterval(() => this._radarStart(true), 600000);
  }
}
if (!customElements.get("os-echo-weather")) customElements.define("os-echo-weather", OSEchoWeather);
})();
