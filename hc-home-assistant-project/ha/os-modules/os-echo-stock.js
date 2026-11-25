/* os-echo-stock (Nov 17 2026): the stock Echo Show 8 look for os-echo, rebuilt from Owen's own Fire OS backup.
   The files (fonts, bar animations, weather icons, wallpapers) were copied from his kitchen Echo's own backup to
   /config/www/echo-stock-edU4oOWQEk/ and are only used on that same Echo. This file is our own code around them.
   1) Fonts: Amazon Ember (text), Amazon Ember Display (clock, big numbers), Bookerly (alarm clock face).
   2) Alexa bar: the original Lottie animations (ListeningEntry -> ListeningRamp, ThinkingLoop, ListeningExit,
      MuteEntry / ListeningToMute / MuteExit), played from os-echo's own ax / muted / unmuting attributes.
      If anything fails to load, the old CSS bar stays (the host only gets .stk-ok once the animations are ready).
   3) Timers, alarms, reminders: stock colours (accent #00C9FF, slate #232F3E), Ember Display countdowns, and a
      full-screen stock-style ringing screen (Bookerly time for alarms, pulsing radial for timers, big Snooze / Stop).
   4) Weather: the original Echo weather icons replace the mdi weather icons on the home widget and weather page.
   Undo: delete this resource (nothing else was changed for it). */
