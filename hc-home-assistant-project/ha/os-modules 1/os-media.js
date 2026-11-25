/* Clark Home OS - Spotify-style media page */
(() => {
const FONT_TEXT = '-apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
const BASE_CSS = `
:host { display:block; font-family: var(--os-font, ${FONT_TEXT}); color: #f5f5f7;
-webkit-font-smoothing: antialiased; font-feature-settings: "ss03", "cv11"; }
`;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MA_TABS = [["playlist", "Playlists"], ["album", "Albums"], ["artist", "Artists"], ["radio", "Radio"], ["track", "Songs"]];
const CARD_CSS = `
.card { background: #121214; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; box-sizing: border-box; min-width: 0; min-height: 0; }
.kicker { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #a1a1a6; }
.kicker ha-icon { --mdc-icon-size: 15px; width: 15px; height: 15px; display: inline-flex; }
button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
`;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const ftime = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
class OsMediaApp extends HTMLElement {
setConfig(c) {
if (!c || !c.config_entry_id) throw new Error("config_entry_id required");
this._c = c;
this._tab = lsGet("os-ma-tab") || "playlist";
this._q = "";
this._cache = {};
if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
}
getCardSize() { return 14; }
getGridOptions() { return { columns: "full", rows: "auto" }; }
connectedCallback() {
this._tick = setInterval(() => this._progress(), 1000);
this._lib = setInterval(() => { this._cache = {}; if (!this._q) this._load(); }, 600000);
this._sel = null;
if (this._hass) { this._renderSide(true); this._renderBar(true); }
}
disconnectedCallback() { clearInterval(this._tick); clearInterval(this._lib); }
set hass(h) {
const first = !this._hass;
this._hass = h;
this._renderSide();
this._renderBar();
if (first) this._load();
}
_players() {
const h = this._hass, c = this._c, out = [];
const names = c.names || {};
const ma = Object.keys(h.entities || {}).filter((id) => id.startsWith("media_player.") && h.entities[id].platform === "music_assistant"
&& h.states[id] && !id.includes("browser_mod") && !(c.exclude || []).includes(id));
ma.sort((a, b) => (names[a] || a).localeCompare(names[b] || b));
if (c.default_player && ma.includes(c.default_player)) { ma.splice(ma.indexOf(c.default_player), 1); ma.unshift(c.default_player); }
ma.forEach((id) => out.push({ id, kind: "ma", group: "Music", name: names[id] || h.states[id].attributes.friendly_name, icon: (c.icons || {})[id] || "mdi:speaker" }));
(c.groups || []).forEach((g) => (g.entities || []).forEach((e) => {
const id = typeof e === "string" ? e : e.entity;
if (!h.states[id]) return;
out.push({ id, kind: g.kind || "other", group: g.title, name: e.name || h.states[id].attributes.friendly_name, icon: e.icon || g.icon || "mdi:speaker" });
}));
return out;
}
_active(s) { return s && (s.state === "playing" || s.state === "paused" || s.state === "buffering"); }
_target() {
const ps = this._players();
if (this._sel && ps.some((p) => p.id === this._sel)) return ps.find((p) => p.id === this._sel);
const h = this._hass;
const stored = lsGet("os-media-target");
const playing = ps.find((p) => h.states[p.id].state === "playing");
const st = ps.find((p) => p.id === stored);
const pick = (st && h.states[st.id].state === "playing") ? st : playing || st || ps.find((p) => p.id === this._c.default_player) || ps[0];
this._sel = pick && pick.id;
return pick;
}
_select(id) {
this._sel = id; lsSet("os-media-target", id);
this._renderSide(true); this._renderBar(true); this._context();
}
_build() {
this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}
:host{display:block;height:100%;}
.app{display:grid;height:100%;grid-template-columns:290px minmax(0,1fr);grid-template-rows:minmax(0,1fr) 96px;gap:16px;}
.side{padding:18px 10px 12px;overflow-y:auto;scrollbar-width:none;}
.side::-webkit-scrollbar,.scroll::-webkit-scrollbar{display:none;}
.gh{font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6e6e73;padding:14px 12px 6px;}
.sh{font-family:var(--os-font-display,system-ui);font-size:22px;font-weight:700;letter-spacing:-0.02em;padding:0 12px 2px;}
.spk{width:100%;display:grid;grid-template-columns:40px minmax(0,1fr) 18px;align-items:center;gap:12px;padding:8px 10px;border:none;background:transparent;
border-radius:12px;cursor:pointer;text-align:left;transition:background-color 200ms ease,transform 140ms ease;}
.spk:active{transform:scale(0.97);}
.spk.sel{background:rgba(255,255,255,0.10);}
.spk .ic{width:40px;height:40px;border-radius:10px;background:#2c2c2e;display:flex;align-items:center;justify-content:center;color:#a1a1a6;overflow:hidden;}
.spk .ic img{width:100%;height:100%;object-fit:cover;}
.spk.sel .ic{background:#f5f5f7;color:#1d1d1f;}
.spk .ic ha-icon{--mdc-icon-size:22px;width:22px;height:22px;display:inline-flex;}
.spk .n{font-size:16px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#a1a1a6;}
.spk.sel .n,.spk.on .n{color:#f5f5f7;}
.spk .s{font-size:13px;color:#6e6e73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
.spk.on .s{color:#a1a1a6;}
.spk.dead{opacity:0.45;}
.eq{display:flex;align-items:flex-end;gap:2px;height:14px;}
.eq i{width:3px;background:#f5f5f7;border-radius:1px;animation:eq 900ms ease-in-out infinite;}
.eq i:nth-child(2){animation-delay:-300ms;}.eq i:nth-child(3){animation-delay:-600ms;}
@keyframes eq{0%,100%{height:4px;}50%{height:14px;}}
.main{display:flex;flex-direction:column;padding:18px 0 0;overflow:hidden;}
.top{display:flex;gap:12px;align-items:center;padding:0 22px;}
.search{flex:1;display:flex;align-items:center;gap:10px;height:50px;padding:0 18px;border-radius:999px;background:#1c1c1e;border:1px solid transparent;transition:border-color 200ms ease;}
.search:focus-within{border-color:rgba(255,255,255,0.18);}
.search ha-icon{--mdc-icon-size:22px;width:22px;height:22px;color:#a1a1a6;display:inline-flex;}
.search input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:#f5f5f7;font:400 17px var(--os-font,system-ui);letter-spacing:-0.02em;}
.search input::placeholder{color:#6e6e73;}
.clr{width:30px;height:30px;border-radius:50%;border:none;background:#2c2c2e;color:#f5f5f7;display:none;align-items:center;justify-content:center;cursor:pointer;}
.clr ha-icon{--mdc-icon-size:18px;width:18px;height:18px;color:inherit;}
.ctx{padding:12px 22px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.ctx:empty{display:none;}
.note{font-size:14px;color:#a1a1a6;display:flex;align-items:center;gap:8px;}
.note ha-icon{--mdc-icon-size:18px;width:18px;height:18px;display:inline-flex;}
.chips{display:flex;gap:8px;flex-wrap:wrap;padding:14px 22px 4px;}
.chip{height:38px;padding:0 18px;border-radius:999px;border:none;background:#1c1c1e;color:#f5f5f7;
font:600 15px/1 var(--os-font,system-ui);letter-spacing:-0.01em;cursor:pointer;transition:transform 140ms ease,background-color 200ms ease;display:inline-flex;align-items:center;gap:8px;max-width:100%;}
.chip ha-icon{--mdc-icon-size:18px;width:18px;height:18px;display:inline-flex;}
.chip span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.chip:active{transform:scale(0.94);}
.chip.on{background:#f5f5f7;color:#1d1d1f;}
.chip.ask{background:#2997ff;color:#fff;height:44px;font-size:16px;}
.scroll{flex:1;overflow-y:auto;padding:10px 22px 22px;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
h3{font:600 20px/1.2 var(--os-font-display,system-ui);letter-spacing:-0.01em;margin:14px 0 12px;color:#f5f5f7;}
h3:first-child{margin-top:4px;}
.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:20px 16px;}
.item{cursor:pointer;min-width:0;transition:transform 160ms ease;-webkit-tap-highlight-color:transparent;}
.item:active{transform:scale(0.95);}
.art{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:#2c2c2e;display:flex;align-items:center;justify-content:center;}
.art.round{border-radius:50%;}
.art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.art > ha-icon{--mdc-icon-size:36px;width:36px;height:36px;color:#6e6e73;}
.go{position:absolute;right:8px;bottom:8px;width:42px;height:42px;border-radius:50%;background:#f5f5f7;color:#1d1d1f;
display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(6px) scale(0.9);transition:all 220ms ease;box-shadow:0 4px 14px rgba(0,0,0,0.4);}
.go ha-icon{--mdc-icon-size:24px;width:24px;height:24px;color:inherit;}
.item.busy .go{opacity:1;transform:none;}
.t{font-size:15px;font-weight:600;letter-spacing:-0.01em;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s2{font-size:13px;color:#a1a1a6;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.empty{color:#6e6e73;font-size:16px;padding:40px 0;text-align:center;}
.bar{grid-column:1 / 3;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) minmax(0,1fr);align-items:center;gap:20px;padding:0 20px 0 14px;}
.np{display:flex;align-items:center;gap:14px;min-width:0;}
.np .a{width:68px;height:68px;flex:none;border-radius:10px;overflow:hidden;background:#2c2c2e;display:flex;align-items:center;justify-content:center;color:#6e6e73;}
.np .a img{width:100%;height:100%;object-fit:cover;}
.np .a ha-icon{--mdc-icon-size:28px;width:28px;height:28px;}
.np .tt{font-size:17px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.np .ss{font-size:14px;color:#a1a1a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.ctr{display:flex;flex-direction:column;align-items:center;gap:6px;}
.btns{display:flex;align-items:center;gap:18px;}
.b{width:46px;height:46px;border:none;border-radius:50%;background:transparent;color:#f5f5f7;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 140ms ease,opacity 200ms ease;}
.b:active{transform:scale(0.88);}
.b ha-icon{--mdc-icon-size:28px;width:28px;height:28px;color:inherit;}
.b.pp{width:56px;height:56px;background:#f5f5f7;color:#1d1d1f;}
.b.pp ha-icon{--mdc-icon-size:32px;width:32px;height:32px;}
.b[disabled]{opacity:0.3;pointer-events:none;}
.prog{display:flex;align-items:center;gap:10px;width:100%;font-size:11px;font-weight:600;color:#6e6e73;font-variant-numeric:tabular-nums;}
.prog.hide{visibility:hidden;}
.track{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.14);overflow:hidden;}
.track i{display:block;height:100%;background:#f5f5f7;border-radius:2px;width:0;}
.vol{display:flex;align-items:center;gap:12px;justify-content:flex-end;}
.vol .who{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:#a1a1a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}
.vol .who ha-icon{--mdc-icon-size:18px;width:18px;height:18px;flex:none;}
input[type=range]{-webkit-appearance:none;appearance:none;width:150px;flex:none;height:28px;background:transparent;cursor:pointer;}
input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#f5f5f7 var(--v,50%),rgba(255,255,255,0.16) var(--v,50%));}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;margin-top:-8px;box-shadow:0 2px 8px rgba(0,0,0,0.4);}
input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:rgba(255,255,255,0.16);}
input[type=range]::-moz-range-progress{height:6px;border-radius:3px;background:#f5f5f7;}
input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:none;}
.toast{position:absolute;left:50%;bottom:112px;transform:translate(-50%,12px);opacity:0;pointer-events:none;transition:all 260ms ease;z-index:5;
padding:12px 20px;border-radius:999px;background:rgba(44,44,46,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);font-size:15px;font-weight:600;white-space:nowrap;box-shadow:0 8px 30px rgba(0,0,0,0.5);}
.toast.show{opacity:1;transform:translate(-50%,0);}
.wrap{position:relative;height:100%;}
</style>
<div class="wrap"><div class="app">
<div class="card side" id="side"></div>
<div class="card main">
<div class="top"><label class="search"><ha-icon icon="mdi:magnify"></ha-icon><input id="q" placeholder="What do you want to play?" autocomplete="off" enterkeyhint="search"><button class="clr" id="clr" aria-label="Clear"><ha-icon icon="mdi:close"></ha-icon></button></label></div>
<div class="ctx" id="ctx"></div>
<div class="chips" id="tabs"></div>
<div class="scroll" id="body"><div class="empty">Loading your music…</div></div>
</div>
<div class="card bar" id="bar">
<div class="np"><div class="a" id="bart"></div><div style="min-width:0"><div class="tt" id="btt"></div><div class="ss" id="bss"></div></div></div>
<div class="ctr"><div class="btns">
<button class="b" id="prev" aria-label="Previous"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
<button class="b pp" id="pp" aria-label="Play or pause"><ha-icon icon="mdi:play"></ha-icon></button>
<button class="b" id="next" aria-label="Next"><ha-icon icon="mdi:skip-next"></ha-icon></button></div>
<div class="prog" id="prog"><span id="pos">0:00</span><div class="track"><i id="fill"></i></div><span id="dur">0:00</span></div></div>
<div class="vol"><div class="who" id="who"></div><button class="b" id="mute" aria-label="Mute" style="width:36px;height:36px"><ha-icon icon="mdi:volume-high" style="--mdc-icon-size:22px;width:22px;height:22px"></ha-icon></button><input type="range" id="vol" min="0" max="100" step="1"></div>
</div>
</div><div class="toast" id="toast"></div></div>`;
const $ = (id) => this.shadowRoot.getElementById(id);
const q = $("q");
q.addEventListener("input", () => {
this._q = q.value.trim();
$("clr").style.display = this._q ? "flex" : "none";
clearTimeout(this._deb); this._deb = setTimeout(() => { this._context(); this._load(); }, 450);
});
q.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(this._deb); this._context(); this._load(); q.blur(); } });
$("clr").addEventListener("click", (e) => { e.preventDefault(); q.value = ""; this._q = ""; $("clr").style.display = "none"; this._context(); this._load(); });
$("side").addEventListener("click", (e) => { const b = e.target.closest(".spk"); if (b) this._select(b.dataset.id); });
$("tabs").addEventListener("click", (e) => {
const b = e.target.closest(".chip"); if (!b) return;
this._tab = b.dataset.k; lsSet("os-ma-tab", this._tab); this._renderTabs(); this._load();
});
$("ctx").addEventListener("click", (e) => {
const b = e.target.closest("[data-say]"); if (b) this._alexa(b.dataset.say, b.dataset.label || b.dataset.say);
});
$("body").addEventListener("click", (e) => { const it = e.target.closest(".item"); if (it) this._play(it); });
const svc = (s, d) => { const t = this._target(); if (t) this._hass.callService("media_player", s, Object.assign({ entity_id: t.id }, d || {})); };
$("prev").addEventListener("click", () => svc("media_previous_track"));
$("next").addEventListener("click", () => svc("media_next_track"));
$("pp").addEventListener("click", () => {
const t = this._target(); if (!t) return;
const s = this._hass.states[t.id];
if (s.state === "playing") svc("media_pause");
else if (s.state === "paused") svc("media_play");
else this._toast("Pick something to play");
});
$("mute").addEventListener("click", () => {
const t = this._target(); if (!t) return;
svc("volume_mute", { is_volume_muted: !this._hass.states[t.id].attributes.is_volume_muted });
});
const vol = $("vol");
vol.addEventListener("input", () => {
vol.style.setProperty("--v", vol.value + "%");
this._volBusy = Date.now();
clearTimeout(this._vt); this._vt = setTimeout(() => svc("volume_set", { volume_level: vol.value / 100 }), 250);
});
this._renderTabs();
}
_sub(p) {
const s = this._hass.states[p.id];
if (!s || s.state === "unavailable") return "Offline";
const a = s.attributes;
if (s.state === "playing" || s.state === "paused") {
const line = [a.media_title, a.media_artist].filter(Boolean).join(" · ") || a.app_name || "";
return s.state === "paused" ? "Paused" + (line ? " · " + line : "") : line || "Playing";
}
if (p.kind === "tv") return s.state === "off" || s.state === "standby" ? "Off" : a.app_name || "On";
return "Ready";
}
_renderSide(force) {
if (!this._hass) return;
const ps = this._players(), t = this._target();
const sig = ps.map((p) => { const s = this._hass.states[p.id]; return p.id + s.state + (s.attributes.media_title || "") + (s.attributes.entity_picture || ""); }).join("|") + (t && t.id);
if (!force && sig === this._sideSig) return;
this._sideSig = sig;
let html = `<div class="sh">Play on</div>`, g = null;
ps.forEach((p) => {
if (p.group !== g) { g = p.group; html += `<div class="gh">${esc(g)}</div>`; }
const s = this._hass.states[p.id];
const on = s.state === "playing", dead = s.state === "unavailable";
const pic = this._active(s) && (s.attributes.entity_picture_local || s.attributes.entity_picture);
html += `<button class="spk ${t && t.id === p.id ? "sel" : ""} ${on ? "on" : ""} ${dead ? "dead" : ""}" data-id="${p.id}">
<div class="ic">${pic ? `<img src="${esc(pic)}" onerror="this.remove()">` : `<ha-icon icon="${p.icon}"></ha-icon>`}</div>
<div style="min-width:0"><div class="n">${esc(p.name)}</div><div class="s">${esc(this._sub(p))}</div></div>
<div>${on ? '<div class="eq"><i></i><i></i><i></i></div>' : ""}</div></button>`;
});
this.shadowRoot.getElementById("side").innerHTML = html;
this._context();
}
_renderBar(force) {
if (!this._hass) return;
const t = this._target(); if (!t) return;
const s = this._hass.states[t.id], a = s.attributes, act = this._active(s);
const pic = act && (a.entity_picture_local || a.entity_picture);
const sig = [t.id, s.state, a.media_title, a.media_artist, pic, a.volume_level, a.is_volume_muted, a.media_duration, a.media_position].join("|");
if (!force && sig === this._barSig) return;
this._barSig = sig;
const $ = (id) => this.shadowRoot.getElementById(id);
$("bart").innerHTML = pic ? `<img src="${esc(pic)}" onerror="this.remove()">` : `<ha-icon icon="${t.icon}"></ha-icon>`;
$("btt").textContent = act ? a.media_title || a.app_name || t.name : "Not playing";
$("bss").textContent = act ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") || (s.state === "paused" ? "Paused" : "") : s.state === "unavailable" ? `${t.name} is offline` : `Pick something to play on ${t.name}`;
$("pp").querySelector("ha-icon").setAttribute("icon", s.state === "playing" ? "mdi:pause" : "mdi:play");
["prev", "next"].forEach((b) => $(b).toggleAttribute("disabled", !act));
$("pp").toggleAttribute("disabled", s.state === "unavailable");
$("who").innerHTML = `<ha-icon icon="${t.icon}"></ha-icon><span style="overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>`;
const v = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
const vol = $("vol");
vol.disabled = v == null;
vol.style.opacity = v == null ? 0.3 : 1;
if (v != null && (!this._volBusy || Date.now() - this._volBusy > 2000)) { vol.value = v; vol.style.setProperty("--v", v + "%"); }
$("mute").querySelector("ha-icon").setAttribute("icon", a.is_volume_muted ? "mdi:volume-off" : v != null && v < 35 ? "mdi:volume-low" : "mdi:volume-high");
this._progress();
}
_progress() {
if (!this._hass || !this.shadowRoot) return;
const t = this._target(); if (!t) return;
const s = this._hass.states[t.id], a = s.attributes, dur = a.media_duration;
const $ = (id) => this.shadowRoot.getElementById(id);
if (!this._active(s) || !dur) { $("prog").classList.add("hide"); return; }
$("prog").classList.remove("hide");
let pos = a.media_position || 0;
if (s.state === "playing" && a.media_position_updated_at) pos += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
pos = Math.min(pos, dur);
$("pos").textContent = ftime(pos); $("dur").textContent = ftime(dur);
$("fill").style.width = ((pos / dur) * 100).toFixed(2) + "%";
}
_context() {
const el = this.shadowRoot && this.shadowRoot.getElementById("ctx"); if (!el || !this._hass) return;
const t = this._target(); if (!t) { el.innerHTML = ""; return; }
let html = "";
if (t.kind === "tv") {
html = `<div class="note"><ha-icon icon="mdi:information-outline"></ha-icon>Controlling ${esc(t.name)}. To play music, pick a speaker on the left.</div>`;
} else if (t.kind === "alexa") {
if (this._q) html = `<button class="chip ask" data-say="${esc(this._q)}"><ha-icon icon="mdi:microphone-outline"></ha-icon><span>Ask Alexa to play “${esc(this._q)}”</span></button>`;
else {
const rec = [1, 2, 3, 4, 5].map((i) => this._hass.states[`input_text.media_recent_${i}`]).filter((s) => s && s.state && !["unknown", "unavailable", ""].includes(s.state));
if (rec.length) html = `<div class="note"><ha-icon icon="mdi:history"></ha-icon>Recent</div>` + rec.slice(0, 4).map((s) => {
const label = s.state.replace(/^play /i, "").replace(/\s*\[[^\]]*\]/g, "").replace(/\s*\([^)]*\)/g, "");
return `<button class="chip" data-say="${esc(s.state)}" data-label="${esc(label)}"><ha-icon icon="mdi:history"></ha-icon><span style="max-width:260px">${esc(label)}</span></button>`;
}).join("");
}
}
if (html !== this._ctxHtml) { this._ctxHtml = html; el.innerHTML = html; }
}
_renderTabs() {
const el = this.shadowRoot.getElementById("tabs");
el.style.display = this._q ? "none" : "flex";
el.innerHTML = MA_TABS.map(([k, n]) => `<button class="chip ${k === this._tab ? "on" : ""}" data-k="${k}">${n}</button>`).join("");
}
async _call(service, data) {
const r = await this._hass.callWS({ type: "call_service", domain: "music_assistant", service,
service_data: Object.assign({ config_entry_id: this._c.config_entry_id }, data), return_response: true });
return r && r.response;
}
async _load() {
if (!this._hass) return;
this._renderTabs();
const body = this.shadowRoot.getElementById("body");
const key = this._q ? "q:" + this._q : "t:" + this._tab;
const token = (this._tok = (this._tok || 0) + 1);
if (!this._cache[key]) body.innerHTML = `<div class="empty">${this._q ? "Searching…" : "Loading…"}</div>`;
try {
let html;
if (this._cache[key]) html = this._cache[key];
else if (this._q) {
const r = await this._call("search", { name: this._q, limit: 12 });
const groups = [["Songs", r.tracks], ["Artists", r.artists], ["Albums", r.albums], ["Playlists", r.playlists], ["Radio", r.radio]].filter(([, v]) => v && v.length);
html = groups.length ? groups.map(([n, v]) => `<h3>${n}</h3>${this._grid(v.slice(0, 6))}`).join("") : `<div class="empty">No results for “${esc(this._q)}”</div>`;
} else {
let r = await this._call("get_library", { media_type: this._tab, favorite: true, limit: 30, order_by: "last_played_desc" });
let items = (r && r.items) || [];
if (items.length < 12) {
const more = await this._call("get_library", { media_type: this._tab, limit: 30, order_by: "last_played_desc" });
const seen = new Set(items.map((i) => i.uri));
items = items.concat(((more && more.items) || []).filter((i) => !seen.has(i.uri))).slice(0, 30);
}
html = items.length ? this._grid(items) : `<div class="empty">Nothing here yet. Search above to find something.</div>`;
}
this._cache[key] = html;
if (token !== this._tok) return;
body.innerHTML = html;
body.scrollTop = 0;
} catch (e) {
if (token === this._tok) body.innerHTML = `<div class="empty">Music Assistant isn't responding right now.</div>`;
}
}
_grid(items) {
return `<div class="grid">${items.map((i) => {
const artist = i.artists && i.artists.length ? i.artists.map((a) => a.name).join(", ") : "";
const sub = artist || i.owner || ({ playlist: "Playlist", album: "Album", artist: "Artist", radio: "Radio station", track: "Song" }[i.media_type] || "");
const icon = { artist: "mdi:account-music-outline", radio: "mdi:radio", playlist: "mdi:playlist-music", album: "mdi:album", track: "mdi:music-note-outline" }[i.media_type] || "mdi:music-note-outline";
return `<div class="item" data-uri="${esc(i.uri)}" data-type="${esc(i.media_type)}" data-name="${esc(i.name)}" data-artist="${esc(artist)}">
<div class="art ${i.media_type === "artist" ? "round" : ""}"><ha-icon icon="${icon}"></ha-icon>${i.image ? `<img src="${esc(i.image)}" loading="lazy" onerror="this.remove()">` : ""}
<div class="go"><ha-icon icon="mdi:play"></ha-icon></div></div>
<div class="t">${esc(i.name)}</div><div class="s2">${esc(sub)}</div></div>`;
}).join("")}</div>`;
}
_toast(msg) {
const t = this.shadowRoot.getElementById("toast");
t.textContent = msg; t.classList.add("show");
clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove("show"), 3200);
}
async _alexa(say, label) {
const t = this._target(); if (!t) return;
const cmd = /^play\b/i.test(say) ? say : "play " + say;
try {
await this._hass.callService("media_player", "play_media", { entity_id: t.id, media_content_id: cmd, media_content_type: "custom" });
this._toast(`Asking Alexa for ${label.replace(/^play /i, "")} on ${t.name}`);
} catch (e) { this._toast("Alexa didn't respond"); }
}
async _play(it) {
const t = this._target();
if (!t) { this._toast("Pick a speaker on the left first"); return; }
if (t.kind === "tv") { this._toast("Pick a speaker on the left to play music"); return; }
it.classList.add("busy");
setTimeout(() => it.classList.remove("busy"), 1400);
const d = it.dataset;
if (t.kind === "alexa") {
const by = d.artist ? ` by ${d.artist}` : "";
const phrase = { track: `${d.name}${by}`, album: `the album ${d.name}${by}`, artist: `${d.name}`, playlist: `${d.name} playlist`, radio: `${d.name} radio` }[d.type] || d.name;
return this._alexa(phrase, d.name);
}
try {
await this._hass.callService("music_assistant", "play_media", { media_id: d.uri, media_type: d.type }, { entity_id: t.id });
this._toast(`Playing ${d.name} on ${t.name}`);
} catch (e) { this._toast("Couldn't start playback"); }
}
}
if (!customElements.get("os-media-app")) customElements.define("os-media-app", OsMediaApp);
})();
