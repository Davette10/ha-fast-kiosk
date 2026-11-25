/* Clark Home OS - dynamic Home slots, at-a-glance, routines, camera panels */
(() => {
const FONT_TEXT = '-apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
const BASE_CSS = `
:host { display:block; font-family: var(--os-font, ${FONT_TEXT}); color: #f5f5f7;
-webkit-font-smoothing: antialiased; font-feature-settings: "ss03", "cv11"; }
`;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const osNavigate = (path) => {
history.pushState(null, "", path);
window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
};
const fmtClock = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtAgo = (d) => {
const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
if (s < 60) return "Just now";
if (s < 3600) return Math.round(s / 60) + " min ago";
if (s < 86400) { const h = Math.floor(s / 3600); return h + (h === 1 ? " hr ago" : " hrs ago"); }
const dd = Math.floor(s / 86400); return dd + (dd === 1 ? " day ago" : " days ago");
};
const fmtDur = (ms) => {
const m = Math.max(0, Math.round(ms / 60000));
if (m < 60) return m + "m";
const h = Math.floor(m / 60), r = m % 60;
return r ? `${h}h ${r}m` : `${h}h`;
};
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const okState = (s) => s && !["unknown", "unavailable", ""].includes(s.state);
const CARD_CSS = `
.card { background: #121214; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; box-sizing: border-box; min-width: 0; min-height: 0; }
.kicker { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #a1a1a6; }
.kicker ha-icon { --mdc-icon-size: 15px; width: 15px; height: 15px; display: inline-flex; }
button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
`;
const sunInfo = (hass) => {
const s = hass && hass.states["sun.sun"];
if (!s) return null;
const r = new Date(s.attributes.next_rising), st = new Date(s.attributes.next_setting);
return { rise: r.getHours() * 60 + r.getMinutes(), set: st.getHours() * 60 + st.getMinutes(), riseAt: r, setAt: st, up: s.state === "above_horizon" };
};
const createCard = async (conf) => {
const helpers = await window.loadCardHelpers();
const tag = conf.type.startsWith("custom:") ? conf.type.slice(7) : `hui-${conf.type}-card`;
if (!customElements.get(tag)) {
helpers.createCardElement(conf);
await Promise.race([customElements.whenDefined(tag), new Promise((r) => setTimeout(r, 5000))]);
}
return helpers.createCardElement(conf);
};
class OsSwitch extends HTMLElement {
setConfig(c) {
this._c = c || {};
this._fns = (this._c.cases || []).map((x) => {
if (!x.if) return () => true;
try { return new Function("states", "hass", "return (" + x.if + ");"); } catch (e) { return () => false; }
});
this._els = []; this._cur = -2;
}
connectedCallback() { this.style.display = "block"; this.style.height = "100%"; }
getCardSize() { return 3; }
set hass(h) {
this._hass = h;
let i = -1;
for (let k = 0; k < this._fns.length; k++) { let ok = false; try { ok = !!this._fns[k](h.states, h); } catch (e) {} if (ok) { i = k; break; } }
if (i !== this._cur) this._swap(i);
const el = this._els[i]; if (el) el.hass = h;
}
async _swap(i) {
this._cur = i;
if (i < 0) { this.replaceChildren(); return; }
let el = this._els[i];
if (!el) { el = await createCard(this._c.cases[i].card); this._els[i] = el; }
if (this._cur !== i) return;
el.hass = this._hass;
el.style.display = "block"; el.style.height = "100%";
this.replaceChildren(el);
if (el.animate) el.animate([{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" });
}
}
class OsGlance extends HTMLElement {
setConfig(c) { this._c = c || {}; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 4; }
connectedCallback() { this._t = setInterval(() => this._render(true), 30000); }
disconnectedCallback() { clearInterval(this._t); }
set hass(h) { this._hass = h; this._render(); }
_build() {
this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}
:host{display:block;height:100%;}
.card{height:100%;padding:16px 16px 12px 20px;display:flex;flex-direction:column;}
.hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;}
.hd .t{font-family:var(--os-font-display,system-ui);font-size:21px;font-weight:600;letter-spacing:-0.01em;}
.rows{flex:1;display:flex;flex-direction:column;justify-content:space-around;min-height:0;}
.r{display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;align-items:center;cursor:pointer;border-radius:12px;padding:4px 0;}
.r:active{opacity:0.6;}
.i{width:36px;height:36px;border-radius:50%;background:#2c2c2e;display:flex;align-items:center;justify-content:center;}
.i ha-icon{--mdc-icon-size:19px;width:19px;height:19px;display:inline-flex;}
.a{font-size:15px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.b{font-size:13px;color:#a1a1a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.r.alert .i{background:rgba(255,69,58,0.18);color:#ff453a;}
</style><div class="card"><div class="hd"><span class="t">At a Glance</span></div><div class="rows" id="rows"></div></div>`;
this.shadowRoot.getElementById("rows").addEventListener("click", (e) => { const r = e.target.closest(".r"); if (r && r.dataset.nav) osNavigate(r.dataset.nav); });
}
_render(force) {
const h = this._hass, c = this._c; if (!h) return;
const S = (e) => e && h.states[e];
const rows = [];
const net = S(c.internet);
if (net && net.state !== "on") rows.push({ alert: true, icon: "mdi:wifi-off", a: "Internet is down", b: `Since ${fmtClock(net.last_changed)}` });
const cams = (c.cameras || []).map((x) => ({ x, s: S(x.activity), m: S(x.motion) })).filter((o) => o.s || o.m);
const live = cams.find((o) => o.m && o.m.state === "on");
if (live) rows.push({ icon: "mdi:motion-sensor", a: "Motion detected", b: `${live.x.name} camera · now`, color: "#ff9f0a", nav: c.cameras_path });
else if (cams.length) {
const latest = cams.filter((o) => o.s && okState(o.s)).sort((a, b) => new Date(b.s.state) - new Date(a.s.state))[0];
if (latest) rows.push({ icon: "mdi:cctv", a: `${latest.x.name} camera`, b: `Last activity ${fmtAgo(latest.s.state).toLowerCase()}`, nav: c.cameras_path });
}
const ins = S(c.inside);
if (ins && okState(ins)) {
const parts = (c.climates || []).map((x) => { const e = S(x.entity); if (!e) return ""; const act = e.attributes.hvac_action; return `${x.name} ${act && act !== "idle" && act !== "off" ? act : e.state === "off" ? "off" : "idle"}`; }).filter(Boolean);
rows.push({ icon: "mdi:home-thermometer-outline", a: `${Math.round(num(ins.state))}° inside`, b: parts.join(" · ") });
}
const sun = sunInfo(h);
if (sun) rows.push(sun.up ? { icon: "mdi:weather-sunset-down", color: "#ff9f0a", a: `Sunset at ${fmtClock(sun.setAt)}`, b: `${fmtDur(sun.setAt - Date.now())} of daylight left` }
: { icon: "mdi:weather-sunset-up", color: "#ffd60a", a: `Sunrise at ${fmtClock(sun.riseAt)}`, b: "All lights are off" });
if (net && net.state === "on" && rows.length < 4) rows.push({ icon: "mdi:wifi", a: "Internet online", b: "Network is healthy" });
const html = rows.slice(0, 4).map((r) => `<div class="r ${r.alert ? "alert" : ""}" ${r.nav ? `data-nav="${esc(r.nav)}"` : ""}><div class="i" ${r.color ? `style="color:${r.color}"` : ""}><ha-icon icon="${r.icon}"></ha-icon></div><div style="min-width:0"><div class="a">${esc(r.a)}</div><div class="b">${esc(r.b || "")}</div></div></div>`).join("");
if (!force && html === this._sig) return;
this._sig = html;
this.shadowRoot.getElementById("rows").innerHTML = html;
}
}
class OsRoutines extends HTMLElement {
setConfig(c) { this._c = c || {}; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 2; }
set hass(h) { this._hass = h; this._hl(); }
_build() {
const items = this._c.items || [];
this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}
:host{display:block;height:100%;}
.card { height: 100%; display: grid; grid-template-columns: repeat(${items.length}, 1fr); align-items: center; padding: 0 8px;
background:rgba(28,28,30,0.72);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);}
.it{display:flex;flex-direction:column;align-items:center;gap:6px;border:none;background:none;cursor:pointer;padding:6px 0;}
.it .c{width:48px;height:48px;border-radius:50%;background:#2c2c2e;display:flex;align-items:center;justify-content:center;transition:transform 140ms ease,background-color 200ms ease;}
.it:active .c{transform:scale(0.9);}
.it.hl .c{background:#f5f5f7;color:#1d1d1f;}
.it .c ha-icon{--mdc-icon-size:24px;width:24px;height:24px;display:inline-flex;}
.it span{font-size:12px;font-weight:600;color:#a1a1a6;white-space:nowrap;}
.it.done .c{background:#30d158;color:#fff;}
</style><div class="card">${items.map((x, i) => `<button class="it" data-i="${i}"><div class="c"><ha-icon icon="${x.icon}"></ha-icon></div><span>${esc(x.name)}</span></button>`).join("")}</div>`;
this.shadowRoot.querySelector(".card").addEventListener("click", (e) => {
const b = e.target.closest(".it"); if (!b || !this._hass) return;
const x = items[+b.dataset.i];
const [d, s] = (x.action || "button.press").split(".");
this._hass.callService(d, s, {}, { entity_id: x.entity });
b.classList.add("done"); const ic = b.querySelector("ha-icon"); const old = ic.getAttribute("icon"); ic.setAttribute("icon", "mdi:check");
setTimeout(() => { b.classList.remove("done"); ic.setAttribute("icon", old); }, 1600);
});
}
_hl() {
const hr = new Date().getHours();
const want = hr >= 5 && hr < 11 ? "morning" : hr >= 20 || hr < 3 ? "night" : "";
this.shadowRoot.querySelectorAll(".it").forEach((b, i) => b.classList.toggle("hl", !!want && (this._c.items[i].when || "") === want));
}
}
class OsCamPanel extends HTMLElement {
setConfig(c) { this._c = c || {}; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
getCardSize() { return 5; }
connectedCallback() { this._t = setInterval(() => this._render(true), 30000); }
disconnectedCallback() { clearInterval(this._t); }
set hass(h) { this._hass = h; this._render(); }
_build() {
this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}
:host{display:block;height:100%;}
.card{height:100%;padding:20px 22px;display:flex;flex-direction:column;gap:14px;}
.hd{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.t{font-family:var(--os-font-display,system-ui);font-size:24px;font-weight:700;letter-spacing:-0.02em;}
.pill{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;font-size:14px;font-weight:600;background:rgba(255,255,255,0.08);color:#f5f5f7;}
.pill i{width:8px;height:8px;border-radius:50%;background:#30d158;}
.pill.hot{background:rgba(255,159,10,0.18);color:#ffb340;}
.pill.hot i{background:#ff9f0a;animation:pulse 1.2s ease-in-out infinite;}
@keyframes pulse{50%{opacity:0.3;}}
.big{font-size:30px;font-weight:600;letter-spacing:-0.02em;line-height:1.1;}
.sub{font-size:14px;color:#a1a1a6;margin-top:4px;}
.grid{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-content:end;}
.st{background:#1c1c1e;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;border:none;text-align:left;min-width:0;}
.st .k{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#a1a1a6;}
.st .k ha-icon{--mdc-icon-size:15px;width:15px;height:15px;display:inline-flex;}
.st .v{font-size:18px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
button.st{cursor:pointer;transition:transform 140ms ease,background-color 200ms ease;}
button.st:active{transform:scale(0.96);}
button.st.on{background:#f5f5f7;color:#1d1d1f;}
button.st.on .k{color:rgba(29,29,31,0.6);}
button.st.danger.on{background:#ff453a;color:#fff;}
button.st.danger.on .k{color:rgba(255,255,255,0.8);}
</style><div class="card"><div class="hd"><span class="t" id="t"></span><span class="pill" id="pill"></span></div><div><div class="big" id="big"></div><div class="sub" id="sub"></div></div><div class="grid" id="grid"></div></div>`;
this.shadowRoot.getElementById("grid").addEventListener("click", (e) => {
const b = e.target.closest("button.st"); if (!b || !this._hass) return;
const id = b.dataset.e, on = this._hass.states[id] && this._hass.states[id].state === "on";
if (b.classList.contains("danger") && !on && !confirm(`Sound the ${this._c.name} siren?`)) return;
this._hass.callService(id.split(".")[0], on ? "turn_off" : "turn_on", { entity_id: id });
});
}
_render(force) {
const h = this._hass, c = this._c; if (!h) return;
const S = (e) => e && h.states[e];
const m = S(c.motion), act = S(c.activity);
const hot = m && m.state === "on";
const tiles = [];
if (S(c.ding)) { const d = S(c.ding); tiles.push({ icon: "mdi:bell-outline", k: "Doorbell", v: d.state === "on" ? "Ringing" : `Rang ${fmtAgo(d.last_changed).toLowerCase()}` }); }
if (S(c.battery)) tiles.push({ icon: "mdi:battery-high", k: "Battery", v: `${Math.round(num(S(c.battery).state) || 0)}%` });
if (S(c.signal)) { const s = num(S(c.signal).state); tiles.push({ icon: "mdi:wifi", k: "Wi-Fi", v: s == null ? S(c.signal).state : s > -60 ? "Strong" : s > -70 ? "Good" : "Weak" }); }
if (S(c.detection)) tiles.push({ btn: c.detection, icon: "mdi:motion-sensor", k: "Alerts", v: S(c.detection).state === "on" ? "On" : "Off", on: S(c.detection).state === "on" });
if (S(c.siren)) tiles.push({ btn: c.siren, danger: true, icon: "mdi:bullhorn-outline", k: "Siren", v: S(c.siren).state === "on" ? "Sounding" : "Off", on: S(c.siren).state === "on" });
const cat = act && act.attributes.category;
const big = hot ? "Motion right now" : act && okState(act) ? `Activity ${fmtAgo(act.state).toLowerCase()}` : "No recent activity";
const sub = act && okState(act) ? `${cat === "ding" ? "Doorbell" : cat === "motion" ? "Motion" : "Live view"} · ${fmtClock(act.state)}` : "";
const html = `${esc(c.name)}|${hot}|${big}|${sub}|` + tiles.map((x) => JSON.stringify(x)).join();
if (!force && html === this._sig) return;
this._sig = html;
const $ = (id) => this.shadowRoot.getElementById(id);
$("t").textContent = c.name;
const pill = $("pill"); pill.className = "pill" + (hot ? " hot" : ""); pill.innerHTML = `<i></i>${hot ? "Motion" : "All clear"}`;
$("big").textContent = big; $("sub").textContent = sub;
$("grid").innerHTML = tiles.map((x) => x.btn
? `<button class="st ${x.on ? "on" : ""} ${x.danger ? "danger" : ""}" data-e="${esc(x.btn)}"><div class="k"><ha-icon icon="${x.icon}"></ha-icon>${x.k}</div><div class="v">${esc(x.v)}</div></button>`
: `<div class="st"><div class="k"><ha-icon icon="${x.icon}"></ha-icon>${x.k}</div><div class="v">${esc(x.v)}</div></div>`).join("");
}
}
Object.entries({ "os-switch": OsSwitch, "os-glance": OsGlance, "os-routines": OsRoutines, "os-cam-panel": OsCamPanel }).forEach(([n, k]) => { if (!customElements.get(n)) customElements.define(n, k); });
})();