(() => {
if (window.__osEchoStock) return; window.__osEchoStock = true;
const BASE = "/local/echo-stock-edU4oOWQEk/";
const ACCENT = "#00C9FF", SLATE = "#232F3E";

/* ---------- 1) fonts (declared on the document so every shadow root can use them) ---------- */
const face = (fam, file, w) => `@font-face{font-family:"${fam}";src:url(${BASE}fonts/${file}.woff2) format("woff2");font-weight:${w};font-style:normal;font-display:swap;}`;
const FONTS = [
  face("Amazon Ember", "ember-thin", 100), face("Amazon Ember", "ember-light", 300), face("Amazon Ember", "ember-regular", 400),
  face("Amazon Ember", "ember-medium", 500), face("Amazon Ember", "ember-bold", 700), face("Amazon Ember", "ember-heavy", 900),
  face("Amazon Ember Display", "ember-display-light", 300), face("Amazon Ember Display", "ember-display-regular", 400),
  face("Amazon Ember Display", "ember-display-medium", 500), face("Amazon Ember Display", "ember-display-bold", 700),
  face("Bookerly", "bookerly-regular", 400),
].join("");
if (!document.getElementById("os-echo-stock-fonts")) {
  const s = document.createElement("style"); s.id = "os-echo-stock-fonts"; s.textContent = FONTS; document.head.appendChild(s);
}
const TXT = `"Amazon Ember",Roboto,system-ui,sans-serif`, DSP = `"Amazon Ember Display","Amazon Ember",Roboto,sans-serif`;

/* ---------- styles added inside os-echo's shadow root ---------- */
const CSS = `
:host{font-family:${TXT}!important;}
.clock{font-family:${DSP};font-weight:300;letter-spacing:-.02em;}
.night .c,.wnow b,.ring .v b{font-family:${DSP};}
/* stock Alexa bar */
.stkbar{position:absolute;left:0;right:0;bottom:0;height:calc(100vw * 200 / 960);pointer-events:none;}
.stkbar>div{position:absolute;inset:0;display:none;}
.stkbar>div.on{display:block;}
.stkbar svg{width:100%!important;height:100%!important;}
:host(.stk-ok) .ax .bar{display:none!important;}
:host(.stk-hold) .dim,:host(.stk-hold) .ax .said{opacity:0!important;}
/* timers, alarms, reminders: stock colours */
.ring .tr{stroke:rgba(255,255,255,.14);}
.ring .pr{stroke:${ACCENT};}
.tm.snz .pr{stroke:#879496;}
.ring .v b{font-weight:300;}
.tgrid.solo .ring .v b{font-weight:300;letter-spacing:-.01em;}
.tbh h2{font-weight:500;}
.pill{background:transparent;box-shadow:inset 0 0 0 .3vh rgba(255,255,255,.85);font-weight:500;}
/* stock ringing screen */
.srv{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4vh;overflow:hidden;border-radius:inherit;background:${SLATE};}
.srv::before{content:"";position:absolute;left:50%;top:44%;width:120vh;height:120vh;transform:translate(-50%,-50%) scale(.35);border-radius:50%;
  background:radial-gradient(closest-side,rgba(0,201,255,.55),rgba(0,201,255,.18) 55%,rgba(0,201,255,0));animation:stkpulse 1.6s ease-in-out infinite;}
.srv.al::before{background:radial-gradient(closest-side,rgba(255,255,255,.16),rgba(255,255,255,.05) 55%,rgba(255,255,255,0));animation-duration:2.4s;}
@keyframes stkpulse{0%,100%{transform:translate(-50%,-50%) scale(.35);opacity:.65}50%{transform:translate(-50%,-50%) scale(.62);opacity:1}}
.srv>*{position:relative;}
.srv .sk{font-size:3vh;letter-spacing:.14em;text-transform:uppercase;font-weight:500;color:rgba(255,255,255,.72);}
.srv .st{font-family:${DSP};font-weight:300;font-size:19vh;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
.srv.al .st{font-family:"Bookerly",Georgia,serif;font-weight:400;font-size:21vh;letter-spacing:0;}
.srv .ss{font-size:3.4vh;color:rgba(255,255,255,.82);max-width:80%;text-align:center;}
.srv .wi{width:12vh;height:12vh;}
.srv .rb{display:flex;gap:3vw;margin-top:2vh;}
.srv .big{min-width:30vw;height:15vh;border-radius:999px;font-size:4.4vh;font-weight:500;background:rgba(255,255,255,.16);color:#fff;}
.srv .big.stop{background:#fff;color:${SLATE};}
img.stkwx{display:inline-block;object-fit:contain;vertical-align:middle;}
`;

/* ---------- 2) Lottie bar ---------- */
const ANIMS = ["ListeningEntry", "ListeningRamp", "ListeningExit", "ThinkingLoop", "MuteEntry", "MuteExit", "ListeningToMute"];
let libP = null;
const lib = () => libP || (libP = new Promise((res, rej) => {
  if (window.lottie) return res(window.lottie);
  const s = document.createElement("script"); s.src = BASE + "lottie_light.min.js"; s.async = true;
  s.onload = () => (window.lottie ? res(window.lottie) : rej(new Error("no lottie"))); s.onerror = () => { libP = null; rej(new Error("lottie load")); };
  document.head.appendChild(s);
}));
const dataP = {};
const data = (n) => dataP[n] || (dataP[n] = fetch(BASE + "lottie/" + n + ".json", { cache: "force-cache" }).then((r) => (r.ok ? r.text() : Promise.reject(r.status))));

function setupBar(el, sr) {
  const ax = sr.querySelector(".ax"); if (!ax || ax.querySelector(".stkbar")) return;
  const box = document.createElement("div"); box.className = "stkbar"; ax.appendChild(box);
  Promise.all([lib(), ...ANIMS.map(data)]).then(([L, ...texts]) => {
    const A = {};
    ANIMS.forEach((n, i) => {
      const w = document.createElement("div"); box.appendChild(w);
      const a = L.loadAnimation({ container: w, renderer: "svg", loop: false, autoplay: false, animationData: JSON.parse(texts[i]),
        rendererSettings: { preserveAspectRatio: "xMidYMax meet", progressiveLoad: false } });
      a.__w = w; a.__done = null; a.addEventListener("complete", () => { const f = a.__done; a.__done = null; if (f) f(); });
      A[n] = a;
    });
    let state = null, cur = null, held = false;
    const hide = () => { if (cur) { cur.stop(); cur.__w.classList.remove("on"); } cur = null; };
    const play = (n, loop, done) => {
      const a = A[n]; if (cur && cur !== a) { cur.stop(); cur.__w.classList.remove("on"); }
      cur = a; a.loop = !!loop; a.__done = loop ? null : done || null; a.__w.classList.add("on"); a.goToAndPlay(0, true);
    };
    const update = () => {
      const st = el.getAttribute("ax"), muted = el.hasAttribute("muted"), unm = el.hasAttribute("unmuting");
      if (muted) { if (state !== "mute") { play(state === "listening" ? "ListeningToMute" : "MuteEntry", false); state = "mute"; } return; }
      if (unm) { if (state !== "unmute") { state = "unmute"; play("MuteExit", false, () => { if (state === "unmute") { hide(); state = null; } }); } return; }
      if (state === "unmute") { hide(); state = null; }
      if (st === "listening") {
        if (state !== "listening") { const from = state; state = "listening";
          const go = () => { if (from === "processing" || from === "responding") play("ListeningRamp", true);
            else play("ListeningEntry", false, () => { if (state === "listening") play("ListeningRamp", true); }); };
          /* os-echo-wake: a fresh wake is only shown once the second stage agrees */
          const v = window.__osWakeVerdict, hold = v && Date.now() - v.t < 400 ? v.p : null;
          if (hold) { held = true; el.classList.add("stk-hold");
            hold.then((ok) => { held = false; el.classList.remove("stk-hold"); if (ok && state === "listening") go(); }); }
          else go(); }
      } else if (st === "processing") { if (state !== "processing") { state = "processing"; held = false; el.classList.remove("stk-hold"); play("ThinkingLoop", true); } }
      else if (st === "responding") { if (state !== "responding") { state = "responding"; held = false; el.classList.remove("stk-hold"); play("ListeningRamp", true); } }
      else if (state && state !== "closing" && state !== "mute" && (held || !cur)) { hide(); state = null; held = false; el.classList.remove("stk-hold"); }
      else if (state && state !== "closing" && state !== "mute") {
        state = "closing"; play("ListeningExit", false, () => { if (state === "closing") { hide(); state = null; } });
      } else if (!st && state === "mute") { hide(); state = null; }
    };
    new MutationObserver(update).observe(el, { attributes: true, attributeFilter: ["ax", "muted", "unmuting"] });
    el.classList.add("stk-ok"); update();
  }).catch((e) => { box.remove(); console.warn("os-echo-stock bar:", e); });
}

/* ---------- 4) weather icons ---------- */
const WXF = { "weather-sunny": "sunny", "weather-night": "clear_night", "weather-partly-cloudy": "partly_cloudy", "weather-night-partly-cloudy": "partly_cloudy_night",
  "weather-cloudy": "cloudy", "weather-fog": "cloudy", "weather-hazy": "cloudy", "weather-rainy": "rainy", "weather-pouring": "rainy", "weather-partly-rainy": "partly_cloudy_rain",
  "weather-lightning": "lightning", "weather-lightning-rainy": "lightning", "weather-snowy": "snow", "weather-snowy-rainy": "snow", "weather-hail": "snow",
  "weather-partly-snowy": "snow", "weather-windy": "wind", "weather-windy-variant": "wind" };
function swapWx(root) {
  root.querySelectorAll("ha-icon[icon^='mdi:weather-']").forEach((ic) => {
    if (ic.closest(".q,.rail,.wh")) return;               /* leave buttons and small section headers alone */
    const f = WXF[ic.getAttribute("icon").slice(4)]; if (!f) return;
    const img = document.createElement("img"); img.className = "stkwx"; img.alt = ""; img.src = `${BASE}wx/ic_weather_${f}_144dp.png`;
    const r = ic.getBoundingClientRect();
    const sz = r.width > 4 ? r.width + "px" : (getComputedStyle(ic).getPropertyValue("--mdc-icon-size").trim() || "1.2em");
    img.style.width = img.style.height = sz; ic.replaceWith(img);
  });
}
const wxWatch = new WeakSet();
function watchWx(root) {
  if (!root || wxWatch.has(root)) return; wxWatch.add(root);
  let q = 0; const run = () => { q = 0; swapWx(root); root.querySelectorAll("os-echo-weather").forEach((w) => w.shadowRoot && watchWx(w.shadowRoot)); };
  new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); }).observe(root, { childList: true, subtree: true });
  run();
}

