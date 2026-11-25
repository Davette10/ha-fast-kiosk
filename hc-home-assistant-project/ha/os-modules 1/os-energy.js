/* Clark Home OS - Duke Energy usage: os-energy-mini (home dock / phone home) and os-energy-page (Energy tab).
   Data: long-term statistic from the hunterjm/ha-dukeenergy custom integration, read with WS recorder/statistics_during_period.
   Main chart: one zoomable timeline (pinch / wheel / Hour-Day-Week-Month-Year) from hourly bars out to years; Duke only provides hourly data.
   Cost: Duke Energy Progress NC Schedule RES, typical-bill table effective Sep 1 2026 (NC Public Staff), plus 7% NC sales tax. */
(() => {
const STAT = "duke_energy:electric_330757818_energy_consumption";
const RATE = { fixed: 15.81, kwh: 0.16104, winterTail: 0.15104, winterBlock: 800, winterMonths: [0, 1, 2, 3, 4, 9, 10, 11], tax: 0.07, name: "Duke Energy Progress · Residential (RES)" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WDS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WDL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addM = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const dim = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const fk = (v, dp) => (v == null || isNaN(v) ? "–" : v.toLocaleString("en-US", { maximumFractionDigits: dp == null ? (v >= 100 ? 0 : 1) : dp, minimumFractionDigits: dp == null ? 0 : dp }));
const fm = (v) => (v == null || isNaN(v) ? "–" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: v >= 1000 ? 0 : 2, maximumFractionDigits: v >= 1000 ? 0 : 2 }));
const hr = (h) => (h % 12 || 12) + (h < 12 ? "a" : "p");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------- tariff */
const winter = (m) => RATE.winterMonths.includes(m);
const billFor = (kwh, month) => { const w = winter(month); const e = w ? Math.min(kwh, RATE.winterBlock) * RATE.kwh + Math.max(0, kwh - RATE.winterBlock) * RATE.winterTail : kwh * RATE.kwh; return (RATE.fixed + e) * (1 + RATE.tax); };
/* energy-only cost of `kwh` used when `before` kWh were already used earlier in the same month */
const costSlice = (kwh, before, month) => { if (!winter(month)) return kwh * RATE.kwh * (1 + RATE.tax); const a = Math.max(0, Math.min(kwh, RATE.winterBlock - before)); return (a * RATE.kwh + (kwh - a) * RATE.winterTail) * (1 + RATE.tax); };

/* ---------------- data */
const E = window.__osEnergy || (window.__osEnergy = { cache: new Map(), hass: null, subs: new Set() });
const q = async (start, end, period) => {
  const h = E.hass; if (!h) return [];
  const key = period + "|" + start.getTime() + "|" + end.getTime(), c = E.cache.get(key);
  if (c && Date.now() - c.t < 15 * 60000) return c.p;
  const p = h.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(), statistic_ids: [STAT], period, types: ["change"] })
    .then((r) => (r && r[STAT] ? r[STAT] : []).map((x) => ({ s: new Date(typeof x.start === "number" ? x.start : Date.parse(x.start)), v: Math.max(0, x.change || 0) })))
    .catch(() => { E.cache.delete(key); return []; });
  E.cache.set(key, { t: Date.now(), p });
  return p;
};
const byDay = (rows) => { const m = new Map(); rows.forEach((r) => m.set(day0(r.s).getTime(), r.v)); return m; };
/* last day that has data (Duke lags about a day) */
const lastDay = async () => { const now = new Date(); const rows = await q(addD(day0(now), -10), now, "hour"); let last = null; rows.forEach((r) => { if (r.v > 0) last = r.s; }); return last ? day0(last) : addD(day0(now), -1); };
/* summary used by both cards */
const summary = async () => {
  const today = day0(new Date()), ld = await lastDay();
  const ms = new Date(ld.getFullYear(), ld.getMonth(), 1), pms = addM(ms, -1);
  const days = await q(addD(pms, -31), addD(today, 1), "day"), dm = byDay(days);
  const sumRange = (a, b) => { let t = 0, n = 0; for (let d = a; d <= b; d = addD(d, 1)) { const v = dm.get(d.getTime()); if (v != null) { t += v; n++; } } return { t, n }; };
  const y = dm.get(ld.getTime()) || 0;
  const avg30 = sumRange(addD(ld, -30), addD(ld, -1)); const avg = avg30.n ? avg30.t / avg30.n : 0;
  const mtd = sumRange(ms, ld), lm = sumRange(pms, addD(ms, -1));
  const daysIn = dim(ms), proj = mtd.n ? (mtd.t / mtd.n) * daysIn : 0;
  const yBefore = sumRange(ms, addD(ld, -1)).t;
  const spark = []; for (let i = 13; i >= 0; i--) { const d = addD(ld, -i); spark.push({ d, v: dm.get(d.getTime()) || 0 }); }
  return { ld, y, yCost: costSlice(y, yBefore, ld.getMonth()), avg, mtd: mtd.t, mtdDays: mtd.n, mtdCost: billFor(mtd.t, ms.getMonth()) - RATE.fixed * (1 + RATE.tax) * (1 - mtd.n / daysIn), proj, projBill: billFor(proj, ms.getMonth()), lm: lm.t, lmBill: billFor(lm.t, pms.getMonth()), ms, pms, spark };
};

/* ---------------- shared styles */
const CARD = `:host{display:block;height:100%;}
.card{position:relative;height:100%;box-sizing:border-box;border-radius:22px;background:var(--os-glass-bg,#1c1c1e);box-shadow:var(--os-glass-shadow,none);-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);color:var(--os-text,#f5f5f7);overflow:hidden;font-family:var(--os-font-text,-apple-system,"SF Pro Text",Inter,system-ui,sans-serif);user-select:none;-webkit-user-select:none;text-align:left;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.lab{font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--os-text-2,#a1a1a6);}
.num{font-family:var(--os-font-display,-apple-system,"SF Pro Display",Inter,system-ui,sans-serif);font-variant-numeric:tabular-nums;letter-spacing:-0.025em;}
.u{font-size:0.5em;font-weight:600;color:var(--os-text-2,#a1a1a6);letter-spacing:0;margin-left:3px;}
.sub{font-size:14px;color:var(--os-text-2,#a1a1a6);}
svg{display:block;overflow:visible;}
.bar{fill:var(--os-accent,#2997ff);opacity:0.55;transition:opacity 160ms ease;}
.bar.hi{opacity:1;}
.bar.cmp{fill:var(--os-text-3,#6e6e73);opacity:0.6;}
.grid{stroke:var(--os-hairline,rgba(255,255,255,0.08));stroke-width:1;}
.avg{stroke:var(--os-text-2,#a1a1a6);stroke-width:1.5;stroke-dasharray:4 4;opacity:0.8;}
.ax{fill:var(--os-text-3,#6e6e73);font-size:12px;font-weight:500;font-variant-numeric:tabular-nums;}
.line{fill:none;stroke:var(--os-accent,#2997ff);stroke-width:2;stroke-linejoin:round;stroke-linecap:round;}
.area{fill:var(--os-accent,#2997ff);opacity:0.14;}
.dot{fill:var(--os-accent,#2997ff);stroke:var(--os-surface,#121214);stroke-width:2;}
.hit{fill:transparent;cursor:pointer;}`;

