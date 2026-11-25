/* os-echo-climate: full-screen Climate page for the Echo Show (<os-echo-climate>, opened by os-echo).
   One large card per thermostat, side by side. Each card has a dial you can drag (or use − / +) to set the
   temperature, the current inside temperature as a dot on the dial, what the system is doing right now,
   and a mode switch (Off / Heat / Cool / Auto). Changes are sent once you stop adjusting. */
(() => {
const LO = 50, HI = 90, A0 = 135, SW = 270, R = 84, C = 100;
const COL = { heat: "#ff9f0a", cool: "#0a84ff", heat_cool: "#bf5af2", off: "rgba(255,255,255,.35)" };
const MODES = [["off", "mdi:power", "Off"], ["heat", "mdi:fire", "Heat"], ["cool", "mdi:snowflake", "Cool"], ["heat_cool", "mdi:sun-snowflake-variant", "Auto"]];
const ang = (v) => A0 + (SW * (Math.max(LO, Math.min(HI, v)) - LO)) / (HI - LO);
const pt = (a) => { const r = (a * Math.PI) / 180; return [C + R * Math.cos(r), C + R * Math.sin(r)]; };
const arc = (a0, a1) => { if (a1 - a0 < 0.5) a1 = a0 + 0.5; const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };

const CSS = `
:host{display:block;height:100%;color:#fff;}
*{box-sizing:border-box;}
button{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .12s,background-color .2s,color .2s,opacity .2s;}
button:active{transform:scale(.93);}
.g{height:100%;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:1.6vw;padding:0 3vw 3vh;}
.k{position:relative;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr) auto;border-radius:3.6vh;padding:2.6vh 2vw 2.4vh;
background:rgba(255,255,255,.065);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);--c:${COL.off};}
.k::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 70% at 50% 45%,var(--c),transparent 70%);opacity:.0;transition:opacity .6s;}
.k[data-act=heating]::before,.k[data-act=cooling]::before{opacity:.16;animation:br 4s ease-in-out infinite;}
@keyframes br{50%{opacity:.26}}
.hd{display:flex;align-items:baseline;justify-content:space-between;gap:1vw;position:relative;}
.hd b{font-size:3.6vh;font-weight:600;letter-spacing:-.01em;}
.st{display:flex;align-items:center;gap:.6vw;font-size:2.4vh;color:rgba(255,255,255,.62);white-space:nowrap;}
.st i{width:1.3vh;height:1.3vh;border-radius:50%;background:rgba(255,255,255,.35);}
.k[data-act=heating] .st,.k[data-act=cooling] .st{color:var(--c);}
.k[data-act=heating] .st i,.k[data-act=cooling] .st i{background:var(--c);box-shadow:0 0 1.2vh var(--c);}
.dw{position:relative;display:flex;align-items:center;justify-content:center;min-height:0;}
svg{height:100%;max-height:52vh;aspect-ratio:1;overflow:visible;touch-action:none;cursor:pointer;}
.tr{fill:none;stroke:rgba(255,255,255,.1);stroke-width:11;stroke-linecap:round;}
.pg{fill:none;stroke:var(--c);stroke-width:11;stroke-linecap:round;transition:stroke .3s;}
.kn{fill:#fff;filter:drop-shadow(0 0 3px rgba(0,0,0,.5));}
.cur{fill:none;stroke:#fff;stroke-width:2.4;}
.tk{stroke:rgba(255,255,255,.22);stroke-width:1.2;}
.mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;}
.mid small{font-size:2.1vh;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--c);}
.mid b{font-size:14vh;font-weight:200;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums;}
.mid b.r{font-size:10vh;}
.mid span{font-size:2.5vh;color:rgba(255,255,255,.62);margin-top:.6vh;}
.pm{position:absolute;top:50%;transform:translateY(-50%);width:9vh;height:9vh;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;}
.pm:active{transform:translateY(-50%) scale(.92);}
.pm ha-icon{--mdc-icon-size:4.4vh;}
.pm.m{left:0;}.pm.p{right:0;}
.k[data-m=off] .pm{opacity:.25;pointer-events:none;}
.lb{fill:rgba(255,255,255,.4);font-size:8.5px;text-anchor:middle;}
.rs{display:flex;justify-content:center;gap:.5vw;margin-top:-.5vh;position:relative;}
.rs button{font-size:2vh;font-weight:600;padding:.8vh 1.2vw;border-radius:99px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);}
.rs button.on{background:rgba(255,255,255,.9);color:#000;}
.md{display:grid;grid-template-columns:repeat(4,1fr);gap:.5vw;padding:.6vh;border-radius:99px;background:rgba(255,255,255,.08);position:relative;}
.md button{height:7vh;border-radius:99px;display:flex;align-items:center;justify-content:center;gap:.5vw;font-size:2.4vh;font-weight:600;color:rgba(255,255,255,.7);}
.md button ha-icon{--mdc-icon-size:3vh;}
.md button.on{background:var(--mc);color:#fff;}
.md button.on[data-hm=off]{background:rgba(255,255,255,.9);color:#000;}
`;

class OSEchoClimate extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ thermostats: [] }, c || {}); this._p = {}; this._sel = {}; }
  set hass(h) {
    this._h = h;
    if (!this.shadowRoot) { this.attachShadow({ mode: "open" }).innerHTML = `<style>${CSS}</style><div class="g" id="g"></div>`; this._build(); }
    this._c.thermostats.forEach((t, i) => this._sync(i));
  }
  disconnectedCallback() { Object.keys(this._p).forEach((i) => { if (this._p[i] && this._p[i].tm) { clearTimeout(this._p[i].tm); this._send(+i); } }); }
  _build() {
    const g = this.shadowRoot.getElementById("g");
    const ticks = [...Array(41)].map((_, i) => { const a = A0 + (SW * i) / 40, r1 = R - 13, r2 = R - (i % 5 ? 16 : 19), rad = (a * Math.PI) / 180; return `<line class="tk" x1="${(C + r1 * Math.cos(rad)).toFixed(1)}" y1="${(C + r1 * Math.sin(rad)).toFixed(1)}" x2="${(C + r2 * Math.cos(rad)).toFixed(1)}" y2="${(C + r2 * Math.sin(rad)).toFixed(1)}"/>`; }).join("");
    g.innerHTML = this._c.thermostats.map((t, i) => `<div class="k" id="k${i}"><div class="hd"><b>${t.label || ""}</b><div class="st"><i></i><span class="sx"></span></div></div>
<div class="dw"><button class="pm m" data-i="${i}" data-d="-1"><ha-icon icon="mdi:minus"></ha-icon></button>
<svg viewBox="0 0 200 200" data-i="${i}">${ticks}<path class="tr" d="${arc(A0, A0 + SW)}"/><path class="pg"/><path class="pg p2" style="display:none"/>${[[LO, A0], [HI, A0 + SW]].map(([v, a]) => { const [x, y] = pt(a); return `<text class="lb" x="${x.toFixed(1)}" y="${(y + 19).toFixed(1)}">${v}°</text>`; }).join("")}<circle class="cur" r="4"/><circle class="kn k1" r="7.5"/><circle class="kn k2" r="7.5" style="display:none"/></svg>
<div class="mid"><small></small><b></b><span></span></div><button class="pm p" data-i="${i}" data-d="1"><ha-icon icon="mdi:plus"></ha-icon></button></div>
<div><div class="rs" style="display:none"><button data-i="${i}" data-rs="lo">Heat to</button><button data-i="${i}" data-rs="hi">Cool to</button></div>
<div class="md">${MODES.map(([m, ic, l]) => `<button data-i="${i}" data-hm="${m}" style="--mc:${COL[m]}"><ha-icon icon="${ic}"></ha-icon>${l}</button>`).join("")}</div></div></div>`).join("");
    g.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; const i = +b.dataset.i;
      if (b.dataset.d) this._nudge(i, +b.dataset.d);
      else if (b.dataset.rs) { this._sel[i] = b.dataset.rs; this._sync(i); }
      else if (b.dataset.hm) this._mode(i, b.dataset.hm);
    });
    g.querySelectorAll("svg").forEach((sv) => {
      const i = +sv.dataset.i;
      const val = (e) => { const r = sv.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; let rel = ((Math.atan2(y, x) * 180) / Math.PI - A0 + 720) % 360; if (rel > SW) rel = rel < SW + 45 ? SW : 0; return Math.round(LO + (rel / SW) * (HI - LO)); };
      sv.addEventListener("pointerdown", (e) => { const s = this._st(i); if (!s || s.m === "off") return; const v = val(e), lo = s.lo != null ? s.lo : 68, hi = s.hi != null ? s.hi : 74, near = (x) => Math.abs(v - x) <= 4;
      if (s.m === "heat_cool") { if (!near(lo) && !near(hi)) return; this._sel[i] = Math.abs(v - lo) <= Math.abs(v - hi) ? "lo" : "hi"; } else if (!near(s.t != null ? s.t : 70)) return;
      sv.setPointerCapture(e.pointerId); this._drag = i; this._setv(i, v, true); });
      sv.addEventListener("pointermove", (e) => { if (this._drag === i) this._setv(i, val(e), true); });
      const up = () => { if (this._drag !== i) return; this._drag = null; this._queue(i); };
      sv.addEventListener("pointerup", up); sv.addEventListener("pointercancel", up);
    });
  }
  /* the shown state: what HA reports, overlaid with changes not yet sent */
  _st(i) {
    const t = this._c.thermostats[i], s = this._h && this._h.states[t.entity]; if (!s) return null;
    const a = s.attributes, p = this._p[i] || {};
    return { e: t.entity, m: p.m || s.state, act: a.hvac_action, cur: a.current_temperature, t: p.t != null ? p.t : a.temperature, lo: p.lo != null ? p.lo : a.target_temp_low, hi: p.hi != null ? p.hi : a.target_temp_high, min: a.min_temp || LO, max: a.max_temp || HI, modes: a.hvac_modes || [] };
  }
  _sync(i) {
    const s = this._st(i), k = this.shadowRoot.getElementById("k" + i); if (!k) return;
    if (!s) { k.querySelector(".sx").textContent = "Unavailable"; return; }
    const m = s.m, hc = m === "heat_cool", c = COL[m] || COL.off, $ = (q) => k.querySelector(q);
    k.dataset.m = m; k.dataset.act = s.act || ""; k.style.setProperty("--c", c);
    $(".sx").textContent = m === "off" ? "Off" : s.act === "heating" ? "Heating now" : s.act === "cooling" ? "Cooling now" : s.act === "fan" ? "Fan only" : "Holding";
    const lo = s.lo != null ? s.lo : 68, hi = s.hi != null ? s.hi : 74, pg = k.querySelectorAll(".pg"), k1 = $(".k1"), k2 = $(".k2");
    const place = (el, v) => { const [x, y] = pt(ang(v)); el.setAttribute("cx", x.toFixed(2)); el.setAttribute("cy", y.toFixed(2)); };
    if (s.cur != null) { place($(".cur"), s.cur); $(".cur").style.display = ""; } else $(".cur").style.display = "none";
    pg[1].style.display = "none"; k2.style.display = hc ? "" : "none"; k1.style.display = m === "off" ? "none" : "";
    if (m === "off") pg[0].setAttribute("d", "");
    else if (hc) { pg[0].setAttribute("d", arc(ang(lo), ang(hi))); place(k1, lo); place(k2, hi); }
    else { const v = s.t != null ? s.t : 70; pg[0].setAttribute("d", m === "cool" ? arc(ang(v), A0 + SW) : arc(A0, ang(v))); place(k1, v); }
    const sel = this._sel[i] || "lo";
    $(".mid small").textContent = m === "off" ? "" : hc ? "Keep between" : m === "cool" ? "Cool to" : "Heat to";
    const b = $(".mid b"); b.classList.toggle("r", hc);
    b.textContent = m === "off" ? "Off" : hc ? `${Math.round(lo)}–${Math.round(hi)}°` : `${s.t != null ? Math.round(s.t) : "--"}°`;
    $(".mid span").textContent = s.cur != null ? `Inside ${Math.round(s.cur)}°` : "";
    $(".rs").style.display = hc ? "" : "none";
    k.querySelectorAll(".rs button").forEach((x) => x.classList.toggle("on", x.dataset.rs === sel));
    k.querySelectorAll(".md button").forEach((x) => { x.classList.toggle("on", x.dataset.hm === m); x.style.display = s.modes.length && !s.modes.includes(x.dataset.hm) ? "none" : ""; });
  }
  _setv(i, v, live) {
    const s = this._st(i); if (!s) return; const p = (this._p[i] = this._p[i] || {});
    v = Math.max(s.min, Math.min(s.max, v));
    if (s.m === "heat_cool") { if ((this._sel[i] || "lo") === "lo") p.lo = Math.min(v, (s.hi != null ? s.hi : 74) - 2); else p.hi = Math.max(v, (s.lo != null ? s.lo : 68) + 2); }
    else p.t = v;
    this._sync(i); if (!live) this._queue(i);
  }
  _nudge(i, d) { const s = this._st(i); if (!s || s.m === "off") return; if (s.m === "heat_cool") { const k = this._sel[i] || "lo"; this._setv(i, (k === "lo" ? (s.lo != null ? s.lo : 68) : (s.hi != null ? s.hi : 74)) + d); } else this._setv(i, (s.t != null ? s.t : 70) + d); }
  _queue(i) { const p = this._p[i]; if (!p) return; clearTimeout(p.tm); p.tm = setTimeout(() => this._send(i), 900); }
  _send(i) {
    const p = this._p[i], s = this._st(i); if (!p || !s) return; clearTimeout(p.tm); p.tm = null;
    const d = { entity_id: s.e };
    if (s.m === "heat_cool") { d.target_temp_low = s.lo != null ? s.lo : 68; d.target_temp_high = s.hi != null ? s.hi : 74; } else d.temperature = s.t != null ? s.t : 70;
    this._h.callService("climate", "set_temperature", d).catch(() => {}).finally(() => setTimeout(() => { if (this._p[i] === p && !p.tm) { delete this._p[i]; this._sync(i); } }, 2500));
  }
  _mode(i, m) {
    const s = this._st(i); if (!s || s.m === m) return;
    const p = (this._p[i] = this._p[i] || {}); p.m = m; this._sync(i);
    this._h.callService("climate", "set_hvac_mode", { entity_id: s.e, hvac_mode: m }).catch(() => {}).finally(() => setTimeout(() => { if (this._p[i] === p && !p.tm) { delete this._p[i]; this._sync(i); } }, 2500));
  }
}
if (!customElements.get("os-echo-climate")) customElements.define("os-echo-climate", OSEchoClimate);
})();