/* ---------- 3) ringing screen (replaces os-echo._islRing; same data-snz / data-stp buttons) ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "");
const hm = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
const ampm = (d) => (d.getHours() < 12 ? "AM" : "PM");
function ringHtml(el) {
  const t = (el._ex || [])[0], kind = t ? t.timer_class : "alarm", now = new Date();
  if (kind === "timer") {
    const name = t && t.name ? cap(t.name) : "Timer";
    const dur = t && t.duration ? String(t.duration).replace(/^(\d+) (second|minute|hour)s?$/, (m, n, u) => `${n} ${u}${n === "1" ? "" : "s"}`) : "";
    return `<div class="srv"><div class="sk">${esc(name)}</div><div class="st">0:00</div><div class="ss">${esc(dur ? dur + " timer is done" : "Your timer is done")}</div>
      <div class="rb"><button class="big stop" data-stp="1">Stop</button></div></div>`;
  }
  const w = el._hass && el._c && el._hass.states[el._c.weather];
  const cond = w && w.state, temp = w && w.attributes && w.attributes.temperature;
  const icon = { sunny: "sunny", "clear-night": "clear_night", partlycloudy: "partly_cloudy", cloudy: "cloudy", fog: "cloudy", rainy: "rainy", pouring: "rainy",
    lightning: "lightning", "lightning-rainy": "lightning", snowy: "snow", "snowy-rainy": "snow", hail: "snow", windy: "wind", "windy-variant": "wind" }[cond];
  const title = kind === "reminder" ? cap((t && t.name) || "Reminder") : t && t.name ? cap(t.name) : "Alarm";
  const when = t && t.expires ? new Date(t.expires) : now;
  return `<div class="srv al"><div class="sk">${esc(kind === "reminder" ? "Reminder" : title)}</div>
    <div class="st">${hm(when)}<span style="font-size:.28em;margin-left:.25em;font-family:${TXT}">${ampm(when)}</span></div>
    <div class="ss">${kind === "reminder" ? esc(title) : ""}${icon ? `<img class="wi" style="vertical-align:middle;width:7vh;height:7vh;margin:0 .6vw 0 0" src="${BASE}wx/ic_weather_${icon}_144dp.png" alt="">` : ""}${temp != null ? `${Math.round(temp)}°` : ""}</div>
    <div class="rb"><button class="big" data-snz="1">Snooze</button><button class="big stop" data-stp="1">Stop</button></div></div>`;
}

/* ---------- hook into os-echo ---------- */
function init(el) {
  if (el.__stk) return; const sr = el.shadowRoot; if (!sr || !sr.querySelector(".ax")) return; el.__stk = true;
  const st = document.createElement("style"); st.textContent = CSS; sr.appendChild(st);
  setupBar(el, sr); watchWx(sr);
}
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype;
  if (P.__stkPatched) return; P.__stkPatched = true;
  const tick = P._tick; P._tick = function () { try { init(this); } catch (e) { /* never break the clock */ } return tick.apply(this, arguments); };
  const ring = P._islRing;
  P._islRing = function () {
    try { this._islSet("ring", ringHtml(this), { w: 0.936, h: 0.86, dim: true }); } catch (e) { return ring.apply(this, arguments); }
  };
});
})();
