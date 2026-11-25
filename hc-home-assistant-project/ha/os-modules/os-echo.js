/* Clark Home OS - Echo Show screen v3 (custom:os-echo)
   One element runs the whole jailbroken Echo Show 8 screen. Home = clock + widgets (weather, calendar, family map,
   doorbell). The top-left "island" is a Dynamic-Island style surface that shows glance widgets (timers, music,
   next event, packages, sunset), grows in place for Alexa answers, result carousels (movies, recipes...), the
   camera "vision" preview + answer, timers and the ringing alarm. Night clock from the light sensor (checked every
   second), Alexa light bar, volume HUD, quick settings (swipe down), shortcut rail (swipe in from the right) and
   panels: Smart Home (brightness + colour sheet), Cameras (live + two-way talk), Climate, Music, Family, Calendar,
   Weather, News, Lists, Orders. Voice drives it through view_assist.set_state(echo_cmd / echo_card).
   Performance: no backdrop blur, transform/opacity/size transitions on one element, a single 1 s tick. */
(() => {
if (customElements.get("os-echo")) return;
const FONT = 'Roboto, "Amazon Ember", "Segoe UI", system-ui, -apple-system, sans-serif';
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const PICS = [1015, 1016, 1018, 1036, 1039, 1043, 1044, 1047, 1050, 1067];
const HINTS = ["Alexa, show the front door", "Alexa, set a timer for 10 minutes", "Alexa, use the camera, what am I holding?", "Alexa, recommend a scary movie", "Alexa, show me a chicken recipe", "Alexa, where is everyone?", "Alexa, dim the kitchen lights to 30%", "Alexa, what's on my calendar?", "Alexa, play the news", "Alexa, where's my stuff?"];
const WX = { "clear-night": "weather-night", cloudy: "weather-cloudy", exceptional: "alert-circle-outline", fog: "weather-fog", hail: "weather-hail", lightning: "weather-lightning", "lightning-rainy": "weather-lightning-rainy", partlycloudy: "weather-partly-cloudy", pouring: "weather-pouring", rainy: "weather-rainy", snowy: "weather-snowy", "snowy-rainy": "weather-snowy-rainy", sunny: "weather-sunny", windy: "weather-windy", "windy-variant": "weather-windy-variant" };
const WXT = { "clear-night": "Clear", cloudy: "Cloudy", exceptional: "Alert", fog: "Foggy", hail: "Hail", lightning: "Storms", "lightning-rainy": "Thunderstorms", partlycloudy: "Partly cloudy", pouring: "Heavy rain", rainy: "Rain", snowy: "Snow", "snowy-rainy": "Sleet", sunny: "Sunny", windy: "Windy", "windy-variant": "Windy" };
const fmtClock = (d) => { let h = d.getHours() % 12; if (!h) h = 12; return `${h}:${pad(d.getMinutes())}`; };
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const dayN = (d) => { const a = new Date(d); a.setHours(0, 0, 0, 0); const b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((a - b) / 864e5); };
const dayWord = (d) => { const n = dayN(d); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "long" }); };
const left = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
const num = (s) => { const n = s ? parseFloat(s.state) : NaN; return isNaN(n) ? null : n; };
const curve = (lux) => Math.max(3, Math.min(100, Math.round(8 + 30 * Math.log10(Math.max(0, lux) + 1))));
const TILE = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
const lon2x = (lon, z) => ((lon + 180) / 360) * 256 * 2 ** z;
const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 256 * 2 ** z; };
const IS_ECHO = /Android/i.test(navigator.userAgent);
const WHITES = [[2700, "#ffb661", "Warm"], [4000, "#ffe2bd", "Soft"], [5500, "#fff4ea", "Day"], [6500, "#dfe9ff", "Cool"]];
const HUES = [[0, "Red"], [28, "Orange"], [50, "Yellow"], [120, "Green"], [185, "Teal"], [225, "Blue"], [270, "Purple"], [320, "Pink"]];
const ORB = `<i class="orb"></i>`;

