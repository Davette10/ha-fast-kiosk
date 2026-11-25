/* Clark Home OS - v3 refinements (camera timeline previews, fast thermostat sends, two-way talk, media speaker groups) */
(() => {
const cache = new Map();
const resolve = async (hass, id) => { const c = cache.get(id); if (c && Date.now() - c.at < 6 * 3600e3) return c.url; const r = await hass.callWS({ type: "media_source/resolve_media", media_content_id: id }); const url = hass.hassUrl ? hass.hassUrl(r.url) : r.url; cache.set(id, { url, at: Date.now() }); return url; };
customElements.whenDefined("os-cam").then(() => {
const P = customElements.get("os-cam").prototype; if (P.__osV3b) return; P.__osV3b = true;
P._thumb = async function (el) {
const o = this._clips[+el.dataset.i]; if (!o || !o.jpg) return;
try { const url = await resolve(this._hass, o.jpg); o.thumb = url; const img = document.createElement("img"); img.decoding = "async"; img.alt = ""; img.src = url; img.onload = () => { if (el.isConnected && !el.querySelector("img")) el.prepend(img); }; } catch (e) {}
};
const b = P._build;
P._build = function () { b.apply(this, arguments); const st = document.createElement("style");
st.textContent = ".none{left:14px !important;right:auto !important;bottom:20px !important;text-align:left !important;max-width:calc(50% - 60px);line-height:1.25;}.c .tt{z-index:1;}.c.live{z-index:1;}";
this.shadowRoot.appendChild(st); const n = this.shadowRoot.getElementById("none"); if (n) n.textContent = "No motion clips yet";
const sr = this.shadowRoot, vid = sr.getElementById("vid"), old = sr.getElementById("mute"), gl = sr.getElementById("golive");
if (gl) gl.style.display = "none";
const mute = old.cloneNode(true); old.replaceWith(mute);
mute.addEventListener("click", () => {
if (this._idx === -1) { const v = this._liveVideo(); if (v) { v.muted = !v.muted; this._userMute = v.muted; if (!v.muted) v.play().catch(() => {}); } }
else { vid.muted = !vid.muted; this._clipMuted = vid.muted; }
this._muteUi();
});
vid.addEventListener("play", () => { if (this._clipMuted && !vid.muted) vid.muted = true; this._muteUi(); });
vid.addEventListener("playing", () => this._muteUi());
vid.addEventListener("volumechange", () => this._muteUi());
st.textContent += "#talkv{position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;overflow:hidden;pointer-events:none;}.top{display:none !important;}"
+ ".cb{flex:none;display:flex;align-items:center;gap:10px;height:" + (this._c.compact ? 58 : 64) + "px;padding:0 12px 0 16px;background:var(--os-cam-tl, rgba(18,18,20,0.96));border-bottom:1px solid rgba(255,255,255,0.06);color:#fff;}"
+ ".cb .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}.cb .n1{font-size:17px;font-weight:600;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.cb .n2{font-size:12px;font-weight:500;color:rgba(255,255,255,0.55);display:flex;align-items:center;gap:6px;}.cb .n2 i{width:6px;height:6px;border-radius:50%;background:#ff453a;display:none;}.cb.talking .n2 i{display:block;animation:tk 1.2s ease-in-out infinite;}@keyframes tk{50%{opacity:0.25;}}"
+ ".cb .pill{height:44px;padding:0 18px 0 14px;gap:7px;font-size:15px;font-weight:600;border:none;cursor:pointer;background:rgba(255,255,255,0.12);box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;-webkit-tap-highlight-color:transparent;transition:transform 140ms ease,background 180ms ease,color 180ms ease;}"
+ ".cb .pill:active{transform:scale(0.94);}.cb .rnd{width:44px;padding:0;justify-content:center;}.cb .pill ha-icon{--mdc-icon-size:22px;width:22px;height:22px;display:flex;}.cb #talk.on{background:#fff;color:#000;}"
+ ".ctl{left:12px;right:12px;bottom:12px;height:48px;padding:0 16px 0 6px;gap:12px;}.pp{width:36px;height:36px;}.pp ha-icon{--mdc-icon-size:22px;width:22px;height:22px;}.tm{font-size:13px;}"
+ ".c{border-radius:10px;}.c.live{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:rgba(255,255,255,0.14);}.c.live ha-icon{display:none;}.c.live.on{background:rgba(255,255,255,0.34);}";
const cb = document.createElement("div"); cb.className = "cb"; cb.id = "cb"; cb.innerHTML = '<div class="nm"><div class="n1"></div><div class="n2"><i></i><span id="sub">Live</span></div></div>'; cb.querySelector(".n1").textContent = this._c.name || "";
sr.querySelector(".tl").before(cb); cb.appendChild(mute);
if (this._c.talk) { const t = document.createElement("button"); t.className = "pill gone"; t.id = "talk"; t.setAttribute("aria-label", "Talk"); t.innerHTML = '<ha-icon icon="mdi:microphone-outline"></ha-icon><span>Talk</span>'; cb.appendChild(t); t.addEventListener("click", () => this._talk(!this._talking)); this._talkUi(); }
};
P._talkUi = function () { const sr = this.shadowRoot, t = sr.getElementById("talk"), sub = sr.getElementById("sub"), live = this._idx === -1; if (sub) sub.textContent = this._talking ? "Microphone on" : live ? "Live" : "Recording"; const cb = sr.getElementById("cb"); if (cb) cb.classList.toggle("talking", !!this._talking); if (!t) return; const ok = live && window.isSecureContext && !!customElements.get("webrtc-camera"); t.classList.toggle("gone", !ok); t.classList.toggle("on", !!this._talking); t.firstElementChild.setAttribute("icon", this._talking ? "mdi:microphone" : "mdi:microphone-outline"); t.lastElementChild.textContent = this._talking ? "Done" : "Talk"; if (!ok && !customElements.get("webrtc-camera") && !this._talkWait) { this._talkWait = true; customElements.whenDefined("webrtc-camera").then(() => this._talkUi()); } };
P._talk = function (on) {
const sr = this.shadowRoot; let box = sr.getElementById("talkv");
if (on && !box) {
const lv = this._liveVideo(); this._preMute = lv ? lv.muted : true; if (lv) lv.muted = true;
box = document.createElement("div"); box.id = "talkv"; const el = document.createElement("webrtc-camera");
el.setConfig({ url: this._c.talk, mode: "webrtc", media: "audio,microphone", muted: false, ui: false, background: true });
el.hass = this._hass; box.appendChild(el); sr.getElementById("stage").appendChild(box); this._talking = true; this._talkPath = location.pathname;
} else if (!on && box) { const w = box.querySelector("webrtc-camera"); try { if (w && w.pc) w.pc.getSenders().forEach((x) => { if (x.track) x.track.stop(); }); if (w && w.ondisconnect) w.ondisconnect(); } catch (e) {} box.remove(); this._talking = false; const lv = this._liveVideo(); if (lv && this._preMute === false) { lv.muted = false; lv.play().catch(() => {}); } }
this._talkUi(); this._muteUi();
};
const mk = P._mark;
P._mark = function () { mk.apply(this, arguments); if (this._idx !== -1 && this._talking) this._talk(false); this._talkUi(); };
const dc = P.disconnectedCallback;
P.disconnectedCallback = function () { if (this._talking) this._talk(false); if (this._offs) { this._offs.forEach((f) => f()); this._offs = null; } return dc.apply(this, arguments); };
P._goLive = function () {
const sr = this.shadowRoot, strip = sr && sr.getElementById("strip"), live = strip && strip.querySelector(".c.live"); if (!live) return;
this._quiet = true; clearTimeout(this._openT); this._idx = -1; this._center(live, false); this._mark(); this._open(); clearTimeout(this._qt); this._qt = setTimeout(() => { this._quiet = false; }, 250);
};
P._recenter = function () {
const sr = this.shadowRoot, strip = sr && sr.getElementById("strip"); if (!strip || !strip.clientWidth) return;
const t = strip.querySelector('.c[data-i="' + this._idx + '"]') || strip.querySelector(".c.live"); if (!t) return;
this._quiet = true; this._center(t, false); clearTimeout(this._qt); this._qt = setTimeout(() => { this._quiet = false; }, 250);
};
const cc = P.connectedCallback;
P.connectedCallback = function () {
const r = cc.apply(this, arguments); const sr = this.shadowRoot, strip = sr && sr.getElementById("strip");
if (this._offs) this._offs.forEach((f) => f()); this._offs = [];
requestAnimationFrame(() => this._goLive());
if (strip && window.ResizeObserver) { let w = strip.clientWidth; const ro = new ResizeObserver(() => { const n = strip.clientWidth; if (n === w) return; const was = w; w = n; if (!n) return; if (!was) this._goLive(); else this._recenter(); }); ro.observe(strip); this._offs.push(() => ro.disconnect()); }
if (window.IntersectionObserver) { const io = new IntersectionObserver((es) => { const vis = es[es.length - 1].isIntersecting; if (!vis && this._talking) this._talk(false); if (vis && this._wasHidden) this._goLive(); this._wasHidden = !vis && !this.getClientRects().length; }); io.observe(this); this._offs.push(() => io.disconnect()); }
const stop = () => { if (this._talking) this._talk(false); };
const vis = () => { if (document.hidden) stop(); };
const nav = () => { if (this._talkPath && location.pathname !== this._talkPath) stop(); setTimeout(() => { if (!this.isConnected || !this.getClientRects().length) stop(); }, 60); };
window.addEventListener("pagehide", stop); document.addEventListener("visibilitychange", vis); window.addEventListener("location-changed", nav); window.addEventListener("popstate", nav);
this._offs.push(() => { window.removeEventListener("pagehide", stop); document.removeEventListener("visibilitychange", vis); window.removeEventListener("location-changed", nav); window.removeEventListener("popstate", nav); });
return r;
};
const sp = P._strip;
P._strip = function () { const r = sp.apply(this, arguments); requestAnimationFrame(() => requestAnimationFrame(() => { const strip = this.shadowRoot.getElementById("strip"); if (strip && strip.clientWidth) this._recenter(); })); return r; };
P._muteUi = function () {
const sr = this.shadowRoot, b = sr.getElementById("mute"); if (!b) return;
const live = this._idx === -1, vid = sr.getElementById("vid");
const v = live ? this._liveVideo() : (vid.classList.contains("gone") ? null : vid);
b.classList.toggle("gone", !v || (live && !!this._talking));
if (v) { const ic = v.muted ? "mdi:volume-off" : "mdi:volume-high"; if (b.firstElementChild.getAttribute("icon") !== ic) b.firstElementChild.setAttribute("icon", ic); }
};
const pk = P._peek;
P._peek = function () { pk.apply(this, arguments); if (this._clips[this._idx]) this.shadowRoot.getElementById("mute").classList.remove("gone"); };
});
customElements.whenDefined("os-thermo").then(() => {
const P = customElements.get("os-thermo").prototype; if (P.__osV3b) return; P.__osV3b = true;
const TEMP_MS = 500, MODE_MS = 500, HOLD = 8000;
const tg = (e) => { const a = e.attributes; return [a.temperature, a.target_temp_low, a.target_temp_high].join("|"); };
P._arm = function () { const p = this._p; clearTimeout(this._timer); clearTimeout(this._hold); this._timer = setTimeout(() => this._send(), p.dT ? TEMP_MS : MODE_MS); };
const s = P._send;
P._send = function () {
const p = this._p, e = this._ent();
if (p && e && !p.dM && p.dT) { const a = e.attributes; const same = p.lo != null ? a.target_temp_low === p.lo && a.target_temp_high === p.hi : a.temperature === p.t; if (same) { this._timer = null; this._p = null; this._render(); return; } }
if (p && e) { this._base = e.state + "|" + tg(e); const now = Date.now(); this._sentLog = (this._sentLog || []).filter((x) => now - x.at < 15000); this._sentLog.push({ at: now, v: [p.t, p.lo, p.hi].join("|") }); }
const r = s.apply(this, arguments);
clearTimeout(this._hold); this._hold = setTimeout(() => { if (this._p && !this._timer) { this._p = null; this._render(); } }, HOLD);
return r;
};
const st = P._settle;
P._settle = function () {
const p = this._p, e = this._ent();
if (p && e && p.sent && !this._timer && this._base != null) { const cur = tg(e), now = Date.now(), mine = [p.t, p.lo, p.hi].join("|");
if (e.state + "|" + cur !== this._base && cur !== mine && !(this._sentLog || []).some((x) => x.v === cur && now - x.at < 15000) && (p.mode == null || p.mode === e.state)) { this._p = null; clearTimeout(this._hold); return; } }
return st.apply(this, arguments);
};
});
customElements.whenDefined("os-media-app").then(() => {
const P = customElements.get("os-media-app").prototype; if (P.__osV3b) return; P.__osV3b = true;
const rs = P._renderSide;
P._renderSide = function () {
const r = rs.apply(this, arguments); const sr = this.shadowRoot, side = sr && sr.getElementById("side"); if (!side) return r;
if (!sr.getElementById("v3seg")) { const st = document.createElement("style"); st.id = "v3seg"; st.textContent = ".side{overflow:hidden !important;display:flex;flex-direction:column;}.gh{display:none !important;}.seg{flex:none;display:flex;gap:4px;margin:12px 4px 10px;padding:4px;border-radius:14px;background:rgba(127,127,127,0.16);}.seg button{flex:1;min-width:0;height:38px;border:none;border-radius:10px;background:transparent;color:inherit;opacity:0.62;font:inherit;font-size:14px;font-weight:600;letter-spacing:-0.01em;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background-color 200ms ease,opacity 200ms ease,transform 140ms ease;}.seg button:active{transform:scale(0.96);}.seg button.on{background:rgba(127,127,127,0.34);opacity:1;}.spk.v3h{display:none !important;}"; sr.appendChild(st);
side.addEventListener("click", (e) => { const b = e.target.closest(".seg button"); if (b) { this._grp = b.dataset.g; this._grpPicked = true; this._segUi(); } }); }
this._segUi(); return r;
};
P._segUi = function () {
const side = this.shadowRoot.getElementById("side"); if (!side) return;
const groups = []; let g = null, selG = null;
[...side.children].forEach((el) => { if (el.classList.contains("gh")) { g = el.textContent; groups.push(g); } else if (el.classList.contains("spk")) { el.dataset.g = g || ""; if (el.classList.contains("sel")) selG = g; } });
if (groups.length < 2) return;
if (this._selSeen !== (selG || "")) { this._selSeen = selG || ""; if (selG && !this._grpPicked) this._grp = selG; }
const act = groups.includes(this._grp) ? this._grp : (selG || groups[0]); this._grp = act;
let seg = side.querySelector(".seg"); const key = groups.join("|");
if (!seg || seg.dataset.k !== key) { if (seg) seg.remove(); seg = document.createElement("div"); seg.className = "seg"; seg.dataset.k = key; groups.forEach((n) => { const b = document.createElement("button"); b.dataset.g = n; b.textContent = n; seg.appendChild(b); }); const sh = side.querySelector(".sh"); if (sh) sh.after(seg); else side.prepend(seg); }
seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.g === act));
side.querySelectorAll(".spk").forEach((el) => el.classList.toggle("v3h", el.dataset.g !== act));
};
});
})();
