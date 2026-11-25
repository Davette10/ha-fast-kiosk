/* os-alexa-skin (Nov 18 2026): stock-Echo look for os-echo on the NEW dashboard only (/alexa-dashboard-os).
   Active only when the os-echo card config has  skin: "stock"  (the old /alexa-dashboard is untouched).
   Our own code: it restyles os-echo (home, status icons, swipe-down drawer, All Screens, panel headers, island)
   in the Echo Show's dark-navy system style and adds a Settings app wired to the real Echo controls.
   Fonts come from os-echo-stock (Amazon Ember, from Owen's own Echo backup). Undo: delete this resource. */
(() => {
if (window.__osAlexaSkin) return; window.__osAlexaSkin = true;
const NAVY = "#161e29", CARD = "#202b38", LINE = "rgba(255,255,255,.12)", CYAN = "#00caff", TOG = "#1a98d5", SUB = "#a9b4c0";
const TXT = `"Amazon Ember",Roboto,system-ui,sans-serif`, DSP = `"Amazon Ember Display","Amazon Ember",Roboto,sans-serif`;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (s) => { const n = s ? parseFloat(s.state) : NaN; return isNaN(n) ? null : n; };

const CSS = `
:host{font-family:${TXT}!important;}
/* ---- home ---- */
.shade{background:linear-gradient(90deg,rgba(0,0,0,.62) 0%,rgba(0,0,0,.25) 48%,rgba(0,0,0,.42) 100%),linear-gradient(0deg,rgba(0,0,0,.45),rgba(0,0,0,0) 45%)!important;}
.home{padding:4.4vh 3.6vw 5.4vh!important;grid-template-columns:40fr 60fr!important;}
.sk-greet{font-size:3.6vh;font-weight:400;color:#fff;margin-bottom:1vh;text-shadow:0 2px 10px rgba(0,0,0,.45);}
.clock{font-family:${DSP}!important;font-weight:300!important;font-size:16vh!important;letter-spacing:-.025em!important;}
.date{font-size:3.2vh!important;font-weight:400!important;color:rgba(255,255,255,.9)!important;}
.hint{font-size:2.5vh!important;color:rgba(255,255,255,.75)!important;}
.fbk{background:rgba(22,30,41,.78)!important;border-radius:1.6vh!important;}
.grid{gap:1.6vh 1.2vw!important;}
.w{border-radius:2.2vh!important;background:rgba(14,19,27,.72)!important;box-shadow:none!important;padding:2.2vh 1.6vw!important;}
.w.full{padding:0!important;}
.wh{font-size:2.3vh!important;letter-spacing:0!important;text-transform:none!important;font-weight:500!important;color:rgba(255,255,255,.88)!important;}
.wh ha-icon{color:${CYAN};}
.w.full .wh{background:rgba(14,19,27,.78)!important;border-radius:1.2vh!important;}
.ev i{background:${CYAN}!important;}
/* status icons (top right, like the Echo's) */
.sk-st{position:absolute;right:3.2vw;top:2.2vh;z-index:9;display:flex;gap:1.2vw;align-items:center;pointer-events:none;}
.sk-st ha-icon{--mdc-icon-size:3.2vh;color:#fff;filter:drop-shadow(0 1px 4px rgba(0,0,0,.6));}
.sk-st ha-icon.red{color:#ff4f4f;}
/* ---- swipe-down drawer ---- */
.drawer{background:${NAVY}!important;border-radius:0 0 2.4vh 2.4vh!important;padding:3vh 4vw 3.4vh!important;}
.qrow{grid-template-columns:repeat(6,1fr)!important;}
.q{font-size:2.2vh!important;color:#fff!important;}
.q .c{width:9.6vh!important;height:9.6vh!important;background:${CARD}!important;}
.q.on .c{background:${TOG}!important;}
.q[data-q="kiosk"]{display:none!important;}
.sl ha-icon{color:#fff!important;}
.sl small{color:${SUB}!important;}
input[type=range]{accent-color:${CYAN};}
/* ---- All Screens ---- */
.rail{background:${NAVY}!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;border:none!important;border-radius:2.4vh!important;}
.rail h3{font-size:2.6vh!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${SUB};}
.rail button{background:${CARD}!important;border-radius:1.8vh!important;font-weight:500!important;color:#fff!important;}
.rail button.cur{box-shadow:inset 0 0 0 2px ${CYAN}!important;}
.rail .ic{background:rgba(255,255,255,.06)!important;}
.rail ha-icon{color:#fff!important;}
/* ---- panels: Echo-style header ---- */
.panel:not(.nwp):not(.wxp){background:${NAVY}!important;}
.ph h2{font-size:2.7vh!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;}
.x{background:none!important;width:5.6vh!important;height:5.6vh!important;}
/* ---- panels inside os-echo: Echo colours ---- */
.area button{color:${CYAN}!important;}
.tile{background:${CARD}!important;border-radius:1.8vh!important;}
.tile.on{background:#eaf9ff!important;color:#0f1720!important;}
.li.done i{background:${TOG}!important;border-color:${TOG}!important;}
.pb>os-amazon{margin-top:2.6vh;}
/* ---- island: Echo navy pill ---- */
.isl{background:${NAVY}!important;box-shadow:0 1.2vh 3.6vh rgba(0,0,0,.5)!important;}
.isl[data-m=ring]{box-shadow:0 0 0 .45vh ${CYAN},0 2vh 6vh rgba(0,0,0,.6)!important;}
/* ---- Settings app ---- */
.sk-set{position:absolute;inset:0;z-index:15;background:${NAVY};display:flex;transform:translateX(100%);transition:transform .38s cubic-bezier(.32,.72,0,1);color:#fff;}
.sk-set.open{transform:none;}
.sk-nav{width:31vw;flex:none;padding:3vh 0 3vh 1.6vw;display:flex;flex-direction:column;}
.sk-nav h1{margin:0 0 2.4vh 1.4vw;font-size:3.6vh;font-weight:500;display:flex;align-items:center;gap:1vw;}
.sk-nav h1 button{width:5vh;height:5vh;display:flex;align-items:center;justify-content:center;}
.sk-nav .it{display:flex;align-items:center;gap:1.4vw;padding:1.9vh 1.4vw;border-radius:1.4vh 0 0 1.4vh;font-size:2.6vh;text-align:left;width:100%;}
.sk-nav .it ha-icon{--mdc-icon-size:3.6vh;color:#fff;}
.sk-nav .it{background:none!important;}
.sk-nav .it.cur{background:${CARD}!important;}
.sk-pane{flex:1;min-width:0;background:${CARD};margin:2.4vh 2.4vw 2.4vh 0;border-radius:2.4vh;display:flex;flex-direction:column;overflow:hidden;}
.sk-ph{display:flex;align-items:center;justify-content:center;position:relative;padding:2.4vh 2vw 1.6vh;font-size:3vh;font-weight:500;}
.sk-body{flex:1;overflow:auto;padding:0 2.6vw 3vh;touch-action:pan-y;}
.sk-grp{margin-top:2vh;}
.sk-grp h4{margin:0 0 .8vh;font-size:2.1vh;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${SUB};}
.sk-row{display:flex;align-items:center;gap:2vw;padding:2vh 0;border-bottom:1px solid ${LINE};width:100%;text-align:left;}
.sk-row:last-child{border-bottom:none;}
.sk-row .tx{flex:1;min-width:0;}
.sk-row .tx b{display:block;font-size:2.9vh;font-weight:400;}
.sk-row .tx span{display:block;font-size:2.1vh;font-weight:700;color:#e8edf2;margin-top:.5vh;line-height:1.3;}
.sk-row .val{font-size:2.4vh;color:${SUB};}
.sk-row.dis .tx b{color:rgba(255,255,255,.45);}
.sk-tg{flex:none;width:7.6vh;height:4vh;border-radius:99px;background:rgba(255,255,255,.28);position:relative;transition:background .2s;}
.sk-tg::after{content:"";position:absolute;left:.45vh;top:.45vh;width:3.1vh;height:3.1vh;border-radius:50%;background:#fff;transition:transform .2s;}
.sk-tg.on{background:${TOG};}
.sk-tg.on::after{transform:translateX(3.6vh);}
.sk-sl{display:flex;align-items:center;gap:1.4vw;width:100%;padding:1.2vh 0 2vh;border-bottom:1px solid ${LINE};}
.sk-sl ha-icon{--mdc-icon-size:3.2vh;color:#fff;}
.sk-sl input{flex:1;height:5vh;}
.sk-sl b{width:5vh;text-align:right;font-size:2.6vh;font-weight:500;font-variant-numeric:tabular-nums;}
.sk-opts{display:flex;flex-wrap:wrap;gap:1vh 1vw;padding:1.4vh 0 2vh;border-bottom:1px solid ${LINE};}
.sk-opts button{padding:1.2vh 1.6vw;border-radius:99px;background:rgba(255,255,255,.1);font-size:2.3vh;}
.sk-opts button.on{background:${TOG};}
.sk-note{font-size:2.2vh;color:${SUB};line-height:1.45;padding:1.6vh 0;}
`;

/* ---------- settings content ---------- */
const CATS = [
  ["alexa", "mdi:account-voice", "Alexa"],
  ["display", "mdi:monitor", "Display & Appearance"],
  ["sound", "mdi:volume-high", "Notifications & Sound"],
  ["device", "mdi:tablet", "Device Options"],
  ["access", "mdi:human", "Accessibility"],
  ["help", "mdi:help-circle-outline", "Help"],
];
const row = (k, title, sub, right, dis) => `<button class="sk-row${dis ? " dis" : ""}" ${k ? `data-k="${k}"` : ""}><div class="tx"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>${right || ""}</button>`;
const tog = (on) => `<i class="sk-tg${on ? " on" : ""}"></i>`;
const val = (v) => `<span class="val">${esc(v)}</span>`;
const grp = (h, inner) => `<div class="sk-grp">${h ? `<h4>${esc(h)}</h4>` : ""}${inner}</div>`;
const sld = (k, icon, min, max, step, v, lab) => `<div class="sk-sl"><ha-icon icon="${icon}"></ha-icon><input type="range" data-s="${k}" min="${min}" max="${max}" step="${step}" value="${v == null ? min : v}"><b data-sv="${k}">${lab == null ? (v == null ? "–" : v) : esc(lab)}</b></div>`;

function pane(el, cat) {
  const h = el._hass, C = el._c, S = h.states, v = C.vaca || "vaca_amzn_echo_show_8_3a31";
  const st = (id) => (S[id] || {}).state, on = (id) => st(id) === "on";
  const va = S[C.va], dnd = !!(va && va.attributes.do_not_disturb === "on");
  if (cat === "alexa") return grp("", row("", "Wake Word", "Say this word to get Alexa's attention.", val("Alexa")) +
      row("mute", "Microphone", on(C.mute) ? "Off. Alexa can't hear you." : "On. Alexa listens for the wake word.", tog(!on(C.mute))) +
      row("follow", "Follow-Up Mode", "Keep listening for a few seconds after Alexa answers, so you can ask another question without the wake word.", tog(on(`switch.${v}_continue_conversation`)))) +
    grp("Alexa's AI", row("", "Assistant", "Answers come from Home Assistant's AI.", val(st(`select.${v}_assistant`) || "–")));
  if (cat === "display") {
    const b = num(S[C.bright]);
    return grp("Brightness", sld("bright", "mdi:brightness-6", 3, 100, 1, b == null ? null : Math.round(b)) +
        row("adaptive", "Adaptive Brightness", "Automatically adjusts screen brightness based on available light.", tog(on("automation.echo_show_adaptive_brightness")))) +
      grp("Screen", row("night", "Night Mode", el._isNight ? "On. A dim clock is showing." : "Show a dim clock now. It also turns on by itself when the room is dark.", tog(!!el._isNight)) +
        row("always", "Screen Always On", "Keep the screen on instead of turning it off.", tog(on(C.screen.replace("_screen", "_screen_always_on")))) +
        row("screenoff", "Turn Screen Off", "Tap the screen to turn it back on.", `<ha-icon icon="mdi:chevron-right"></ha-icon>`));
  }
  if (cat === "sound") {
    const L = el._level(), al = S[`number.${v}_alarm_volume`], as = S[`select.${v}_alarm_sound`];
    return grp("Volume", sld("vol", "mdi:volume-high", 0, 10, 1, L)) +
      grp("Do Not Disturb", row("dnd", "Do Not Disturb", dnd ? "On. Notifications and calls are silenced. Alarms and timers still sound." : "Silence notifications and calls.", tog(dnd))) +
      grp("Alarms, Timers and Notifications",
        (al ? `<div class="sk-note">Alarm and timer volume</div>` + sld("alvol", "mdi:alarm", al.attributes.min || 0, al.attributes.max || 10, al.attributes.step || 1, num(al)) : "") +
        (as && (as.attributes.options || []).length > 1 ? `<div class="sk-note">Alarm sound</div><div class="sk-opts">${(as.attributes.options || []).map((o) => `<button data-o="${esc(o)}" class="${o === as.state ? "on" : ""}">${esc(o)}</button>`).join("")}</div>` : ""));
  }
  if (cat === "device") {
    const con = on(`binary_sensor.${v}_connected`), lux = num(S[C.lux]), kio = on(C.kiosk);
    return grp("About This Device", row("", "Device Name", "", val("Kitchen")) + row("", "Device Model", "", val("Echo Show 8 (1st Gen)")) +
        row("", "Software", `LineageOS 18.1 · View Assist Companion ${st(`sensor.${v}_app_version`) || ""}`, "") +
        row("", "Network", con ? "Connected to Home Assistant" : "Not connected", val(con ? "Connected" : "Offline")) +
        row("", "Room Light", "Read by the Echo's light sensor.", val(lux == null ? "–" : `${Math.round(lux)} lux`))) +
      grp("Options", row("restart", "Restart Screen", "Reloads this screen. Music keeps playing.", `<ha-icon icon="mdi:chevron-right"></ha-icon>`) +
        row("kiosk", "Kiosk Mode", kio ? "On. Android's bars and buttons are hidden." : "Off. Android's bars and buttons can show.", tog(kio)));
  }
  if (cat === "access") return grp("", `<div class="sk-note">Text and buttons use the Echo's standard size. Ask Alexa to read anything on screen out loud.</div>`);
  if (cat === "help") return grp("Things to Try", ["Alexa, set a timer for 10 minutes", "Alexa, what's the weather?", "Alexa, show the front door", "Alexa, play the news", "Alexa, where is everyone?", "Alexa, show my calendar", "Alexa, turn off the kitchen lights", "Alexa, log a complaint"].map((t) => row("", `“${t}”`, "", "")).join("")) +
    grp("Getting Around", row("", "Swipe down from the top", "Brightness, Do Not Disturb, Mic Off, Home and Settings.", "") +
      row("", "Swipe in from the right", "All Screens: Lights, Cameras, Music, Calendar and more.", "") +
      row("", "Swipe right from the left edge", "Go back.", ""));
  return "";
}

function openSet(el, cat) {
  const sr = el.shadowRoot; let s = sr.querySelector(".sk-set");
  if (!s) {
    s = document.createElement("div"); s.className = "sk-set";
    s.innerHTML = `<div class="sk-nav"><h1><button data-close="1"><ha-icon icon="mdi:chevron-left"></ha-icon></button>Settings</h1>${CATS.map(([k, i, t]) => `<button class="it" data-c="${k}"><ha-icon icon="${i}"></ha-icon>${t}</button>`).join("")}</div><div class="sk-pane"><div class="sk-ph"></div><div class="sk-body"></div></div>`;
    sr.appendChild(s);
    s.addEventListener("click", (e) => onSetClick(el, e));
    s.addEventListener("input", (e) => { const k = e.target.dataset && e.target.dataset.s; if (!k) return; const b = s.querySelector(`[data-sv="${k}"]`); if (b) b.textContent = e.target.value; el.__skDrag = Date.now(); });
    s.addEventListener("change", (e) => onSlide(el, e.target));
  }
  el.__skCat = cat || el.__skCat || "alexa"; el.__skOpen = true; renderSet(el, true);
  requestAnimationFrame(() => s.classList.add("open")); idle(el);
}
function closeSet(el) { const s = el.shadowRoot.querySelector(".sk-set"); el.__skOpen = false; clearTimeout(el.__skT); if (s) s.classList.remove("open"); }
function idle(el) { clearTimeout(el.__skT); el.__skT = setTimeout(() => closeSet(el), 120000); }
function renderSet(el, force) {
  if (!el.__skOpen) return; if (!force && el.__skDrag && Date.now() - el.__skDrag < 3000) return;
  const s = el.shadowRoot.querySelector(".sk-set"), cat = el.__skCat;
  s.querySelectorAll(".it").forEach((b) => b.classList.toggle("cur", b.dataset.c === cat));
  s.querySelector(".sk-ph").textContent = (CATS.find((c) => c[0] === cat) || [])[2] || "";
  const html = pane(el, cat), body = s.querySelector(".sk-body");
  if (html !== el.__skHtml) { const y = body.scrollTop; body.innerHTML = html; body.scrollTop = force ? 0 : y; el.__skHtml = html; }
}
function onSlide(el, t) {
  const k = t.dataset && t.dataset.s; if (!k) return; const v = +t.value, C = el._c, vc = C.vaca || "vaca_amzn_echo_show_8_3a31";
  el.__skDrag = Date.now(); idle(el);
  if (k === "bright") el._setBright(v);
  else if (k === "vol") { el._setVol(v); el._vSnd(); }
  else if (k === "alvol") el._call("number", "set_value", { entity_id: `number.${vc}_alarm_volume`, value: v });
}
function onSetClick(el, e) {
  idle(el);
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.close) return closeSet(el);
  if (t.dataset.c) { el.__skCat = t.dataset.c; el.__skHtml = null; return renderSet(el, true); }
  const C = el._c, h = el._hass, vc = C.vaca || "vaca_amzn_echo_show_8_3a31", S = h.states;
  if (t.dataset.o) return el._call("select", "select_option", { entity_id: `select.${vc}_alarm_sound`, option: t.dataset.o });
  const k = t.dataset.k; if (!k) return;
  const flip = (id) => el._call(id.split(".")[0] === "automation" ? "automation" : "switch", (S[id] || {}).state === "on" ? "turn_off" : "turn_on", { entity_id: id });
  if (k === "mute") flip(C.mute);
  else if (k === "follow") flip(`switch.${vc}_continue_conversation`);
  else if (k === "adaptive") flip("automation.echo_show_adaptive_brightness");
  else if (k === "always") flip(C.screen.replace("_screen", "_screen_always_on"));
  else if (k === "dnd") el._quick("dnd");
  else if (k === "night") { closeSet(el); el._force(!el._isNight); return; }
  else if (k === "screenoff") { closeSet(el); el._call("switch", "turn_off", { entity_id: C.screen }); return; }
  else if (k === "restart") { el._call("button", "press", { entity_id: `button.${vc}_refresh` }); return; }
  else if (k === "kiosk") { closeSet(el); el._quick("kiosk"); return; }
  /* optimistic flip so the switch moves at once; the next state update confirms it */
  const tg = t.querySelector(".sk-tg"); if (tg) tg.classList.toggle("on");
}

/* ---------- status icons ---------- */
function status(el) {
  const h = el._hass, C = el._c, S = h.states, va = S[C.va], v = C.vaca || "vaca_amzn_echo_show_8_3a31";
  const ic = [];
  if (va && va.attributes.do_not_disturb === "on") ic.push(["mdi:minus-circle", ""]);
  if ((S[C.mute] || {}).state === "on") ic.push(["mdi:microphone-off", "red"]);
  if ((S[`binary_sensor.${v}_connected`] || {}).state === "off") ic.push(["mdi:wifi-off", ""]);
  if ((el._list || []).some((x) => x.timer_class === "alarm")) ic.push(["mdi:alarm", ""]);
  const html = ic.map(([i, c]) => `<ha-icon class="${c}" icon="${i}"></ha-icon>`).join("");
  if (html !== el.__skSt) { el.__skSt = html; el.shadowRoot.querySelector(".sk-st").innerHTML = html; }
}
const greet = () => { const H = new Date().getHours(); return H < 5 ? "Good evening" : H < 12 ? "Good morning" : H < 17 ? "Good afternoon" : "Good evening"; };

/* ---------- hook into os-echo ---------- */
function init(el) {
  if (el.__sk) return; const sr = el.shadowRoot; if (!sr || !sr.getElementById("clock")) return; el.__sk = true;
  const st = document.createElement("style"); st.textContent = CSS; sr.appendChild(st);
  const g = document.createElement("div"); g.className = "sk-greet"; sr.getElementById("clock").before(g);
  const s = document.createElement("div"); s.className = "sk-st"; sr.appendChild(s);
  /* drawer: add Settings; All Screens: add Settings tile */
  const qrow = sr.querySelector(".qrow");
  if (qrow) { const b = document.createElement("button"); b.className = "q"; b.dataset.q = "sk-settings"; b.innerHTML = `<span class="c"><ha-icon icon="mdi:cog-outline"></ha-icon></span>Settings`; qrow.appendChild(b);
    b.addEventListener("click", () => { el._drawer(false); openSet(el); }); }
  const rg = sr.querySelector(".rail .g");
  if (rg) { const b = document.createElement("button"); b.innerHTML = `<span class="ic" style="--t:#fff"><ha-icon icon="mdi:cog-outline"></ha-icon></span>Settings`; rg.appendChild(b);
    b.addEventListener("click", () => { el._rail(false); openSet(el); }); }
  /* swipe right from the left edge closes Settings, like Back */
  let sx = 0, sy = 0; el.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; }, { passive: true });
  el.addEventListener("pointerup", (e) => { if (el.__skOpen && sx < innerWidth * 0.1 && e.clientX - sx > innerWidth * 0.12 && Math.abs(e.clientY - sy) < Math.abs(e.clientX - sx)) closeSet(el); }, { passive: true });
}
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype;
  if (P.__skPatched) return; P.__skPatched = true;
  const on = (el) => el._c && el._c.skin === "stock";
  const tick = P._tick;
  P._tick = function () {
    if (on(this)) { try { init(this); const g = this.shadowRoot.querySelector(".sk-greet"), w = greet(); if (g && g.textContent !== w) g.textContent = w; status(this); } catch (e) { /* never break the clock */ } }
    return tick.apply(this, arguments);
  };
  const sh = P._setHass;
  P._setHass = function (h) { const r = sh.apply(this, arguments); if (on(this) && this.__skOpen) { try { renderSet(this); } catch (e) {} } return r; };
  const cmd = P._cmd;
  P._cmd = function () {
    /* "home" from a voice command also closes Settings */
    try { const c = on(this) && this._hass.states[this._c.va].attributes.echo_cmd; if (c && c.ts !== this._cmdTs && c.panel) closeSet(this); } catch (e) {}
    return cmd.apply(this, arguments);
  };
});
})();