const CSS = `
:host{display:block;position:relative;height:100vh;width:100%;background:#000;color:#fff;font-family:${FONT};overflow:hidden;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:none;}
*{box-sizing:border-box;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
ha-icon{display:inline-flex;}
.bg{position:absolute;inset:0;background:#0b0d12 center/cover no-repeat;opacity:0;transition:opacity 1.6s ease;}
.bg.on{opacity:1;}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.66) 0%,rgba(0,0,0,.38) 45%,rgba(0,0,0,.55) 100%);}
/* home */
.home{position:absolute;inset:0;display:grid;grid-template-columns:38fr 62fr;gap:2.2vw;padding:3.4vh 3.2vw 4.4vh;transition:opacity .35s;}
.lcol{display:flex;flex-direction:column;min-width:0;}
.lsp{flex:1;}
.clock{font-size:17vh;line-height:.9;font-weight:300;letter-spacing:-.03em;font-variant-numeric:tabular-nums;text-shadow:0 2px 14px rgba(0,0,0,.45);}
.date{font-size:3.5vh;margin-top:1.6vh;color:rgba(255,255,255,.92);font-weight:400;}
.hint{font-size:2.5vh;margin-top:2.4vh;color:rgba(255,255,255,.62);line-height:1.3;transition:opacity .5s;}
.grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1.8vh 1.4vw;min-height:0;}
.w{position:relative;text-align:left;border-radius:3vh;background:rgba(20,22,28,.78);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);overflow:hidden;padding:2.2vh 1.6vw;display:flex;flex-direction:column;min-height:0;transition:transform .15s;}
.w:active{transform:scale(.97);}
.wh{display:flex;align-items:center;gap:.7vw;font-size:2vh;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.58);margin-bottom:1.2vh;}
.wh ha-icon{--mdc-icon-size:2.5vh;}
.wx1{display:flex;align-items:center;gap:1.2vw;}
.wx1 ha-icon{--mdc-icon-size:8vh;color:#fff;}
.wx1 b{font-size:8vh;font-weight:300;line-height:1;}
.wx1 span{font-size:2.5vh;color:rgba(255,255,255,.72);display:block;margin-top:.6vh;}
.wxd{display:flex;justify-content:space-between;margin-top:auto;}
.wxd div{display:flex;flex-direction:column;align-items:center;gap:.4vh;font-size:2.2vh;color:rgba(255,255,255,.7);}
.wxd ha-icon{--mdc-icon-size:3.4vh;color:#fff;}
.wxd b{font-size:2.4vh;color:#fff;font-weight:500;}
.ev{display:flex;gap:1vw;padding:.9vh 0;border-top:1px solid rgba(255,255,255,.08);}
.ev:first-of-type{border-top:none;}
.ev i{flex:none;width:.45vw;border-radius:9px;background:#38bdf8;}
.ev b{display:block;font-size:2.8vh;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ev span{font-size:2.2vh;color:rgba(255,255,255,.62);}
.muted{font-size:2.6vh;color:rgba(255,255,255,.55);margin:auto 0;}
.w.full{padding:0;}
.w.full .wh{position:absolute;left:1.2vw;top:1.4vh;z-index:2;margin:0;padding:.6vh 1vw;border-radius:99px;background:rgba(0,0,0,.6);color:#fff;letter-spacing:.06em;}
.mapbox{position:absolute;left:0;right:0;top:0;bottom:38%;overflow:hidden;background:#e9e5dc;}
.mapbox img.t{position:absolute;width:256px;height:256px;}
.pin{position:absolute;width:4.6vh;height:4.6vh;margin:-2.3vh 0 0 -2.3vh;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:2.2vh;color:#111;border:.4vh solid #fff;box-shadow:0 .4vh 1.2vh rgba(0,0,0,.45);}
.mapl{position:absolute;left:0;right:0;bottom:0;height:38%;display:grid;grid-template-columns:1fr 1fr;align-content:center;gap:.5vh 1vw;padding:.8vh 1.2vw;z-index:2;}
.mapl span{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:.6vw;align-items:center;min-width:0;font-size:2vh;line-height:1.25;white-space:nowrap;}
.mapl i{flex:none;width:1.3vh;height:1.3vh;border-radius:50%;}
.mapl b{font-weight:600;}
.mapl b,.mapl em{grid-column:2;min-width:0;overflow:hidden;text-overflow:ellipsis;}
.mapl em{font-style:normal;font-size:1.75vh;color:rgba(255,255,255,.6);}
.cam{position:absolute;inset:0;background:#000 center/cover no-repeat;}
.cam > *{position:absolute;inset:0;width:100%;height:100%;}
.live{position:absolute;right:1.2vw;top:1.4vh;z-index:3;display:none;align-items:center;gap:.5vw;padding:.6vh 1vw;border-radius:99px;background:rgba(0,0,0,.6);font-size:1.9vh;font-weight:700;letter-spacing:.06em;}
.live i{width:1.1vh;height:1.1vh;border-radius:50%;background:#ff453a;}
.live.on{display:flex;}
/* the island */
.idim{position:absolute;inset:0;z-index:9;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .35s;}
.idim.on{pointer-events:auto;}
.idim.dark{opacity:1;}
.isl{position:absolute;left:3.2vw;top:3.4vh;z-index:10;width:22vw;height:6.6vh;border-radius:3.3vh;background:#000;box-shadow:0 1.4vh 4.4vh rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.09);overflow:hidden;clip-path:inset(0 round 3.3vh);-webkit-mask-image:-webkit-radial-gradient(white,black);transition:width .5s cubic-bezier(.32,.72,0,1),height .5s cubic-bezier(.32,.72,0,1),border-radius .5s cubic-bezier(.32,.72,0,1),opacity .3s,transform .3s;}
.isl.hide{opacity:0;transform:scale(.8);pointer-events:none;}
.isl.xl{border-radius:3.6vh;clip-path:inset(0 round 3.6vh);}
.isl[data-m=ring]{box-shadow:0 0 0 .45vh #38bdf8,0 2vh 6vh rgba(0,0,0,.6);animation:rg 1.4s ease-in-out infinite;}
@keyframes rg{50%{box-shadow:0 0 0 .45vh rgba(56,189,248,.25),0 2vh 6vh rgba(0,0,0,.6);}}
.isli{position:absolute;left:0;top:0;overflow:hidden;opacity:0;transition:opacity .2s ease .14s;}
.isli.show{opacity:1;}
.gl{display:flex;align-items:center;gap:1vw;height:6.6vh;padding:0 2.1vw 0 1.5vw;white-space:nowrap;font-size:2.7vh;font-weight:500;font-variant-numeric:tabular-nums;}
.gl ha-icon{--mdc-icon-size:3.4vh;color:var(--a,#38bdf8);}
.gl small{font-size:2.3vh;color:rgba(255,255,255,.6);font-weight:400;}
.orb{flex:none;display:inline-block;width:4.6vh;height:4.6vh;border-radius:50%;background:conic-gradient(from 200deg,#00caff,#2f6bff,#8a5cff,#00caff);-webkit-mask:radial-gradient(circle,transparent 46%,#000 49%);mask:radial-gradient(circle,transparent 46%,#000 49%);}
.ok{flex:none;width:4.6vh;height:4.6vh;border-radius:50%;background:#30d158;display:flex;align-items:center;justify-content:center;}
.ok ha-icon{--mdc-icon-size:3vh;color:#fff;}
.an{padding:2.4vh 2vw 2.8vh;}
.anh{display:flex;align-items:center;gap:1vw;min-width:0;}
.anh .qq{font-size:2.4vh;color:rgba(255,255,255,.58);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.at{font-size:3.3vh;line-height:1.36;font-weight:500;margin-top:1.6vh;}
.anok{display:flex;align-items:center;gap:1.2vw;height:7.6vh;padding:0 2.2vw 0 1.4vw;font-size:2.8vh;font-weight:500;white-space:nowrap;}
.rc{display:flex;flex-direction:column;padding:2.6vh 2.4vw 2.4vh;}
.rch{display:flex;align-items:flex-start;gap:1.4vw;}
.rch .tt{flex:1;min-width:0;}
.rch h2{margin:0;font-size:4.2vh;font-weight:600;letter-spacing:-.01em;line-height:1.15;}
.rch p{margin:.8vh 0 0;font-size:2.7vh;line-height:1.35;color:rgba(255,255,255,.72);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.x{width:6.6vh;height:6.6vh;border-radius:50%;background:rgba(255,255,255,.13);display:flex;align-items:center;justify-content:center;flex:none;}
.x ha-icon{--mdc-icon-size:3.6vh;}
.carw{position:relative;margin-top:3vh;}
.car{display:flex;gap:1.6vw;overflow-x:auto;touch-action:pan-x;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:.6vh;}
.car::-webkit-scrollbar{display:none;}
.ci{flex:none;width:17.4vw;scroll-snap-align:start;text-align:left;}
.ci .im{height:36vh;border-radius:2vh;background:#1c1e24 center/cover no-repeat;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);}
.ci .im ha-icon{--mdc-icon-size:7vh;color:rgba(255,255,255,.18);}
.ci b{display:block;font-size:2.9vh;font-weight:500;margin-top:1.5vh;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ci span{display:block;font-size:2.25vh;color:rgba(255,255,255,.62);margin-top:.5vh;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ci span.dd{white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;color:rgba(255,255,255,.8);line-height:1.3;}
.ci em.tg{display:inline-block;margin-top:1vh;padding:.35vh .9vw;border-radius:99px;background:rgba(48,209,88,.16);color:#32d74b;font-style:normal;font-size:1.9vh;font-weight:600;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.nx{position:absolute;right:-.6vw;top:11vh;width:7vh;height:7vh;border-radius:50%;background:rgba(40,42,48,.95);box-shadow:0 .6vh 2vh rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;}
.nx ha-icon{--mdc-icon-size:4vh;}
.rbody{display:flex;gap:2.4vw;margin-top:2.4vh;min-height:0;flex:1;}
.cardb{flex:1;min-width:0;overflow:auto;touch-action:pan-y;font-size:3vh;line-height:1.45;color:rgba(255,255,255,.92);}
.cardb ul,.cardb ol{margin:.4vh 0;padding-left:3.4vh;}
.cardb li{margin:.5vh 0;}
.cardb .h{font-weight:600;color:#fff;margin-top:1vh;}
.rimg{flex:none;width:30vw;border-radius:2.4vh;background:#1c1e24 center/cover no-repeat;}
.vz{display:flex;gap:2vw;padding:2.2vh 1.8vw;height:100%;}
.pv{position:relative;width:24vw;flex:none;border-radius:2.4vh;overflow:hidden;background:#111 center/cover no-repeat;}
.pv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.pv img:not([src]){display:none;}
.pv .scan{position:absolute;left:0;right:0;top:-30%;height:30%;background:linear-gradient(180deg,transparent,rgba(0,202,255,.45),transparent);animation:scan 1.8s ease-in-out infinite;}
@keyframes scan{to{top:100%}}
.pv.snap::after{content:"";position:absolute;inset:0;background:#fff;animation:shut .5s ease-out forwards;}
@keyframes shut{from{opacity:1}to{opacity:0}}
.pv .tag{position:absolute;left:1vw;top:1.4vh;padding:.5vh .9vw;border-radius:99px;background:rgba(0,0,0,.6);font-size:1.9vh;font-weight:700;letter-spacing:.06em;display:flex;gap:.5vw;align-items:center;}
.pv .tag i{width:1.1vh;height:1.1vh;border-radius:50%;background:#ff453a;}
.vt{flex:1;min-width:0;display:flex;flex-direction:column;}
.vt .qq{font-size:2.5vh;color:rgba(255,255,255,.6);}
.vt .st{font-size:3.6vh;font-weight:600;margin-top:1.4vh;background:linear-gradient(90deg,#fff 0%,#7fdcff 50%,#fff 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shim 1.6s linear infinite;}
@keyframes shim{to{background-position:-200% 0}}
.vt .at{overflow:auto;touch-action:pan-y;flex:1;min-height:0;}
.flash{position:absolute;inset:0;z-index:9;background:#fff;opacity:0;pointer-events:none;transition:opacity .35s;}
.flash.on{opacity:.94;}
/* timers inside the island */
.tmb{padding:2.6vh 2.4vw;}
.tbh{display:flex;align-items:center;justify-content:space-between;margin-bottom:2.4vh;}
.tbh h2{margin:0;font-size:3.8vh;font-weight:600;}
.tgrid{display:flex;flex-wrap:wrap;gap:2vw;}
.tm{display:flex;flex-direction:column;align-items:center;gap:1.2vh;}
.ring{position:relative;width:24vh;height:24vh;}
.ring svg{width:100%;height:100%;transform:rotate(-90deg);}
.ring circle{fill:none;stroke-width:5;}
.ring .tr{stroke:rgba(255,255,255,.12);}
.ring .pr{stroke:#38bdf8;stroke-linecap:round;transition:stroke-dashoffset 1s linear;}
.tm.snz .pr{stroke:#fbbf24;}
.ring .v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ring .v b{font-size:5.4vh;font-weight:400;font-variant-numeric:tabular-nums;}
.ring .v span{font-size:2.3vh;color:rgba(255,255,255,.7);margin-top:.4vh;max-width:18vh;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tgrid.solo{justify-content:center;padding:1vh 0 1.6vh;}
.tgrid.solo .tm{gap:2.4vh;}
.tgrid.solo .ring{width:46vh;height:46vh;}
.tgrid.solo .ring circle{stroke-width:3.4;}
.tgrid.solo .ring .v b{font-size:11.5vh;font-weight:300;letter-spacing:-.02em;}
.tgrid.solo .ring .v span{font-size:3vh;max-width:34vh;margin-top:.8vh;}
.pill{height:6vh;padding:0 3vh;border-radius:999px;background:rgba(255,255,255,.14);font-size:2.6vh;font-weight:500;}
.pill:active,.big:active,.x:active,.cb:active{transform:scale(.95);}
.it{display:flex;align-items:center;gap:1.4vw;padding:1.4vh 1.6vw;border-radius:2vh;background:rgba(255,255,255,.07);margin-top:1.2vh;}
.it ha-icon{--mdc-icon-size:3.6vh;color:#38bdf8;flex:none;}
.it .t{flex:1;min-width:0;}
.it .t b{display:block;font-size:3vh;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.it .t span{font-size:2.3vh;color:rgba(255,255,255,.65);}
.del{width:5.6vh;height:5.6vh;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex:none;}
.del ha-icon{--mdc-icon-size:3vh;color:#fff !important;}
.rv{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.6vh;height:100%;}
.rv ha-icon{--mdc-icon-size:13vh;color:#38bdf8;animation:bz .5s ease-in-out infinite alternate;}
@keyframes bz{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
.rv .rt{font-size:6.4vh;font-weight:600;text-align:center;letter-spacing:-.01em;}
.rv .rs{font-size:3vh;color:rgba(255,255,255,.7);margin-top:-1.4vh;}
.rb{display:flex;gap:2vw;margin-top:1vh;}
.big{height:11vh;min-width:26vw;padding:0 5vh;border-radius:999px;font-size:4vh;font-weight:600;background:rgba(255,255,255,.14);}
.big.stop{background:#0a84ff;}
/* night clock */
.night{position:absolute;inset:0;z-index:12;background:#000;display:none;flex-direction:column;align-items:center;justify-content:center;}
.night.on{display:flex;}
.night .c{font-size:30vh;font-weight:200;color:#5a5a5f;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.night .d{font-size:4vh;color:#3a3a3c;margin-top:2vh;}
/* Alexa light bar */
.dim{position:absolute;inset:0;z-index:13;background:rgba(0,0,0,.42);opacity:0;pointer-events:none;transition:opacity .35s;}
.ax{position:absolute;left:0;right:0;bottom:0;z-index:14;pointer-events:none;}
.ax .said{position:absolute;left:4vw;right:4vw;bottom:5vh;font-size:5vh;font-weight:500;line-height:1.2;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.7);opacity:0;transform:translateY(1vh);transition:opacity .25s,transform .25s;}
:host([ax=listening]) .dim,:host([ax=processing]) .dim{opacity:1;}
/* light bar look + motion: os-echo-fx */
:host([ax=processing]) .ax .said.on{opacity:1;transform:none;}
/* volume HUD */
.vh{position:absolute;left:50%;top:3vh;z-index:15;width:40vw;margin-left:-20vw;display:flex;align-items:center;gap:1.4vw;padding:1.7vh 2vw;border-radius:99px;background:#000;box-shadow:0 1.2vh 4vh rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.09);transform:translateY(-160%);opacity:0;transition:transform .35s cubic-bezier(.32,.72,0,1),opacity .2s;}
.vh.on{transform:none;opacity:1;}
.vh ha-icon{--mdc-icon-size:4vh;}
.vh .tr2{flex:1;height:1.4vh;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden;}
.vh .tr2 i{display:block;height:100%;background:#fff;border-radius:9px;transition:width .15s;}
.vh b{font-size:3vh;width:4vh;text-align:right;font-variant-numeric:tabular-nums;}
/* quick settings, rail, sheet */
.grab{position:absolute;top:0;left:35vw;right:35vw;height:4vh;z-index:5;display:flex;justify-content:center;padding-top:1vh;}
.grab i{width:8vw;height:.6vh;border-radius:9px;background:rgba(255,255,255,.4);}
.edge{position:absolute;right:0;top:30vh;bottom:30vh;width:3.4vw;z-index:5;display:flex;align-items:center;justify-content:flex-end;}
.edge i{width:.55vw;height:12vh;border-radius:9px;background:rgba(255,255,255,.3);margin-right:.5vw;}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .3s;z-index:16;}
.scrim.on{opacity:1;pointer-events:auto;}
.drawer{position:absolute;left:0;right:0;top:0;z-index:17;padding:3.6vh 5vw 4vh;background:#18191d;border-radius:0 0 3.6vh 3.6vh;transform:translateY(-105%);transition:transform .4s cubic-bezier(.32,.72,0,1);box-shadow:0 2vh 6vh rgba(0,0,0,.5);}
.drawer.open{transform:none;}
.qrow{display:grid;grid-template-columns:repeat(6,1fr);gap:1.6vw;margin-bottom:3vh;}
.q{display:flex;flex-direction:column;align-items:center;gap:1.1vh;font-size:2.3vh;color:rgba(255,255,255,.85);}
.q .c{width:10vh;height:10vh;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;}
.q .c ha-icon{--mdc-icon-size:4.4vh;}
.q.on .c{background:#0a84ff;}
.sl{display:grid;grid-template-columns:5vh 1fr 6vh;align-items:center;gap:2vw;margin-top:2.4vh;font-size:2.6vh;}
.sl ha-icon{--mdc-icon-size:4vh;color:rgba(255,255,255,.8);}
.sl small{font-size:2vh;color:rgba(255,255,255,.5);grid-column:2;margin-top:-1.6vh;}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6vh;border-radius:999px;background:rgba(255,255,255,.14);outline:none;margin:0;touch-action:none;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:6vh;height:6vh;border-radius:50%;background:#fff;box-shadow:0 .4vh 1.2vh rgba(0,0,0,.4);}
.rail{position:absolute;right:1.6vw;top:3vh;bottom:3vh;z-index:17;width:50vw;background:rgba(26,27,31,.9);-webkit-backdrop-filter:blur(30px) saturate(160%);backdrop-filter:blur(30px) saturate(160%);border:1px solid rgba(255,255,255,.08);border-radius:4.4vh;padding:3vh 1.6vw 2.4vh;display:flex;flex-direction:column;transform:translateX(110%);transition:transform .45s cubic-bezier(.32,.72,0,1);box-shadow:0 2vh 8vh rgba(0,0,0,.6);}
.rail.open{transform:none;}
.rail h3{margin:0 0 2vh .6vw;font-size:3.6vh;font-weight:700;letter-spacing:-.01em;}
.rail .g{flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;gap:1.4vh;}
.rail button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.3vh;border-radius:2.8vh;background:rgba(255,255,255,.055);font-size:2.3vh;font-weight:600;color:#e5e5ea;transition:transform .12s ease,background .12s ease;}
.rail button:active{transform:scale(.95);background:rgba(255,255,255,.14);}
.rail button.cur{background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 2px rgba(255,255,255,.35);}
.rail .ic{width:8.6vh;height:8.6vh;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--t) 22%,transparent);}
.rail ha-icon{--mdc-icon-size:4.6vh;color:var(--t);}
.sheet{position:absolute;left:5vw;right:5vw;bottom:0;z-index:18;background:#1c1d22;border-radius:3.8vh 3.8vh 0 0;padding:2.8vh 3vw 4vh;transform:translateY(105%);transition:transform .45s cubic-bezier(.32,.72,0,1);box-shadow:0 -2vh 6vh rgba(0,0,0,.55);}
.sheet.open{transform:none;}
.shh{display:flex;align-items:center;gap:1.6vw;}
.sht{flex:1;min-width:0;}
.sht b{display:block;font-size:3.8vh;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sht span{font-size:2.5vh;color:rgba(255,255,255,.6);}
.bsl{position:relative;height:11vh;border-radius:3vh;background:rgba(255,255,255,.12);overflow:hidden;margin-top:3vh;touch-action:none;display:flex;align-items:center;padding:0 2.4vw;gap:1.2vw;}
.bsl .f{position:absolute;left:0;top:0;bottom:0;background:#fff;}
.bsl ha-icon,.bsl b{position:relative;z-index:1;mix-blend-mode:difference;color:#fff;}
.bsl ha-icon{--mdc-icon-size:4.4vh;}
.bsl b{font-size:3.4vh;font-weight:600;margin-left:auto;font-variant-numeric:tabular-nums;}
.shr{display:flex;flex-wrap:wrap;gap:1.4vw;margin-top:3vh;align-items:center;}
.sw{width:7.4vh;height:7.4vh;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);position:relative;}
.sw.on::after{content:"";position:absolute;inset:-.7vh;border-radius:50%;box-shadow:0 0 0 .45vh #fff;}
.sep{width:1px;height:5vh;background:rgba(255,255,255,.15);margin:0 .6vw;}
.hue{position:relative;height:6vh;border-radius:3vh;margin-top:2.6vh;background:linear-gradient(90deg,#f00,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00);touch-action:none;}
.hue i{position:absolute;top:-.6vh;width:7.2vh;height:7.2vh;margin-left:-3.6vh;border-radius:50%;border:.5vh solid #fff;box-shadow:0 .4vh 1.4vh rgba(0,0,0,.5);}
/* panels */
.panel{position:absolute;inset:0;z-index:6;background:#0b0c10;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .42s cubic-bezier(.32,.72,0,1);}
.panel.open{transform:none;}
.ph{display:flex;align-items:center;gap:1.4vw;padding:2.6vh 3vw 1.4vh;}
.ph h2{margin:0;font-size:4.4vh;font-weight:600;letter-spacing:-.01em;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pb{flex:1;min-height:0;overflow:auto;padding:0 3vw 3vh;touch-action:pan-y;-webkit-overflow-scrolling:touch;}
.pb.fill{overflow:hidden;padding:0;position:relative;}
.area{font-size:2.2vh;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.5);margin:2.6vh 0 1.2vh;display:flex;align-items:center;justify-content:space-between;}
.area button{font-size:2.3vh;letter-spacing:0;text-transform:none;color:#0a84ff;font-weight:500;padding:.6vh 0 .6vh 2vw;}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4vh 1.2vw;}
.tile{display:flex;flex-direction:column;align-items:flex-start;gap:1vh;padding:1.8vh 1.3vw;border-radius:2.6vh;background:rgba(255,255,255,.08);text-align:left;min-height:17vh;transition:background .2s,transform .15s;}
.tile:active{transform:scale(.97);}
.ti{width:6.8vh;height:6.8vh;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex:none;}
.ti ha-icon{--mdc-icon-size:3.8vh;color:rgba(255,255,255,.75);}
.tile b{font-size:2.6vh;font-weight:600;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:auto;}
.tile span{font-size:2.2vh;color:rgba(255,255,255,.58);}
.tile.on{background:#f2f2f4;color:#1d1d1f;}
.tile.on .ti{background:var(--lc,#ffb340);}
.tile.on .ti ha-icon{color:#fff;}
.tile.on span{color:rgba(0,0,0,.55);}
.cams{display:grid;grid-template-columns:1fr 1fr;gap:1.6vw;height:100%;padding:0 3vw 3vh;}
.ct{position:relative;border-radius:2.8vh;overflow:hidden;background:#000;}
.ct .lb{position:absolute;left:1.2vw;bottom:1.4vh;z-index:2;padding:.6vh 1.2vw;border-radius:99px;background:rgba(0,0,0,.6);font-size:2.4vh;font-weight:500;}
.cbar{position:absolute;left:50%;bottom:3vh;z-index:3;transform:translateX(-50%);display:flex;gap:1.2vw;align-items:center;padding:1.2vh 1.2vw;border-radius:99px;background:rgba(0,0,0,.72);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);}
.cb{height:8vh;padding:0 3.2vh;border-radius:99px;background:rgba(255,255,255,.14);display:flex;align-items:center;gap:1vw;font-size:2.8vh;font-weight:600;}
.cb ha-icon{--mdc-icon-size:4vh;}
.cb.on{background:#30d158;color:#000;}
.cb.off{opacity:.45;}
.thermo{display:grid;grid-template-columns:1fr 1fr;gap:2vw;padding:2vh 0;}
.np{display:flex;gap:3vw;align-items:center;padding-top:2vh;}
.art{width:34vh;height:34vh;border-radius:2.4vh;background:#24262b center/cover no-repeat;flex:none;display:flex;align-items:center;justify-content:center;}
.art ha-icon{--mdc-icon-size:12vh;color:rgba(255,255,255,.3);}
.np .ti2{font-size:4.4vh;font-weight:600;line-height:1.15;}
.np .ar{font-size:3vh;color:rgba(255,255,255,.65);margin-top:1vh;}
.ctl{display:flex;gap:2vw;margin-top:3vh;align-items:center;}
.mb{width:9vh;height:9vh;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;}
.mb.main{width:12vh;height:12vh;background:#fff;color:#000;}
.mb ha-icon{--mdc-icon-size:5vh;}
.chips2{display:flex;flex-wrap:wrap;gap:1.2vh 1vw;margin-top:3vh;}
.chips2 button{padding:1.4vh 2vw;border-radius:99px;background:rgba(255,255,255,.1);font-size:2.6vh;}
.day{font-size:2.3vh;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:#0a84ff;margin:2.6vh 0 .6vh;}
.wnow{display:flex;align-items:center;gap:2vw;}
.wnow ha-icon{--mdc-icon-size:14vh;}
.wnow b{font-size:14vh;font-weight:200;line-height:1;}
.hours{display:flex;gap:1.4vw;overflow:hidden;margin:2vh 0;}
.hours div,.days div{display:flex;flex-direction:column;align-items:center;gap:.6vh;font-size:2.3vh;color:rgba(255,255,255,.7);min-width:7vw;}
.hours ha-icon,.days ha-icon{--mdc-icon-size:4.4vh;color:#fff;}
.hours b,.days b{font-size:2.8vh;color:#fff;font-weight:500;}
.days{display:flex;justify-content:space-between;padding:2vh 0;border-top:1px solid rgba(255,255,255,.1);}
.panel.nwp{background:#000;}
.panel.nwp .ph{display:none;}
.li{display:flex;align-items:center;gap:1.4vw;width:100%;padding:1.6vh 1vw;border-bottom:1px solid rgba(255,255,255,.08);font-size:3vh;text-align:left;}
.li i{flex:none;width:4vh;height:4vh;border-radius:50%;border:.35vh solid rgba(255,255,255,.5);}
.li.done{color:rgba(255,255,255,.4);text-decoration:line-through;}
.li.done i{background:#0a84ff;border-color:#0a84ff;}
.pact{display:flex;gap:.8vw;align-items:center;}
.pact button{height:6.4vh;min-width:6.4vh;padding:0 1.8vw;border-radius:99px;background:rgba(255,255,255,.13);font-size:2.5vh;font-weight:600;display:flex;align-items:center;justify-content:center;gap:.6vw;}
.pact button.add{background:#0a84ff;}
.pact ha-icon{--mdc-icon-size:3.4vh;}
.panel.wxp{background:var(--wbg,#1d4f91);}
.mg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:auto repeat(6,minmax(0,1fr));gap:.5vh .4vw;height:100%;padding:0 3vw 2.4vh;}
.mw{font-size:1.8vh;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.45);text-align:center;padding-bottom:.3vh;}
.md{border-radius:1.4vh;background:rgba(255,255,255,.055);padding:.5vh .4vw;text-align:left;overflow:hidden;display:flex;flex-direction:column;gap:.3vh;min-height:0;}
.md.o{opacity:.4;}
.md.s{background:rgba(10,132,255,.2);box-shadow:inset 0 0 0 1px rgba(10,132,255,.65);}
.md .n{font-size:2.1vh;font-weight:600;width:3.4vh;height:3.4vh;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;}
.md.t .n{background:#ff453a;}
.md em{font-style:normal;font-size:1.6vh;line-height:1.3;padding:0 .4vw;border-radius:.6vh;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none;}
.md em.m{color:rgba(255,255,255,.55);}
.ain{width:100%;height:7vh;border-radius:2vh;border:none;outline:none;background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:3vh;padding:0 1.6vw;margin-top:1.8vh;user-select:text;-webkit-user-select:text;}
.arow{display:flex;align-items:center;gap:1.2vw;margin-top:1.3vh;font-size:2.7vh;}
.arow > span{width:13vw;color:rgba(255,255,255,.62);}
.arow b{min-width:22vw;text-align:center;font-weight:600;}
.arow button{height:6.4vh;min-width:6.4vh;padding:0 1.6vw;border-radius:99px;background:rgba(255,255,255,.12);font-size:2.5vh;font-weight:600;}
.arow button.on{background:#0a84ff;}
.sheet.evs{left:50%;right:auto;top:50%;bottom:auto;width:60vw;border-radius:4vh;padding:3vh 3vw 3.4vh;opacity:0;pointer-events:none;transform:translate(-50%,-46%) scale(.96);transition:transform .42s cubic-bezier(.32,.72,0,1),opacity .25s;box-shadow:0 3vh 9vh rgba(0,0,0,.65),inset 0 0 0 1px rgba(255,255,255,.08);}
.sheet.evs.open{opacity:1;pointer-events:auto;transform:translate(-50%,-50%);}
.evs .shh{justify-content:center;position:relative;text-align:center;min-height:6.6vh;}
.evs .sht{flex:none;}
.evs .shh .x{position:absolute;right:0;top:50%;transform:translateY(-50%);}
.evs .ain{text-align:center;margin-top:2.2vh;}
.ac{margin-top:1.8vh;border-radius:2.6vh;background:rgba(255,255,255,.06);padding:0 1.6vw;}
.evs .arow{display:grid;grid-template-columns:11vw 1fr 11vw;align-items:center;height:8.6vh;margin:0;border-top:1px solid rgba(255,255,255,.08);}
.evs .arow:first-child{border-top:0;}
.evs .arow > span{width:auto;}
.cc{display:flex;align-items:center;justify-content:center;gap:1vw;}
.cc button{width:6.4vh;padding:0;display:flex;align-items:center;justify-content:center;}
.cc ha-icon{--mdc-icon-size:3.2vh;}
.cc b{min-width:18vw;}
.cc.seg{gap:0;padding:.5vh;border-radius:99px;background:rgba(255,255,255,.08);justify-self:center;}
.cc.seg button{width:auto;min-width:8.4vw;height:5.6vh;background:none;padding:0 1.2vw;}
.cc.seg button.on{background:#0a84ff;}
.evs .big{display:block;width:100%;height:8.6vh;margin-top:2.4vh;font-size:3.2vh;}
.evr{display:flex;gap:1.2vw;align-items:center;padding:1.3vh 0;border-top:1px solid rgba(255,255,255,.08);font-size:2.8vh;}
.evr i{width:.5vw;align-self:stretch;border-radius:9px;flex:none;}
.evr span{color:rgba(255,255,255,.6);font-size:2.3vh;min-width:13vw;}
`;

