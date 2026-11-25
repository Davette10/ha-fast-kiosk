/* Clark Home OS - Echo Show chat (custom element os-echo-chat, opened by os-echo as the "chat" panel).
   Alexa+-style conversation view: every voice turn is logged on the Echo (localStorage), tapping an answer in the
   island opens it as a chat, and follow-ups can be typed (Assist pipeline "Gemini Assist" with the Echo's device id,
   so the camera and other Echo-only commands work) or spoken (mic button wakes VACA). Typed answers are not spoken. */
(() => {
const TURNS = "osecho-turns", CHATS = "osecho-chats";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]") || []; } catch (e) { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const noEmoji = (s) => String(s || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s{2,}/g, " ").trim();
/* os-echo calls this for every voice turn: {turn, q, a} first, then {turn, card} if a result card followed */
window.osEchoLog = (x) => {
if (!x || !x.turn) return;
const L = load(TURNS); let t = L.find((y) => y.turn === x.turn);
if (!t) { t = { turn: x.turn, ts: Date.now() }; L.push(t); }
if (x.q) t.q = x.q; if (x.a) t.a = noEmoji(x.a); if (x.card) t.card = x.card;
save(TURNS, L.slice(-40));
};
const SUGGEST = ["Tell me more", "Give me more options", "Explain it simply", "Why?"];
const CSS = `
:host{display:block;height:100%;color:#fff;font-family:inherit;}
.w{display:flex;height:100%;}
.side{flex:none;width:23vw;border-right:1px solid rgba(255,255,255,.08);padding:1vh 1.4vw 1vh 0;display:flex;flex-direction:column;gap:.6vh;overflow:auto;touch-action:pan-y;}
.side button{all:unset;cursor:pointer;display:block;padding:1.3vh 1vw;border-radius:1.8vh;font-size:2.3vh;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.side button.on{background:rgba(255,255,255,.12);color:#fff;}
.side .new{display:flex;align-items:center;gap:.8vw;color:#fff;font-weight:600;background:rgba(10,132,255,.22);margin-bottom:1vh;}
.side .new ha-icon{--mdc-icon-size:3vh;}
.side small{display:block;font-size:1.8vh;color:rgba(255,255,255,.4);padding:1.4vh 1vw .4vh;text-transform:uppercase;letter-spacing:.06em;}
.main{flex:1;min-width:0;display:flex;flex-direction:column;padding-left:2vw;}
.log{flex:1;overflow:auto;touch-action:pan-y;padding:1vh .6vw 2vh 0;display:flex;flex-direction:column;gap:2.2vh;scroll-behavior:smooth;}
.u{align-self:flex-end;max-width:72%;background:#2c2c2e;border-radius:2.6vh 2.6vh .8vh 2.6vh;padding:1.4vh 1.6vw;font-size:2.7vh;line-height:1.3;}
.a{display:flex;gap:1.2vw;max-width:94%;}
.a .o{flex:none;width:4.2vh;height:4.2vh;margin-top:.4vh;border-radius:50%;background:conic-gradient(from 200deg,#00caff,#2f6bff,#8a5cff,#00caff);-webkit-mask:radial-gradient(circle,transparent 46%,#000 49%);mask:radial-gradient(circle,transparent 46%,#000 49%);}
.a .o.busy{animation:sp 1.1s linear infinite;}
@keyframes sp{to{transform:rotate(360deg)}}
.a .t{font-size:3.2vh;line-height:1.35;font-weight:400;min-width:0;}
.a .t ul,.a .t ol{margin:.6vh 0;padding-left:2.6vw;} .a .t li{margin:.4vh 0;} .a .t .h{font-weight:600;margin-top:1vh;}
.dots{display:inline-flex;gap:.6vw;padding-top:1.4vh;} .dots i{width:1.2vh;height:1.2vh;border-radius:50%;background:rgba(255,255,255,.5);animation:bl 1.2s infinite;} .dots i:nth-child(2){animation-delay:.2s} .dots i:nth-child(3){animation-delay:.4s}
@keyframes bl{0%,80%,100%{opacity:.25}40%{opacity:1}}
.cars{display:flex;gap:1.2vw;overflow-x:auto;touch-action:pan-x;margin:1.6vh 0 0 5.4vh;padding-bottom:.6vh;scrollbar-width:none;}
.cars .c{flex:none;width:13.5vw;}
.cars .im{height:27vh;border-radius:1.6vh;background:#1c1e24 center/cover no-repeat;}
.cars b{display:block;font-size:2.2vh;font-weight:500;margin-top:1vh;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cars span{display:block;font-size:1.8vh;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cars em{display:inline-block;margin-top:.6vh;padding:.2vh .7vw;border-radius:99px;background:rgba(48,209,88,.16);color:#32d74b;font-style:normal;font-size:1.6vh;font-weight:600;}
.pic{margin:1.6vh 0 0 5.4vh;width:40%;height:26vh;border-radius:1.6vh;background:#1c1e24 center/cover no-repeat;}
.sug{display:flex;flex-wrap:wrap;gap:1vh .8vw;margin-left:5.4vh;}
.sug button{all:unset;cursor:pointer;padding:1vh 1.4vw;border-radius:99px;border:1px solid rgba(255,255,255,.18);font-size:2.2vh;color:rgba(255,255,255,.85);}
.sug button:active,.side button:active{background:rgba(255,255,255,.14);}
.bar{flex:none;display:flex;align-items:center;gap:1vw;padding:1.2vh 0 .4vh;}
.bar input{flex:1;min-width:0;height:7.4vh;border-radius:3.7vh;border:0;outline:0;background:#1c1c1e;color:#fff;font:inherit;font-size:2.7vh;padding:0 2vw;}
.bar input::placeholder{color:rgba(255,255,255,.4);}
.bar button{all:unset;cursor:pointer;flex:none;width:7.4vh;height:7.4vh;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1c1c1e;}
.bar button.send{background:#0a84ff;} .bar button.live{background:#0a84ff;animation:pl 1.2s ease-in-out infinite;}
@keyframes pl{50%{box-shadow:0 0 0 1.2vh rgba(10,132,255,.25)}}
.bar ha-icon{--mdc-icon-size:3.6vh;}
.empty{margin:auto;text-align:center;color:rgba(255,255,255,.55);font-size:2.7vh;line-height:1.5;}
.empty b{display:block;font-size:4.2vh;color:#fff;font-weight:600;margin-bottom:1vh;}
`;
class OsEchoChat extends HTMLElement {
setConfig(c) { this._c = Object.assign({ pipeline: "01m1mv4wd92910191722ek9eyr", device_id: "ec03f4d2ee9afa40eaee338d45e57228" }, c || {}); }
set hass(h) { this._hass = h; }
connectedCallback() {
if (this.shadowRoot) return;
const r = this.attachShadow({ mode: "open" });
r.innerHTML = `<style>${CSS}</style><div class="w"><div class="side" id="side"></div><div class="main"><div class="log" id="log"></div><div class="bar"><input id="in" placeholder="Ask Alexa anything" enterkeyhint="send" autocomplete="off"><button id="mic" aria-label="Speak"><ha-icon icon="mdi:microphone"></ha-icon></button><button class="send" id="go" aria-label="Send"><ha-icon icon="mdi:arrow-up"></ha-icon></button></div></div></div>`;
const $ = (id) => r.getElementById(id);
$("go").addEventListener("click", () => this._send());
$("in").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); this._send(); } this._poke(); });
$("in").addEventListener("focus", () => this._poke());
$("mic").addEventListener("click", () => this._mic());
$("side").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.new) this._show(this._newChat()); else this._show(b.dataset.id); });
$("log").addEventListener("click", (e) => { const b = e.target.closest("[data-sug]"); if (b) this._send(b.dataset.sug); });
if (this._pending !== undefined) this.open(this._pending);
}
_poke() { if (this.host && this.host._idle) this.host._idle(300000); }
_chats() { return load(CHATS); }
_put(chat) { const L = this._chats().filter((x) => x.id !== chat.id); chat.ts = Date.now(); L.push(chat); save(CHATS, L.slice(-20)); }
_get(id) { return this._chats().find((x) => x.id === id); }
_newChat(seed) {
const chat = { id: "c" + Date.now(), title: "New chat", cid: null, msgs: [], seed: null };
if (seed && (seed.q || seed.a)) {
chat.title = seed.q || "Alexa"; chat.turn = seed.turn;
if (seed.q) chat.msgs.push({ r: "u", t: seed.q });
chat.msgs.push({ r: "a", t: seed.a || "", card: seed.card || null });
chat.seed = `For context, earlier on this Echo Show I asked: "${seed.q || ""}". You answered: "${seed.a || ""}".`;
}
this._put(chat); return chat.id;
}
/* open(turn): the chat for that voice turn (made on first open), or the latest chat, or a new one */
open(turn) {
if (!this.shadowRoot) { this._pending = turn; return; }
let id = null;
if (turn) { const ex = this._chats().find((x) => x.turn === turn); if (ex) id = ex.id; else { const t = load(TURNS).find((y) => y.turn === turn); if (t) id = this._newChat(t); } }
if (!id) { const L = this._chats(); id = L.length && L[L.length - 1].msgs.length ? L[L.length - 1].id : (L.length ? L[L.length - 1].id : this._newChat()); }
this._show(id);
}
_show(id) {
this._id = id; const chat = this._get(id); if (!chat) return;
const L = this._chats().slice().reverse();
this.shadowRoot.getElementById("side").innerHTML = `<button class="new" data-new="1"><ha-icon icon="mdi:square-edit-outline"></ha-icon>New chat</button><small>Recent</small>` + L.map((c) => `<button data-id="${c.id}" class="${c.id === id ? "on" : ""}">${esc(c.title)}</button>`).join("");
this._render();
}
_render() {
const chat = this._get(this._id), log = this.shadowRoot.getElementById("log"); if (!chat) return;
if (!chat.msgs.length) { log.innerHTML = `<div class="empty"><b>Hi, what can I help with?</b>Type below or tap the microphone.<br>Answers here aren't spoken out loud.</div>`; return; }
const fmt = (t) => (this.host && this.host._fmt ? this.host._fmt(t) : esc(t));
let html = chat.msgs.map((m, i) => {
if (m.r === "u") return `<div class="u">${esc(m.t)}</div>`;
let x = `<div class="a"><div class="o${m.busy ? " busy" : ""}"></div><div class="t">${m.busy && !m.t ? `<span class="dots"><i></i><i></i><i></i></span>` : fmt(m.t)}</div></div>`;
const c = m.card;
if (c) {
let items = c.items; if (typeof items === "string") { try { items = JSON.parse(items.replace(/'/g, '"')); } catch (e) { items = []; } }
if (Array.isArray(items) && items.length) x += `<div class="cars">${items.slice(0, 10).map((it, k) => `<div class="c"><div class="im" id="m${i}i${k}"></div><b>${esc(it.t || it.title)}</b>${it.s ? `<span>${esc(it.s)}</span>` : ""}${it.g ? `<em>${esc(it.g)}</em>` : ""}</div>`).join("")}</div>`;
else { if (c.body && c.body !== m.t) x += `<div class="a"><div class="o" style="visibility:hidden"></div><div class="t" style="font-size:2.6vh">${fmt(c.body)}</div></div>`; if (c.image || c.image_query) x += `<div class="pic" id="m${i}p"${c.image ? ` style="background-image:url('${esc(c.image)}')"` : ""}></div>`; }
}
return x;
}).join("");
const last = chat.msgs[chat.msgs.length - 1];
if (last && last.r === "a" && !last.busy) html += `<div class="sug">${SUGGEST.map((s) => `<button data-sug="${s}">${s}</button>`).join("")}</div>`;
log.innerHTML = html; log.scrollTop = log.scrollHeight;
this._pics(chat);
}
async _pics(chat) {
const h = this.host; if (!h || !h._img) return;
for (let i = 0; i < chat.msgs.length; i++) {
const c = chat.msgs[i].card; if (!c) continue;
let items = c.items; if (typeof items === "string") { try { items = JSON.parse(items.replace(/'/g, '"')); } catch (e) { items = []; } }
if (Array.isArray(items) && items.length) for (let k = 0; k < Math.min(10, items.length); k++) { const it = items[k], u = await h._img(it.img || it.image, it.q || h._q(it)), el = this.shadowRoot.getElementById(`m${i}i${k}`); if (el && u) el.style.backgroundImage = `url("${u}")`; }
else if (!c.image && c.image_query) { const u = await h._img(null, c.image_query), el = this.shadowRoot.getElementById(`m${i}p`); if (el && u) el.style.backgroundImage = `url("${u}")`; }
}
}
/* typed follow-up: the Echo's own Assist pipeline, same conversation each time */
async _send(text) {
const inp = this.shadowRoot.getElementById("in"); text = (text || inp.value).trim(); if (!text || this._busy) return;
inp.value = ""; inp.blur(); this._poke();
const chat = this._get(this._id); if (!chat) return;
if (chat.title === "New chat") chat.title = text.slice(0, 60);
chat.msgs.push({ r: "u", t: text }); const a = { r: "a", t: "", busy: true }; chat.msgs.push(a); this._put(chat); this._render();
this._busy = true; this._chatCard = null; this._sentAt = Date.now() / 1000;
const full = chat.seed && !chat.cid ? `${chat.seed} Now: ${text}` : text;
const done = (t, cid) => {
const c2 = this._get(this._id) || chat, m = c2.msgs[c2.msgs.length - 1];
m.t = noEmoji(t) || "Sorry, I couldn't get an answer just now. Try again."; m.busy = false; if (this._chatCard) m.card = this._chatCard;
if (cid) c2.cid = cid; this._put(c2); this._busy = false; this._render();
/* typed turns are recorded and reviewed by the Alexa Recorder integration (it sees every Assist pipeline run) */
};
try {
let unsub = null, finished = false, out = "", cid = null;
const run = (msg) => this._hass.connection.subscribeMessage((ev) => {
const d = ev.data || {};
if (ev.type === "intent-progress" && d.chat_log_delta && d.chat_log_delta.content) { out += d.chat_log_delta.content; const c2 = this._get(this._id), m = c2.msgs[c2.msgs.length - 1]; m.t = out; this._put(c2); this._render(); }
if (ev.type === "intent-end") { const r = d.intent_output || {}; cid = r.conversation_id || cid; out = (((r.response || {}).speech || {}).plain || {}).speech || out; }
if (ev.type === "error") { out = out || ""; }
if (ev.type === "run-end" || ev.type === "error") { if (!finished) { finished = true; setTimeout(() => done(out, cid), this._chatCard === null ? 600 : 0); } if (unsub) unsub.then((u) => u && u()).catch(() => {}); }
}, msg);
const base = { type: "assist_pipeline/run", start_stage: "intent", end_stage: "intent", input: { text: full }, pipeline: this._c.pipeline, conversation_id: chat.cid || null };
try { unsub = run(Object.assign({ device_id: this._c.device_id }, base)); await unsub; }
catch (e) { unsub = run(base); await unsub; }
setTimeout(() => { if (!finished) { finished = true; done(out, cid); } }, 45000);
} catch (e) { done("", null); }
}
/* voice follow-up: wake the Echo's own assistant; the turn arrives through voice() */
_mic() { this._poke(); this._listening = true; this.shadowRoot.getElementById("mic").classList.add("live"); if (this._hass && this._c.wake) this._hass.callService("button", "press", { entity_id: this._c.wake }); clearTimeout(this._micT); this._micT = setTimeout(() => this._micOff(), 15000); }
_micOff() { this._listening = false; const b = this.shadowRoot && this.shadowRoot.getElementById("mic"); if (b) b.classList.remove("live"); }
voice(q, a) { this._micOff(); const chat = this._get(this._id); if (!chat) return; if (q) chat.msgs.push({ r: "u", t: q }); chat.msgs.push({ r: "a", t: noEmoji(a) }); if (chat.title === "New chat" && q) chat.title = q.slice(0, 60); this._put(chat); this._render(); this._poke(); }
/* a result card written while this chat is open (typed or spoken) joins the latest answer */
card(c) {
if (this._busy) { this._chatCard = c; return; }
const chat = this._get(this._id); if (!chat) return; const m = chat.msgs[chat.msgs.length - 1];
if (m && m.r === "a") { m.card = c; this._put(chat); this._render(); }
}
}
if (!customElements.get("os-echo-chat")) customElements.define("os-echo-chat", OsEchoChat);
})();
