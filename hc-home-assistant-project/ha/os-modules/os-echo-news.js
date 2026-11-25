/* Clark Home OS - Echo Show live news (custom element os-echo-news, opened by os-echo as the "news" panel).
   Full-screen live TV: the picture fills the screen, a tap shows a back button, the channel name, a Sound button
   and a row of big channel buttons, which fade away again after a few seconds. The live video for each channel is
   found with the YouTube Data API (yt_key, cached 3 h per channel); the YouTube player runs without its own controls
   and is driven through its postMessage API (play, mute, unmute, errors). */
(() => {
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const CSS = `
:host{display:block;position:relative;height:100%;background:#000;color:#fff;overflow:hidden;font-family:inherit;}
.v,.v iframe,.catch{position:absolute;inset:0;width:100%;height:100%;border:0;}
.v iframe{opacity:0;transition:opacity .5s;} .v iframe.on{opacity:1;}
.catch{z-index:2;}
.ui{position:absolute;inset:0;z-index:3;pointer-events:none;opacity:1;transition:opacity .35s;}
.ui.hide{opacity:0;}
.ui.hide *{pointer-events:none!important;}
.top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:1.6vw;padding:3vh 3vw 6vh;background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);}
.cb{all:unset;cursor:pointer;pointer-events:auto;flex:none;width:8.6vh;height:8.6vh;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(40,40,44,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
.cb ha-icon{--mdc-icon-size:4.4vh;}
.cb.on{background:#fff;color:#000;}
.nm{flex:1;min-width:0;display:flex;align-items:center;gap:1.2vw;}
.nm b{font-size:4.2vh;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.live{flex:none;display:inline-flex;align-items:center;gap:.6vw;padding:.6vh 1vw;border-radius:99px;background:#ff3b30;font-size:2vh;font-weight:700;letter-spacing:.08em;}
.live i{width:1vh;height:1vh;border-radius:50%;background:#fff;animation:lp 1.6s ease-in-out infinite;}
@keyframes lp{50%{opacity:.3}}
.cb.wide{width:auto;padding:0 2.4vw;gap:.9vw;border-radius:4.3vh;font-size:2.5vh;font-weight:600;}
.dock{position:absolute;left:0;right:0;bottom:0;display:flex;gap:1.2vw;padding:7vh 3vw 3.4vh;background:linear-gradient(0deg,rgba(0,0,0,.8),transparent);overflow-x:auto;touch-action:pan-x;scrollbar-width:none;}
.dock button{all:unset;cursor:pointer;pointer-events:auto;flex:none;min-width:17vw;padding:2vh 1.8vw;border-radius:2.4vh;background:rgba(40,40,44,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);font-size:2.6vh;font-weight:600;text-align:center;}
.dock button.on{background:#fff;color:#000;}
.dock button small{display:block;font-size:1.8vh;font-weight:500;opacity:.6;margin-top:.4vh;}
.st{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6vh;text-align:center;padding:0 10vw 14vh;}
.st b{font-size:4vh;font-weight:600;} .st span{font-size:2.6vh;color:rgba(255,255,255,.6);max-width:60vw;line-height:1.4;}
.st .row{display:flex;gap:1vw;flex-wrap:wrap;justify-content:center;margin-top:1vh;}
.st .row button{all:unset;cursor:pointer;padding:1.6vh 2.2vw;border-radius:99px;background:#fff;color:#000;font-size:2.4vh;font-weight:600;}
.spin{width:6vh;height:6vh;border-radius:50%;border:.6vh solid rgba(255,255,255,.15);border-top-color:#fff;animation:sp .9s linear infinite;}
@keyframes sp{to{transform:rotate(360deg)}}
.st.off{display:none;}
`;
class OsEchoNews extends HTMLElement {
setConfig(c) { this._c = Object.assign({ channels: [], key: "", muted: false }, c || {}); this._muted = !!this._c.muted; }
set hass(h) { this._hass = h; }
connectedCallback() {
if (this.shadowRoot) return;
const r = this.attachShadow({ mode: "open" });
r.innerHTML = `<style>${CSS}</style><div class="v" id="v"></div><div class="st" id="st"></div><div class="catch" id="catch"></div>
<div class="ui" id="ui"><div class="top"><button class="cb" id="back" aria-label="Back"><ha-icon icon="mdi:chevron-left"></ha-icon></button><div class="nm"><span class="live" id="lv"><i></i>LIVE</span><b id="nm"></b></div><button class="cb wide" id="snd" aria-label="Sound"><ha-icon icon="mdi:volume-off"></ha-icon><span id="sndt">Sound off</span></button></div><div class="dock" id="dock"></div></div>`;
const $ = (id) => r.getElementById(id);
$("catch").addEventListener("click", () => this._wake());
$("back").addEventListener("click", () => { if (this.host && this.host._close) this.host._close(); });
$("snd").addEventListener("click", () => { this._sound(!this._muted ? true : false); this._wake(); });
$("dock").addEventListener("click", (e) => { const b = e.target.closest("[data-ch]"); if (b) this.play(b.dataset.ch); });
$("st").addEventListener("click", (e) => { const b = e.target.closest("[data-ch]"); if (b) this.play(b.dataset.ch); });
this._onMsg = (e) => this._yt(e);
window.addEventListener("message", this._onMsg);
this._drawDock(); this._sndIcon();
if (this._want) this.play(this._want);
}
disconnectedCallback() { window.removeEventListener("message", this._onMsg); clearTimeout(this._hideT); clearTimeout(this._slowT); clearInterval(this._lisT); }
_ch(id) { const L = this._c.channels; return L.find((n) => n.id === id) || L[0]; }
_drawDock() {
const d = this.shadowRoot && this.shadowRoot.getElementById("dock"); if (!d) return;
d.innerHTML = this._c.channels.map((n) => `<button data-ch="${n.id}" class="${this._cur && this._cur.id === n.id ? "on" : ""}">${esc(n.name)}</button>`).join("");
}
/* show the controls; they fade out again after 5 s while the picture is playing */
_wake() {
const ui = this.shadowRoot.getElementById("ui"); ui.classList.remove("hide"); clearTimeout(this._hideT);
if (this.host && this.host._idle) clearTimeout(this.host._pIdle);
if (this._playing) this._hideT = setTimeout(() => ui.classList.add("hide"), 5000);
}
_state(kind, ch) {
const st = this.shadowRoot.getElementById("st"), $ = (id) => this.shadowRoot.getElementById(id);
$("lv").style.display = kind === "play" ? "" : "none";
if (kind === "play") { st.className = "st off"; return; }
st.className = "st";
const others = this._c.channels.filter((n) => n.id !== ch.id).slice(0, 3).map((n) => `<button data-ch="${n.id}">${esc(n.name)}</button>`).join("");
if (kind === "load") st.innerHTML = `<div class="spin"></div><b>${esc(ch.name)}</b><span>Tuning in…</span>`;
else if (kind === "slow") st.innerHTML = `<div class="spin"></div><b>${esc(ch.name)}</b><span>Still loading. You can pick another channel below.</span>`;
else if (kind === "off") st.innerHTML = `<b>${esc(ch.name)} isn’t live right now</b><span>Try one of these instead:</span><div class="row">${others}</div>`;
else if (kind === "nokey") st.innerHTML = `<b>News isn’t set up yet</b><span>Live news needs a free YouTube key in the Echo dashboard (yt_key).</span>`;
else st.innerHTML = `<b>${esc(ch.name)} can’t be shown here</b><span>Try another channel:</span><div class="row">${others}</div>`;
}
/* the channel's current live video: YouTube Data API search, cached for 3 hours */
async _live(ch, force) {
if (ch.video) return ch.video;
const k = "osecho-yt-" + ch.ch; let c = null;
try { c = JSON.parse(localStorage.getItem(k) || "null"); } catch (e) {}
if (!force && c && Date.now() - c.t < 3 * 36e5) return c.v;
if (!this._c.key) return undefined;
try {
const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&channelId=${encodeURIComponent(ch.ch)}&eventType=live&type=video&order=viewCount&maxResults=1&key=${encodeURIComponent(this._c.key)}`);
const j = await r.json(), v = j && j.items && j.items[0] && j.items[0].id && j.items[0].id.videoId;
try { if (v) localStorage.setItem(k, JSON.stringify({ v, t: Date.now() })); else localStorage.removeItem(k); } catch (e) {}
return v || null;
} catch (e) { return null; }
}
async play(id, force) {
if (!this.shadowRoot) { this._want = id || (this._c.channels[0] || {}).id; return; }
const ch = this._ch(id); if (!ch) return;
this._cur = ch; this._playing = false; this._vid = null; this._retried = !!force && this._retried;
const $ = (i) => this.shadowRoot.getElementById(i);
$("nm").textContent = ch.name; this._drawDock(); this._wake();
$("v").innerHTML = ""; this._state("load", ch);
clearTimeout(this._slowT); clearInterval(this._lisT);
const v = await this._live(ch, force);
if (this._cur !== ch) return;
if (v === undefined) return this._state("nokey", ch);
if (!v) return this._state("off", ch);
this._vid = v;
const f = document.createElement("iframe");
f.src = `https://www.youtube.com/embed/${encodeURIComponent(v)}?autoplay=1&mute=${this._muted ? 1 : 0}&controls=0&disablekb=1&fs=0&iv_load_policy=3&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
f.allow = "autoplay; encrypted-media"; f.referrerPolicy = "strict-origin-when-cross-origin";
f.addEventListener("load", () => {
/* ask the player to report its state (it keeps sending updates once we are "listening") */
let n = 0; clearInterval(this._lisT);
this._lisT = setInterval(() => { if (this._playing || ++n > 10 || !f.contentWindow) return clearInterval(this._lisT); f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "osnews", channel: "widget" }), "*"); }, 500);
});
$("v").appendChild(f); this._frame = f;
this._slowT = setTimeout(() => { if (this._cur === ch && !this._playing) { this._state("slow", ch); f.classList.add("on"); } }, 12000);
}
_cmd(func, args) { const f = this._frame; if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*"); }
_yt(e) {
if (!this._frame || e.source !== this._frame.contentWindow) return;
let d = e.data; if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
if (!d) return;
const state = d.event === "onStateChange" ? d.info : d.event === "infoDelivery" && d.info ? d.info.playerState : undefined;
if (state === 1 && !this._playing) {
this._playing = true; clearTimeout(this._slowT); this._frame.classList.add("on"); this._state("play", this._cur);
if (!this._muted) { this._cmd("unMute"); this._cmd("setVolume", [100]); }
this._wake();
}
if (d.event === "onError") {
/* an old cached video (the stream restarted): look it up again once, otherwise say so */
const ch = this._cur;
if (!this._retried && ch && !ch.video) { this._retried = true; this.play(ch.id, true); } else this._state("err", ch);
}
}
_sound(mute) { this._muted = mute; if (mute) this._cmd("mute"); else { this._cmd("unMute"); this._cmd("setVolume", [100]); this._cmd("playVideo"); } this._sndIcon(); }
_sndIcon() {
const b = this.shadowRoot && this.shadowRoot.getElementById("snd"); if (!b) return;
b.classList.toggle("on", !this._muted); b.querySelector("ha-icon").setAttribute("icon", this._muted ? "mdi:volume-off" : "mdi:volume-high"); b.querySelector("span").textContent = this._muted ? "Sound off" : "Sound on";
}
}
if (!customElements.get("os-echo-news")) customElements.define("os-echo-news", OsEchoNews);
})();