class OsEcho extends HTMLElement {
setConfig(c) {
const v = (c && c.vaca) || "vaca_amzn_echo_show_8_3a31";
const C = this._c = Object.assign({
va: "sensor.echo_show", weather: "weather.forecast_home", calendars: [], snooze: "9 minutes", night_lux: 1, day_lux: 6, night_hold: 90,
home_path: "/alexa-dashboard/home", offset: "input_number.echo_show_brightness_offset", music_player: "media_player.echo_show_music", play_script: "script.play_on_voice_assistant",
doorbell: { snapshot: "camera.front_door_snapshot", live: "camera.front_door_live_view", motion: "binary_sensor.front_door_motion", ding: "binary_sensor.front_door_ding", name: "Front Door" },
cameras: [{ id: "front_door", name: "Front Door", snapshot: "camera.front_door_snapshot", live: "camera.front_door_live_view", talk: "front_door" }, { id: "downstairs", name: "Downstairs", snapshot: "camera.downstairs_snapshot", live: "camera.downstairs_live_view", talk: "downstairs" }],
thermostats: [{ entity: "climate.downstairs_thermostat", label: "Downstairs" }, { entity: "climate.upstairs_thermostat", label: "Upstairs" }],
mute_media: true, news: [{ id: "fox", name: "LiveNOW from FOX", ch: "UCJg9wBPyKMNA5sRDnvzmkdg" }, { id: "abc", name: "ABC News Live", ch: "UCBi2mrWuNuyYy4gbM6fU18Q" }, { id: "nbc", name: "NBC News NOW", ch: "UCeY0bbntWzzVIaj2z3QigXg" }, { id: "sky", name: "Sky News", ch: "UCoMdktPbSTixAyNGwb-UYkQ" }, { id: "weather", name: "FOX Weather", ch: "UC1FbPiXx59_ltnFVx7IxWow" }, { id: "bloomberg", name: "Bloomberg", ch: "UCIALMKvObZNtJ6AmdCLP7Lg" }],
lists: ["todo.shopping_list"], orders: "todo.amazon_orders", sun: "sun.sun",
people: [], stations: ["Fox News", "NPR", "BBC World Service", "Smooth Jazz", "Classic Rock", "Country"],
}, c || {});
C.sat = C.sat || `assist_satellite.${v}`; C.stt = C.stt || `sensor.${v}_stt`; C.tts = C.tts || `sensor.${v}_tts`;
C.alarm = C.alarm || `switch.${v}_alarm`; C.mute = C.mute || `switch.${v}_mute`; C.screen = C.screen || `switch.${v}_screen`;
C.bright = C.bright || `number.${v}_screen_brightness`; C.music = C.music || `number.${v}_music_volume`; C.kiosk = C.kiosk || "input_boolean.echo_show_kiosk";
C.lux = C.lux || `sensor.${v}_light_level`; C.selfcam = C.selfcam || `camera.${v}_camera`; C.stream = C.stream || `switch.${v}_video_stream_enabled`;
C.cal_add = C.cal_add || "calendar.clarkcalendar1613_gmail_com";
this._photos = (C.photos && C.photos.length) ? C.photos : null;
}
getCardSize() { return 8; }
set hass(h) {
this._hass = h;
if (!this._built) this._build();
const C = this._c, s = h.states;
const g = (key, ids) => { this._seen = this._seen || {}; let ch = false; ids.forEach((id) => { if (s[id] !== this._seen[key + id]) { this._seen[key + id] = s[id]; ch = true; } }); return ch; };
if (g("t", [C.va, C.alarm, C.mute])) { this._timers(); if (C.replay) this._replay(); else this._cmd(); this._vaBg(); if (!(this._muteAt && Date.now() - this._muteAt < 2500)) this._mute((s[C.mute] || {}).state === "on"); }
if (g("v", [C.sat, C.stt, C.tts]) && !C.replay) this._voice();
if (g("w", [C.weather])) { this._wxWidget(); if (!this._fc && h.connection) this._subForecast(); }
if (g("b", [C.bright, C.offset])) this._drawerSync();
if (g("m", [C.music])) this._volChange();
if (g("g", [C.music_player, C.orders, C.sun])) this._glance();
const d = C.doorbell; if (g("d", [d.motion, d.ding])) this._door();
const pp = this._people(); if (g("p", pp.map((p) => p.tracker || p.person))) this._mapW();
if (this._panel) this._panelHass();
if (this._sh && g("s", [this._sh])) this._sheetSync();
}
connectedCallback() {
this._hideVA();
if (!this._rs) { this._rs = () => { this._fit(); this._mapW(true); this._diag(); }; window.addEventListener("resize", this._rs); }
requestAnimationFrame(() => this._fit());
/* On the Echo, View Assist may still try to open one of its own views: send it straight back to this screen */
if (IS_ECHO && !window.__osEchoNav) {
window.__osEchoNav = true;
window.addEventListener("location-changed", () => {
const p = location.pathname, home = (this._c && this._c.home_path) || "/alexa-dashboard/home";
if (p !== home && (p.startsWith("/view-assist") || p.startsWith(home.replace(/\/[^/]*$/, "/")))) setTimeout(() => { history.replaceState(null, "", home); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: true } })); }, 0);
});
}
if (this._built) this._start();
}
disconnectedCallback() {
setTimeout(() => { if (!this.isConnected) { const st = document.getElementById("os-echo-hide-va"); if (st) st.remove(); } }, 500);
[this._sec, this._calT, this._hintT, this._snapT].forEach((t) => clearInterval(t));
if (this._fc) { this._fc.then((u) => u && u()).catch(() => {}); this._fc = null; }
this._ringSound(false);
}
_build() {
this._built = true;
const r = this.attachShadow({ mode: "open" });
r.innerHTML = `<style>${CSS}</style>
<div class="bg" id="b0"></div><div class="bg" id="b1"></div><div class="shade"></div>
<div class="home" id="home">
<div class="lcol"><div class="lsp"></div><div class="clock" id="clock"></div><div class="date" id="date"></div><div class="hint" id="hint"></div></div>
<div class="grid">
<button class="w" id="wWx"><div class="wh"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>Weather</div><div class="wx1" id="wx1"></div><div class="wxd" id="wxd"></div></button>
<button class="w" id="wCal"><div class="wh"><ha-icon icon="mdi:calendar-blank-outline"></ha-icon>Up next</div><div id="cal"></div></button>
<button class="w full" id="wMap"><div class="mapbox" id="mapbox"></div><div class="wh"><ha-icon icon="mdi:map-marker-radius-outline"></ha-icon>Family</div><div class="mapl" id="mapl"></div></button>
<button class="w full" id="wDoor"><div class="cam" id="door"></div><div class="wh"><ha-icon icon="mdi:doorbell-video"></ha-icon><span id="doorN"></span></div><div class="live" id="doorL"><i></i>LIVE</div></button>
</div>
</div>
<div class="grab" id="grab"><i></i></div><div class="edge" id="edge"><i></i></div>
<div class="panel" id="panel"><div class="ph"><button class="x" id="pClose"><ha-icon icon="mdi:chevron-left"></ha-icon></button><h2 id="pTitle"></h2><div class="pact" id="pAct"></div></div><div class="pb" id="pBody"></div></div>
<div class="flash" id="flash"></div>
<div class="idim" id="idim"></div>
<div class="isl hide" id="isl"><div class="isli" id="isli"></div></div>
<div class="night" id="night"><div class="c" id="nc"></div><div class="d" id="nd"></div></div>
<div class="dim"></div>
<div class="ax"><div class="said" id="said"></div><div class="bar"><i class="gl"></i><i class="sp l"></i><i class="sp r"></i><i class="spot"></i></div></div>
<div class="vh" id="vh"><ha-icon icon="mdi:volume-high"></ha-icon><div class="tr2"><i id="vhb"></i></div><b id="vhn"></b></div>
<div class="scrim" id="scrim"></div>
<div class="drawer" id="drawer">
<div class="qrow">
<button class="q" data-q="dnd"><span class="c"><ha-icon icon="mdi:minus-circle-outline"></ha-icon></span>Do Not Disturb</button>
<button class="q" data-q="mute"><span class="c"><ha-icon icon="mdi:microphone-off"></ha-icon></span>Mic Off</button>
<button class="q" data-q="night"><span class="c"><ha-icon icon="mdi:weather-night"></ha-icon></span>Night Clock</button>
<button class="q" data-q="screen"><span class="c"><ha-icon icon="mdi:cellphone-off"></ha-icon></span>Screen Off</button>
<button class="q" data-q="home"><span class="c"><ha-icon icon="mdi:home-outline"></ha-icon></span>Home</button>
<button class="q" data-q="kiosk"><span class="c"><ha-icon icon="mdi:lock-outline"></ha-icon></span><em style="font-style:normal">Kiosk</em></button>
</div>
<div class="sl"><ha-icon icon="mdi:brightness-6"></ha-icon><input type="range" id="sb" min="3" max="100" step="1"><span id="sbv"></span><small>Adaptive — follows the room light</small></div>
<div class="sl"><ha-icon icon="mdi:volume-high"></ha-icon><input type="range" id="sv" min="0" max="10" step="1"><span id="svv"></span></div>
</div>
<div class="rail" id="rail">
<h3>All Screens</h3><div class="g">
${[["chat", "mdi:chat-processing-outline", "Alexa Chat", "#bf5af2"], ["smart_home", "mdi:lightbulb-group-outline", "Lights", "#ffd60a"], ["cameras", "mdi:cctv", "Cameras", "#64d2ff"], ["climate", "mdi:thermostat", "Climate", "#ff9f0a"], ["music", "mdi:music-note", "Music", "#ff375f"], ["map", "mdi:map-marker-radius-outline", "Family", "#30d158"], ["calendar", "mdi:calendar-month-outline", "Calendar", "#ff453a"], ["weather", "mdi:weather-partly-cloudy", "Weather", "#0a84ff"], ["news", "mdi:newspaper-variant-outline", "News", "#e5e5ea"], ["lists", "mdi:format-list-checks", "Lists", "#ffd60a"], ["orders", "mdi:package-variant-closed", "Orders", "#ac8e68"], ["timers", "mdi:timer-outline", "Timers", "#ff9f0a"]].map(([k, i, n, t]) => `<button data-p="${k}" style="--t:${t}"><span class="ic"><ha-icon icon="${i}"></ha-icon></span>${n}</button>`).join("")}</div>
</div>
<div class="sheet" id="sheet"></div>`;
const $ = (id) => r.getElementById(id); this.$ = $;
$("pClose").addEventListener("click", () => this._close());
$("scrim").addEventListener("click", () => { this._drawer(false); this._rail(false); this._sheet(null); });
$("grab").addEventListener("click", () => this._drawer(true));
$("edge").addEventListener("click", () => this._rail(true));
$("idim").addEventListener("click", () => this._islHome());
$("isl").addEventListener("click", (e) => this._islClick(e));
$("wWx").addEventListener("click", () => this._open("weather"));
$("wCal").addEventListener("click", () => this._open("calendar"));
$("wMap").addEventListener("click", () => this._open("map"));
$("wDoor").addEventListener("click", () => this._open("cam", { cam: "front_door" }));
$("night").addEventListener("click", () => { this._peek = Date.now(); this._nightApply(); });
r.querySelectorAll(".q").forEach((b) => b.addEventListener("click", () => this._quick(b.dataset.q)));
r.querySelectorAll(".rail button").forEach((b) => b.addEventListener("click", () => { this._rail(false); b.dataset.p === "timers" ? this._islTimers() : this._open(b.dataset.p); }));
const sb = $("sb"), sv = $("sv");
sb.addEventListener("input", () => { $("sbv").textContent = sb.value; this._bDrag = Date.now(); });
sb.addEventListener("change", () => this._setBright(+sb.value));
sv.addEventListener("input", () => { $("svv").textContent = sv.value; this._vDrag = Date.now(); this._hud(+sv.value); clearTimeout(this._svT); this._svT = setTimeout(() => this._setVol(+sv.value), 90); });
sv.addEventListener("change", () => { this._setVol(+sv.value); this._vSnd(); });
$("pBody").addEventListener("click", (e) => this._panelClick(e));
$("pAct").addEventListener("click", (e) => this._panelClick(e));
$("sheet").addEventListener("click", (e) => this._sheetClick(e));
this._gestures();
this._start();
}
_start() {
if (!this._fx) { this._fx = 1; [["os-echo-fx", "OSEchoFX"], ["os-echo-map", "OSEchoMap"]].forEach(([t, g]) => customElements.whenDefined(t).then(() => { const st = document.createElement("style"); st.textContent = window[g].css; this.shadowRoot.appendChild(st); this._mapW(true); })); }
this._tick(); this._hint(); this._bgNext(true);
clearInterval(this._sec); this._sec = setInterval(() => this._tick(), 1000);
clearInterval(this._hintT); this._hintT = setInterval(() => this._hint(), 12000);
clearInterval(this._calT); this._loadCal(); this._calT = setInterval(() => this._loadCal(), 30000);
clearInterval(this._snapT); this._snap(); this._snapT = setInterval(() => this._snap(), 15000);
clearInterval(this._r30); this._r30 = setInterval(() => this._refresh(), 15000);
if (!this._keyB) { this._keyB = (e) => this._key(e); window.addEventListener("keydown", this._keyB, true); }
setTimeout(() => this._mapW(true), 900); setTimeout(() => this._glance(), 1000); setTimeout(() => this._diag(), 4000);
if (this._c.start_panel) setTimeout(() => this._open(this._c.start_panel, { ch: this._c.start_ch, cam: this._c.start_cam }), 1200);
if (this._c.demo) setTimeout(() => this._demo(this._c.demo), 1500);
}
/* replay view (rendered by Puppet for the activity log): redraw the logged answer or card whenever a new one is logged */
_replay() {
const r = this._hass.states[this._c.va].attributes.echo_review || {}; if (r.ts === this._rpTs) return; this._rpTs = r.ts;
clearTimeout(this._rpT); this._rpT = setTimeout(() => { const c = r.card || {}; this._islHome(); this._turn = Date.now(); if ((c.items && c.items.length) || c.body) this._rich(c); else if (r.a) this._answer(r.a, r.q); }, 400);
}
/* everything on screen refreshes every 30 s (calendar, map, weather, open panels) */
_refresh() {
if (!this._hass || document.hidden) return;
this._mapW(true); this._wxWidget(); this._glance();
if (!this._fc && this._hass.connection) this._subForecast();
const P = this._panel;
if (P === "weather") this._pWeather();
else if (P === "map") { const bm = this.shadowRoot.getElementById("bigmap"); if (bm) this._tiles(bm, this._people().map((p) => this._loc(p)).filter(Boolean), 16); }
}
/* hardware buttons, handled on the Echo itself (no round trip): the button layout maps
   volume down/up to F1/F2 and the mute button to F3; the stock volume keys are handled too when they reach the page */
_key(e) {
const k = e.key, C = this._c; if (!this._hass) return;
const up = k === "F2" || k === "AudioVolumeUp", dn = k === "F1" || k === "AudioVolumeDown";
if (up || dn) {
e.preventDefault(); const now = Date.now();
const ha = num(this._hass.states[C.music]);
let m = this._kvM != null && ha === this._kvHa && now - this._kvAt < 60000 ? this._kvM : ha; if (m == null) m = 0;
m = Math.max(0, Math.min(15, m + (up ? 1 : -1))); this._kvM = m; this._kvAt = now; this._kvHa = ha; this._vDrag = now;
const L = Math.round(m / 1.5); this._lastL = L; this._hud(L); this._vSnd();
if (this._dOpen) { this.$("sv").value = L; this.$("svv").textContent = L; }
if (k[0] === "F") { clearTimeout(this._kvT); this._kvT = setTimeout(() => this._call("number", "set_value", { entity_id: C.music, value: this._kvM }), 60); }
} else if (k === "F3") {
e.preventDefault(); if (e.repeat) return;
this._mute(!this.hasAttribute("muted"), true);
}
}
/* mute / unmute: red bar, chime (mute_sound: false turns it off), and the red bar collapses on unmute */
_mute(on, local) {
const first = this._mInit == null; this._mInit = 1;
if (on === this.hasAttribute("muted")) return;
clearTimeout(this._umT); this.removeAttribute("unmuting"); this.toggleAttribute("muted", on);
if (first) return;
if (!on) { this.setAttribute("unmuting", ""); this._umT = setTimeout(() => this.removeAttribute("unmuting"), 700); }
if (this._c.mute_sound !== false && !this._c.replay && window.OSEchoFX) window.OSEchoFX.play(on ? "mute" : "unmute");
if (local) { this._muteAt = Date.now(); this._call("switch", on ? "turn_on" : "turn_off", { entity_id: this._c.mute }); }
}
_call(d, s, data) { if (this._hass) return this._hass.callService(d, s, data).catch((e) => console.warn("os-echo", d, s, e)); }
/* the Echo reports what its webview looks like, to debug scaling after a reboot */
_diag() {
if (!IS_ECHO || !this._hass) return;
clearTimeout(this._dgT); this._dgT = setTimeout(() => this._call("view_assist", "set_state", { entity_id: this._c.va, echo_diag: { w: innerWidth, h: innerHeight, sw: screen.width, sh: screen.height, dpr: devicePixelRatio, secure: isSecureContext, origin: location.origin, ts: Date.now() / 1000 } }), 1500);
}
/* ---------- 1 s tick: size, clock, night check, timers ---------- */
_fit() { const t = Math.max(0, Math.round(this.getBoundingClientRect().top)), hh = (window.innerHeight - t) + "px"; if (this.style.height !== hh) this.style.height = hh; }
/* View Assist injects its own listening overlay (a coloured bar) into <body>; the Alexa light bar replaces it.
   Its <head> style can get lost on reloads, so it is re-checked every second and the element itself is hidden too. */