/* rounded-top bar path: 4px radius on the data end, square at the baseline */
const barPath = (x, y, w, h) => { if (h <= 0.5) return ""; const r = Math.min(4, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
const ticks = (m, k) => { m = Math.max(m, 1e-6); const raw = m / k, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p, st = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p, top = Math.ceil(m / st - 1e-9) * st; return { top, st, n: Math.round(top / st) }; };

/* bar chart: vals[], labels[] (sparse ok), opts {sel, avg, cmp[], fmt} */
const barChart = (W, H, vals, labels, o = {}) => {
  const L = o.axis === false ? 0 : 44, B = o.axis === false ? 0 : 22, T = 6, iw = Math.max(10, W - L), ih = Math.max(10, H - B - T);
  const all = vals.concat(o.cmp || []).filter((v) => v != null); const tk = ticks(Math.max(0.0001, ...all), 4), mx = tk.top;
  const n = vals.length, slot = iw / n, gap = Math.max(2, Math.min(slot * 0.28, 10)), groups = o.cmp ? 2 : 1, bw = Math.max(1.5, (slot - gap) / groups - (groups > 1 ? 1 : 0));
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  if (o.axis !== false) for (let i = 0; i <= tk.n; i++) { const v = tk.st * i, y = T + ih - (v / mx) * ih; s += `<line class="grid" x1="${L}" x2="${W}" y1="${y}" y2="${y}"/><text class="ax" x="${L - 8}" y="${y + 4}" text-anchor="end">${o.fmt ? o.fmt(v, true) : fk(v, 0)}</text>`; }
  vals.forEach((v, i) => {
    const x0 = L + i * slot + gap / 2;
    if (o.cmp) { const c = o.cmp[i]; if (c != null) { const h = (c / mx) * ih; s += `<path class="bar cmp" d="${barPath(x0, T + ih - h, bw, h)}"/>`; } }
    if (v != null) { const h = (v / mx) * ih, x = o.cmp ? x0 + bw + 2 : x0; s += `<path class="bar ${o.sel === i || (o.sel == null && o.hiLast && i === n - 1) ? "hi" : ""}" d="${barPath(x, T + ih - h, bw, h)}"/>`; }
    if (labels[i] && o.axis !== false) s += `<text class="ax" x="${L + i * slot + slot / 2}" y="${H - 4}" text-anchor="middle">${labels[i]}</text>`;
    if (o.hits !== false) s += `<rect class="hit" data-i="${i}" x="${L + i * slot}" y="0" width="${slot}" height="${H}"/>`;
  });
  if (o.avg != null && o.avg > 0) { const y = T + ih - (o.avg / mx) * ih; s += `<line class="avg" x1="${L}" x2="${W}" y1="${y}" y2="${y}"/>`; }
  return s + "</svg>";
};
const lineChart = (W, H, vals, labels, o = {}) => {
  const L = 44, B = 22, T = 8, iw = W - L - 6, ih = H - B - T, tk = ticks(Math.max(0.0001, ...vals), 3), mx = tk.top, n = vals.length;
  const X = (i) => L + (n === 1 ? iw / 2 : (i / (n - 1)) * iw), Y = (v) => T + ih - (v / mx) * ih;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  for (let i = 0; i <= tk.n; i++) { const v = tk.st * i, y = Y(v); s += `<line class="grid" x1="${L}" x2="${W}" y1="${y}" y2="${y}"/><text class="ax" x="${L - 8}" y="${y + 4}" text-anchor="end">${fk(v, tk.st < 1 ? 1 : 0)}</text>`; }
  const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  s += `<polygon class="area" points="${X(0)},${T + ih} ${pts} ${X(n - 1)},${T + ih}"/><polyline class="line" points="${pts}"/>`;
  labels.forEach((l, i) => { if (l) s += `<text class="ax" x="${X(i)}" y="${H - 4}" text-anchor="middle">${l}</text>`; });
  if (o.sel != null && vals[o.sel] != null) s += `<line class="grid" x1="${X(o.sel)}" x2="${X(o.sel)}" y1="${T}" y2="${T + ih}" style="stroke:var(--os-text-2,#a1a1a6)"/><circle class="dot" cx="${X(o.sel)}" cy="${Y(vals[o.sel])}" r="5"/>`;
  vals.forEach((v, i) => { const w = iw / Math.max(1, n - 1); s += `<rect class="hit" data-i="${i}" x="${X(i) - w / 2}" y="0" width="${w}" height="${H}"/>`; });
  return s + "</svg>";
};

/* ---------------- mini card (home dock, phone home) */
class OsEnergyMini extends HTMLElement {
  setConfig(c) { this._c = c || {}; if (this._c.height) this.style.height = this._c.height; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); } }
  getCardSize() { return 2; }
  set hass(h) { E.hass = h; if (!this._did) { this._did = true; this._load(); } }
  connectedCallback() { this._iv = setInterval(() => this._load(), 30 * 60000); }
  disconnectedCallback() { clearInterval(this._iv); }
  _build() {
    this.shadowRoot.innerHTML = `<style>${CARD}
.card{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:16px;padding:12px 18px 12px 18px;cursor:pointer;transition:transform 160ms ease;}
.card:active{transform:scale(0.98);}
.l{min-width:0;display:flex;flex-direction:column;gap:2px;}
.lab{display:flex;align-items:center;gap:6px;font-size:12px;}
.lab ha-icon{--mdc-icon-size:16px;width:16px;height:16px;display:flex;color:var(--os-text-2,#a1a1a6);}
.big{font-size:30px;font-weight:600;line-height:1.05;white-space:nowrap;}
.sub{font-size:13px;white-space:nowrap;}
#sp{height:100%;min-height:40px;display:flex;flex-direction:column;justify-content:flex-end;}
.cap{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:600;color:var(--os-text-3,#6e6e73);text-align:right;margin-top:3px;letter-spacing:0.02em;}
</style><div class="card" id="card"><div class="l"><div class="lab"><ha-icon icon="mdi:lightning-bolt-outline"></ha-icon><span id="t">Energy</span></div><div class="big num" id="v">–</div><div class="sub" id="s">Loading…</div></div><div id="sp"><div id="g"></div><div class="cap" id="cap"></div></div></div>`;
    if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this._draw()); this._ro.observe(this.shadowRoot.getElementById("sp")); }
    this.shadowRoot.getElementById("card").addEventListener("click", () => {
      const p = (this._c && this._c.path) || "/claude-test-dashboard/energy";
      history.pushState(null, "", p); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    });
  }
  async _load() { try { this._d = await summary(); } catch (e) { this._d = null; } this._paint(); }
  _paint() {
    const d = this._d, sr = this.shadowRoot; if (!sr || !d) return;
    sr.getElementById("t").textContent = "Energy · " + (day0(new Date()).getTime() - d.ld.getTime() <= 86400000 ? "Yesterday" : WDL[d.ld.getDay()]);
    sr.getElementById("v").innerHTML = `${fk(d.y, 0)}<span class="u">kWh</span>`;
    const diff = d.avg ? Math.round(((d.y - d.avg) / d.avg) * 100) : 0;
    sr.getElementById("s").textContent = `${fm(d.yCost)} · ${diff === 0 ? "about average" : Math.abs(diff) + "% " + (diff > 0 ? "above" : "below") + " avg"}`;
    sr.getElementById("cap").textContent = `${MON[d.ms.getMonth()]} ${fk(d.mtd, 0)} kWh · ${fm(d.mtdCost)}`;
    this._draw();
  }
  _draw() {
    const d = this._d, sr = this.shadowRoot; if (!sr || !d) return;
    const box = sr.getElementById("sp"), W = box.clientWidth, H = Math.max(36, box.clientHeight - 18);
    if (!W) return;
    sr.getElementById("g").innerHTML = barChart(W, H, d.spark.map((x) => x.v), [], { axis: false, hiLast: true, hits: false });
  }
}

