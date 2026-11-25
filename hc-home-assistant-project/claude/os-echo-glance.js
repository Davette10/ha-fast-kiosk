/* os-echo-glance: tap the resting island ("dynamic widget") on the Echo Show and it expands in place into a detail card
   for whatever it was showing, like an iPhone Live Activity: weather (now, today, 5 days, sun times), Amazon packages
   (each order with its picture and arrival), the next calendar events, or the song playing (with controls).
   Each card has a button at the bottom that opens the full screen, a close button, and closes itself after 25 s.
   Timers and alarms keep their own expanded view.
   Doorbell: when the front door camera sees motion or the doorbell rings, the island turns into a small live view of the
   door (like a Live Activity; a chime on a ring). Tap it for the full camera with sound and Talk. It shrinks back
   30 s after the motion/ring ends. Motion never covers an open screen or an answer; a ring always shows.
   Kept as its own resource because os-echo is at the size limit. */
(() => {
if (window.__osEchoGlance) return; window.__osEchoGlance = 1;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const WX = { "clear-night": "weather-night", cloudy: "weather-cloudy", exceptional: "alert-circle-outline", fog: "weather-fog", hail: "weather-hail", lightning: "weather-lightning", "lightning-rainy": "weather-lightning-rainy", partlycloudy: "weather-partly-cloudy", pouring: "weather-pouring", rainy: "weather-rainy", snowy: "weather-snowy", "snowy-rainy": "weather-snowy-rainy", sunny: "weather-sunny", windy: "weather-windy", "windy-variant": "weather-windy-variant" };
const WXT = { "clear-night": "Clear", cloudy: "Cloudy", exceptional: "Alert", fog: "Foggy", hail: "Hail", lightning: "Storms", "lightning-rainy": "Thunderstorms", partlycloudy: "Partly cloudy", pouring: "Heavy rain", rainy: "Rain", snowy: "Snow", "snowy-rainy": "Sleet", sunny: "Sunny", windy: "Windy", "windy-variant": "Windy" };
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const day0 = (d) => { const a = new Date(d); a.setHours(0, 0, 0, 0); return a; };
const dayN = (d) => Math.round((day0(d) - day0(new Date())) / 864e5);
const dayWord = (d) => { const n = dayN(d); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long" }); };
const IMG_OK = /^https:\/\/(m\.media-amazon\.com|images-na\.ssl-images-amazon\.com|images-amazon\.com)\//;

const CSS = `
.gx{display:flex;flex-direction:column;padding:2.6vh 2.4vw 2.4vh;gap:1.8vh;}
.gxh{display:flex;align-items:center;gap:1.2vw;}
.gxh ha-icon{--mdc-icon-size:3.6vh;color:var(--a,#38bdf8);}
.gxh h2{margin:0;flex:1;font-size:3.4vh;font-weight:600;letter-spacing:-.01em;}
.gxh .x ha-icon,.gxdh .x ha-icon{--mdc-icon-size:3.2vh;color:#fff;}
.gxn{display:flex;align-items:center;gap:2vw;}
.gxn ha-icon{--mdc-icon-size:12vh;color:var(--a,#38bdf8);}
.gxn b{font-size:11vh;font-weight:300;letter-spacing:-.03em;line-height:1;}
.gxn .c{display:flex;flex-direction:column;gap:.6vh;font-size:2.8vh;}
.gxn .c span{color:rgba(255,255,255,.62);font-size:2.4vh;}
.gxd{display:grid;grid-template-columns:repeat(5,1fr);gap:.8vw;}
.gxd div{display:flex;flex-direction:column;align-items:center;gap:.8vh;padding:1.4vh 0;border-radius:2.2vh;background:rgba(255,255,255,.07);font-size:2.3vh;}
.gxd div:first-child{background:rgba(255,255,255,.13);}
.gxd small{color:rgba(255,255,255,.6);font-size:2vh;}
.gxd ha-icon{--mdc-icon-size:4.4vh;color:#fff;}
.gxd em{font-style:normal;font-size:1.9vh;color:#64d2ff;min-height:2.2vh;}
.gxs{display:flex;gap:1vw;}
.gxs div{flex:1;display:flex;align-items:center;gap:1vw;padding:1.3vh 1.2vw;border-radius:2vh;background:rgba(255,255,255,.07);font-size:2.4vh;}
.gxs ha-icon{--mdc-icon-size:3.4vh;color:#ffd60a;}
.gxs small{display:block;color:rgba(255,255,255,.6);font-size:1.9vh;}
.gxl{display:flex;flex-direction:column;gap:1vh;}
.gxr{display:flex;align-items:center;gap:1.4vw;padding:1.3vh 1.3vw;border-radius:2.2vh;background:rgba(255,255,255,.07);}
.gxr .p{width:8vh;height:8vh;flex:none;border-radius:1.6vh;background:#fff center/contain no-repeat;display:flex;align-items:center;justify-content:center;}
.gxr .p ha-icon{--mdc-icon-size:4.4vh;color:#8e8e93;}
.gxr .tm{flex:none;width:12vh;text-align:center;font-size:2.4vh;font-weight:600;color:var(--a,#0a84ff);}
.gxr .tm small{display:block;font-weight:400;font-size:1.9vh;color:rgba(255,255,255,.55);}
.gxr .t{flex:1;min-width:0;}
.gxr .t b{display:block;font-size:2.8vh;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gxr .t span{display:block;font-size:2.2vh;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gxr .t span.hot{color:#ff9f0a;}
.gxm{display:flex;align-items:center;gap:2vw;}
.gxm .art{width:22vh;height:22vh;flex:none;border-radius:2.4vh;background:#1c1c1e center/cover no-repeat;box-shadow:0 1.2vh 3vh rgba(0,0,0,.5);}
.gxm .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:.8vh;}
.gxm .t b{font-size:3.6vh;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gxm .t span{font-size:2.6vh;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gxbar{height:.7vh;border-radius:.35vh;background:rgba(255,255,255,.16);overflow:hidden;margin-top:1.2vh;}
.gxbar i{display:block;height:100%;background:#fff;border-radius:.35vh;}
.gxc{display:flex;justify-content:center;gap:4vw;}
.gxc button{width:10vh;height:10vh;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);}
.gxc button.pp{background:#fff;}
.gxc button.pp ha-icon{color:#000;}
.gxc ha-icon{--mdc-icon-size:5.4vh;color:#fff;}
.gxc button:active,.gxo:active{transform:scale(.95);}
.gxo{align-self:stretch;height:7vh;border-radius:3.5vh;background:rgba(255,255,255,.14);font-size:2.6vh;font-weight:600;display:flex;align-items:center;justify-content:center;gap:1vw;}
.gxo ha-icon{--mdc-icon-size:3vh;}
.gxe{color:rgba(255,255,255,.6);font-size:2.6vh;padding:1vh 0;}
.gxdh{display:flex;align-items:center;gap:1vw;padding:1.4vh 1.6vw 1.2vh;}
.gxdh i{width:1.4vh;height:1.4vh;border-radius:50%;background:#ff453a;box-shadow:0 0 1.2vh #ff453a;animation:gxp 1.4s ease-in-out infinite;}
@keyframes gxp{50%{opacity:.35}}
.gxdh b{font-size:2.6vh;font-weight:600;}
.gxdh span{flex:1;font-size:2.2vh;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gxdh .x{width:5.2vh;height:5.2vh;}
.gxdv{position:relative;margin:0 1vw 1vw;border-radius:2.6vh;overflow:hidden;background:#111 center/cover no-repeat;}
.gxdv>*{position:absolute;inset:0;}
.isl[data-m=door].ding{box-shadow:0 0 0 .45vh #ff9f0a,0 2vh 6vh rgba(0,0,0,.6);}
`;

const head = (icon, title, a) => `<div class="gxh" style="--a:${a}"><ha-icon icon="${icon}"></ha-icon><h2>${esc(title)}</h2><button class="x" data-close="1"><ha-icon icon="mdi:close"></ha-icon></button></div>`;
const openBtn = (p, label) => `<button class="gxo" data-gxo="${p}">${esc(label)}<ha-icon icon="mdi:chevron-right"></ha-icon></button>`;

/* ---------- the cards ---------- */
function wxCard(e) {
  const h = e._hass, C = e._c, w = h.states[C.weather], f = e._fcast || [], sun = h.states[C.sun];
  const a = (w && w.attributes) || {}, t = a.temperature != null ? Math.round(a.temperature) : "–", st = w ? w.state : "";
  const t0 = f[0] || {};
  const now = `<div class="gxn" style="--a:#64d2ff"><ha-icon icon="mdi:${WX[st] || "weather-partly-cloudy"}"></ha-icon><b>${t}°</b><div class="c">${esc(WXT[st] || st)}${t0.temperature != null ? `<span>High ${Math.round(t0.temperature)}° · Low ${t0.templow != null ? Math.round(t0.templow) + "°" : "–"}</span>` : ""}${a.humidity != null ? `<span>Humidity ${Math.round(a.humidity)}%${a.wind_speed != null ? ` · Wind ${Math.round(a.wind_speed)} ${esc(a.wind_speed_unit || "mph")}` : ""}</span>` : ""}</div></div>`;
  const days = f.slice(0, 5).map((d, i) => { const dt = new Date(d.datetime); const pp = d.precipitation_probability; return `<div><small>${i === 0 ? "Today" : dt.toLocaleDateString(undefined, { weekday: "short" })}</small><ha-icon icon="mdi:${WX[d.condition] || "weather-partly-cloudy"}"></ha-icon><span>${Math.round(d.temperature)}°${d.templow != null ? ` <small>${Math.round(d.templow)}°</small>` : ""}</span><em>${pp ? pp + "%" : ""}</em></div>`; }).join("");
  let sunRow = "";
  if (sun) { const r = new Date(sun.attributes.next_rising), s = new Date(sun.attributes.next_setting); sunRow = `<div class="gxs"><div><ha-icon icon="mdi:weather-sunset-up"></ha-icon><span><small>Sunrise</small>${fmtTime(r)}</span></div><div><ha-icon icon="mdi:weather-sunset-down"></ha-icon><span><small>Sunset</small>${fmtTime(s)}</span></div></div>`; }
  return `<div class="gx">${head("mdi:weather-partly-cloudy", "Weather", "#64d2ff")}${now}${days ? `<div class="gxd">${days}</div>` : ""}${sunRow}${openBtn("weather", "Full forecast and radar")}</div>`;
}
function evCard(e) {
  const evs = (e._events || []).filter((x) => x.all ? dayN(x.d) >= 0 : x.d - Date.now() > -30 * 60000).slice(0, 5);
  const rows = evs.map((x) => { const n = dayN(x.d); return `<div class="gxr" style="--a:#0a84ff"><div class="tm">${x.all ? "All day" : fmtTime(x.d)}<small>${n === 0 ? "Today" : n === 1 ? "Tomorrow" : x.d.toLocaleDateString(undefined, { weekday: "short" })}</small></div><div class="t"><b>${esc(x.t)}</b>${!x.all && n === 0 ? `<span>${(() => { const m = Math.round((x.d - Date.now()) / 60000); return m <= 0 ? "Happening now" : m < 60 ? `In ${m} min` : `In ${Math.floor(m / 60)} hr ${m % 60 ? (m % 60) + " min" : ""}`; })()}</span>` : ""}</div></div>`; }).join("");
  return `<div class="gx">${head("mdi:calendar-clock", "Up Next", "#0a84ff")}<div class="gxl">${rows || `<div class="gxe">Nothing coming up.</div>`}</div>${openBtn("calendar", "Open calendar")}</div>`;
}
function musicCard(e) {
  const h = e._hass, mp = h.states[e._c.music_player]; const a = (mp && mp.attributes) || {};
  const pic = window.OSEchoArt ? window.OSEchoArt(a.entity_picture, 256) : a.entity_picture ? (/^https?:/.test(a.entity_picture) ? a.entity_picture : h.hassUrl(a.entity_picture)) : "";
  let pct = 0; if (a.media_duration) { let pos = a.media_position || 0; if (mp.state === "playing" && a.media_position_updated_at) pos += (Date.now() - new Date(a.media_position_updated_at)) / 1000; pct = Math.max(0, Math.min(100, (pos / a.media_duration) * 100)); }
  const playing = mp && mp.state === "playing";
  return `<div class="gx">${head("mdi:music-note", "Now Playing", "#ff375f")}<div class="gxm"><div class="art" style="${pic ? `background-image:url('${esc(pic)}')` : ""}"></div><div class="t"><b>${esc(a.media_title || "Nothing playing")}</b><span>${esc(a.media_artist || "")}</span><span>${esc(a.media_album_name || "")}</span><div class="gxbar"><i id="gxpb" style="width:${pct.toFixed(1)}%"></i></div></div></div>
<div class="gxc"><button data-mc="media_previous_track" aria-label="Previous"><ha-icon icon="mdi:skip-previous"></ha-icon></button><button class="pp" data-mc="media_play_pause" aria-label="${playing ? "Pause" : "Play"}"><ha-icon icon="mdi:${playing ? "pause" : "play"}"></ha-icon></button><button data-mc="media_next_track" aria-label="Next"><ha-icon icon="mdi:skip-next"></ha-icon></button></div>${openBtn("music", "Open music")}</div>`;
}
const ordLine = (o) => {
  if (o.s === "out") return ["Out for delivery · arriving today" + (o.eta_txt ? " " + o.eta_txt : ""), true];
  if (o.s === "delayed") return ["Running late" + (o.eta ? " · now " + dayWord(o.eta).toLowerCase() : ""), true];
  if (!o.eta) return [o.s === "shipped" ? "Shipped" : "Ordered", false];
  const n = dayN(o.eta), w = dayWord(o.eta);
  return [`Arriving ${n <= 1 ? w.toLowerCase() : w}${o.eta_txt ? " " + o.eta_txt : ""}`, n <= 0];
};
async function ordCard(e) {
  let L = [];
  try { const r = await e._hass.callWS({ type: "todo/item/list", entity_id: e._c.orders }); L = ((r && r.items) || []).filter((i) => i.status !== "completed"); } catch (x) {}
  const os = L.map((it) => { let j = {}; try { j = JSON.parse(it.description || "{}") || {}; } catch (x) {} const items = Array.isArray(j.items) ? j.items : []; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(j.eta || it.due || "");
    return { n: items[0] ? String(items[0].sn || items[0].n || "") : "Amazon order", img: items[0] && IMG_OK.test(String(items[0].img || "")) ? String(items[0].img) : "", cnt: Math.max(parseInt(j.cnt, 10) || 0, items.length), s: String(j.s || "").toLowerCase(), eta: m ? new Date(+m[1], +m[2] - 1, +m[3]) : null, eta_txt: String(j.eta_txt || "").trim() }; })
    .filter((o) => !["delivered", "cancelled", "return"].includes(o.s))
    .sort((a, b) => (a.s === "out" ? -1 : 0) - (b.s === "out" ? -1 : 0) || (a.eta || 9e15) - (b.eta || 9e15));
  const rows = os.slice(0, 4).map((o) => { const [ln, hot] = ordLine(o); return `<div class="gxr"><div class="p" style="${o.img ? `background-image:url('${esc(o.img)}')` : ""}">${o.img ? "" : `<ha-icon icon="mdi:package-variant-closed"></ha-icon>`}</div><div class="t"><b>${esc(o.n)}</b><span class="${hot ? "hot" : ""}">${esc(ln)}</span>${o.cnt > 1 ? `<span>and ${o.cnt - 1} more item${o.cnt > 2 ? "s" : ""}</span>` : ""}</div></div>`; }).join("");
  const more = os.length > 4 ? `<div class="gxe">and ${os.length - 4} more order${os.length - 4 === 1 ? "" : "s"}</div>` : "";
  return `<div class="gx">${head("mdi:package-variant-closed", os.length ? `${os.length} package${os.length === 1 ? "" : "s"} on the way` : "Packages", "#ff9f0a")}<div class="gxl">${rows || `<div class="gxe">Nothing on the way right now.</div>`}${more}</div>${openBtn("orders", "All orders")}</div>`;
}


/* ---------- doorbell: live view in the island ---------- */
function css(e) { const R = e.shadowRoot; if (R && !R.getElementById("gxcss")) { const s = document.createElement("style"); s.id = "gxcss"; s.textContent = CSS; R.appendChild(s); } }
function doorIsl(e, kind) {
  const d = e._c.doorbell, R = e.shadowRoot, I = R && R.getElementById("isl"); if (!I) return;
  const label = kind === "ding" ? "Someone's at the door" : "Motion at the front door";
  if (e._isl && e._isl.m === "door") { const sp = R.getElementById("gxdl"); if (sp) sp.textContent = label; I.classList.toggle("ding", kind === "ding"); return; }
  css(e);
  const snap = e._hass.states[d.snapshot], bg = snap ? `background-image:url('${esc(snap.attributes.entity_picture)}')` : "";
  const W = innerWidth, H = innerHeight, w = Math.round(W * 0.36), vh = Math.round(w - W * 0.02), hh = Math.round(vh + H * 0.1);
  e._islSet("door", `<div class="gxdh"><i></i><b>${esc(d.name || "Front Door")}</b><span id="gxdl">${esc(label)}</span><button class="x" data-close="1"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="gxdv" id="gxdv" style="height:${vh}px;${bg}"></div>`,
    { w: 0.36, h: hh / H, after: async () => {
      const box = R.getElementById("gxdv"); if (!box) return;
      const el = await e._live(d.live, d.rtsp); const b2 = R.getElementById("gxdv");
      if (!e._isl || e._isl.m !== "door" || !b2) { el.remove(); return; }
      b2.appendChild(el);
    } });
  I.classList.toggle("ding", kind === "ding");
  const dim = R.getElementById("idim"); if (dim) dim.classList.remove("on");
}
function doorPatch(C) {
  C.prototype._door = function () {
    const h = this._hass, d = this._c.doorbell, m = h.states[d.motion], dg = h.states[d.ding];
    const ding = !!(dg && dg.state === "on"), motion = !!(m && m.state === "on");
    const newDing = ding && !this._dingOn; this._dingOn = ding;
    if (newDing) { this._chime(); this._peek = Date.now(); this._nightApply(); }
    clearTimeout(this._doorOff);
    const im = this._isl ? this._isl.m : "glance", inDoor = im === "door";
    /* a ring always shows (not over a ringing alarm or a camera question); motion only when the screen is resting */
    const may = ding ? !["ring", "vision", "looking", "snap"].includes(im) && this._panel !== "cam" : (im === "glance" || inDoor) && !this._panel;
    if ((ding || motion) && may) { doorIsl(this, ding ? "ding" : "motion"); return; }
    if (!ding && !motion && inDoor) this._doorOff = setTimeout(() => { if (this._isl && this._isl.m === "door") this._islHome(); }, 30000);
  };
}

/* ---------- open / refresh / taps ---------- */
async function expand(e, k) {
  const R = e.shadowRoot; if (!R) return false;
  css(e);
  const kind = k === "sun" ? "wx" : k;
  let html;
  if (kind === "wx") html = wxCard(e); else if (kind === "event") html = evCard(e); else if (kind === "music") html = musicCard(e); else if (kind === "orders") html = await ordCard(e); else return false;
  e._gxK = kind;
  e._islSet("gx", html, { w: kind === "music" ? 0.6 : 0.62, maxH: 0.9, ttl: 25000, dim: true });
  clearInterval(e._gxT);
  if (kind === "music") e._gxT = setInterval(() => { if (!e._isl || e._isl.m !== "gx" || e._gxK !== "music") return clearInterval(e._gxT); const mp = e._hass.states[e._c.music_player], a = (mp && mp.attributes) || {}, b = R.getElementById("gxpb"); if (b && a.media_duration) { let pos = a.media_position || 0; if (mp.state === "playing" && a.media_position_updated_at) pos += (Date.now() - new Date(a.media_position_updated_at)) / 1000; b.style.width = Math.max(0, Math.min(100, (pos / a.media_duration) * 100)).toFixed(1) + "%"; } }, 1000);
  return true;
}
function patch() {
  const C = customElements.get("os-echo"); if (!C || C.prototype.__gxPatched) return !!C;
  const orig = C.prototype._islClick;
  C.prototype._islClick = function (ev) {
    const t = ev.target;
    if (this._isl && this._isl.m === "door") {
      if (t.closest("[data-close]")) { clearTimeout(this._doorOff); return this._islHome(); }
      this._islHome(); this._open("cam", { cam: "front_door", auto: 90 }); return;
    }
    if (this._isl && this._isl.m === "gx") {
      const o = t.closest("[data-gxo]"); if (o) { const p = o.dataset.gxo; this._islHome(); this._open(p); return; }
      const mc = t.closest("[data-mc]");
      if (mc) { this._islBump(); this._call("media_player", mc.dataset.mc, { entity_id: this._c.music_player }); if (mc.dataset.mc === "media_play_pause") { const i = mc.querySelector("ha-icon"); const on = i.getAttribute("icon") === "mdi:pause"; i.setAttribute("icon", on ? "mdi:play" : "mdi:pause"); } else setTimeout(() => { if (this._isl && this._isl.m === "gx" && this._gxK === "music") expand(this, "music"); }, 1500); return; }
      return orig.call(this, ev);
    }
    if ((!this._isl || this._isl.m === "glance") && ["wx", "sun", "event", "music", "orders"].includes(this._glKind) && !t.closest("[data-del],[data-stp],[data-snz]")) {
      expand(this, this._glKind).then((ok) => { if (!ok) orig.call(this, ev); });
      return;
    }
    return orig.call(this, ev);
  };
  doorPatch(C);
  /* Volume blip at the speaker's real volume, like a stock Echo: it plays at the level the Echo is being set to,
     not at the music's own volume. The blip goes out on the Android media stream, so it already follows the
     current speaker volume; when a key press or the slider asks for a new level before the Echo has applied it,
     the blip is shifted by the difference between the two levels on the Echo's own speaker volume curve
     (dumpsys media.audio_policy, STREAM_MUSIC, speaker: 1% -58 dB, 20% -40 dB, 60% -17 dB, 100% 0 dB). */
  const VC = [[1, -58], [20, -40], [60, -17], [100, 0]];
  const vdb = (i) => { const p = (i / 15) * 100; for (let k = 1; k < VC.length; k++) if (p <= VC[k][0]) { const [x0, y0] = VC[k - 1], [x1, y1] = VC[k]; return y0 + ((Math.max(p, x0) - x0) * (y1 - y0)) / (x1 - x0); } return 0; };
  const nv = (st) => { const v = st ? parseFloat(st.state) : NaN; return isNaN(v) ? null : v; };
  const setVol = C.prototype._setVol;
  C.prototype._setVol = function (L) { this._svTgt = Math.round(L * 1.5); this._svAt = Date.now(); return setVol.call(this, L); };
  C.prototype._vSnd = function () {
    const fx = window.OSEchoFX; if (!fx || !this._hass) return;
    const id = this._c.music, now = Date.now(), cur = nv(this._hass.states[id]);
    let tgt = cur;
    if (this._kvM != null && now - (this._kvAt || 0) < 3000) tgt = this._kvM;
    if (this._svTgt != null && now - this._svAt < 3000 && this._svAt >= (this._kvAt || 0)) tgt = this._svTgt;
    clearInterval(this._vsI);
    if (!(tgt > 0)) return; /* volume 0 is silent, as on the Echo */
    const go = (a) => fx.play("volume", Math.min(2, Math.pow(10, (vdb(tgt) - vdb(a)) / 20)));
    if (cur > 0) return go(cur);
    /* coming up from 0: the media stream is silent until the new level lands, so wait for it (up to 1.5 s) */
    this._vsI = setInterval(() => { const a = nv(this._hass.states[id]); if (a > 0 || Date.now() - now > 1500) { clearInterval(this._vsI); if (a > 0) go(a); } }, 40);
  };
  C.prototype.__gxPatched = true; return true;
}
if (!patch()) customElements.whenDefined("os-echo").then(patch);
})();