_hideVA() {
if (!document.getElementById("os-echo-hide-va")) { const st = document.createElement("style"); st.id = "os-echo-hide-va"; st.textContent = "view-assist-overlays{display:none !important;}"; document.head.appendChild(st); }
const o = document.querySelector("view-assist-overlays"); if (o && o.style.getPropertyPriority("display") !== "important") o.style.setProperty("display", "none", "important");
}
_tick() {
this._fit(); this._hideVA();
const n = new Date(), $ = this.$, t = fmtClock(n);
if (t !== this._lastClock) {
this._lastClock = t; const d = n.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
$("clock").textContent = t; $("date").textContent = d; $("nc").textContent = t; $("nd").textContent = d;
}
this._nightTick(); this._tmShow();
if ((this._list || []).some((x) => x.timer_class === "timer")) this._tickT();
if (this._glNext && Date.now() > this._glNext) this._glance(true);
}
_hint() { const el = this.$("hint"); this._hi = ((this._hi == null ? Math.floor(Math.random() * HINTS.length) : this._hi) + 1) % HINTS.length; el.style.opacity = 0; setTimeout(() => { el.textContent = `Try “${HINTS[this._hi]}”`; el.style.opacity = 1; }, 500); }
_vaBg() {
if (this._photos) return;
const s = this._hass.states[this._c.va], u = s && s.attributes.background;
if (u && u !== this._bgUrl) { this._bgUrl = u; this._show(u); }
else if (!u && !this._bgUrl) { this._bgUrl = "x"; this._photos = PICS.map((n) => `https://picsum.photos/id/${n}/1280/800.jpg`); this._bgNext(true); }
}
_show(url) { const img = new Image(); img.onload = () => { const a = this.$("b0"), b = this.$("b1"), on = a.classList.contains("on") ? b : a, off = on === a ? b : a; on.style.backgroundImage = `url("${url}")`; on.classList.add("on"); off.classList.remove("on"); }; img.src = url; }
_bgNext(first) { const P = this._photos; if (!P || !P.length) return; this._pi = first ? Math.floor((Date.now() / 36e5) % P.length) : ((this._pi || 0) + 1) % P.length; this._show(P[this._pi]); }
/* ---------- weather ---------- */
_subForecast() {
try { this._fc = this._hass.connection.subscribeMessage((m) => { this._fcast = (m && m.forecast) || []; this._wxWidget(); this._glance(); if (this._panel === "weather") this._pWeather(); }, { type: "weather/subscribe_forecast", entity_id: this._c.weather, forecast_type: "daily" }); this._fc.catch(() => { this._fc = null; }); } catch (e) { this._fc = null; }
}
_wxWidget() {
const s = this._hass.states[this._c.weather]; if (!s) return;
const t = Math.round(parseFloat(s.attributes.temperature)), f = this._fcast || [];
this.$("wx1").innerHTML = `<ha-icon icon="mdi:${WX[s.state] || "weather-partly-cloudy"}"></ha-icon><div><b>${isNaN(t) ? "--" : t}°</b><span>${esc(WXT[s.state] || cap(s.state))}${f[0] ? ` · H ${Math.round(f[0].temperature)}° L ${Math.round(f[0].templow)}°` : ""}</span></div>`;
this.$("wxd").innerHTML = f.slice(1, 5).map((d) => `<div>${new Date(d.datetime).toLocaleDateString(undefined, { weekday: "short" })}<ha-icon icon="mdi:${WX[d.condition] || "weather-partly-cloudy"}"></ha-icon><b>${Math.round(d.temperature)}°</b></div>`).join("");
}
/* ---------- calendar ---------- */
async _loadCal(days) {
const h = this._hass; if (!h) { setTimeout(() => this._loadCal(), 3000); return; }
let cals = this._c.calendars; if (!cals || !cals.length) cals = Object.keys(h.states).filter((id) => id.startsWith("calendar."));
const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(s.getTime() + (days || 14) * 864e5), out = [];
await Promise.all(cals.map((id) => h.callApi("GET", `calendars/${id}?start=${encodeURIComponent(s.toISOString())}&end=${encodeURIComponent(e.toISOString())}`).then((l) => (l || []).forEach((v) => out.push(v))).catch(() => {})));
const at = (x) => new Date(x.start.dateTime || (x.start.date + "T00:00:00"));
this._events = out.filter((x) => x && x.start && (x.start.date ? true : at(x) > new Date(Date.now() - 6e5))).sort((a, b) => at(a) - at(b)).map((x) => ({ t: x.summary, d: at(x), all: !!x.start.date }));
const up = this._events.slice(0, 3);
this.$("cal").innerHTML = up.length ? up.map((e2) => `<div class="ev"><i></i><div style="min-width:0"><b>${esc(e2.t)}</b><span>${dayWord(e2.d)}${e2.all ? " · All day" : " · " + fmtTime(e2.d)}</span></div></div>`).join("") : `<div class="muted">Nothing on the calendar</div>`;
if (this._panel === "calendar") this._pCalendar();
this._glance();
}
/* ---------- family map widget (static tiles, no Leaflet) ---------- */
_people() {
if (this._pp) return this._pp;
const C = this._c, h = this._hass;
let p = C.people && C.people.length ? C.people : null;
if (!p) {
const COL = { jason: "#2997ff", jill: "#ff375f", lauren: "#bf5af2", harper: "#ffd60a", hayden: "#30d158" };
p = Object.keys(h.states).filter((id) => id.startsWith("person.") && (h.states[id].attributes.device_trackers || []).some((t) => t.includes("life360"))).map((id) => {
const k = id.split(".")[1]; const tr = (h.states[id].attributes.device_trackers || []).find((t) => t.includes("life360"));
return { person: id, tracker: tr, name: h.states[id].attributes.friendly_name || cap(k), color: COL[k] || "#8e8e93" };
});
}
this._pp = p; return p;
}
_loc(p) {
const h = this._hass, t = h.states[p.tracker] || h.states[p.person]; if (!t) return null;
const a = t.attributes; if (a.latitude == null) return null;
const ps = h.states[p.person];
let where = ps && ps.state === "home" ? "Home" : ps && !["not_home", "unknown"].includes(ps.state) ? ps.state : (a.address || a.place || "Away");
if (typeof where === "string") where = where.split(",")[0];
return { lat: a.latitude, lon: a.longitude, where, ...p };
}
_mapW(force) {
const box = this.$("mapbox"); if (!box) return;
const now = Date.now(); if (!force && this._mapAt && now - this._mapAt < 4000) { clearTimeout(this._mapT); this._mapT = setTimeout(() => this._mapW(true), 4000); return; }
this._mapAt = now;
const pts = this._people().map((p) => this._loc(p)).filter(Boolean);
this.$("mapl").innerHTML = pts.map((p) => `<span><i style="background:${p.color}"></i><b>${esc(p.name.split(" ")[0])}</b><em>${esc(p.where)}</em></span>`).join("");
const lg = this.$("mapl"), lb = box.parentNode.querySelector(".wh");
this._tiles(box, pts, 15, lb ? lb.offsetTop + lb.offsetHeight : 0, 0);
}
_tiles(box, pts, zmax, padT, padB) {
const W = box.clientWidth, H = box.clientHeight; if (!W || !H || !pts.length) return;
padT = padT || 0; padB = padB || 0; const av = Math.max(60, H - padT - padB);
/* fractional zoom: fit every pin with a comfortable margin, never closer than street level or wider than a region */
const sx = Math.max(...pts.map((p) => lon2x(p.lon, 0))) - Math.min(...pts.map((p) => lon2x(p.lon, 0)));
const sy = Math.max(...pts.map((p) => lat2y(p.lat, 0))) - Math.min(...pts.map((p) => lat2y(p.lat, 0)));
const fx = sx > 0 ? Math.log2(Math.max(1, W - 64) / sx) : zmax, fy = sy > 0 ? Math.log2(Math.max(1, av - 52) / sy) : zmax;
const zf = Math.round(Math.max(3, Math.min(zmax, fx, fy)) * 100) / 100, z = Math.floor(zf), sc = 2 ** (zf - z), T = 256 * sc;
const xs = pts.map((p) => lon2x(p.lon, zf)), ys = pts.map((p) => lat2y(p.lat, zf));
const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
const x0 = cx - W / 2, y0 = cy - (padT + av / 2), k = `${zf}|${Math.round(x0)}|${Math.round(y0)}|${W}x${H}`;
let html = "";
if (box.dataset.k !== k) {
for (let tx = Math.floor(x0 / T); tx <= Math.floor((x0 + W) / T); tx++) for (let ty = Math.floor(y0 / T); ty <= Math.floor((y0 + H) / T); ty++) html += `<img class="t" src="${TILE(z, tx, ty)}" style="left:${(tx * T - x0).toFixed(1)}px;top:${(ty * T - y0).toFixed(1)}px;width:${Math.ceil(T) + 1}px;height:${Math.ceil(T) + 1}px" alt="">`;
box.dataset.k = k; box.dataset.t = html;
} else html = box.dataset.t;
/* people at the same place share one pin with their Life360 photos (os-echo-map) */
box.innerHTML = html + (window.OSEchoMap ? window.OSEchoMap.pins(pts.map((p, i) => ({ ...p, x: xs[i] - x0, y: ys[i] - y0 })), W, H, padT, padB, this._hass) : "");
}
/* ---------- doorbell widget: snapshot, live while there is motion ---------- */
_snap() {
const h = this._hass; if (!h || this._doorLive) return;
const d = this._c.doorbell, s = h.states[d.snapshot] || h.states[d.live]; if (!s) return;
this.$("doorN").textContent = d.name;
const url = `${s.attributes.entity_picture}&t=${Date.now()}`;
const img = new Image(); img.onload = () => { if (!this._doorLive) this.$("door").style.backgroundImage = `url("${url}")`; }; img.src = url;
}
_door() {
const h = this._hass, d = this._c.doorbell, m = h.states[d.motion], dg = h.states[d.ding];
const ding = dg && dg.state === "on", active = (m && m.state === "on") || ding;
if (ding && !this._dingOn) { this._chime(); this._open("cam", { cam: "front_door", auto: 90 }); }
this._dingOn = ding;
clearTimeout(this._doorOff);
if (active) this._doorLiveOn();
else if (this._doorLive) this._doorOff = setTimeout(() => this._doorLiveOff(), 30000);
}
async _doorLiveOn() {
if (this._doorLive) return; this._doorLive = true;
const el = await this._live(this._c.doorbell.live); if (!this._doorLive) return;
const box = this.$("door"); box.innerHTML = ""; box.appendChild(el); this.$("doorL").classList.add("on");
}
_doorLiveOff() { this._doorLive = false; this.$("door").innerHTML = ""; this.$("doorL").classList.remove("on"); this._snap(); }
async _live(entity) {
const helpers = await window.loadCardHelpers();
const el = helpers.createCardElement({ type: "picture-entity", entity, camera_view: "live", show_name: false, show_state: false, tap_action: { action: "none" } });
el.hass = this._hass; el.style.cssText = "display:block;height:100%;--ha-card-border-radius:0;--ha-card-background:#000;";
(this._lives = this._lives || new Set()).add(el); return el;
}
/* ---------- sounds (WebAudio; follows the media volume, so it is silent while the Echo is at 0) ---------- */
_audio() { try { const A = window.AudioContext || window.webkitAudioContext; this._ac = this._ac || new A(); if (this._ac.state === "suspended") this._ac.resume(); return this._ac; } catch (e) { return null; } }
_note(ctx, f, t, dur, vol) {
/* soft mallet: fundamental + a quiet 4x partial, fast attack, exponential decay */
[[f, 1], [f * 4, 0.12]].forEach(([fr, gm]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = fr; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * gm, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05); });
}
_chime() { const ctx = this._audio(); if (!ctx) return; const t = ctx.currentTime + 0.02; this._note(ctx, 659.3, t, 1.2, 0.5); this._note(ctx, 523.3, t + 0.45, 1.4, 0.5); }
/* Alexa-style alarm: a bright four-note mallet phrase that repeats and slowly gets louder */
_ringSound(on) {
/* original Echo alarm / timer / reminder sound (os-echo-fx); the synthesized phrase below is only a fallback */
const fx = window.OSEchoFX && window.OSEchoFX.ring(on, (((this._hass.states[this._c.va] || {}).attributes || {}).timers || []).filter((t) => t.status === "expired").sort((a, b) => new Date(b.expires) - new Date(a.expires)).concat([{}])[0].timer_class);
if (!on) { clearInterval(this._rsT); this._rsT = null; return false; }
if (fx != null) return fx;
if (this._rsT) return true;
const ctx = this._audio(); if (!ctx) return false;
const start = Date.now();
const phrase = () => { const t = ctx.currentTime + 0.03, v = Math.min(0.9, 0.35 + (Date.now() - start) / 60000); [[1046.5, 0], [1318.5, 0.16], [1568, 0.32], [1318.5, 0.48]].forEach(([f, d]) => this._note(ctx, f, t + d, 0.55, v)); this._note(ctx, 1568, t + 0.64, 0.9, v); };
phrase(); this._rsT = setInterval(phrase, 1900);
return ctx.state === "running";
}
/* ---------- timers ---------- */
_timers() {
const s = this._hass.states[this._c.va];
const l = ((s && s.attributes.timers) || []).filter((t) => t.status !== "expired").sort((a, b) => new Date(a.expires) - new Date(b.expires));
this._list = l;
const fresh = l.filter((t) => !(this._known || {})[t.id]);
const first = !this._known; this._known = {}; l.forEach((t) => { this._known[t.id] = 1; });
this._ringCheck();
/* a new timer opens the big countdown once Alexa has finished talking (it is usually created mid-answer) */
if (!first && fresh.length && !this._ringing) this._tmPend = Date.now();
if (this._isl && this._isl.m === "timers") this._islTimers(this._isl.ttl);
this._glance(); this._tmShow();
}
_tmShow() {
if (!this._tmPend) return;
if (this._ringing || Date.now() - this._tmPend > 90000) { this._tmPend = 0; return; }
const sat = this._hass.states[this._c.sat]; if (sat && ["listening", "processing", "responding"].includes(sat.state)) return;
const m = this._isl ? this._isl.m : "glance";
const shortAns = (m === "ok" || m === "answer") && Date.now() - (this._isl.at || 0) > 2200 && (this.$("isli").textContent || "").trim().length < 110;
if (m === "glance" || m === "timers" || shortAns) { this._tmPend = 0; this._islTimers(15000); }
}
_tickT() {
const now = Date.now(), l = this._list || [];
if (this._isl && this._isl.m === "glance" && this._glKind === "timer") { const el = this.shadowRoot.getElementById("glt"); const t = l.find((x) => x.timer_class === "timer"); if (el && t) el.textContent = left((new Date(t.expires) - now) / 1000); }
if (this._isl && this._isl.m === "timers") this.shadowRoot.querySelectorAll(".tm[data-id]").forEach((el) => {
const t = l.find((x) => x.id === el.dataset.id); if (!t) return;
const rem = Math.max(0, (new Date(t.expires) - now) / 1000);
el.querySelector("b").textContent = left(rem); el.querySelector(".pr").style.strokeDashoffset = String(283 * (1 - Math.min(1, rem / Math.max(1, +el.dataset.tot))));
});
}
_timersHtml() {
const l = this._list || [], now = Date.now();
const tms = l.filter((t) => t.timer_class === "timer"), als = l.filter((t) => t.timer_class === "alarm"), rms = l.filter((t) => t.timer_class === "reminder");
const tot = (t) => Math.max(1, (new Date(t.expires) - new Date(t.status === "snoozed" ? t.updated_at : t.created_at)) / 1000);
const ring = (t) => `<div class="tm${t.status === "snoozed" ? " snz" : ""}" data-id="${esc(t.id)}" data-tot="${tot(t)}"><div class="ring"><svg viewBox="0 0 100 100"><circle class="tr" cx="50" cy="50" r="45"/><circle class="pr" cx="50" cy="50" r="45" stroke-dasharray="283" stroke-dashoffset="0"/></svg><div class="v"><b>${left((new Date(t.expires) - now) / 1000)}</b><span>${esc(cap(t.name) || (t.duration ? String(t.duration).replace(/^(\d+) (second|minute|hour)s$/, "$1 $2") + " timer" : "Timer"))}</span></div></div><button class="pill" data-del="${esc(t.id)}">Cancel</button></div>`;
const row = (t, icon, a, b) => `<div class="it"><ha-icon icon="${icon}"></ha-icon><div class="t"><b>${esc(a)}</b><span>${esc(b)}</span></div><button class="del" data-del="${esc(t.id)}"><ha-icon icon="mdi:close"></ha-icon></button></div>`;
return `<div class="tmb"><div class="tbh"><h2>Timers &amp; Alarms</h2><button class="x" data-close="1"><ha-icon icon="mdi:close"></ha-icon></button></div>` +
(tms.length ? `<div class="tgrid${tms.length === 1 ? " solo" : ""}">${tms.slice(0, 3).map(ring).join("")}</div>` : "") +
als.slice(0, 3).map((t) => row(t, "mdi:alarm", fmtTime(new Date(t.expires)), dayWord(new Date(t.expires)) + (t.name ? " · " + cap(t.name) : ""))).join("") +
rms.slice(0, 3).map((t) => row(t, "mdi:bell-ring-outline", cap(t.name || "Reminder"), `${dayWord(new Date(t.expires))} at ${fmtTime(new Date(t.expires))}`)).join("") +
(!l.length ? `<div class="muted" style="padding:2vh 0 1vh">No timers, alarms or reminders.<br>Try “Alexa, set a timer for 10 minutes”.</div>` : "") + `</div>`;
}
_islTimers(ttl) { this._islSet("timers", this._timersHtml(), { w: 0.64, maxH: 0.86, ttl: ttl || 20000, dim: true }); }
_ringCheck() {
const h = this._hass, sw = h.states[this._c.alarm], on = !!(sw && sw.state === "on");
if (!on) { if (this._ringing) { this._ringing = false; this._ex = []; this._ringSound(false); this._islHome(); } return; }
if (!this._ringing) {
this._ringing = true; this._ex = []; this._peek = Date.now(); this._nightApply();
const ok = this._ringSound(true);
if (ok && IS_ECHO) this._call("view_assist", "set_state", { entity_id: this._c.va, echo_ring_ack: Date.now() / 1000 });
h.callWS({ type: "call_service", domain: "view_assist", service: "get_timers", service_data: { entity_id: this._c.va, include_expired: true }, return_response: true })
.then((r) => { this._ex = ((r && r.response && r.response.result) || []).filter((t) => t.status === "expired").sort((a, b) => new Date(b.expires) - new Date(a.expires)); if (this._ringing) this._islRing(); }).catch(() => {});
}
this._islRing();
}
_islRing() {
const t = (this._ex || [])[0], kind = t ? t.timer_class : "alarm";
const title = t ? (kind === "reminder" ? cap(t.name || "Reminder") : t.name ? `${cap(t.name)} ${kind}` : kind === "timer" ? "Timer done" : "Alarm") : "Alarm";
const sub = t ? (kind === "timer" ? `${t.duration || ""} timer` : fmtTime(new Date(t.expires))) : fmtClock(new Date());
this._islSet("ring", `<div class="rv" style="width:100%"><ha-icon icon="${kind === "timer" ? "mdi:timer-outline" : kind === "reminder" ? "mdi:bell-ring-outline" : "mdi:alarm"}"></ha-icon><div class="rt">${esc(title)}</div><div class="rs">${esc(sub)}</div><div class="rb">${kind === "timer" ? "" : `<button class="big" data-snz="1">Snooze</button>`}<button class="big stop" data-stp="1">Stop</button></div></div>`, { w: 0.936, h: 0.86, dim: true });
}
_stopRing(snooze) {
const C = this._c, ex = this._ex || [];
this._ringSound(false);
this._call("switch", "turn_off", { entity_id: C.alarm });
ex.forEach((t) => { if (snooze && t.timer_class !== "timer") this._call("view_assist", "snooze_timer", { timer_id: t.id, time: C.snooze }); else this._call("view_assist", "cancel_timer", { timer_id: t.id }); });
this._call("view_assist", "set_state", { entity_id: C.va, mode: "normal" });
this._ringing = false; this._islHome();
}
/* ---------- night clock: the light sensor is checked every second ---------- */
_nightTick() {
const lux = num(this._hass && this._hass.states[this._c.lux]); if (lux == null) return;
if (this._nightForced != null) { if (this._isNight !== this._nightForced) { this._isNight = this._nightForced; this._nightApply(); } return; }
/* night = the room is fully dark (no lights on) for night_hold seconds; any light back on wakes it within ~3 s */
this._dk = lux <= this._c.night_lux ? (this._dk || 0) + 1 : 0;
this._lt = lux >= this._c.day_lux ? (this._lt || 0) + 1 : 0;
if (!this._isNight && this._dk >= this._c.night_hold) { this._isNight = true; this._nightApply(); }
else if (this._isNight && this._lt >= 3) { this._isNight = false; this._nightApply(); }
else if (this._isNight && this._peek && Date.now() - this._peek > 20000 && this.$("night").className === "night") this._nightApply();
}
_nightApply() {
const peek = this._peek && Date.now() - this._peek < 20000;
const on = !!this._isNight && !peek && !this._ringing && !this._panel && !this.hasAttribute("ax");
this.$("night").classList.toggle("on", on);
}
/* ---------- the island ---------- */
_islSet(m, html, o) {
o = o || {};
const I = this.$("isl"), inner = this.$("isli"), W = innerWidth, H = innerHeight;
this._isl = { m, ttl: o.ttl, turn: o.turn, at: Date.now() };
clearTimeout(this._islT); clearTimeout(this._islF);
if (m !== "vision") this._stopPreview();
inner.classList.remove("show");
const apply = () => {
inner.innerHTML = html; if (o.after) o.after();
let w;
if (o.w === "auto") { inner.style.width = "max-content"; if (html && !inner.scrollWidth) { this._islF = setTimeout(() => { if (this._isl && this._isl.m === m) this._islSet(m, html, o); }, 600); return; } w = Math.min(W * 0.52, inner.scrollWidth + 14); } else w = Math.round(W * o.w);
inner.style.width = w + "px"; inner.style.height = "";
const h = o.h ? Math.round(H * o.h) : Math.min(Math.round(H * (o.maxH || 0.6)), inner.scrollHeight);
inner.style.height = o.h || o.maxH ? h + "px" : "";
I.style.width = w + "px"; I.style.height = h + "px";
I.classList.toggle("xl", m !== "glance" && m !== "ok");
I.dataset.m = m;
I.classList.toggle("hide", m === "glance" && (!html || !!this._panel));
requestAnimationFrame(() => inner.classList.add("show"));
};
/* when one expanded state replaces another, fade the old content out first */
if (I.dataset.m && I.dataset.m !== "glance" && !I.classList.contains("hide")) this._islF = setTimeout(apply, 120); else apply();
const dim = this.$("idim"); dim.classList.toggle("on", m !== "glance" && m !== "ok"); dim.classList.toggle("dark", !!o.dim);
if (o.ttl) this._islT = setTimeout(() => this._islHome(), o.ttl);
}
_islHome() {
if (this._ringing) return this._islRing();
this.$("flash").classList.remove("on");
this._isl = { m: "glance" }; this._glance(true, true);
}
_islBump() { if (this._isl && this._isl.ttl && this._isl.m !== "glance") { clearTimeout(this._islT); this._islT = setTimeout(() => this._islHome(), Math.max(this._isl.ttl, 30000)); } }
_islClick(e) {
this._islBump();
const t = e.target;
const d = t.closest("[data-del]"); if (d) { e.stopPropagation(); this._call("view_assist", "cancel_timer", { timer_id: d.dataset.del }); const it = d.closest(".it,.tm"); if (it) it.style.opacity = ".35"; return; }
if (t.closest("[data-stp]")) return this._stopRing(false);
if (t.closest("[data-snz]")) return this._stopRing(true);
if (t.closest("[data-close]")) return this._islHome();
if (t.closest(".nx")) { const c = this.shadowRoot.getElementById("car"); if (c) c.scrollBy({ left: c.clientWidth * 0.8, behavior: "smooth" }); return; }
if (!this._isl || this._isl.m === "glance") {
const k = this._glKind;
if (k === "timer" || k === "alarm") this._islTimers(); else if (k === "music") this._open("music"); else if (k === "event") this._open("calendar"); else if (k === "orders") this._open("orders"); else this._open("weather");
} else if (["answer", "rich", "vision"].includes(this._isl.m)) { const tn = this._isl.turn; this._islHome(); this._open("chat", { turn: tn }); }
else if (this._isl.m === "ok") this._islHome();
}
/* glance widgets shown in the resting island; the most urgent wins, the rest rotate every 8 s */
_glance(rotate, force) {
if (!this._hass || (this._isl && this._isl.m !== "glance" && !force)) return;
if (!this._isl) this._isl = { m: "glance" };
const h = this._hass, C = this._c, now = Date.now(), l = this._list || [], items = [];
const tm = l.filter((t) => t.timer_class === "timer");
if (tm.length) items.push({ k: "timer", icon: "mdi:timer-outline", a: "#ff9f0a", html: `<span id="glt">${left((new Date(tm[0].expires) - now) / 1000)}</span>${tm.length > 1 ? `<small>+${tm.length - 1} more</small>` : tm[0].name ? `<small>${esc(cap(tm[0].name))}</small>` : ""}`, pin: true });
const mp = h.states[C.music_player];
if (mp && mp.state === "playing") items.push({ k: "music", icon: "mdi:music-note", a: "#ff375f", html: `${esc((mp.attributes.media_title || "Playing").slice(0, 34))}${mp.attributes.media_artist ? `<small>${esc(mp.attributes.media_artist.slice(0, 24))}</small>` : ""}` });
const ev = (this._events || []).find((e) => !e.all && e.d - now > -5 * 60000 && e.d - now < 12 * 36e5);
if (ev) { const m = Math.round((ev.d - now) / 60000); items.push({ k: "event", icon: "mdi:calendar-clock", a: "#0a84ff", html: `${esc(ev.t.slice(0, 28))}<small>${m <= 0 ? "now" : m < 90 ? `in ${m} min` : `${dayN(ev.d) ? "tomorrow " : ""}${fmtTime(ev.d)}`}</small>` }); }
const al = l.find((t) => t.timer_class === "alarm" && new Date(t.expires) - now < 16 * 36e5);
if (al) items.push({ k: "alarm", icon: "mdi:alarm", a: "#ff9f0a", html: `Alarm<small>${fmtTime(new Date(al.expires))}</small>` });
const ord = num(h.states[C.orders]);
if (ord) items.push({ k: "orders", icon: "mdi:package-variant-closed", a: "#ff9f0a", html: `${ord} package${ord === 1 ? "" : "s"}<small>on the way</small>` });
const sun = h.states[C.sun];
if (sun) { const ns = new Date(sun.attributes.next_setting), nr = new Date(sun.attributes.next_rising); if (sun.state === "above_horizon") items.push({ k: "sun", icon: "mdi:weather-sunset-down", a: "#ff9f0a", html: `Sunset<small>${fmtTime(ns)}</small>` }); else if (sun.state !== "above_horizon" && nr - now < 10 * 36e5 && new Date().getHours() < 8) items.push({ k: "sun", icon: "mdi:weather-sunset-up", a: "#ffd60a", html: `Sunrise<small>${fmtTime(nr)}</small>` }); }
const f = this._fcast || [];
if (f[1] && new Date().getHours() >= 17) items.push({ k: "wx", icon: `mdi:${WX[f[1].condition] || "weather-partly-cloudy"}`, a: "#64d2ff", html: `Tomorrow ${Math.round(f[1].temperature)}°<small>${esc(WXT[f[1].condition] || "")}</small>` });
let it = items.find((x) => x.pin);
if (!it && items.length) { if (rotate || this._glI == null) this._glI = ((this._glI == null ? -1 : this._glI) + 1) % items.length; it = items[Math.min(this._glI, items.length - 1)]; }
this._glNext = items.length > 1 && !(it && it.pin) ? now + 8000 : 0;
const html = it ? `<div class="gl" style="--a:${it.a}"><ha-icon icon="${it.icon}"></ha-icon>${it.html}</div>` : "";
this._glKind = it ? it.k : null;
const key = it ? it.k + "|" + it.html.replace(/<span id="glt">[^<]*<\/span>/, "") : "";
if (!force && key === this._glKey && !!this._panel === this._glPanel) return;
this._glKey = key; this._glPanel = !!this._panel;
this._islSet("glance", html, { w: "auto" });
}
/* ---------- Alexa light bar + answers in the island ---------- */
_voice() {
const h = this._hass, C = this._c, s = h.states[C.sat], st = s ? s.state : "idle", stt = h.states[C.stt], tts = h.states[C.tts];
const ok = (x) => x && !["unknown", "unavailable", ""].includes(x.state) && x.state.trim() !== ".";
if (st !== this._st) {
const was = this._st; this._st = st; clearTimeout(this._axT);
if (["listening", "processing", "responding"].includes(st)) { this.setAttribute("ax", st); this._peek = Date.now(); this._nightApply(); const fx = window.OSEchoFX; if (fx && st === "listening" && C.wake_sound !== false) fx.play("wake"); if (fx && st === "processing" && was === "listening" && C.end_sound) fx.play("end"); }
else if (was && ["listening", "processing", "responding"].includes(was)) { this.setAttribute("ax", "closing"); this._axT = setTimeout(() => { this.removeAttribute("ax"); this._nightApply(); }, 560); }
else this.removeAttribute("ax");
}
if (st === "listening") {
this._turn = Date.now(); this.$("said").classList.remove("on"); this.$("said").textContent = "";
if (this._isl && ["answer", "ok"].includes(this._isl.m)) this._islHome();
return;
}
const fresh = (x) => !!this._turn && ok(x) && new Date(x.last_changed) > new Date(this._turn - 1500);
if (st === "processing" && fresh(stt)) { this.$("said").textContent = stt.state.trim(); this.$("said").classList.add("on"); }
if (this._turn && ok(tts) && ((st === "responding" && this._shownTurn !== this._turn) || (fresh(tts) && this._shown !== tts.last_changed && Date.now() - this._turn < 60000))) {
this._shownTurn = this._turn; this._shown = tts.last_changed;
const q0 = fresh(stt) ? stt.state.trim() : "", a0 = tts.state.trim();
if (window.osEchoLog) window.osEchoLog({ turn: this._turn, q: q0, a: a0 });
if (this._chatEl) this._chatEl.voice(q0, a0); else this._answer(a0, q0);
}
if (st === "idle" && this._isl && this._isl.m === "answer" && this._isl.turn === this._turn) { clearTimeout(this._islT); this._islT = setTimeout(() => this._islHome(), Math.min(30000, 7000 + (this._ansLen || 0) * 55)); }
}
_answer(a, q) {
if (!a) return;
this._lastQ = q;
/* a card or the camera already answered this turn: put the spoken text into it instead */
if (this._isl && ["rich", "vision"].includes(this._isl.m) && this._isl.turn === this._turn) { const p = this.shadowRoot.getElementById("rsaid"); if (p && !p.textContent) p.textContent = a; return; }
const short = a.length < 70 && /^(done|ok|okay|alright|sure|turned|set|playing|opening|showing|snooz|stopp|cancel|added|removed|locked|unlocked|dimm|bright|volume|your .* (timer|alarm|reminder))/i.test(a);
if (short) return this._islSet("ok", `<div class="anok"><span class="ok"><ha-icon icon="mdi:check"></ha-icon></span>${esc(a)}</div>`, { w: "auto", ttl: 4000, turn: this._turn });
this._ansLen = a.length;
this._islSet("answer", `<div class="an"><div class="anh">${ORB}<span class="qq">${q ? `“${esc(q)}”` : "Alexa"}</span></div><div class="at">${esc(a)}</div></div>`, { w: 0.355, maxH: 0.6, ttl: 60000, turn: this._turn });
}
/* result cards (recommendations, recipes, how-tos) written by Gemini through script.echo_show_display */
_rich(card) {
const c = card || this._hass.states[this._c.va].attributes.echo_card || {};
let items = c.items; if (typeof items === "string") { try { items = JSON.parse(items.replace(/'/g, '"')); } catch (e) { items = []; } }
items = Array.isArray(items) ? items.filter((x) => x && (x.t || x.title)).slice(0, 10) : [];
if (items.length < 2 && c.body) { if (items[0] && !c.image_query) c.image_query = items[0].q || items[0].t; items = []; }
let body = "";
if (items.length) {
body = `<div class="carw"><div class="car" id="car">${items.map((x, i) => `<div class="ci"><div class="im" id="ci${i}"><ha-icon icon="mdi:image-outline"></ha-icon></div><b>${esc(x.t || x.title)}</b>${x.s ? `<span>${esc(x.s)}</span>` : ""}${x.d ? `<span class="dd">${esc(x.d)}</span>` : ""}${x.g ? `<em class="tg">${esc(x.g)}</em>` : ""}</div>`).join("")}</div>${items.length > 5 ? `<button class="nx"><ha-icon icon="mdi:chevron-right"></ha-icon></button>` : ""}</div>`;
if (c.body) body += `<div class="cardb" style="margin-top:2vh;flex:none;max-height:12vh">${this._fmt(c.body)}</div>`;
} else body = `<div class="rbody"><div class="cardb">${this._fmt(c.body)}</div>${c.image || c.image_query ? `<div class="rimg" id="rimg"${c.image ? ` style="background-image:url('${esc(c.image)}')"` : ""}></div>` : ""}</div>`;
const tts = this._hass.states[this._c.tts], spoken = this._turn && tts && new Date(tts.last_changed) > new Date(this._turn - 1500) ? tts.state : "";
this._islSet("rich", `<div class="rc" style="height:100%"><div class="rch"><div class="tt"><h2>${esc(c.title || "")}</h2><p id="rsaid">${esc(spoken || c.said || "")}</p></div><button class="x" data-close="1"><ha-icon icon="mdi:close"></ha-icon></button></div>${body}</div>`, { w: 0.936, h: 0.86, ttl: 120000, dim: true, turn: this._turn });
const put = (el, u) => { const im = new Image(); im.onload = () => { el.style.backgroundImage = `url("${u}")`; el.innerHTML = ""; }; im.src = u; };
setTimeout(async () => {
for (let i = 0; i < items.length; i++) { const x = items[i], u = await this._img(x.img || x.image, x.q || this._q(x)), el = this.shadowRoot.getElementById("ci" + i); if (el && u) put(el, u); }
if (!items.length && !c.image && c.image_query) { const u = await this._img(null, c.image_query), el = this.shadowRoot.getElementById("rimg"); if (el && u) put(el, u); else if (el) el.remove(); }
}, 200);
}
_q(x) { const s = String(x.s || ""), y = (s.match(/\b(19|20)\d\d\b/) || [""])[0]; return `${x.t || x.title} ${y}${/movie|film/i.test(s) ? " film" : /tv|series|show/i.test(s) ? " TV series" : ""}`.trim(); }
/* pictures for result cards come from Wikipedia's public image search (free, no key) */
async _img(url, q, retry) {
if (url) return url; if (!q) return null;
this._wc = this._wc || {}; if (this._wc[q] !== undefined) return this._wc[q];
try { const ls = localStorage.getItem("osw:" + q); if (ls) return (this._wc[q] = ls); } catch (e) {}
try {
const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=thumbnail&pilicense=any&pithumbsize=480`);
if (!r.ok) { if (retry) return null; await new Promise((ok) => setTimeout(ok, 1500)); return this._img(null, q, true); }
const j = await r.json(), p = j && j.query && j.query.pages, u = p ? (Object.values(p)[0].thumbnail || {}).source || null : null;
this._wc[q] = u; if (u) { try { localStorage.setItem("osw:" + q, u); } catch (e) {} }
return u;
} catch (e) { if (retry) return null; await new Promise((ok) => setTimeout(ok, 1500)); return this._img(null, q, true); }
}
_fmt(text) {
let html = "", list = null;
String(text || "").split("\n").forEach((ln) => {
const m = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/.exec(ln);
if (m) { const tag = m[1] ? "ol" : "ul"; if (list !== tag) { if (list) html += `</${list}>`; html += `<${tag}>`; list = tag; } html += `<li>${esc(m[2].replace(/\*\*/g, ""))}</li>`; }
else { if (list) { html += `</${list}>`; list = null; } const t = ln.replace(/\*\*/g, "").trim(); html += t ? `<div class="${/^[A-Z][^.!?]{0,30}:?$/.test(t) && t.length < 32 ? "h" : ""}">${esc(t)}</div>` : `<div style="height:1.2vh"></div>`; }
});
return html + (list ? `</${list}>` : "");
}
/* camera questions: live preview from the Echo's own camera, a shutter when the photo is taken, then the answer */
_vision(stage) {
const C = this._c, q = this._lastQ || (this._hass.states[C.stt] || {}).state || "";
if (stage === "looking") {
this._islSet("vision", `<div class="vz"><div class="pv" id="pv"><img id="pvi" alt=""><div class="tag"><i></i>CAMERA</div></div><div class="vt"><div class="qq">${q ? `“${esc(q)}”` : ""}</div><div class="st">Looking…</div></div></div>`, { w: 0.6, h: 0.52, ttl: 45000, turn: this._turn, after: () => this._camLocal() });
this._snapped = false; this._shot = null; clearTimeout(this._autoSnap);
/* never leave HA waiting: if the picture has not appeared after 7 s, give up so the fallback camera is used */
this._autoSnap = setTimeout(() => this._vision("snap"), 7000);
} else if (stage === "snap") {
if (this._snapped) return; this._snapped = true; clearTimeout(this._autoSnap);
const pv = this.shadowRoot.getElementById("pv"); if (pv) { pv.classList.remove("snap"); void pv.offsetWidth; pv.classList.add("snap"); }
this._camStop(true, true);
const st = this.shadowRoot.querySelector(".vt .st"); if (st) st.textContent = "Thinking…";
} else {
const c = this._hass.states[C.va].attributes.echo_card || {};
this.$("flash").classList.remove("on"); this._stopPreview();
this._islSet("vision", `<div class="vz"><div class="pv" style="background-image:url('${this._shot || esc(c.image || "")}')"></div><div class="vt"><div class="qq">“${esc(c.title || q)}”</div><div class="at" id="rsaid">${esc(c.body || "")}</div></div></div>`, { w: 0.6, h: 0.52, ttl: 40000, turn: this._turn });
}
}
_preview(n) {
const img = this.shadowRoot.getElementById("pvi"), s = this._hass.states[this._c.selfcam]; if (!img) return;
const src = s && s.attributes.entity_picture ? s.attributes.entity_picture.replace("/camera_proxy/", "/camera_proxy_stream/") : null;
if (!src) return;
/* wait until the camera stream is really on, then connect once (each reconnect flashes the camera indicator) */
if ((this._hass.states[this._c.stream] || {}).state !== "on") { if (n < 40) this._pvT = setTimeout(() => this._preview(n + 1), 300); return; }
img.onerror = () => { if (n < 43 && this._isl && this._isl.m === "vision") this._pvT = setTimeout(() => this._preview(Math.max(n, 40) + 1), 1500); };
img.src = `${src}&t=${Date.now()}`;
}
/* on a secure page the Echo's camera is shown straight from the device (full frame rate, live exposure) */
async _camLocal() {
const pv = this.shadowRoot.getElementById("pv"); if (!pv) return;
if (!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return this._preview(0);
try {
const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
if (!this._isl || this._isl.m !== "vision") { st.getTracks().forEach((t) => t.stop()); return; }
const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.autoplay = true; v.srcObject = st;
/* shutter = the moment the frame is captured: 2.2 s after the picture appears, so exposure has settled */
v.addEventListener("playing", () => { clearTimeout(this._autoSnap); this._autoSnap = setTimeout(() => this._vision("snap"), 2200); }, { once: true });
v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover"; pv.insertBefore(v, pv.firstChild);
this._camSt = st; this._camV = v; v.play().catch(() => {});
} catch (e) { this._snapped = true; clearTimeout(this._autoSnap); this._photoDone(""); this._preview(0); }
}
_camStop(freeze, send) {
const v = this._camV, pv = this.shadowRoot && this.shadowRoot.getElementById("pv");
if (freeze && v && pv && v.videoWidth) { if (send && window.OSEchoFX) window.OSEchoFX.play("shutter"); try { const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); this._shot = c.toDataURL("image/jpeg", 0.8); pv.style.backgroundImage = `url(${this._shot})`; if (send) c.toBlob((b) => this._upload(b), "image/jpeg", 0.88); } catch (e) { if (send) this._photoDone(""); } }
else if (send) this._photoDone("");
if (this._camSt) this._camSt.getTracks().forEach((t) => t.stop());
this._camSt = null; if (v) v.remove(); this._camV = null;
}
/* the photo goes straight to Home Assistant's image store; the AI reads it from there (no VACA camera stream, no camera icon) */
async _upload(blob) {
if (!blob) return this._photoDone("");
try {
const fd = new FormData(); fd.append("file", blob, "echo-vision.jpg");
const r = await this._hass.fetchWithAuth("/api/image/upload", { method: "POST", body: fd });
if (!r.ok) throw new Error("upload " + r.status);
const j = await r.json(); this._photoDone(j.id || "");
} catch (e) { console.warn("os-echo upload", e); this._photoDone(""); }
}
_photoDone(id) {
const va = this._hass.states[this._c.va], prev = va && (va.attributes.echo_photo || {}).id;
this._call("view_assist", "set_state", { entity_id: this._c.va, echo_photo: { id, ts: Date.now() / 1000 } });
if (prev && prev !== id && this._hass.callWS) this._hass.callWS({ type: "image/delete", image_id: prev }).catch(() => {});
}
_stopPreview() { this._camStop(false); clearTimeout(this._pvT); const img = this.shadowRoot && this.shadowRoot.getElementById("pvi"); if (img) { img.onerror = null; img.removeAttribute("src"); } }
/* ---------- volume (0-10) ---------- */
_level() { const m = num(this._hass.states[this._c.music]); return m == null ? null : Math.round(m / 1.5); }
_volChange() {
const L = this._level(); if (L == null) return;
if (this._lastL != null && L !== this._lastL && !(this._vDrag && Date.now() - this._vDrag < 2500)) this._hud(L);
this._lastL = L; this._drawerSync();
}
_hud(L) {
this.$("vhb").style.width = `${L * 10}%`; this.$("vhn").textContent = L;
this.$("vh").querySelector("ha-icon").setAttribute("icon", L === 0 ? "mdi:volume-off" : L < 4 ? "mdi:volume-low" : L < 8 ? "mdi:volume-medium" : "mdi:volume-high");
this.$("vh").classList.add("on"); clearTimeout(this._vhT); this._vhT = setTimeout(() => this.$("vh").classList.remove("on"), 2200);
}
/* the original volume blip, played after the new level has reached the Echo */
_vSnd() { if (window.OSEchoFX) window.OSEchoFX.play("volume"); }
_setVol(L) { this._vDrag = Date.now(); this._call("number", "set_value", { entity_id: this._c.music, value: Math.round(L * 1.5) }); }
_setBright(v) {
const lux = num(this._hass.states[this._c.lux]) || 0;
this._call("input_number", "set_value", { entity_id: this._c.offset, value: Math.max(-60, Math.min(60, v - curve(lux))) });
}
/* ---------- quick settings drawer + rail ---------- */
_drawer(open) {
this._dOpen = open; this.$("drawer").classList.toggle("open", open); this._scrim();
clearTimeout(this._dT); if (open) { this._drawerSync(true); this._dT = setTimeout(() => this._drawer(false), 20000); }
}
_scrim() { this.$("scrim").classList.toggle("on", !!(this._dOpen || this._rOpen || this._sh)); }
_drawerSync(force) {
if (!this._dOpen && !force) return;
const h = this._hass, C = this._c, r = this.shadowRoot, b = num(h.states[C.bright]), L = this._level(), va = h.states[C.va], mu = h.states[C.mute];
if (b != null && !(this._bDrag && Date.now() - this._bDrag < 3000)) { this.$("sb").value = Math.round(b); this.$("sbv").textContent = Math.round(b); }
if (L != null && !(this._vDrag && Date.now() - this._vDrag < 3000)) { this.$("sv").value = L; this.$("svv").textContent = L; }
r.querySelector('[data-q="dnd"]').classList.toggle("on", !!(va && va.attributes.do_not_disturb === "on"));
r.querySelector('[data-q="mute"]').classList.toggle("on", !!(mu && mu.state === "on"));
r.querySelector('[data-q="night"]').classList.toggle("on", !!this._isNight);
const ks = h.states[C.kiosk], kb = r.querySelector('[data-q="kiosk"]'), kon = !!(ks && ks.state === "on");
kb.classList.toggle("on", kon); kb.querySelector("em").textContent = kon ? "Exit Kiosk" : "Kiosk"; kb.querySelector("ha-icon").setAttribute("icon", kon ? "mdi:lock-open-variant-outline" : "mdi:lock-outline");
}
_quick(q) {
const C = this._c, h = this._hass;
if (q === "dnd") { const va = h.states[C.va]; this._call("view_assist", "set_state", { entity_id: C.va, do_not_disturb: va && va.attributes.do_not_disturb === "on" ? "off" : "on" }); }
else if (q === "mute") { const mu = h.states[C.mute]; this._call("switch", mu && mu.state === "on" ? "turn_off" : "turn_on", { entity_id: C.mute }); }
else if (q === "night") { this._force(!this._isNight); this._drawer(false); return; }
else if (q === "screen") { this._drawer(false); this._call("switch", "turn_off", { entity_id: C.screen }); return; }
else if (q === "home") { this._drawer(false); this._close(); this._islHome(); return; }
else if (q === "kiosk") {
const ks = h.states[C.kiosk]; this._drawer(false);
if (!ks) { this._answer("Kiosk mode isn't set up yet. It needs the Android Debug Bridge link in Home Assistant.", "kiosk"); return; }
const on = ks.state !== "on"; this._call("input_boolean", on ? "turn_on" : "turn_off", { entity_id: C.kiosk });
this._answer(on ? "Locking the Echo to this screen." : "Kiosk off. Android's bars and buttons are back. Open Controls and tap Kiosk to lock it again.", "kiosk"); return;
}
this.shadowRoot.querySelector(`[data-q="${q}"]`).classList.toggle("on");
}
_force(on) { this._nightForced = on; this._isNight = on; this._peek = 0; this._nightApply(); clearTimeout(this._nfT); this._nfT = setTimeout(() => { this._nightForced = null; }, 20 * 60000); }
_rail(open) { this._rOpen = open; this.$("rail").classList.toggle("open", open); if (open) this.$("rail").querySelectorAll("button").forEach((b) => b.classList.toggle("cur", b.dataset.p === this._panel)); this._scrim(); clearTimeout(this._rT); if (open) this._rT = setTimeout(() => this._rail(false), 15000); }
/* ---------- voice commands from HA (view_assist set_state echo_cmd / echo_card) ---------- */
_cmd() {
const a = this._hass.states[this._c.va].attributes, c = a.echo_cmd;
if (!c || !c.ts) return;
if (this._cmdTs == null) { this._cmdTs = c.ts; return; }
if (c.ts === this._cmdTs) return; this._cmdTs = c.ts;
if (Date.now() / 1000 - c.ts > 60) return;
const p = c.panel;
if (["looking", "snap", "vision"].includes(p)) { if (p === "looking" && !this._chatEl) this._close(); return this._vision(p); }
if (p === "card") { const cd = a.echo_card; if (this._chatEl) return this._chatEl.card(cd); if (window.osEchoLog && this._turn && Date.now() - this._turn < 120000) window.osEchoLog({ turn: this._turn, card: cd }); this._close(); return this._rich(); }
if (p === "home") { this._close(); this._islHome(); return; }
if (p === "stop") { if (["news", "cam", "music"].includes(this._panel)) this._close(); if (this._isl && this._isl.m !== "glance") this._islHome(); return; }
if (p === "timers") { this._islTimers(15000); return; }
if (p === "screen_on") { this._peek = Date.now(); this._nightApply(); return; }
if (p === "night") return this._force(true);
if (p === "day") { this._nightForced = null; this._isNight = false; this._nightApply(); return; }
this._open(p, { cam: c.cam, auto: c.auto, ch: c.ch });
}
/* ---------- panels ---------- */
_open(p, o) {
o = o || {}; this._close(true);
const titles = { smart_home: "Smart Home", cameras: "Cameras", climate: "Climate", music: "Music", map: "Family", calendar: "Calendar", weather: "Weather", cam: "", news: "News", lists: "Lists", orders: "Amazon Orders", chat: "Alexa" };
if (!(p in titles)) return;
this._panel = p; this._po = o; this._peek = Date.now(); this._nightApply();
if (this._isl && this._isl.m !== "glance") this._islHome(); else this._glance(false, true);
const body = this.$("pBody"); body.className = "pb"; body.innerHTML = ""; this.$("pAct").innerHTML = "";
this.$("panel").classList.toggle("wxp", p === "weather"); this.$("panel").classList.toggle("nwp", p === "news");
this.$("pTitle").textContent = titles[p];
({ smart_home: () => this._pSmart(), cameras: () => this._pCams(), climate: () => this._pClimate(), music: () => this._pMusic(), map: () => this._pMap(), calendar: () => this._pCalendar(), weather: () => this._pWeather(), cam: () => this._pCam(o.cam), news: () => this._pNews(o.ch), lists: () => this._pLists(), orders: () => this._pOrders(), chat: () => this._pChat(o) })[p]();
this.$("panel").classList.add("open");
if (p === "news") clearTimeout(this._pIdle); else this._idle(o.auto ? o.auto * 1000 : p === "chat" ? 300000 : 90000);
}
_idle(ms) { clearTimeout(this._pIdle); if (this._panel === "news" || this._talking) return; if (this._panel) this._pIdle = setTimeout(() => this._close(), ms || 90000); }
_close(quiet) {
clearTimeout(this._pIdle); clearInterval(this._pSnap); this._camAud = null; this._chatEl = null; this._newsEl = null;
if (!this._panel) return;
this._talk(false);
this._panel = null; this.$("panel").classList.remove("open");
const body = this.$("pBody"); setTimeout(() => { if (!this._panel) body.innerHTML = ""; }, 420);
(this._lives || new Set()).forEach((el) => { if (!this.$("door").contains(el)) { el.remove(); this._lives.delete(el); } });
this._pEls = []; this._sheet(null);
if (!quiet) { this._peek = Date.now(); this._nightApply(); this._glance(false, true); }
}
_panelHass() {
const now = Date.now(); if (this._phAt && now - this._phAt < 1200) { clearTimeout(this._phT); this._phT = setTimeout(() => this._panelHass(), 1300); return; }
this._phAt = now;
const h = this._hass; (this._pEls || []).forEach((el) => { el.hass = h; });
if (this._panel === "smart_home") this._pSmartSync();
if (this._panel === "music") this._pMusicSync();
}
_panelClick(e) {
this._idle(90000);
const t = e.target.closest("[data-e],[data-sh],[data-a],[data-cam],[data-st],[data-mp],[data-ch],[data-li],[data-talk],[data-snd],[data-day],[data-cm]"); if (!t) return;
if (t.dataset.cm) { const v = t.dataset.cm; if (v === "add") return this._addSheet(this._csel || new Date()); if (v === "today") { this._cm = null; this._csel = null; } else this._cmStep(+v); return this._pCalendar(); }
if (t.dataset.day) { this._csel = new Date(+t.dataset.day); this._pCalendar(); return this._daySheet(this._csel); }
if (t.dataset.ch) { this._pNews(t.dataset.ch); return; }
if (t.dataset.talk) { this._talk(!this._talking); return; }
if (t.dataset.snd) { const a = this._camAud, vd = a && (a.video || a.querySelector("video")); if (!vd) return; vd.muted = !vd.muted; if (!vd.muted) vd.play().catch(() => {}); t.classList.toggle("on", !vd.muted); t.querySelector("ha-icon").setAttribute("icon", vd.muted ? "mdi:volume-off" : "mdi:volume-high"); return; }
if (t.dataset.li) { const [ent, uid, st] = t.dataset.li.split("|"); this._call("todo", "update_item", { entity_id: ent, item: uid, status: st === "completed" ? "needs_action" : "completed" }); t.classList.toggle("done"); return; }
if (t.dataset.e) { e.stopPropagation(); const id = t.dataset.e; this._call(id.split(".")[0], "toggle", { entity_id: id }); const tile = t.closest(".tile"); if (tile) tile.classList.toggle("on"); return; }
if (t.dataset.sh) return this._sheet(t.dataset.sh);
if (t.dataset.a) { const ids = t.dataset.a.split(","); this._call("light", "turn_off", { entity_id: ids }); }
else if (t.dataset.cam) this._open("cam", { cam: t.dataset.cam });
else if (t.dataset.st) this._call("script", "turn_on", { entity_id: this._c.play_script, variables: { query: t.dataset.st, player: this._c.music_player } });
else if (t.dataset.mp) this._call("media_player", t.dataset.mp, { entity_id: this._c.music_player });
}
_lights() {
const h = this._hass, E = h.entities || {}, D = h.devices || {}, A = h.areas || {};
const skip = /browser_mod|led_ring|fu_zhi_bkn/;
const groups = {};
Object.keys(h.states).filter((id) => id.startsWith("light.") && !skip.test(id)).forEach((id) => {
const e = E[id] || {}; if (e.hidden || e.entity_category) return;
const st = h.states[id]; if (st.state === "unavailable") return;
if (st.attributes.entity_id && Array.isArray(st.attributes.entity_id)) return;
const ar = e.area_id || (e.device_id && D[e.device_id] && D[e.device_id].area_id) || "";
(groups[ar] = groups[ar] || []).push(id);
});
return Object.keys(groups).map((k) => ({ id: k, name: (A[k] && A[k].name) || "Other", ids: groups[k].sort() })).sort((a, b) => a.name.localeCompare(b.name));
}
_lc(s) { const c = s.attributes.rgb_color; return c ? `rgb(${c.join(",")})` : "#ffb340"; }
_lstate(s) { return s.state === "on" ? (s.attributes.brightness ? Math.round(s.attributes.brightness / 2.55) + "%" : "On") : "Off"; }
_pSmart() {
const h = this._hass, body = this.$("pBody");
body.innerHTML = this._lights().map((g) => `<div class="area">${esc(g.name)}<button data-a="${g.ids.join(",")}">All off</button></div><div class="tiles">${g.ids.map((id) => { const s = h.states[id]; return `<div class="tile${s.state === "on" ? " on" : ""}" data-sh="${id}" style="--lc:${this._lc(s)}"><button class="ti" data-e="${id}"><ha-icon icon="${s.attributes.icon || "mdi:lightbulb"}"></ha-icon></button><b>${esc(s.attributes.friendly_name || id)}</b><span>${this._lstate(s)}</span></div>`; }).join("")}</div>`).join("") || `<div class="muted">No lights found</div>`;
}
_pSmartSync() {
const h = this._hass;
this.$("pBody").querySelectorAll(".tile[data-sh]").forEach((t) => { const s = h.states[t.dataset.sh]; if (!s) return; t.classList.toggle("on", s.state === "on"); t.style.setProperty("--lc", this._lc(s)); const sp = t.querySelector("span"), txt = this._lstate(s); if (sp.textContent !== txt) sp.textContent = txt; });
}
/* the sheet is a bottom sheet, or (new event) a centred card; switch without animating the jump */
_sheetMode(center) { const el = this.$("sheet"); if (el.classList.contains("evs") === center) return; el.style.transition = "none"; el.classList.toggle("evs", center); void el.offsetWidth; el.style.transition = ""; }
/* ---------- light sheet: brightness, white temperature, colour ---------- */
_sheet(id) {
this._sh = id; const el = this.$("sheet");
if (id) this._sheetMode(false);
if (!id) { el.classList.remove("open"); this._scrim(); return; }
const s = this._hass.states[id]; if (!s) return;
const modes = s.attributes.supported_color_modes || [], dim = modes.some((m) => m !== "onoff"), ct = modes.includes("color_temp"), col = modes.some((m) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(m));
el.innerHTML = `<div class="shh"><button class="ti" id="shp" style="width:8vh;height:8vh"><ha-icon icon="${s.attributes.icon || "mdi:lightbulb"}"></ha-icon></button><div class="sht"><b>${esc(s.attributes.friendly_name || id)}</b><span id="shs"></span></div><button class="x" data-shx="1"><ha-icon icon="mdi:close"></ha-icon></button></div>` +
(dim ? `<div class="bsl" id="bsl"><div class="f" id="bslf"></div><ha-icon icon="mdi:brightness-6"></ha-icon><b id="bslv"></b></div>` : "") +
(ct || col ? `<div class="shr">${ct ? WHITES.map(([k, c]) => `<button class="sw" data-k="${k}" style="background:${c}"></button>`).join("") : ""}${ct && col ? `<span class="sep"></span>` : ""}${col ? HUES.map(([hu]) => `<button class="sw" data-hu="${hu}" style="background:hsl(${hu} 95% 55%)"></button>`).join("") : ""}</div>` : "") +
(col ? `<div class="hue" id="hue"><i id="huek"></i></div>` : "");
el.classList.add("open"); this._scrim();
this._sheetSync(true);
const drag = (bar, onMove, onEnd) => {
if (!bar) return;
bar.addEventListener("pointerdown", (e) => {
bar.setPointerCapture(e.pointerId); this._shDrag = true; clearTimeout(this._pIdle);
const r = bar.getBoundingClientRect(), at = (ev) => Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
let last = 0; onMove(at(e), true);
const mv = (ev) => { const t = Date.now(); onMove(at(ev), t - last > 380); if (t - last > 380) last = t; };
const up = (ev) => { bar.removeEventListener("pointermove", mv); bar.removeEventListener("pointerup", up); bar.removeEventListener("pointercancel", up); onEnd(at(ev)); setTimeout(() => { this._shDrag = false; }, 1500); this._idle(90000); };
bar.addEventListener("pointermove", mv); bar.addEventListener("pointerup", up); bar.addEventListener("pointercancel", up);
});
};
const R = this.shadowRoot;
drag(R.getElementById("bsl"), (f, send) => { const p = Math.max(1, Math.round(f * 100)); R.getElementById("bslf").style.width = p + "%"; R.getElementById("bslv").textContent = p + "%"; if (send) this._call("light", "turn_on", { entity_id: id, brightness_pct: p }); }, (f) => this._call("light", "turn_on", { entity_id: id, brightness_pct: Math.max(1, Math.round(f * 100)) }));
drag(R.getElementById("hue"), (f, send) => { const hu = Math.round(f * 360); R.getElementById("huek").style.left = f * 100 + "%"; R.getElementById("huek").style.background = `hsl(${hu} 95% 55%)`; if (send) this._call("light", "turn_on", { entity_id: id, hs_color: [hu, 100] }); }, (f) => this._call("light", "turn_on", { entity_id: id, hs_color: [Math.round(f * 360), 100] }));
}
_sheetSync(force) {
const id = this._sh, s = id && id !== "cal" && this._hass.states[id], R = this.shadowRoot; if (!s || (this._shDrag && !force)) return;
const on = s.state === "on", a = s.attributes, p = on && a.brightness ? Math.round(a.brightness / 2.55) : 0;
const pw = R.getElementById("shp"); if (pw) { pw.style.background = on ? this._lc(s) : ""; pw.querySelector("ha-icon").style.color = on ? "#fff" : ""; }
const ss = R.getElementById("shs"); if (ss) ss.textContent = on ? `On${a.brightness ? " · " + p + "%" : ""}` : "Off";
const f = R.getElementById("bslf"); if (f) { f.style.width = p + "%"; f.style.background = on && a.rgb_color ? `rgb(${a.rgb_color.join(",")})` : "#fff"; R.getElementById("bslv").textContent = on ? p + "%" : "Off"; }
const k = R.getElementById("huek"); if (k) { const hu = a.hs_color ? a.hs_color[0] : 30; k.style.left = hu / 3.6 + "%"; k.style.background = `hsl(${hu} 95% 55%)`; }
R.querySelectorAll(".sw").forEach((b) => { const sel = on && ((b.dataset.k && a.color_mode === "color_temp" && Math.abs((a.color_temp_kelvin || 0) - +b.dataset.k) < 300) || (b.dataset.hu && a.color_mode !== "color_temp" && a.hs_color && Math.abs(a.hs_color[0] - +b.dataset.hu) < 12 && a.hs_color[1] > 60)); b.classList.toggle("on", !!sel); });
}
_sheetClick(e) {
this._idle(90000);
const id = this._sh, t = e.target; if (!id) return;
if (id === "cal") return this._calSheetClick(e);
if (t.closest("[data-shx]")) return this._sheet(null);
if (t.closest("#shp")) return this._call("light", "toggle", { entity_id: id });
const b = t.closest(".sw"); if (!b) return;
const s = this._hass.states[id], a = s.attributes;
if (b.dataset.k) { const k = Math.max(a.min_color_temp_kelvin || 2000, Math.min(a.max_color_temp_kelvin || 6500, +b.dataset.k)); this._call("light", "turn_on", { entity_id: id, color_temp_kelvin: k }); }
else this._call("light", "turn_on", { entity_id: id, hs_color: [+b.dataset.hu, 100] });
this.shadowRoot.querySelectorAll(".sw").forEach((x) => x.classList.toggle("on", x === b));
}
/* ---------- cameras + two-way talk ---------- */
_pCams() {
const body = this.$("pBody"); body.className = "pb fill";
body.innerHTML = `<div class="cams">${this._c.cameras.map((c) => `<button class="ct" data-cam="${c.id}"><div class="cam" id="pc_${c.id}"></div><div class="lb">${esc(c.name)}</div></button>`).join("")}</div>`;
const load = () => this._c.cameras.forEach((c) => { const s = this._hass.states[c.snapshot] || this._hass.states[c.live]; if (!s) return; const url = `${s.attributes.entity_picture}&t=${Date.now()}`; const img = new Image(); img.onload = () => { const el = this.shadowRoot.getElementById("pc_" + c.id); if (el) el.style.backgroundImage = `url("${url}")`; }; img.src = url; });
load(); this._pSnap = setInterval(load, 10000);
}
async _pCam(id) {
const c = this._c.cameras.find((x) => x.id === id) || this._c.cameras[0];
this._camCfg = c; this.$("pTitle").textContent = c.name;
const body = this.$("pBody"); body.className = "pb fill";
const canTalk = !!c.talk && window.isSecureContext && !!customElements.get("webrtc-camera");
body.innerHTML = `<div class="cam" id="lv" style="border-radius:0"></div>${c.talk ? `<div class="cbar">${canTalk ? `<button class="cb on" id="sndb" data-snd="1"><ha-icon icon="mdi:volume-high"></ha-icon><span>Sound</span></button>` : ""}<button class="cb${canTalk ? "" : " off"}" id="talkb" data-talk="1"><ha-icon icon="mdi:microphone"></ha-icon><span>Talk</span></button></div>` : ""}<div id="talkv" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"></div>`;
const s = this._hass.states[c.snapshot]; if (s) body.firstChild.style.backgroundImage = `url("${s.attributes.entity_picture}&t=${Date.now()}")`;
let el = null;
if (canTalk) { try { el = document.createElement("webrtc-camera"); el.setConfig({ entity: c.live, media: "video,audio", muted: false, ui: false }); /* live picture from the Ring camera entity; the go2rtc Ring source is only used for talk */ el.hass = this._hass; el.style.cssText = "display:block;height:100%;background:#000"; this._camAud = el; } catch (e) { el = null; } }
if (!el) el = await this._live(c.live);
if (this._panel !== "cam") { el.remove(); return; }
const lv = this.shadowRoot.getElementById("lv"); if (lv) lv.appendChild(el);
}
_talk(on) {
const c = this._camCfg, R = this.shadowRoot, b = R && R.getElementById("talkb"), box = R && R.getElementById("talkv");
if (!on) { if (this._talkEl) { this._talkEl.remove(); this._talkEl = null; } this._talking = false; if (b) { b.classList.remove("on"); b.querySelector("span").textContent = "Talk"; } return; }
if (!c || !c.talk || !box) return;
if (!window.isSecureContext || !customElements.get("webrtc-camera")) {
this._answer("Two-way talk needs the secure https address for Home Assistant on this screen, so the microphone can be shared with the camera.", "talk");
return;
}
const el = document.createElement("webrtc-camera");
try { el.setConfig({ url: c.talk, media: this._camAud ? "microphone" : "audio,microphone", background: true, muted: false }); } catch (e) { return; }
el.hass = this._hass; box.appendChild(el); this._talkEl = el; this._talking = true; clearTimeout(this._pIdle);
if (b) { b.classList.add("on"); b.querySelector("span").textContent = "Done"; }
}
_pClimate() {
const body = this.$("pBody"); this._pEls = [];
const w = this._hass.states[this._c.weather]; if (w && w.attributes.temperature != null) this.$("pAct").innerHTML = `<button style="pointer-events:none"><ha-icon icon="mdi:${WX[w.state] || "weather-partly-cloudy"}"></ha-icon>Outside ${Math.round(w.attributes.temperature)}°</button>`;
/* full-screen thermostats with drag dials (os-echo-climate); the small tablet card is the fallback */
if (customElements.get("os-echo-climate")) { body.className = "pb fill"; const el = document.createElement("os-echo-climate"); el.setConfig({ thermostats: this._c.thermostats }); el.style.cssText = "display:block;height:100%;"; body.appendChild(el); el.hass = this._hass; this._pEls.push(el); return; }
body.innerHTML = `<div class="thermo" id="th"></div>`;
const box = this.shadowRoot.getElementById("th");
this._c.thermostats.forEach((t) => { if (!customElements.get("os-thermo")) { box.insertAdjacentHTML("beforeend", `<div class="muted">Thermostat card not loaded</div>`); return; } const el = document.createElement("os-thermo"); el.setConfig({ type: "custom:os-thermo", entity: t.entity, label: t.label }); el.hass = this._hass; box.appendChild(el); this._pEls.push(el); });
}
_pMusic() {
const body = this.$("pBody");
body.innerHTML = `<div class="np"><div class="art" id="art"><ha-icon icon="mdi:music-note"></ha-icon></div><div style="min-width:0;flex:1"><div class="ti2" id="mti">Nothing playing</div><div class="ar" id="mar">Try “Alexa, play Fox News”</div><div class="ctl"><button class="mb" data-mp="media_previous_track"><ha-icon icon="mdi:skip-previous"></ha-icon></button><button class="mb main" data-mp="media_play_pause"><ha-icon id="mpp" icon="mdi:play"></ha-icon></button><button class="mb" data-mp="media_next_track"><ha-icon icon="mdi:skip-next"></ha-icon></button><button class="mb" data-mp="media_stop"><ha-icon icon="mdi:stop"></ha-icon></button></div><div class="chips2">${this._c.stations.map((s) => `<button data-st="${esc(s)}">${esc(s)}</button>`).join("")}</div></div></div>`;
this._pMusicSync();
}
_pMusicSync() {
const s = this._hass.states[this._c.music_player], r = this.shadowRoot; if (!s || !r.getElementById("mti")) return;
const a = s.attributes, playing = s.state === "playing";
r.getElementById("mti").textContent = a.media_title || (playing ? "Playing" : "Nothing playing");
r.getElementById("mar").textContent = a.media_artist || a.media_album_name || (a.media_title ? "" : "Try “Alexa, play Fox News”");
r.getElementById("mpp").setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
const pic = a.entity_picture_local || a.entity_picture, art = r.getElementById("art"); if (pic && art.dataset.u !== pic) { art.dataset.u = pic; art.style.backgroundImage = `url("${pic}")`; art.innerHTML = ""; }
}
_pMap() {
const body = this.$("pBody"); body.className = "pb fill"; this._pEls = [];
const people = this._people().map((p) => ({ person: p.person, tracker: p.tracker, name: p.name.split(" ")[0], initial: p.name[0], color: p.color }));
const el = document.createElement(customElements.get("os-echo-map") ? "os-echo-map" : "div"); if (el.setConfig) el.setConfig({ people }); el.style.cssText = "display:block;height:100%;"; body.appendChild(el); el.hass = this._hass; this._pEls.push(el);
}
/* ---------- weather: full-screen, colours follow the sky ---------- */
_wxBg(c) {
const night = (this._hass.states[this._c.sun] || {}).state === "below_horizon";
const G = { sunny: ["#1c63c4", "#5fb0f2"], "clear-night": ["#0a1430", "#2a3c78"], partlycloudy: night ? ["#131d3d", "#3e5079"] : ["#3471bd", "#8ab6e0"], cloudy: ["#4b596a", "#8a9aac"], fog: ["#5d6976", "#a0aab5"], rainy: ["#24374d", "#4f6a8a"], pouring: ["#1b2838", "#3d5269"], lightning: ["#1f1c33", "#4b4468"], "lightning-rainy": ["#1f1c33", "#4b4468"], snowy: ["#6b87a4", "#bccddd"], "snowy-rainy": ["#52708c", "#9fb4c8"], windy: ["#386a90", "#89b2cf"], "windy-variant": ["#386a90", "#89b2cf"], hail: ["#475667", "#8f9dab"], exceptional: ["#5b2a2a", "#9b4a3a"] };
const g = G[c] || G.cloudy; return `linear-gradient(160deg,${g[0]} 0%,${g[1]} 100%)`;
}
_pWeather() {
const s = this._hass.states[this._c.weather], body = this.$("pBody"); if (!s) return;
this.$("panel").style.setProperty("--wbg", this._wxBg(s.state));
if (body.querySelector("os-echo-weather")) return;
body.className = "pb fill"; this._pEls = [];
if (!customElements.get("os-echo-weather")) { body.innerHTML = `<div class="muted" style="padding:4vh 3vw">Loading weather…</div>`; customElements.whenDefined("os-echo-weather").then(() => { if (this._panel === "weather") { body.innerHTML = ""; this._pWeather(); } }); return; }
/* full-screen weather with hourly, 7-day, live rain radar and details (os-echo-wx) */
const el = document.createElement("os-echo-weather"); el.setConfig({ weather: this._c.weather, sun: this._c.sun }); el.style.cssText = "display:block;height:100%;"; body.appendChild(el); el.hass = this._hass; this._pEls.push(el);
}
/* ---------- calendar: full month grid, tap a day for its events, + to add one ---------- */
_cmStep(n) { const c = this._cm || { y: new Date().getFullYear(), m: new Date().getMonth() }; const d = new Date(c.y, c.m + n, 1); this._cm = { y: d.getFullYear(), m: d.getMonth() }; }
_calColor(id) { return /birthday/.test(id) ? "191,90,242" : /holiday/.test(id) ? "48,209,88" : "10,132,255"; }
async _monthEvents(y, m) {
const h = this._hass, k = y + "-" + m; this._mc = this._mc || {};
const c = this._mc[k]; if (c && Date.now() - c.at < 25000) return c.ev;
let cals = this._c.calendars; if (!cals || !cals.length) cals = Object.keys(h.states).filter((id) => id.startsWith("calendar."));
const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()), end = new Date(start.getTime() + 43 * 864e5), out = [];
const dd = (x) => (x.dateTime ? new Date(x.dateTime) : new Date(x.date + "T00:00:00"));
await Promise.all(cals.map((id) => h.callApi("GET", `calendars/${id}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`).then((l) => (l || []).forEach((v) => v && v.start && out.push({ t: v.summary || "", s: dd(v.start), e: v.end ? dd(v.end) : dd(v.start), all: !v.start.dateTime, cal: id }))).catch(() => {})));
out.sort((a, b) => (b.all - a.all) || (a.s - b.s));
this._mc[k] = { at: Date.now(), ev: out }; return out;
}
_onDay(ev, d) { const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(a.getTime() + 864e5); return ev.filter((x) => x.s < b && (x.e > a || (+x.e === +x.s && x.s >= a))); }
async _pChat(o) {
const body = this.$("pBody"); body.className = "pb fill"; this._pEls = [];
if (!customElements.get("os-echo-chat")) { body.innerHTML = `<div class="muted">Chat isn't loaded yet.</div>`; return; }
const el = document.createElement("os-echo-chat"), st = this._c.music.replace(/^number\.|_music_volume$/g, "");
el.setConfig({ wake: `button.${st}_wake` }); el.host = this; el.hass = this._hass; el.style.cssText = "display:block;height:100%";
body.appendChild(el); this._pEls.push(el); this._chatEl = el; el.open(o.turn);
}
async _pCalendar() {
const now = new Date(), c = this._cm || { y: now.getFullYear(), m: now.getMonth() }, body = this.$("pBody");
this.$("pTitle").innerHTML = `${new Date(c.y, c.m, 1).toLocaleDateString(undefined, { month: "long" })} <span style="font-weight:300;color:rgba(255,255,255,.55)">${c.y}</span>`;
this.$("pAct").innerHTML = `<button data-cm="today">Today</button><button data-cm="-1"><ha-icon icon="mdi:chevron-left"></ha-icon></button><button data-cm="1"><ha-icon icon="mdi:chevron-right"></ha-icon></button><button class="add" data-cm="add"><ha-icon icon="mdi:plus"></ha-icon>Event</button>`;
body.className = "pb fill";
const ev = await this._monthEvents(c.y, c.m); if (this._panel !== "calendar") return;
this._mev = ev;
const first = new Date(c.y, c.m, 1), start = new Date(c.y, c.m, 1 - first.getDay()), sel = this._csel && this._csel.toDateString();
let html = ["S", "M", "T", "W", "T", "F", "S"].map((w) => `<div class="mw">${w}</div>`).join("");
for (let i = 0; i < 42; i++) {
const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), list = this._onDay(ev, d), n = list.length;
html += `<button class="md${d.getMonth() !== c.m ? " o" : ""}${d.toDateString() === now.toDateString() ? " t" : ""}${d.toDateString() === sel ? " s" : ""}" data-day="${+d}"><span class="n">${d.getDate()}</span>${list.slice(0, n > 2 ? 1 : 2).map((x) => `<em style="background:rgba(${this._calColor(x.cal)},.38)">${esc(x.t)}</em>`).join("")}${n > 2 ? `<em class="m">+${n - 1} more</em>` : ""}</button>`;
}
body.innerHTML = `<div class="mg">${html}</div>`;
}
_daySheet(d) {
const ev = this._onDay(this._mev || [], d), el = this.$("sheet");
this._sh = "cal"; this._shMode = "day"; this._sheetMode(false);
el.innerHTML = `<div class="shh"><div class="sht"><b>${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</b><span>${ev.length ? ev.length + " event" + (ev.length === 1 ? "" : "s") : "No events"}</span></div><button class="x" data-shx="1"><ha-icon icon="mdi:close"></ha-icon></button></div><div style="max-height:44vh;overflow:auto;touch-action:pan-y;margin-top:1.6vh">${ev.map((x) => `<div class="evr"><i style="background:rgb(${this._calColor(x.cal)})"></i><span>${x.all ? "All day" : fmtTime(x.s)}</span>${esc(x.t)}</div>`).join("")}</div><button class="big stop" data-cadd="1" style="width:100%;margin-top:2.4vh;height:9vh">Add an event</button>`;
el.classList.add("open"); this._scrim();
}
_addSheet(d) {
const n = new Date(), base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
this._ad = { d: base, all: false, s: base.toDateString() === n.toDateString() ? Math.min(23 * 60, (n.getHours() + 1) * 60) : 9 * 60, len: 60 };
this._sh = "cal"; this._shMode = "add";
const el = this.$("sheet");
el.innerHTML = `<div class="shh"><div class="sht"><b>New event</b><span>Family calendar</span></div><button class="x" data-shx="1"><ha-icon icon="mdi:close"></ha-icon></button></div><input class="ain" id="aT" placeholder="Event name" maxlength="80" autocomplete="off"><div class="ac" id="aRows"></div><button class="big stop" data-asave="1">Add to calendar</button>`;
this._sheetMode(true);
this._addRows(); el.classList.add("open"); this._scrim();
}
_addRows() {
const a = this._ad, R = this.shadowRoot.getElementById("aRows"); if (!R) return;
const tm = (m) => { const d = new Date(a.d); d.setMinutes(m); return fmtTime(d); };
/* every control sits in the same centred column, so the rows line up */
const row = (l, c, seg) => `<div class="arow"><span>${l}</span><div class="cc${seg ? " seg" : ""}">${c}</div></div>`;
R.innerHTML = row("Day", `<button data-ad="-1"><ha-icon icon="mdi:chevron-left"></ha-icon></button><b>${a.d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</b><button data-ad="1"><ha-icon icon="mdi:chevron-right"></ha-icon></button>`) +
row("All day", [["No", 0], ["Yes", 1]].map(([t, v]) => `<button class="${+a.all === v ? "on" : ""}" data-aall="${v}">${t}</button>`).join(""), 1) +
(a.all ? "" : row("Starts", `<button data-at="-30"><ha-icon icon="mdi:minus"></ha-icon></button><b>${tm(a.s)}</b><button data-at="30"><ha-icon icon="mdi:plus"></ha-icon></button>`) + row("Length", [30, 60, 120, 180].map((l) => `<button class="${a.len === l ? "on" : ""}" data-al="${l}">${l < 60 ? l + " min" : l / 60 + " hr"}</button>`).join(""), 1));
}
async _calSheetClick(e) {
const t = e.target;
if (t.closest("[data-shx]")) return this._sheet(null);
if (t.closest("[data-cadd]")) return this._addSheet(this._csel || new Date());
const a = this._ad; if (!a) return;
const b = t.closest("[data-ad],[data-aall],[data-at],[data-al],[data-asave]"); if (!b) return;
if (b.dataset.ad) a.d = new Date(a.d.getFullYear(), a.d.getMonth(), a.d.getDate() + +b.dataset.ad);
else if (b.dataset.aall) a.all = b.dataset.aall === "1";
else if (b.dataset.at) a.s = Math.max(0, Math.min(23 * 60 + 30, a.s + +b.dataset.at));
else if (b.dataset.al) a.len = +b.dataset.al;
else if (b.dataset.asave) {
const ti = (this.shadowRoot.getElementById("aT").value || "").trim(); if (!ti) { this.shadowRoot.getElementById("aT").focus(); return; }
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hm = (d) => `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const s = new Date(a.d.getTime() + a.s * 60000), en = new Date(s.getTime() + a.len * 60000);
const data = a.all ? { summary: ti, start_date: ymd(a.d), end_date: ymd(new Date(a.d.getFullYear(), a.d.getMonth(), a.d.getDate() + 1)) } : { summary: ti, start_date_time: hm(s), end_date_time: hm(en) };
b.textContent = "Adding…";
try { await this._hass.callService("calendar", "create_event", data, { entity_id: this._c.cal_add }); this._sheet(null); this._mc = {}; this._csel = a.d; this._loadCal(); if (this._panel === "calendar") this._pCalendar(); this._answer(`Added “${ti}” to your calendar.`, ""); }
catch (err) { b.textContent = "Couldn't add it. Try again"; }
return;
}
this._addRows();
}
/* live news: full-screen player in its own module (os-echo-news) */
_pNews(id) {
const body = this.$("pBody"), C = this._c; body.className = "pb fill"; this._pEls = [];
if (!customElements.get("os-echo-news")) { body.innerHTML = `<div class="muted">News isn't loaded yet.</div>`; return; }
let el = this._newsEl;
if (!el || !body.contains(el)) { el = document.createElement("os-echo-news"); el.setConfig({ channels: C.news, key: C.yt_key, muted: C.mute_media }); el.host = this; el.style.cssText = "display:block;height:100%"; body.innerHTML = ""; body.appendChild(el); this._newsEl = el; }
el.play(id);
}
async _pLists() {
const body = this.$("pBody"), h = this._hass; let html = "";
for (const ent of this._c.lists) {
const st = h.states[ent]; if (!st) continue;
let items = []; try { const r = await h.callWS({ type: "todo/item/list", entity_id: ent }); items = (r && r.items) || []; } catch (e) {}
const open = items.filter((i) => i.status !== "completed"), done = items.filter((i) => i.status === "completed").slice(0, 6);
html += `<div class="area">${esc(st.attributes.friendly_name || ent)}<span style="letter-spacing:0;text-transform:none;font-weight:500">${open.length} item${open.length === 1 ? "" : "s"}</span></div>` +
(open.length || done.length ? [...open, ...done].map((i) => `<button class="li${i.status === "completed" ? " done" : ""}" data-li="${ent}|${esc(i.uid)}|${i.status}"><i></i><span>${esc(i.summary)}</span></button>`).join("") : `<div class="muted">Empty. Try “Alexa, add milk to my shopping list”.</div>`);
}
if (this._panel === "lists") body.innerHTML = html || `<div class="muted">No lists found</div>`;
}
_pOrders() {
const body = this.$("pBody"); this._pEls = [];
if (customElements.get("os-amazon")) { const el = document.createElement("os-amazon"); el.setConfig({ type: "custom:os-amazon", entity: this._c.orders, compact: true }); el.hass = this._hass; body.appendChild(el); this._pEls.push(el); }
else body.innerHTML = `<div class="muted">Orders card not loaded</div>`;
}
/* ---------- gestures ---------- */
_gestures() {
let sx = 0, sy = 0, t0 = 0, on = false;
this.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; t0 = Date.now(); on = true; this._idle(90000); this._islBump(); if (this._ac && this._ac.state === "suspended") this._ac.resume(); }, { passive: true });
this.addEventListener("pointerup", (e) => {
if (!on) return; on = false;
const dx = e.clientX - sx, dy = e.clientY - sy, W = window.innerWidth, H = window.innerHeight;
if (Date.now() - t0 > 900 || this._shDrag) return;
if (this._isl && this._isl.m !== "glance" && dy < -H * 0.1 && Math.abs(dy) > Math.abs(dx)) { this._islHome(); return; }
if (!this._dOpen && sy < H * 0.16 && dy > H * 0.08 && Math.abs(dy) > Math.abs(dx)) { this._drawer(true); return; }
if (this._dOpen && dy < -H * 0.06) { this._drawer(false); return; }
if (this._sh && dy > H * 0.1 && Math.abs(dy) > Math.abs(dx)) { this._sheet(null); return; }
if (!this._rOpen && sx > W * 0.9 && dx < -W * 0.06 && Math.abs(dx) > Math.abs(dy)) { this._rail(true); return; }
if (this._rOpen && dx > W * 0.06) { this._rail(false); return; }
if (this._panel && sx < W * 0.12 && dx > W * 0.12 && Math.abs(dx) > Math.abs(dy)) { this._close(); return; }
if (this._panel === "calendar" && !this._sh && Math.abs(dx) > W * 0.14 && Math.abs(dx) > Math.abs(dy) * 1.5) { this._cmStep(dx < 0 ? 1 : -1); this._pCalendar(); }
}, { passive: true });
}
/* ---------- test states for screenshots (config demo: answer | ok | rich | recipe | vision | vision2 | timers | ring | volume | listen | closing | night | sheet:<light>) ---------- */
_demo(d) {
const now = Date.now() / 1000;
if (d === "answer") this._answer("Tonight will be clear and cool, around 48 degrees. Tomorrow looks sunny with a high of 67, so it's a great day to be outside.", "what's the weather tonight");
else if (d === "ok") this._answer("Okay, turned off the kitchen lights.", "turn off the kitchen lights");
else if (d === "rich") { this._turn = Date.now(); this._rich({ title: "Scary movies for tonight", said: "Here's Obsession from 2026, plus some classics like The Thing and The Exorcist.", items: [{ t: "The Thing", s: "Movie · 1982 · R", d: "IMDb 8.2 · 1h 49m" }, { t: "The Exorcist", s: "Movie · 1973 · R", d: "IMDb 8.1 · 2h 12m" }, { t: "The Shining", s: "Movie · 1980 · R", d: "IMDb 8.4 · 2h 24m" }, { t: "Train to Busan", s: "Movie · 2016 · R", d: "IMDb 7.6 · 1h 58m" }, { t: "Hereditary", s: "Movie · 2018 · R", d: "IMDb 7.3 · 2h 7m" }, { t: "Get Out", s: "Movie · 2017 · R", d: "IMDb 7.8 · 1h 44m" }] }); }
else if (d === "recipe") { this._turn = Date.now(); this._rich({ title: "Crock-Pot Chicken Tacos", said: "Here's an easy slow-cooker recipe.", image_query: "taco", body: "Ingredients\n- 2 lb chicken breasts\n- 1 jar salsa\n- 1 packet taco seasoning\n\nSteps\n1. Put the chicken in the slow cooker.\n2. Add salsa and seasoning.\n3. Cook on low 6 hours, then shred." }); }
else if (d === "vision") { this._lastQ = "what am I holding"; this._vision("looking"); }
else if (d === "vision2") { this._lastQ = "what am I holding"; this._hass.states[this._c.va].attributes.echo_card = { title: "What am I holding", body: "It looks like a charging case for wireless earbuds. Hold it a little closer if you'd like me to read the brand.", image: (this._hass.states[this._c.doorbell.snapshot] || { attributes: {} }).attributes.entity_picture }; this._vision("vision"); }
else if (d === "timers") { this._list = [{ id: "a", timer_class: "timer", name: "pasta", expires: new Date(Date.now() + 512e3).toISOString(), created_at: new Date(Date.now() - 88e3).toISOString() }, { id: "b", timer_class: "alarm", expires: new Date(Date.now() + 9 * 36e5).toISOString() }]; this._islTimers(60000); }
else if (d === "glance") { this._list = [{ id: "a", timer_class: "timer", name: "pasta", expires: new Date(Date.now() + 512e3).toISOString(), created_at: new Date(Date.now() - 88e3).toISOString() }]; this._glance(false, true); }
else if (d === "ring") { this._ringing = true; this._ex = [{ timer_class: "alarm", expires: new Date().toISOString(), name: "" }]; this._islRing(); }
else if (d === "volume") this._hud(4);
else if (d === "listen") { this.setAttribute("ax", "listening"); }
else if (d === "closing") { this.setAttribute("ax", "closing"); }
else if (d === "night") this._force(true);
else if (d.startsWith("sheet:")) { this._open("smart_home"); setTimeout(() => this._sheet(d.slice(6)), 600); }
}
}
customElements.define("os-echo", OsEcho);
window.customCards = window.customCards || [];
window.customCards.push({ type: "os-echo", name: "OS Echo Show screen", description: "Echo Show style home screen with widgets, island answers, timers and Alexa UI" });
})();