/* ---------------- full page */
/* Zoomable usage timeline. The bar size follows how much time is on screen:
   hours (up to ~2 days), days (up to ~10 weeks), weeks (up to ~9 months), months (up to ~2.4 years), then years.
   Pinch, scroll-wheel, the Hour/Day/Week/Month/Year control and the ‹ › buttons all move one continuous view. */
const HR = 3600e3, DY = 864e5;
const DATA_START = new Date(2023, 9, 1).getTime(); /* Duke history was backfilled from Oct 2023 */
const LV = [
  { k: "hour", l: "Hour", max: 2.25 * DY, preset: 1 * DY },
  { k: "day", l: "Day", max: 75 * DY, preset: 31 * DY },
  { k: "week", l: "Week", max: 275 * DY, preset: 26 * 7 * DY },
  { k: "month", l: "Month", max: 2.4 * 365 * DY, preset: 365 * DY },
  { k: "year", l: "Year", max: Infinity, preset: null },
];
const MIN_SPAN = 6 * HR;
const lvlFor = (span) => LV.find((x) => span <= x.max);
/* bucket start / next start for each level (local time) */
const bStart = (k, t) => { const d = new Date(t); if (k === "hour") return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime(); if (k === "day") return day0(d).getTime(); if (k === "week") return addD(day0(d), -d.getDay()).getTime(); if (k === "month") return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); return new Date(d.getFullYear(), 0, 1).getTime(); };
const bNext = (k, t) => { const d = new Date(t); if (k === "hour") return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime(); if (k === "day") return addD(d, 1).getTime(); if (k === "week") return addD(d, 7).getTime(); if (k === "month") return addM(d, 1).getTime(); return new Date(d.getFullYear() + 1, 0, 1).getTime(); };
/* critically damped spring (damping 1.0, response 0.4 s), used for every animated zoom and pan */
const SPRING_W = (2 * Math.PI) / 0.4;
const springAt = (x0, v0, t) => { const w = SPRING_W; return (x0 + (v0 + w * x0) * t) * Math.exp(-w * t); };
const rubber = (x, d, c = 0.55) => (x * d * c) / (d + c * Math.abs(x));

