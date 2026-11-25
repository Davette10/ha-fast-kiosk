/* os-echo-stock-help (Nov 19 2026): the stock Echo Show Help screen for os-echo (skin: "stock").
   Measured from Owen's own Echo (task thumbnail 7034, Settings > Help): dark slate screen; back chevron and bold "HELP"
   top left; a list of large light-weight topics separated by thin lines. Opened from Settings > Help; a topic opens its
   page in the same style. The answers describe this Echo as it is set up now (Home Assistant, not Amazon). */
(() => {
if (window.__osStockHelp) return; window.__osStockHelp = true;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TOPICS = [
  ["Your Device Can't Connect to Wi-Fi", ["The Echo needs your home Wi-Fi to reach Home Assistant. If the screen shows an error or stops updating, it refreshes by itself within a minute.", "If it stays offline, unplug the Echo for ten seconds and plug it back in.", "Settings > Device Options > Network shows whether it is connected right now."]],
  ["Alexa Doesn't Understand You", ["Speak normally, from the same room, and wait for the blue light bar before you talk.", "If Alexa heard something different, say “Alexa, log a complaint” and describe what happened. It is saved so it can be fixed.", "Check that the microphone is on: a red light bar means it is off. Press the microphone button on top to turn it back on."]],
  ["Hardware Basics and the Light Bar", ["Buttons on top: volume down, volume up, and microphone on / off.", "Blue light bar: Alexa is listening. Moving blue: Alexa is thinking. Red: the microphone is off.", "Swipe down from the top for brightness, Do Not Disturb and Settings. Swipe in from the right for all screens."]],
  ["Reset Your Device", ["To restart the screen, go to Settings > Device Options > Restart Screen. Music keeps playing.", "To restart the whole Echo, unplug it for ten seconds and plug it back in.", "Factory reset is not offered here: it would erase the Home Assistant setup."]],
  ["Ask Alexa for Help", ["Try “Alexa, what can you do?”", "Try “Alexa, set a timer for 10 minutes”, “Alexa, what's the weather?”, “Alexa, show the front door” or “Alexa, play the news”.", "Say “Alexa, go home” to come back to the home screen from anywhere."]],
  ["Things to Try", ["“Alexa, where is everyone?”", "“Alexa, show my calendar”", "“Alexa, turn off the kitchen lights”", "“Alexa, use the camera, what am I holding?”", "“Alexa, where's my stuff?”"]],
];
const CSS = `
.khp{position:absolute;inset:0;z-index:16;background:#1d232a;color:#fff;font-family:"Amazon Ember",Roboto,sans-serif;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .38s cubic-bezier(.32,.72,0,1);}
.khp.open{transform:none;}
.khp button{font:inherit;color:#fff;border:0;background:none!important;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;text-align:left;}
.khh{flex:none;height:16.5vh;display:flex;align-items:center;gap:2.2vw;padding-left:2.2vw;}
.khh button{width:6.4vh;height:6.4vh;display:flex;align-items:center;justify-content:center;}
.khh ha-icon{--mdc-icon-size:4.6vh;}
.khh b{font-size:4vh;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
.khl{flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;padding:0 7.5vw 6vh;}
.khl::-webkit-scrollbar{width:.6vw;}
.khl::-webkit-scrollbar-thumb{background:rgba(255,255,255,.35);border-radius:9px;}
.khl .t{display:flex;align-items:center;width:100%;min-height:16.1vh;border-bottom:1px solid rgba(255,255,255,.16)!important;font-size:6.4vh!important;font-weight:300;line-height:1.15;}
.khl p{margin:0;padding:2.6vh 0;border-bottom:1px solid rgba(255,255,255,.16);font-size:4vh;font-weight:300;line-height:1.4;}
`;
const isOn = (el) => !!(el && el._c && el._c.skin === "stock" && !el._c.replay);
function ui(el) {
  const sr = el.shadowRoot; let h = sr.querySelector(".khp"); if (h) return h;
  const st = document.createElement("style"); st.textContent = CSS; sr.appendChild(st);
  h = document.createElement("div"); h.className = "khp";
  h.innerHTML = `<div class="khh"><button data-k="back" aria-label="Back"><ha-icon icon="mdi:chevron-left"></ha-icon></button><b></b></div><div class="khl"></div>`;
  sr.appendChild(h);
  h.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); el.__skT && clearTimeout(el.__skT);
    if (b.dataset.k === "back") return h.__topic != null ? show(el, null) : close(el);
    if (b.dataset.t != null) show(el, +b.dataset.t);
  });
  let sx = 0, sy = 0;
  h.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; });
  h.addEventListener("pointerup", (e) => { if (sx < innerWidth * 0.12 && e.clientX - sx > innerWidth * 0.12 && Math.abs(e.clientY - sy) < Math.abs(e.clientX - sx)) (h.__topic != null ? show(el, null) : close(el)); });
  return h;
}
function show(el, i) {
  const h = ui(el); h.__topic = i;
  h.querySelector(".khh b").textContent = i == null ? "Help" : TOPICS[i][0];
  h.querySelector(".khl").innerHTML = i == null ? TOPICS.map(([t], k) => `<button class="t" data-t="${k}">${esc(t)}</button>`).join("") : TOPICS[i][1].map((p) => `<p>${esc(p)}</p>`).join("");
  h.querySelector(".khl").scrollTop = 0;
  clearTimeout(h.__t); h.__t = setTimeout(() => close(el), 120000);
}
function open(el) { const h = ui(el); show(el, null); requestAnimationFrame(() => h.classList.add("open")); }
function close(el) { const h = el.shadowRoot.querySelector(".khp"); if (h) { h.classList.remove("open"); clearTimeout(h.__t); } }
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype; if (P.__stkHelp) return; P.__stkHelp = true;
  const t0 = P._tick;
  P._tick = function () {
    const r = t0.apply(this, arguments);
    try {
      const s = isOn(this) && this.shadowRoot.querySelector(".sk-set");
      if (s && !s.__kh) { s.__kh = true; s.addEventListener("click", (e) => { const b = e.target.closest('.it[data-c="help"]'); if (b) setTimeout(() => open(this), 0); }); }
      if (isOn(this) && !this.__skOpen) close(this);
    } catch (e) { /* never break the clock */ }
    return r;
  };
  window.OSEchoHelp = { open: (el) => open(el), close: (el) => close(el) };
});
})();
