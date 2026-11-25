/* os-echo-stock-ask (Nov 19 2026): the Alexa+ conversation screen for os-echo (skin: "stock").
   Measured from an Alexa+ Echo Show 8 (YouTube 3Spm0tw3eTY, ~8:17-8:25): deep navy screen that brightens to blue
   at the bottom (where the light bar is); status (weather, time) top right; an outlined "Alexa+ Early Access" badge top
   left and round history / keyboard buttons top right; what you said in a rounded bubble on the right; Alexa's reply
   as large semibold text on the left, under it round share / thumbs up / thumbs down buttons and, for results,
   rounded tiles (picture, bold title, detail lines) and suggestion chips; newest at the bottom, earlier turns scroll up.
   Replaces os-echo's island answers and result cards while the stock skin is on. It closes by itself after Alexa is
   done (longer for longer answers, kept open while you touch it), on a sideways swipe, on "Alexa, go home / stop", or
   when a full screen (music, weather, camera...) or the timers / alarm / camera view opens.
   History and keyboard open os-echo's Alexa Chat; a chip asks its question there (typed answers are not spoken). */
(() => {
if (window.__osStockAsk) return; window.__osStockAsk = true;
const B = "/local/echo-stock-edU4oOWQEk/";
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const WX = { sunny: "sunny", "clear-night": "clear_night", partlycloudy: "partly_cloudy", cloudy: "cloudy", fog: "cloudy", rainy: "rainy", pouring: "rainy", lightning: "lightning", "lightning-rainy": "lightning", snowy: "snow", "snowy-rainy": "snow", hail: "snow", windy: "wind", "windy-variant": "wind", exceptional: "cloudy" };
const noEmoji = (s) => String(s || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s{2,}/g, " ").trim();
const CSS = `
.ak{position:absolute;inset:0;z-index:13;color:#fff;font-family:"Amazon Ember",Roboto,sans-serif;background:radial-gradient(120% 75% at 50% 118%,#2d6fe4 0%,#163f93 30%,#0b2156 58%,#071331 100%);opacity:0;pointer-events:none;transition:opacity .3s ease;display:flex;flex-direction:column;touch-action:pan-y;}
.ak.on{opacity:1;pointer-events:auto;}
.ak button{font:inherit;color:#fff;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.ak button:active{transform:scale(.94);}
.akst{position:absolute;right:3vw;top:1.2vh;height:3.6vh;display:flex;align-items:center;gap:.6vw;font-size:2.7vh;color:rgba(255,255,255,.85);font-variant-numeric:tabular-nums;}
.akst img{width:3.2vh;height:3.2vh;}
.akst .akck{margin-left:.8vw;}
.akhd{flex:none;display:flex;align-items:center;gap:1vw;padding:5.6vh 3vw 0 3.4vw;}
.akbd{font-size:2.1vh;line-height:1;padding:.9vh .9vw;border-radius:.9vh;border:1px solid rgba(120,195,255,.75);color:#d9efff;background:rgba(10,40,90,.35);}
.aksp{flex:1;}
.akb{width:6vh;height:6vh;border-radius:50%;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;}
.akb ha-icon{--mdc-icon-size:3.2vh;}
.aksc{flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;scrollbar-width:none;padding:0 3vw 0 3.4vw;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 7vh,#000 calc(100% - 5vh),transparent 100%);}
.aksc::-webkit-scrollbar{display:none;}
.akl{min-height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:3vh 0 10vh;gap:3.2vh;}
.akturn{display:flex;flex-direction:column;gap:3.2vh;}
.aku{display:flex;justify-content:flex-end;}
.aku span{max-width:62vw;padding:1.9vh 2.4vw;border-radius:4.6vh;background:rgba(36,66,128,.9);box-shadow:inset 0 0 0 1px rgba(140,180,255,.12);font-size:3.5vh;font-weight:500;line-height:1.3;}
.aka{display:flex;flex-direction:column;align-items:flex-start;gap:2vh;max-width:84vw;}
.akt{font-size:4.25vh;font-weight:600;line-height:1.38;letter-spacing:.003em;}
.akh{font-size:3.4vh;font-weight:700;}
.akr{display:flex;align-items:center;gap:1vw;max-width:93vw;overflow-x:auto;scrollbar-width:none;touch-action:pan-x;}
.akr::-webkit-scrollbar{display:none;}
.akc{flex:none;width:6vh;height:6vh;border-radius:50%;background:rgba(255,255,255,.16)!important;display:flex;align-items:center;justify-content:center;}
.akc ha-icon{--mdc-icon-size:3vh;}
.akc.on{background:rgba(255,255,255,.36)!important;}
.akg{flex:none;width:.8vw;}
.akch{flex:none;height:6vh;padding:0 2vw!important;border-radius:99px;background:rgba(40,78,150,.85)!important;box-shadow:inset 0 0 0 1px rgba(150,190,255,.15);font-size:2.7vh!important;font-weight:500;white-space:nowrap;}
.akcards{display:flex;gap:1.4vw;max-width:93vw;overflow-x:auto;scrollbar-width:none;touch-action:pan-x;padding-bottom:.4vh;}
.akcards::-webkit-scrollbar{display:none;}
.akci{flex:none;width:22.5vw;border-radius:2.4vh;background:rgba(18,40,90,.85);box-shadow:inset 0 0 0 1px rgba(140,180,255,.14);padding:1vh .8vw 1.6vh;text-align:left;}
.akim{height:19vh;border-radius:1.8vh;background:rgba(255,255,255,.07) center/cover no-repeat;}
.akci b{display:block;font-size:2.9vh;font-weight:700;margin:1.3vh .3vw 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.akci span{display:block;font-size:2.1vh;color:rgba(255,255,255,.85);margin:.5vh .3vw 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.akci span.d{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3;}
.akbody{display:flex;gap:2vw;width:86vw;border-radius:2.4vh;background:rgba(18,40,90,.7);box-shadow:inset 0 0 0 1px rgba(140,180,255,.12);padding:2.2vh 1.8vw;}
.akbt{flex:1;min-width:0;font-size:2.9vh;line-height:1.45;}
.akbt ul,.akbt ol{margin:.4vh 0;padding-left:3.2vh;}
.akbt li{margin:.4vh 0;}
.akbt .h{font-weight:700;margin-top:1vh;}
.akbi{flex:none;width:30vw;height:30vh;border-radius:2vh;background:rgba(255,255,255,.06) center/cover no-repeat;}
.aktoast{position:absolute;left:50%;bottom:12vh;transform:translateX(-50%);padding:1.4vh 2.4vw;border-radius:99px;background:rgba(0,0,0,.62);font-size:2.6vh;opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap;}
.aktoast.on{opacity:1;}
.ax .said{display:none!important;}
`;
const isOn = (el) => !!(el && el._c && el._c.skin === "stock" && !el._c.replay);
const wxIcon = (st, night) => { let f = WX[st] || "cloudy"; if (night && f === "partly_cloudy") f = "partly_cloudy_night"; if (night && f === "sunny") f = "clear_night"; return `${B}wx/ic_weather_${f}_144dp.png`; };
const items = (c) => { let it = c && c.items; if (typeof it === "string") { try { it = JSON.parse(it.replace(/'/g, '"')); } catch (e) { it = []; } } return Array.isArray(it) ? it.filter((x) => x && (x.t || x.title)).slice(0, 10) : []; };

function ui(el) {
  if (el.__ak) return el.__ak;
  const sr = el.shadowRoot, st = document.createElement("style"); st.textContent = CSS; sr.appendChild(st);
  const ak = document.createElement("div"); ak.className = "ak";
  ak.innerHTML = `<div class="akst"><img alt=""><span class="akwt"></span><span class="akck"></span></div><div class="akhd"><span class="akbd">Alexa+ Early Access</span><span class="aksp"></span><button class="akb" data-k="hist" aria-label="Conversation history"><ha-icon icon="mdi:history"></ha-icon></button><button class="akb" data-k="kb" aria-label="Type to Alexa"><ha-icon icon="mdi:keyboard-outline"></ha-icon></button></div><div class="aksc"><div class="akl"></div></div><div class="aktoast"></div>`;
  sr.appendChild(ak);
  const A = el.__ak = { root: ak, list: ak.querySelector(".akl"), sc: ak.querySelector(".aksc"), turns: [], open: false, closeAt: 0 };
  ak.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); A.closeAt = Math.max(A.closeAt, Date.now() + 30000);
    const last = A.turns[A.turns.length - 1], turn = last ? last.id : null;
    if (b.dataset.k === "hist") { close(el); return el._open("chat", {}); }
    if (b.dataset.k === "kb") { close(el); el._open("chat", { turn }); setTimeout(() => { const c = el._chatEl, i = c && c.shadowRoot && c.shadowRoot.getElementById("in"); if (i) i.focus(); }, 500); return; }
    const t = A.turns[+((b.closest("[data-i]") || {}).dataset || {}).i];
    if (b.dataset.f === "share") return toast(el, "Sharing works from the Alexa app");
    if (b.dataset.f && t) { t.fb = t.fb === b.dataset.f ? null : b.dataset.f; render(el); if (t.fb) toast(el, "Thanks for your feedback"); return; }
    if (b.dataset.chip != null && t) {
      const q = t.chips[+b.dataset.chip]; close(el); el._open("chat", { turn: t.id });
      setTimeout(() => { const c = el._chatEl; if (c && c._send) c._send(q); }, 600);
    }
  });
  /* a sideways swipe returns to the home screen; any touch keeps the conversation open a little longer */
  let x0 = null, y0 = 0;
  ak.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; A.closeAt = Math.max(A.closeAt, Date.now() + 30000); });
  ak.addEventListener("pointerup", (e) => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > innerWidth * 0.14 && Math.abs(dx) > Math.abs(dy) * 1.5) close(el); });
  return A;
}
function toast(el, msg) { const t = el.__ak.root.querySelector(".aktoast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2200); }
function open(el) {
  const A = ui(el); if (A.open) return A;
  A.open = true; A.root.classList.add("on"); el.classList.add("stk-ak");
  if (el._isl && ["answer", "ok", "rich"].includes(el._isl.m)) el._islHome();
  el._peek = Date.now(); if (el._nightApply) el._nightApply();
  return A;
}
function close(el) {
  const A = el.__ak; if (!A || !A.open) return;
  A.open = false; A.root.classList.remove("on"); el.classList.remove("stk-ak");
  setTimeout(() => { if (!A.open) { A.turns = []; A.list.innerHTML = ""; } }, 350);
}
function turnFor(el, id) {
  const A = open(el); id = id || Date.now();
  let t = A.turns.find((x) => x.id === id);
  if (!t) { t = { id, q: "", a: "", card: null, imgs: {}, chips: [] }; A.turns.push(t); if (A.turns.length > 12) A.turns.shift(); }
  return t;
}
function hold(el, len) { const A = el.__ak; A.closeAt = Math.max(A.closeAt, Date.now() + Math.min(45000, Math.max(9000, 6000 + (len || 0) * 70))); }
function chipsFor(t) {
  const c = t.card; if (!c) return [];
  const it = items(c);
  if (it.length) return it.slice(0, 3).map((x) => `Tell me about ${x.t || x.title}`);
  if (c.body) return ["Tell me more", "Give me more options"];
  return [];
}
function cardHtml(el, t, i) {
  const c = t.card, it = items(c);
  if (it.length >= 2) return `<div class="akcards">${it.map((x, k) => `<div class="akci"><div class="akim" data-im="${i}:${k}"${t.imgs[k] ? ` style="background-image:url('${esc(t.imgs[k])}')"` : ""}></div><b>${esc(x.t || x.title)}</b>${x.s ? `<span>${esc(x.s)}</span>` : ""}${x.d ? `<span class="d">${esc(x.d)}</span>` : x.g ? `<span>${esc(x.g)}</span>` : ""}</div>`).join("")}</div>`;
  if (c.body) { const im = c.image || t.imgs.b; return `<div class="akbody"><div class="akbt">${c.title ? `<div class="akh">${esc(c.title)}</div>` : ""}${el._fmt ? el._fmt(c.body) : esc(c.body)}</div>${c.image || c.image_query || (it[0]) ? `<div class="akbi" data-im="${i}:b"${im ? ` style="background-image:url('${esc(im)}')"` : ""}></div>` : ""}</div>`; }
  return "";
}
function render(el) {
  const A = el.__ak; if (!A) return;
  const last = A.turns.length - 1;
  A.list.innerHTML = A.turns.map((t, i) => {
    let h = t.q ? `<div class="aku"><span>${esc(t.q)}</span></div>` : "";
    const c = t.card, text = t.a || (c && (c.said || (!c.body && !items(c).length ? c.title : ""))) || "";
    if (text || c) {
      h += `<div class="aka" data-i="${i}">${text ? `<div class="akt">${esc(text)}</div>` : ""}${c ? cardHtml(el, t, i) : ""}`;
      t.chips = chipsFor(t);
      h += `<div class="akr"><button class="akc" data-f="share" aria-label="Share"><ha-icon icon="mdi:export-variant"></ha-icon></button><button class="akc${t.fb === "up" ? " on" : ""}" data-f="up" aria-label="Good answer"><ha-icon icon="mdi:thumb-up${t.fb === "up" ? "" : "-outline"}"></ha-icon></button><button class="akc${t.fb === "down" ? " on" : ""}" data-f="down" aria-label="Bad answer"><ha-icon icon="mdi:thumb-down${t.fb === "down" ? "" : "-outline"}"></ha-icon></button>${i === last && t.chips.length ? `<span class="akg"></span>${t.chips.map((q, k) => `<button class="akch" data-chip="${k}">${esc(q)}</button>`).join("")}` : ""}</div></div>`;
    }
    return `<div class="akturn">${h}</div>`;
  }).join("");
  requestAnimationFrame(() => { A.sc.scrollTop = A.sc.scrollHeight; });
  /* pictures for result tiles (os-echo finds them on Wikipedia) */
  A.turns.forEach((t, i) => {
    if (!t.card || !el._img) return;
    const it = items(t.card);
    const want = it.length >= 2 ? it.map((x, k) => [k, x.img || x.image, x.q || (el._q ? el._q(x) : x.t)]) : (t.card.body && !t.card.image && (t.card.image_query || it[0]) ? [["b", null, t.card.image_query || it[0].q || it[0].t]] : []);
    want.forEach(([k, u, q]) => {
      if (t.imgs[k] !== undefined) return; t.imgs[k] = null;
      el._img(u, q).then((url) => { if (!url) return; t.imgs[k] = url; const im = new Image(); im.onload = () => { const d = A.list.querySelector(`[data-im="${i}:${k}"]`); if (d) d.style.backgroundImage = `url("${url}")`; }; im.src = url; }).catch(() => {});
    });
  });
}
/* ---- hooks into os-echo ---- */
function wrap(P, name, fn) {
  const cur = P[name]; if (!cur || cur.__ak) return;
  const w = function () { return fn.call(this, cur, arguments); }; w.__ak = true; P[name] = w;
}
function patch(P) {
  wrap(P, "_voice", function (orig, args) {
    const r = orig.apply(this, args);
    try {
      if (!isOn(this) || this._chatEl) return r;
      const h = this._hass, C = this._c, s = h.states[C.sat], stt = h.states[C.stt], st = s ? s.state : "idle";
      const fresh = !!this._turn && stt && !["unknown", "unavailable", ""].includes(stt.state) && stt.state.trim() !== "." && new Date(stt.last_changed) > new Date(this._turn - 1500);
      if ((st === "processing" || st === "responding") && fresh && this.__akPanelTurn !== this._turn) {
        const t = turnFor(this, this._turn), q = stt.state.trim(); if (t.q !== q) { t.q = q; render(this); } hold(this, 0);
      }
    } catch (e) { /* never break the voice flow */ }
    return r;
  });
  wrap(P, "_answer", function (orig, args) {
    const [a, q] = args;
    if (!a || !isOn(this) || this._chatEl || this._panel) return orig.apply(this, args);
    try {
      if (this.__akPanelTurn && this.__akPanelTurn === this._turn) return;
      const recent = this._turn && Date.now() - this._turn < 120000, t = turnFor(this, recent ? this._turn : Date.now());
      if (q && !t.q) t.q = q; t.a = noEmoji(a); render(this); hold(this, t.a.length);
    } catch (e) { return orig.apply(this, args); }
  });
  wrap(P, "_rich", function (orig, args) {
    if (!isOn(this) || this._chatEl) return orig.apply(this, args);
    try {
      const c = args[0] || ((this._hass.states[this._c.va] || {}).attributes || {}).echo_card || {};
      const recent = this._turn && Date.now() - this._turn < 120000, t = turnFor(this, recent ? this._turn : Date.now());
      t.card = Object.assign({}, c); render(this); hold(this, 400);
    } catch (e) { return orig.apply(this, args); }
  });
  wrap(P, "_open", function (orig, args) {
    try { if (isOn(this)) { if (this.__ak && this.__ak.open) close(this); if (this._turn && Date.now() - this._turn < 60000) this.__akPanelTurn = this._turn; } } catch (e) { /* ignore */ }
    return orig.apply(this, args);
  });
  wrap(P, "_islSet", function (orig, args) {
    try { if (isOn(this) && ["timers", "ring", "vision"].includes(args[0])) close(this); } catch (e) { /* ignore */ }
    return orig.apply(this, args);
  });
  wrap(P, "_cmd", function (orig, args) {
    try { const c = isOn(this) && this._hass.states[this._c.va].attributes.echo_cmd; if (c && c.ts && c.ts !== this._cmdTs && ["home", "stop"].includes(c.panel)) close(this); } catch (e) { /* ignore */ }
    return orig.apply(this, args);
  });
}
function tick(el) {
  const A = el.__ak; if (!A || !A.open) return;
  const h = el._hass, C = el._c, s = h && h.states[C.sat], busy = s && ["listening", "processing", "responding"].includes(s.state);
  if (busy) A.closeAt = Math.max(A.closeAt, Date.now() + 9000);
  if (Date.now() > A.closeAt) return close(el);
  if (el.__sh) el.__sh.t = Date.now();
  const d = new Date(), ck = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`, w = h && h.states[C.weather];
  const r = A.root, cke = r.querySelector(".akck"); if (cke.textContent !== ck) cke.textContent = ck;
  if (w) { const src = wxIcon(w.state, (h.states[C.sun] || {}).state === "below_horizon"), im = r.querySelector(".akst img"); if (im.dataset.s !== src) { im.dataset.s = src; im.src = src; } r.querySelector(".akwt").textContent = `${Math.round(w.attributes.temperature)}°`; }
}
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype; if (P.__stkAsk) return; P.__stkAsk = true;
  const t0 = P._tick;
  P._tick = function () {
    const r = t0.apply(this, arguments);
    try { if (isOn(this) && this.shadowRoot) { patch(Object.getPrototypeOf(this)); ui(this); tick(this); } } catch (e) { /* never break the clock */ }
    return r;
  };
  window.OSEchoAsk = { open: (el) => open(el), close: (el) => close(el), say: (el, q, a, card) => { const t = turnFor(el, Date.now()); t.q = q || ""; t.a = a || ""; t.card = card || null; render(el); hold(el, (a || "").length); } };
});
})();