class OsEnergyPage extends HTMLElement {
  setConfig(c) { this._c = c || {}; if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._unit = "kwh"; this._span = LV[1].preset; this._t1 = null; this._ymax = null; this._build(); } }
  getCardSize() { return 12; }
  set hass(h) { E.hass = h; if (!this._did) { this._did = true; this._init(); } }
  connectedCallback() { this._iv = setInterval(() => { E.cache.clear(); this._D = null; this._init(); }, 60 * 60000); }
  disconnectedCallback() { clearInterval(this._iv); cancelAnimationFrame(this._raf); this._raf = 0; }
  _build() {
    this.shadowRoot.innerHTML = `<style>${CARD}
.page{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) minmax(0,0.62fr);gap:16px;}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;}
.tile .card{padding:16px 20px 15px;display:flex;flex-direction:column;gap:4px;}
.tile .v{font-size:34px;font-weight:600;line-height:1.05;white-space:nowrap;}
.tile .sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tile .sub b{color:var(--os-text,#f5f5f7);font-weight:600;}
.main .card{display:flex;flex-direction:column;padding:16px 20px 12px;}
.hd{display:flex;align-items:center;gap:10px;flex:none;}
.ttl{font-family:var(--os-font-display,-apple-system,"SF Pro Display",Inter,system-ui,sans-serif);font-size:24px;font-weight:700;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}
.sp{flex:1;}
.seg{position:relative;display:inline-flex;padding:3px;border-radius:999px;background:var(--os-surface-3,rgba(255,255,255,0.1));gap:2px;flex:none;}
.seg button{position:relative;z-index:1;height:34px;padding:0 14px;border-radius:999px;font-size:15px;font-weight:600;color:var(--os-text-2,#a1a1a6);transition:color 200ms ease;}
.seg button.on{color:var(--os-on-text,#1d1d1f);}
.seg .thumb{position:absolute;z-index:0;top:3px;height:34px;border-radius:999px;background:var(--os-on,#f5f5f7);box-shadow:0 1px 3px rgba(0,0,0,0.18);transition:transform 360ms cubic-bezier(0.2,0.9,0.25,1),width 360ms cubic-bezier(0.2,0.9,0.25,1);}
.rnd{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--os-surface-3,rgba(255,255,255,0.1));transition:transform 140ms ease,opacity 160ms ease;flex:none;}
.rnd:disabled{opacity:0.3;cursor:default;}
.rnd ha-icon{--mdc-icon-size:24px;width:24px;height:24px;display:flex;}
button:active{transform:scale(0.95);}
.info{display:flex;align-items:baseline;gap:12px;margin:10px 0 4px;flex:none;min-height:40px;}
.info .num{font-size:30px;font-weight:600;white-space:nowrap;}
.info .sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#main{flex:1;min-height:0;position:relative;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab;}
#main.drag{cursor:grabbing;}
#main canvas{position:absolute;left:0;top:0;}
.hint{position:absolute;right:2px;top:0;font-size:12px;font-weight:500;color:var(--os-text-3,#6e6e73);pointer-events:none;transition:opacity 400ms ease;}
.bot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) minmax(0,0.85fr);gap:16px;min-height:0;}
.bot .card{display:flex;flex-direction:column;padding:14px 18px 10px;}
.bot .hd2{display:flex;align-items:baseline;gap:8px;flex:none;margin-bottom:6px;}
.bot .t2{font-size:17px;font-weight:600;letter-spacing:-0.015em;}
.bot .s2{font-size:13px;color:var(--os-text-2,#a1a1a6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#prof,#yoy{flex:1;min-height:0;position:relative;overflow:hidden;}
#prof svg,#yoy svg{position:absolute;left:0;top:0;}
.main,.bot,.bot>div,.tiles{min-height:0;}
.lg{display:flex;gap:12px;font-size:12px;font-weight:600;color:var(--os-text-2,#a1a1a6);margin-left:auto;}
.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;background:var(--os-accent,#2997ff);}
.lg i.c{background:var(--os-text-3,#6e6e73);opacity:0.6;}
.rate{display:flex;flex-direction:column;gap:8px;font-size:14px;color:var(--os-text-2,#a1a1a6);overflow:hidden;}
.rate .t2{color:var(--os-text,#f5f5f7);}
.rate .r{display:flex;justify-content:space-between;gap:8px;}
.rate .r b{color:var(--os-text,#f5f5f7);font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;}
.rate .note{font-size:12px;color:var(--os-text-3,#6e6e73);line-height:1.35;margin-top:auto;}
@media (prefers-reduced-motion: reduce){.seg .thumb{transition:none;}}
@media (max-width: 700px){
.page{display:flex;flex-direction:column;height:auto;}
.tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.tile .card{padding:14px 16px;}
.tile .v{font-size:28px;}
.main .card{height:440px;padding:14px 14px 10px;}
.hd{flex-wrap:wrap;row-gap:10px;}
#seg{order:3;width:100%;justify-content:space-between;}
#seg button{flex:1;padding:0;}
.bot{display:flex;flex-direction:column;gap:10px;}
.bot .card{height:220px;}
.tile .sub{white-space:normal;}
.info{flex-wrap:wrap;row-gap:2px;}
.info .sub{white-space:normal;}
.bot .hd2{flex-wrap:wrap;}
.bot .s2{order:3;width:100%;}
.bot .rc .card{height:auto;}
}
</style>
<div class="page">
<div class="tiles">
<div class="tile"><div class="card"><div class="lab" id="t1l">Yesterday</div><div class="v num" id="t1v">–</div><div class="sub" id="t1s"></div></div></div>
<div class="tile"><div class="card"><div class="lab" id="t2l">This Month</div><div class="v num" id="t2v">–</div><div class="sub" id="t2s"></div></div></div>
<div class="tile"><div class="card"><div class="lab" id="t3l">Projected Bill</div><div class="v num" id="t3v">–</div><div class="sub" id="t3s"></div></div></div>
<div class="tile"><div class="card"><div class="lab" id="t4l">Last Month</div><div class="v num" id="t4v">–</div><div class="sub" id="t4s"></div></div></div>
</div>
<div class="main"><div class="card">
<div class="hd"><div class="ttl" id="ttl">Usage</div><div class="sp"></div>
<div class="seg" id="seg"><span class="thumb" id="th"></span>${LV.map((x) => `<button data-k="${x.k}">${x.l}</button>`).join("")}</div>
<div class="seg" id="unit"><span class="thumb" id="uth"></span><button data-u="kwh">kWh</button><button data-u="usd">$</button></div>
<button class="rnd" id="prev" aria-label="Earlier"><ha-icon icon="mdi:chevron-left"></ha-icon></button><button class="rnd" id="next" aria-label="Later"><ha-icon icon="mdi:chevron-right"></ha-icon></button></div>
<div class="info"><div class="num" id="iv">–</div><div class="sub" id="is"></div></div>
<div id="main"><canvas id="cv"></canvas><div class="hint" id="hint">Pinch to zoom · drag to move</div></div></div></div>
<div class="bot">
<div><div class="card"><div class="hd2"><div class="t2">Typical Day</div><div class="s2" id="psub">average by hour, last 30 days</div></div><div id="prof"></div></div></div>
<div><div class="card"><div class="hd2"><div class="t2">Year over Year</div><div class="s2" id="ysub"></div><div class="lg"><span><i class="c"></i><span id="ly">Last year</span></span><span><i></i><span id="ty">This year</span></span></div></div><div id="yoy"></div></div></div>
<div class="rc"><div class="card rate"><div class="hd2"><div class="t2">Your Rate</div></div>
<div class="r"><span>Energy</span><b>${(RATE.kwh * 100).toFixed(1)}¢ / kWh</b></div>
<div class="r"><span>Winter, over ${RATE.winterBlock} kWh</span><b>${(RATE.winterTail * 100).toFixed(1)}¢ / kWh</b></div>
<div class="r"><span>Monthly charges</span><b>$${RATE.fixed.toFixed(2)}</b></div>
<div class="r"><span>NC sales tax</span><b>${Math.round(RATE.tax * 100)}%</b></div>
<div class="note" id="note">${RATE.name}. Costs are estimates at current rates. Duke reports hourly usage, about a day late.</div></div></div>
</div></div>`;
    const sr = this.shadowRoot, $ = (id) => sr.getElementById(id);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => { this._sizeCanvas(); this._kick(); this._drawProf(); this._drawYoy(); this._thumbs(); });
      ["main", "prof", "yoy", "seg"].forEach((id) => this._ro.observe($(id)));
    }
    $("seg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; this._zoomTo(b.dataset.k); });
    $("unit").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; this._unit = b.dataset.u; this._ymax = null; this._thumbs(); this._kick(); });
    $("prev").addEventListener("click", () => this._page(-1));
    $("next").addEventListener("click", () => this._page(1));
    this._gestures($("main"));
    $("prof").addEventListener("click", (e) => { const r = e.target.closest(".hit"); if (!r) return; const i = +r.dataset.i; this._psel = this._psel === i ? null : i; this._drawProf(); });
    $("yoy").addEventListener("click", (e) => { const r = e.target.closest(".hit"); if (!r) return; const i = +r.dataset.i; this._ysel = this._ysel === i ? null : i; this._drawYoy(); });
    this._thumbs();
  }
  /* sliding highlight behind the selected segment */
  _thumbs() {
    const sr = this.shadowRoot; if (!sr) return;
    const lv = lvlFor(this._span).k;
    [["seg", "th", (b) => b.dataset.k === lv], ["unit", "uth", (b) => b.dataset.u === this._unit]].forEach(([id, th, on]) => {
      const box = sr.getElementById(id), t = sr.getElementById(th); let hit = null;
      box.querySelectorAll("button").forEach((b) => { const o = on(b); b.classList.toggle("on", o); if (o) hit = b; });
      if (hit && hit.offsetWidth) { t.style.width = hit.offsetWidth + "px"; t.style.transform = `translateX(${hit.offsetLeft - 3}px)`; t.style.left = "3px"; }
    });
  }
  async _init() {
    try { this._s = await summary(); } catch (e) { this._s = null; }
    this._tiles();
    const ld = this._s ? this._s.ld : addD(day0(new Date()), -1);
    this._ld = ld;
    this._end = addD(ld, 1).getTime();
    if (this._t1 == null) this._t1 = this._end;
    this._sizeCanvas(); this._kick();
    const hrs = await q(addD(ld, -29), addD(ld, 1), "hour"), sums = new Array(24).fill(0), cnt = new Array(24).fill(0);
    hrs.forEach((r) => { const h = r.s.getHours(); sums[h] += r.v; cnt[h]++; });
    this._prof = sums.map((s, i) => (cnt[i] ? s / cnt[i] : 0));
    const y = ld.getFullYear(), mrows = await q(new Date(y - 1, 0, 1), new Date(y + 1, 0, 1), "month"), mm = new Map();
    mrows.forEach((r) => mm.set(r.s.getFullYear() * 12 + r.s.getMonth(), r.v));
    this._yoy = { y, cur: MON.map((_, i) => (new Date(y, i, 1) <= ld ? mm.get(y * 12 + i) ?? null : null)), prev: MON.map((_, i) => mm.get((y - 1) * 12 + i) ?? null) };
    this.shadowRoot.getElementById("ly").textContent = String(y - 1); this.shadowRoot.getElementById("ty").textContent = String(y);
    this._drawProf(); this._drawYoy();
  }
  _tiles() {
    const d = this._s, sr = this.shadowRoot, $ = (id) => sr.getElementById(id); if (!d) return;
    const diff = d.avg ? Math.round(((d.y - d.avg) / d.avg) * 100) : 0;
    $("t1l").textContent = day0(new Date()).getTime() - d.ld.getTime() <= 86400000 ? "Yesterday" : `${WDS[d.ld.getDay()]}, ${MON[d.ld.getMonth()]} ${d.ld.getDate()}`;
    $("t1v").innerHTML = `${fk(d.y, 0)}<span class="u">kWh</span>`;
    $("t1s").innerHTML = `<b>${fm(d.yCost)}</b> · ${diff === 0 ? "about average" : Math.abs(diff) + "% " + (diff > 0 ? "above" : "below") + " 30-day avg"}`;
    $("t2l").textContent = MONTHS[d.ms.getMonth()] + " so far";
    $("t2v").innerHTML = `${fk(d.mtd, 0)}<span class="u">kWh</span>`;
    $("t2s").innerHTML = `<b>${fm(d.mtdCost)}</b> · ${d.mtdDays} of ${dim(d.ms)} days`;
    $("t3l").textContent = "Projected " + MONTHS[d.ms.getMonth()] + " bill";
    $("t3v").textContent = fm(d.projBill);
    $("t3s").innerHTML = `about <b>${fk(d.proj, 0)} kWh</b> at this pace`;
    $("t4l").textContent = MONTHS[d.pms.getMonth()];
    $("t4v").innerHTML = `${fk(d.lm, 0)}<span class="u">kWh</span>`;
    $("t4s").innerHTML = `<b>${fm(d.lmBill)}</b> estimated bill`;
  }

  /* ---------- data, loaded in chunks as the view needs them ---------- */
  _data() {
    if (!this._D) this._D = { hour: new Map(), day: new Map(), dayCost: new Map(), month: new Map(), want: new Set(), have: new Set() };
    return this._D;
  }
  _need(kind, start) {
    const D = this._data(), key = kind + start;
    if (D.have.has(key) || D.want.has(key)) return;
    D.want.add(key);
    const a = new Date(start), b = kind === "hour" ? addD(a, 1) : kind === "day" ? addM(a, 1) : new Date(a.getFullYear() + 1, 0, 1);
    q(a, b, kind).then((rows) => {
      if (this._D !== D) return;
      if (kind === "day") {
        /* month-to-date, so winter's cheaper tail rate lands on the right days */
        let acc = 0;
        rows.sort((x, y) => x.s - y.s).forEach((r) => { const t = day0(r.s).getTime(); D.day.set(t, r.v); D.dayCost.set(t, costSlice(r.v, acc, r.s.getMonth())); acc += r.v; });
      } else rows.forEach((r) => D[kind].set(kind === "month" ? new Date(r.s.getFullYear(), r.s.getMonth(), 1).getTime() : r.s.getTime(), r.v));
      D.have.add(key); D.want.delete(key);
      this._ymaxTarget = null; this._kick();
    });
  }
  /* value and cost of one bucket, or null while loading / outside the data */
  _bucket(k, s, e) {
    const D = this._data(), end = this._end || Date.now();
    if (s >= end || e <= DATA_START) return null;
    const partial = e > end || s < DATA_START; /* first and newest bars only cover part of their period */
    if (k === "hour") {
      const ds = day0(new Date(s)).getTime();
      this._need("hour", ds); this._need("day", new Date(new Date(s).getFullYear(), new Date(s).getMonth(), 1).getTime());
      if (!D.have.has("hour" + ds)) return null;
      const v = D.hour.get(s) || 0, dv = D.day.get(ds), dc = D.dayCost.get(ds);
      return { v, c: dv ? (dc * v) / dv : v * RATE.kwh * (1 + RATE.tax), partial };
    }
    if (k === "day" || k === "week") {
      let v = 0, c = 0, ok = true;
      for (let t = s; t < e && t < end; t = addD(new Date(t), 1).getTime()) {
        const m = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), 1).getTime();
        this._need("day", m);
        if (!D.have.has("day" + m)) { ok = false; continue; }
        v += D.day.get(t) || 0; c += D.dayCost.get(t) || 0;
      }
      return ok ? { v, c, partial } : null;
    }
    /* months and years: whole bills, fixed charges included */
    let v = 0, c = 0, ok = true;
    for (let t = s; t < e && t < end; t = addM(new Date(t), 1).getTime()) {
      const y = new Date(new Date(t).getFullYear(), 0, 1).getTime();
      this._need("month", y);
      if (!D.have.has("month" + y)) { ok = false; continue; }
      const mv = D.month.get(t) || 0, mo = new Date(t).getMonth();
      const cur = this._s && t === this._s.ms.getTime();
      v += mv; c += cur ? this._s.mtdCost : mv ? billFor(mv, mo) : 0;
    }
    return ok ? { v, c, partial } : null;
  }

  /* ---------- view: t1 = right edge (ms), span = visible time (ms) ---------- */
  _limits() {
    const end = this._end || addD(day0(new Date()), 1).getTime();
    const lv = lvlFor(this._span).k;
    const maxT1 = lv === "hour" || lv === "day" ? end : bNext(lv, bStart(lv, end - 1));
    const yearsSpan = bNext("year", bStart("year", end - 1)) - bStart("year", DATA_START);
    const maxSpan = Math.max(2.5 * 365 * DY, yearsSpan);
    return { maxT1, minT0: bStart(lv, DATA_START), maxSpan };
  }
  _clampSpan(s) { return Math.min(this._limits().maxSpan, Math.max(MIN_SPAN, s)); }
  _kick() { if (!this._raf) this._raf = requestAnimationFrame((t) => this._frame(t)); }
  _frame(now) {
    this._raf = 0;
    if (this._t1 == null) return; /* nothing to show until the newest day is known */
    let more = false;
    const dt = this._lastT ? Math.min(48, now - this._lastT) : 16; this._lastT = now;
    /* animated zoom / pan (spring) */
    const a = this._anim;
    if (a) {
      const t = (now - a.t0) / 1000, ls = Math.log(a.s1) + springAt(Math.log(a.s0) - Math.log(a.s1), 0, t), t1 = a.e1 + springAt(a.e0 - a.e1, 0, t);
      this._span = Math.exp(ls); this._t1 = t1;
      if (t > 1.1) { this._span = a.s1; this._t1 = a.e1; this._anim = null; } else more = true;
    }
    /* momentum after a flick (exponential decay, like a scroll view) */
    if (this._vel && !this._drag) {
      const msPerPx = this._span / this._iw();
      this._t1 -= this._vel * dt * msPerPx;
      this._vel *= Math.pow(0.996, dt);
      const L = this._limits();
      if (this._t1 > L.maxT1 || this._t1 - this._span < L.minT0) this._vel *= 0.6;
      if (Math.abs(this._vel) < 0.02) this._vel = 0; else more = true;
    }
    /* settle back inside the data after an overscroll */
    if (!this._drag && !this._anim && !this._vel) {
      const L = this._limits();
      let target = this._t1;
      if (this._t1 > L.maxT1) target = L.maxT1;
      if (target - this._span < L.minT0) target = Math.min(L.maxT1, L.minT0 + this._span);
      if (Math.abs(target - this._t1) > 1000) { this._anim = { t0: now, s0: this._span, s1: this._span, e0: this._t1, e1: target }; more = true; }
    }
    if (this._draw(dt)) more = true;
    if (more) this._kick(); else this._lastT = 0;
  }
  _iw() { return Math.max(10, (this._W || 600) - 44); }
  _sizeCanvas() {
    const box = this.shadowRoot.getElementById("main"), cv = this.shadowRoot.getElementById("cv");
    const W = box.clientWidth, H = box.clientHeight, dpr = Math.min(3, window.devicePixelRatio || 1);
    if (!W || !H) return;
    if (W === this._W && H === this._H && dpr === this._dpr) return;
    this._W = W; this._H = H; this._dpr = dpr;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
  }
  _colors() {
    const now = performance.now();
    if (this._col && now - this._colT < 1000) return this._col;
    this._colT = now;
    const cs = getComputedStyle(this), g = (n, d) => (cs.getPropertyValue(n) || "").trim() || d;
    const light = document.documentElement.getAttribute("data-os-mode") === "light";
    return (this._col = { accent: g("--os-accent", light ? "#007aff" : "#2997ff"), text2: g("--os-text-2", light ? "#6e6e73" : "#a1a1a6"), text3: g("--os-text-3", light ? "#8e8e93" : "#6e6e73"), grid: light ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)", avg: g("--os-text-2", light ? "#6e6e73" : "#a1a1a6") });
  }
  /* the buckets on screen for the current zoom */
  _buckets() {
    const lv = lvlFor(this._span).k, t0 = this._t1 - this._span, out = [];
    let s = bStart(lv, t0);
    for (let i = 0; i < 400 && s < this._t1; i++) { const e = bNext(lv, s); out.push({ s, e, d: this._bucket(lv, s, e) }); s = e; }
    return { lv, out };
  }
  _draw(dt) {
    const cv = this.shadowRoot && this.shadowRoot.getElementById("cv"); if (!cv || !this._W || this._t1 == null) return false;
    const ctx = cv.getContext("2d"), W = this._W, H = this._H, dpr = this._dpr, L = 44, B = 22, T = 8, iw = W - L, ih = H - B - T;
    const usd = this._unit === "usd", col = this._colors();
    const t0 = this._t1 - this._span, X = (t) => L + ((t - t0) / this._span) * iw;
    const { lv, out } = this._buckets();
    /* y scale glides to the new maximum instead of jumping */
    const vis = out.filter((b) => b.d && b.e > t0 && b.s < this._t1), mxRaw = Math.max(usd ? 0.01 : 0.1, ...vis.map((b) => (usd ? b.d.c : b.d.v)));
    const tk = ticks(mxRaw, 4);
    if (this._ymax == null || this._ymaxUnit !== this._unit + lv) {
      if (this._ymaxUnit && this._ymaxUnit !== this._unit + lv) this._fadeT = performance.now();
      this._ymax = tk.top; this._ymaxUnit = this._unit + lv;
    }
    /* new bar size: bars fade in over 180 ms (instantly with reduced motion) */
    const fade = this._fadeT ? Math.min(1, (performance.now() - this._fadeT) / 180) : 1;
    if (fade >= 1) this._fadeT = 0;
    const k = 1 - Math.exp(-dt / 90); this._ymax += (tk.top - this._ymax) * k;
    const settling = Math.abs(tk.top - this._ymax) > tk.top * 0.002;
    if (!settling) this._ymax = tk.top;
    const Y = (v) => T + ih - (v / this._ymax) * ih;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    /* grid + y labels */
    ctx.font = '500 12px -apple-system,"SF Pro Text",Inter,system-ui,sans-serif'; ctx.textBaseline = "middle";
    const fmtY = (v) => (usd ? "$" + (v > 0 && v < 1 ? v.toFixed(2) : fk(v, v > 0 && v < 10 && v % 1 ? 1 : 0)) : fk(v, v > 0 && v < 10 && v % 1 ? 1 : 0));
    for (let i = 0; i <= tk.n; i++) {
      const v = tk.st * i, y = Math.round(Y(v)) + 0.5; if (y < T - 2) continue;
      ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillStyle = col.text3; ctx.textAlign = "right"; ctx.fillText(fmtY(v), L - 8, y);
    }
    /* bars */
    ctx.save(); ctx.beginPath(); ctx.rect(L, 0, iw, H); ctx.clip();
    const slot = out.length ? (X(out[0].e) - X(out[0].s)) : iw, gap = Math.max(1, Math.min(slot * 0.24, 8));
    const sel = this._sel;
    out.forEach((b) => {
      if (!b.d) return;
      const v = usd ? b.d.c : b.d.v; if (!(v > 0)) return;
      const x0 = X(b.s) + gap / 2, w = Math.max(1, X(b.e) - X(b.s) - gap), y = Y(v), h = T + ih - y; if (h < 0.5) return;
      const r = Math.min(4, w / 2, h);
      ctx.globalAlpha = (sel != null ? (sel === b.s ? 1 : 0.35) : b.d.partial ? 0.35 : 0.6) * fade;
      ctx.fillStyle = col.accent;
      ctx.beginPath(); ctx.moveTo(x0, y + h); ctx.lineTo(x0, y + r); ctx.quadraticCurveTo(x0, y, x0 + r, y); ctx.lineTo(x0 + w - r, y); ctx.quadraticCurveTo(x0 + w, y, x0 + w, y + r); ctx.lineTo(x0 + w, y + h); ctx.closePath(); ctx.fill();
    });
    ctx.globalAlpha = 1;
    /* average of the complete buckets on screen */
    const full = vis.filter((b) => !b.d.partial && (usd ? b.d.c : b.d.v) > 0), avg = full.length > 1 ? full.reduce((a, b) => a + (usd ? b.d.c : b.d.v), 0) / full.length : null;
    if (avg != null) { const y = Math.round(Y(avg)) + 0.5; ctx.strokeStyle = col.avg; ctx.globalAlpha = 0.8; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    ctx.restore();
    /* x labels, spaced so they never collide */
    ctx.fillStyle = col.text3; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    const step = this._labelStep(lv, slot);
    let lastX = -1e9;
    out.forEach((b) => {
      const d = new Date(b.s), lab = this._label(lv, d, step); if (!lab) return;
      const x = (X(b.s) + X(b.e)) / 2, tw = ctx.measureText(lab).width; if (x < L - 2 || x > W + 2 || x - tw / 2 < lastX + 10) return;
      const cxp = Math.min(W - tw / 2 - 2, Math.max(L + tw / 2, x)); ctx.fillText(lab, cxp, H - 4); lastX = cxp + tw / 2;
    });
    this._view = { lv, out, t0, X, avg };
    this._chrome(lv, vis, avg);
    return settling || fade < 1;
  }
  _labelStep(lv, slot) {
    const need = ({ hour: 34, day: 26, week: 56, month: 40, year: 44 }[lv]) / Math.max(1, slot);
    const opts = { hour: [1, 2, 3, 6, 12, 24], day: [1, 2, 5, 10, 15, 31], week: [1, 2, 4, 8, 13, 26, 52], month: [1, 2, 3, 6, 12], year: [1, 2, 5] }[lv];
    return opts.find((o) => o >= need) || opts[opts.length - 1];
  }
  _label(lv, d, step) {
    if (lv === "hour") return d.getHours() % step === 0 ? (d.getHours() === 0 ? `${MON[d.getMonth()]} ${d.getDate()}` : hr(d.getHours())) : "";
    if (lv === "day") { if (d.getDate() === 1) return MON[d.getMonth()]; return step <= 15 && d.getDate() % step === 0 && d.getDate() < 30 ? String(d.getDate()) : ""; }
    if (lv === "week") { const wk = Math.round((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * DY)); return wk % step === 0 ? `${MON[d.getMonth()]} ${d.getDate()}` : ""; }
    if (lv === "month") return d.getMonth() % step === 0 ? (d.getMonth() === 0 ? String(d.getFullYear()) : MON[d.getMonth()]) : "";
    return d.getFullYear() % step === 0 ? String(d.getFullYear()) : "";
  }
  /* title, totals line, buttons and the level control follow the view */
  _chrome(lv, vis, avg) {
    const sr = this.shadowRoot, $ = (id) => sr.getElementById(id), usd = this._unit === "usd";
    const t0 = this._t1 - this._span, inView = vis.filter((b) => (b.s + b.e) / 2 >= t0 && (b.s + b.e) / 2 <= this._t1);
    const a = new Date(Math.max(t0, inView.length ? inView[0].s : t0)), z = new Date(Math.min(this._t1, (this._end || this._t1)) - 1);
    const title = this._rangeTitle(lv, a, z);
    if (title !== this._lastTitle) { $("ttl").textContent = title; this._lastTitle = title; }
    let v, c, lbl;
    const s = this._sel != null ? vis.find((b) => b.s === this._sel) : null;
    if (s) { v = s.d.v; c = s.d.c; lbl = this._bucketName(lv, new Date(s.s)); }
    else { v = inView.reduce((t, b) => t + b.d.v, 0); c = inView.reduce((t, b) => t + b.d.c, 0); lbl = `Total for ${inView.length} ${{ hour: "hour", day: "day", week: "week", month: "month", year: "year" }[lv]}${inView.length === 1 ? "" : "s"}`; }
    const iv = usd ? fm(c) : `${fk(v, v < 10 ? 1 : 0)}<span class="u">kWh</span>`;
    if (iv !== this._lastIv) { $("iv").innerHTML = iv; this._lastIv = iv; }
    const per = { hour: "per hour", day: "per day", week: "per week", month: "per month", year: "per year" }[lv];
    const sub = `${lbl} · ${usd ? fk(v, 0) + " kWh" : fm(c)}${!s && avg != null ? ` · average ${usd ? fm(avg) : fk(avg, avg < 10 ? 1 : 0) + " kWh"} ${per}` : ""}`;
    if (sub !== this._lastSub) { $("is").textContent = sub; this._lastSub = sub; }
    const L = this._limits();
    $("next").disabled = this._t1 >= L.maxT1 - 60000; $("prev").disabled = this._t1 - this._span <= L.minT0 + 60000;
    if (lv !== this._lastLv) { this._lastLv = lv; this._thumbs(); }
  }
  _rangeTitle(lv, a, z) {
    const sameDay = day0(a).getTime() === day0(z).getTime(), sameY = a.getFullYear() === z.getFullYear();
    const ld = this._ld;
    if (lv === "hour" && sameDay) return (ld && day0(a).getTime() === ld.getTime() && day0(new Date()).getTime() - ld.getTime() <= DY ? "Yesterday" : WDL[a.getDay()]) + `, ${MONTHS[a.getMonth()]} ${a.getDate()}`;
    if (lv === "hour" || lv === "day" || lv === "week") {
      if (a.getDate() === 1 && z.getDate() === dim(z) && a.getMonth() === z.getMonth() && sameY) return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
      return `${MON[a.getMonth()]} ${a.getDate()} – ${a.getMonth() === z.getMonth() && sameY ? "" : MON[z.getMonth()] + " "}${z.getDate()}${sameY ? "" : ", " + z.getFullYear()}`;
    }
    if (lv === "month") return sameY ? `${MON[a.getMonth()]} – ${MON[z.getMonth()]} ${z.getFullYear()}` : `${MON[a.getMonth()]} ${a.getFullYear()} – ${MON[z.getMonth()]} ${z.getFullYear()}`;
    return `${a.getFullYear()} – ${z.getFullYear()}`;
  }
  _bucketName(lv, d) {
    if (lv === "hour") return `${WDS[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}, ${hr(d.getHours()).replace("a", " AM").replace("p", " PM")}`;
    if (lv === "day") return `${WDS[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
    if (lv === "week") { const e = addD(d, 6); return `Week of ${MON[d.getMonth()]} ${d.getDate()} – ${d.getMonth() === e.getMonth() ? "" : MON[e.getMonth()] + " "}${e.getDate()}`; }
    if (lv === "month") return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return String(d.getFullYear());
  }

  /* ---------- moving the view ---------- */
  _animTo(span, t1) {
    span = this._clampSpan(span);
    this._vel = 0;
    this._anim = { t0: performance.now(), s0: this._span, s1: span, e0: this._t1, e1: t1 };
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { this._span = span; this._t1 = t1; this._anim = null; }
    this._lastT = 0; this._kick();
  }
  /* jump to a bar size: keep the newest data on screen when it already is, else keep the middle */
  _zoomTo(k) {
    this._sel = null;
    const lv = LV.find((x) => x.k === k), L = this._limits(), end = this._end || this._t1;
    const span = lv.preset || Math.max(2.5 * 365 * DY, bNext("year", bStart("year", end - 1)) - bStart("year", DATA_START));
    const atEnd = this._t1 >= L.maxT1 - this._span * 0.05;
    let t1 = atEnd ? end : this._t1 - this._span / 2 + span / 2;
    if (k === "month" || k === "year") t1 = Math.max(t1, end);
    if (k === "year") t1 = bNext("year", bStart("year", end - 1));
    if (k === "month" && atEnd) t1 = bNext("month", bStart("month", end - 1));
    t1 = Math.min(Math.max(t1, bStart(k, DATA_START) + span), k === "year" || k === "month" ? bNext(k, bStart(k, end - 1)) : end);
    this._animTo(span, t1);
  }
  /* ‹ › move the view by most of a screen */
  _page(dir) {
    this._sel = null;
    const L = this._limits();
    const t1 = Math.min(L.maxT1, Math.max(L.minT0 + this._span, this._t1 + dir * this._span * 0.85));
    this._animTo(this._span, t1);
  }
  _timeAt(x) { return this._t1 - this._span + ((x - 44) / this._iw()) * this._span; }
  _gestures(box) {
    const P = new Map();
    let mode = null, sx = 0, sy = 0, t1s = 0, spanS = 0, hist = [], pinch = null, moved = false;
    const rel = (e) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const stopAnims = () => { this._anim = null; this._vel = 0; };
    box.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      P.set(e.pointerId, rel(e));
      stopAnims();
      if (P.size === 1) { const p = rel(e); sx = p.x; sy = p.y; t1s = this._t1; spanS = this._span; hist = [[performance.now(), p.x]]; mode = null; moved = false; }
      if (P.size === 2) {
        const [a, b] = [...P.values()];
        pinch = { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), span: this._span, mid: (a.x + b.x) / 2, t: this._timeAt((a.x + b.x) / 2) };
        mode = "pinch"; moved = true; this._drag = true; this._hideHint();
        try { box.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    box.addEventListener("pointermove", (e) => {
      if (!P.has(e.pointerId)) return;
      const p = rel(e); P.set(e.pointerId, p);
      if (mode === "pinch" && P.size >= 2) {
        const [a, b] = [...P.values()], d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), mid = (a.x + b.x) / 2;
        const span = this._clampSpan(pinch.span * (pinch.d / d));
        this._span = span;
        this._t1 = pinch.t + (1 - (mid - 44) / this._iw()) * span; /* the time under the fingers stays under the fingers */
        this._kick(); return;
      }
      if (P.size !== 1) return;
      const dx = p.x - sx, dy = p.y - sy;
      if (!mode) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.2) { P.delete(e.pointerId); mode = "scroll"; return; }
        mode = "pan"; moved = true; this._drag = true; box.classList.add("drag"); this._hideHint();
        try { box.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (mode !== "pan") return;
      hist.push([performance.now(), p.x]); if (hist.length > 6) hist.shift();
      const msPerPx = spanS / this._iw(), L = this._limits();
      let t1 = t1s - dx * msPerPx;
      /* soft edges: resistance grows the further past the data you pull */
      const over = (t1 - L.maxT1) / msPerPx, under = (L.minT0 - (t1 - spanS)) / msPerPx;
      if (over > 0) t1 = L.maxT1 + rubber(over, this._iw()) * msPerPx;
      else if (under > 0) t1 = L.minT0 + spanS - rubber(under, this._iw()) * msPerPx;
      this._t1 = t1; this._kick();
    });
    const end = (e) => {
      if (!P.has(e.pointerId)) return;
      const p = P.get(e.pointerId); P.delete(e.pointerId);
      if (mode === "pinch") {
        if (P.size === 1) { const q2 = [...P.values()][0]; sx = q2.x; sy = q2.y; t1s = this._t1; spanS = this._span; hist = [[performance.now(), q2.x]]; mode = "pan"; }
        else if (!P.size) { mode = null; this._drag = false; this._sel = null; this._kick(); }
        return;
      }
      if (P.size) return;
      box.classList.remove("drag");
      if (mode === "pan") {
        this._drag = false;
        const a = hist[0], b = hist[hist.length - 1];
        this._vel = b && a && b[0] - a[0] > 8 ? (b[1] - a[1]) / (b[0] - a[0]) : 0; /* px per ms, handed straight to the momentum */
        this._lastT = 0; this._kick();
      } else if (!moved && e.type === "pointerup") {
        /* tap: pick the bar under the finger, tap again to clear */
        const v = this._view; if (!v) return;
        const t = this._timeAt(p.x), b = v.out.find((x) => t >= x.s && t < x.e && x.d);
        this._sel = b && this._sel !== b.s ? b.s : null; this._kick();
      }
      mode = null;
    };
    box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
    /* trackpads and mice: pinch (ctrl + wheel) zooms around the pointer, sideways scroll pans */
    box.addEventListener("wheel", (e) => {
      const p = rel(e);
      if (e.ctrlKey) {
        e.preventDefault(); stopAnims(); this._hideHint();
        const t = this._timeAt(p.x), span = this._clampSpan(this._span * Math.exp(e.deltaY * 0.01));
        this._span = span; this._t1 = t + (1 - (p.x - 44) / this._iw()) * span; this._sel = null; this._kick();
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault(); stopAnims(); this._hideHint();
        const d = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX, L = this._limits();
        this._t1 = Math.min(L.maxT1, Math.max(L.minT0 + this._span, this._t1 + d * (this._span / this._iw()))); this._kick();
      }
    }, { passive: false });
  }
  _hideHint() { const h = this.shadowRoot.getElementById("hint"); if (h && !this._hinted) { this._hinted = true; h.style.opacity = "0"; } }
  _drawProf() {
    const p = this._prof, box = this.shadowRoot.getElementById("prof"); if (!p || !box.clientWidth) return;
    box.innerHTML = lineChart(box.clientWidth, box.clientHeight, p, p.map((_, h) => (h % 6 === 0 ? hr(h) : "")), { sel: this._psel });
    const sub = this.shadowRoot.getElementById("psub");
    if (this._psel != null) sub.textContent = `${hr(this._psel).replace("a", " AM").replace("p", " PM")} · ${fk(p[this._psel], 1)} kWh on average`;
    else { const pk = p.indexOf(Math.max(...p)); sub.textContent = `busiest around ${hr(pk).replace("a", " AM").replace("p", " PM")}`; }
  }
  _drawYoy() {
    const y = this._yoy, box = this.shadowRoot.getElementById("yoy"); if (!y || !box.clientWidth) return;
    box.innerHTML = barChart(box.clientWidth, box.clientHeight, y.cur, MON.map((m) => m.slice(0, 1)), { cmp: y.prev, sel: this._ysel ?? -1, fmt: (v) => fk(v, 0) });
    const sub = this.shadowRoot.getElementById("ysub");
    if (this._ysel != null) { const i = this._ysel, a = y.prev[i], b = y.cur[i]; sub.textContent = `${MON[i]} · ${b == null ? "–" : fk(b, 0)} vs ${a == null ? "–" : fk(a, 0)} kWh`; }
    else { const n = Math.max(0, y.cur.filter((v) => v != null).length - 1), ytd = y.cur.slice(0, n).reduce((t, v) => t + (v || 0), 0), prev = y.prev.slice(0, n).reduce((t, v) => t + (v || 0), 0); sub.textContent = prev ? `${Math.abs(Math.round(((ytd - prev) / prev) * 100))}% ${ytd >= prev ? "more" : "less"} through ${MON[Math.max(0, n - 1)]}` : ""; }
  }
}
if (!customElements.get("os-energy-mini")) customElements.define("os-energy-mini", OsEnergyMini);
if (!customElements.get("os-energy-page")) customElements.define("os-energy-page", OsEnergyPage);
window.__osEnergyRate = RATE;
})();
