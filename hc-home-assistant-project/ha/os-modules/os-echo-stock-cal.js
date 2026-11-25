/* os-echo-stock-cal (Nov 19 2026): the stock Echo Show calendar for os-echo (skin: "stock").
   Measured from Owen's own Echo (task thumbnail 7551, Fire OS calendar month view): black screen; month and year top left;
   round dark "Today" and "Month" buttons, a settings circle and a "+" circle top right; weekday names; a full-width grid of
   tall day cells (thin grey lines) with the date top left and a dark "No events" pill, or the day's events as pills;
   weeks scroll up and down and the title follows the month on screen. Tap a day = that day's events (os-echo day sheet);
   "+" = new event (os-echo add sheet); Today = back to this week; Month / Agenda switch views; the gear opens Settings. */
(() => {
if (window.__osStockCal) return; window.__osStockCal = true;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CSS = `
:host(.stk-calp) .panel .ph{display:none!important;}
:host(.stk-calp) .panel{background:#000!important;}
.kc{position:absolute;inset:0;background:#000;color:#fff;font-family:"Amazon Ember",Roboto,sans-serif;display:flex;flex-direction:column;}
.kc button{font:inherit;color:#fff;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.kc button:active{opacity:.7;}
.kch{flex:none;position:relative;height:23vh;}
.kct{position:absolute;left:5vw;top:7.5vh;height:7.5vh;display:flex;align-items:center;font-size:5.5vh;font-weight:400;white-space:nowrap;}
.kcp{position:absolute;top:7.5vh;height:7.5vh;border-radius:99px;background:#262626!important;font-size:3.5vh!important;display:flex;align-items:center;justify-content:center;gap:.8vw;}
.kcp ha-icon{--mdc-icon-size:3.5vh;}
.kcc{position:absolute;top:7.25vh;width:8vh;height:8vh;border-radius:50%;background:#262626!important;display:flex;align-items:center;justify-content:center;transform:translateX(-50%);}
.kcc ha-icon{--mdc-icon-size:4vh;}
.kcw{position:absolute;left:0;right:0;bottom:0;height:7vh;display:grid;grid-template-columns:repeat(7,1fr);align-items:center;text-align:center;font-size:3.25vh;}
.kcg{position:relative;flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;scrollbar-width:none;border-top:1px solid #3a3a3a;}
.kcg::-webkit-scrollbar{display:none;}
.kcr{display:grid;grid-template-columns:repeat(7,1fr);height:22.75vh;border-bottom:1px solid #3a3a3a;}
.kcd{position:relative;border-right:1px solid #3a3a3a;text-align:left;overflow:hidden;background:none!important;padding:0!important;display:block;}
.kcd:last-child{border-right:0;}
.kcd .n{position:absolute;left:1.56vw;top:2.4vh;font-size:3vh;line-height:4vh;min-width:4vh;height:4vh;margin-left:-.5vh;text-align:center;border-radius:2vh;}
.kcd.t .n{background:#0a9dff;padding:0 .4vh;}
.kcd.s{background:rgba(255,255,255,.07)!important;}
.kcd .ps{position:absolute;left:1.25vw;right:1.25vw;top:9vh;display:flex;flex-direction:column;gap:1vh;}
.kcd .p{height:6vh;border-radius:99px;background:#2c2c2c;font-size:3.25vh;line-height:6vh;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 1vw;}
.kcd .p.e{height:5vh;line-height:5vh;font-size:2.6vh;text-align:left;padding:0 1vw;}
.kcd .p.m{background:none;height:3.6vh;line-height:3.6vh;font-size:2.4vh;color:rgba(255,255,255,.7);text-align:left;}
.kca{flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;scrollbar-width:none;padding:0 5vw 6vh;border-top:1px solid #3a3a3a;}
.kca::-webkit-scrollbar{display:none;}
.kca h4{margin:3.4vh 0 1.2vh;font-size:3vh;font-weight:700;color:rgba(255,255,255,.75);}
.kca .r{display:flex;align-items:center;gap:2vw;width:100%;min-height:9vh;padding:1.6vh 2vw!important;margin-bottom:1.2vh;border-radius:2.4vh;background:#1c1c1c!important;text-align:left;font-size:3.4vh!important;}
.kca .r i{flex:none;width:1.4vh;height:5vh;border-radius:1vh;}
.kca .r span{flex:none;width:16vw;font-size:2.8vh;color:rgba(255,255,255,.7);}
.kca .em{margin-top:8vh;text-align:center;font-size:3.6vh;color:rgba(255,255,255,.7);}
`;
const isOn = (el) => !!(el && el._c && el._c.skin === "stock" && !el._c.replay);
const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtT = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

async function render(el) {
  const body = el.$("pBody"); body.className = "pb fill"; el._pEls = [];
  if (!el.shadowRoot.querySelector("style[data-kc]")) { const st = document.createElement("style"); st.dataset.kc = "1"; st.textContent = CSS; el.shadowRoot.appendChild(st); }
  el.$("pAct").innerHTML = ""; el.$("pTitle").textContent = "Calendar";
  const view = el.__kcView || "month", now = new Date();
  let root = body.querySelector(".kc");
  if (!root) {
    body.innerHTML = `<div class="kc"><div class="kch"><div class="kct"></div><button class="kcp" data-k="today" style="left:43.1vw;width:16.6vw">Today</button><button class="kcp" data-k="view" style="left:62.5vw;width:16.7vw"><ha-icon></ha-icon><span></span></button><button class="kcc" data-k="set" style="left:84.5vw" aria-label="Settings"><ha-icon icon="mdi:cog"></ha-icon></button><button class="kcc" data-k="add" style="left:92.5vw" aria-label="Add an event"><ha-icon icon="mdi:plus"></ha-icon></button><div class="kcw">${DOW.map((d) => `<span>${d}</span>`).join("")}</div></div><div class="kcb" style="flex:1;min-height:0;display:flex;flex-direction:column"></div></div>`;
    root = body.querySelector(".kc");
    root.addEventListener("click", (e) => click(el, e));
  }
  root.querySelector('[data-k="view"] ha-icon').setAttribute("icon", view === "month" ? "mdi:calendar-month" : "mdi:format-list-bulleted");
  root.querySelector('[data-k="view"] span').textContent = view === "month" ? "Month" : "Agenda";
  root.querySelector(".kcw").style.visibility = view === "month" ? "" : "hidden";
  const box = root.querySelector(".kcb");
  /* events for the month before, this month and the two after (os-echo caches each month for 25 s) */
  const months = []; for (let k = -1; k <= 2; k++) { const d = new Date(now.getFullYear(), now.getMonth() + k, 1); months.push([d.getFullYear(), d.getMonth()]); }
  const lists = await Promise.all(months.map(([y, m]) => el._monthEvents(y, m)));
  if (el._panel !== "calendar") return;
  const seen = new Set(), ev = [];
  lists.forEach((l) => (l || []).forEach((x) => { const k = x.t + "|" + +x.s + "|" + x.cal; if (!seen.has(k)) { seen.add(k); ev.push(x); } }));
  el._mev = ev;
  if (view === "agenda") {
    const days = []; for (let i = 0; i < 60; i++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), l = el._onDay(ev, d); if (l.length) days.push([d, l]); }
    root.querySelector(".kct").textContent = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    box.innerHTML = `<div class="kca">${days.length ? days.map(([d, l]) => `<h4>${d.toDateString() === now.toDateString() ? "Today" : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h4>${l.map((x) => `<button class="r" data-day="${+d}"><i style="background:rgb(${el._calColor(x.cal)})"></i><span>${x.all ? "All day" : fmtT(x.s)}</span>${esc(x.t)}</button>`).join("")}`).join("") : `<div class="em">No upcoming events</div>`}</div>`;
    return;
  }
  /* month view: weeks from the first Sunday on or before the first of last month, 17 weeks */
  const f = new Date(now.getFullYear(), now.getMonth() - 1, 1), start = new Date(f.getFullYear(), f.getMonth(), 1 - f.getDay());
  const sel = el._csel && el._csel.toDateString(), today = now.toDateString();
  let html = "";
  for (let w = 0; w < 17; w++) {
    html += `<div class="kcr" data-w="${+new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7)}">`;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i), l = el._onDay(ev, d), n = l.length;
      const pills = n ? l.slice(0, n > 2 ? 1 : 2).map((x) => `<div class="p e" style="background:rgba(${el._calColor(x.cal)},.42)">${esc(x.t)}</div>`).join("") + (n > 2 ? `<div class="p m">+${n - 1} more</div>` : "") : `<div class="p">No events</div>`;
      html += `<button class="kcd${d.toDateString() === today ? " t" : ""}${d.toDateString() === sel ? " s" : ""}" data-day="${+d}"><span class="n">${d.getDate()}</span><div class="ps">${pills}</div></button>`;
    }
    html += `</div>`;
  }
  const keep = box.querySelector(".kcg"), y = keep ? keep.scrollTop : null;
  box.innerHTML = `<div class="kcg">${html}</div>`;
  const g = box.querySelector(".kcg");
  const title = () => { const rows = g.querySelectorAll(".kcr"), top = g.scrollTop + 2; let r = rows[0]; for (const x of rows) { if (x.offsetTop <= top) r = x; else break; } const d = new Date(+r.dataset.w + 3 * 864e5); root.querySelector(".kct").textContent = d.toLocaleDateString("en-US", { month: "long", year: "numeric" }); };
  g.addEventListener("scroll", () => { requestAnimationFrame(title); if (el._idle) el._idle(90000); }, { passive: true });
  if (y != null && !el.__kcJump) g.scrollTop = y; else jump(el, g, el.__kcJump || sod(now));
  el.__kcJump = null; title();
}
function jump(el, g, d) {
  const rows = [...g.querySelectorAll(".kcr")], t = sod(d).getTime();
  const r = rows.find((x) => t >= +x.dataset.w && t < +x.dataset.w + 7 * 864e5) || rows[0];
  g.scrollTop = r.offsetTop;
}
function click(el, e) {
  if (el._idle) el._idle(90000);
  const b = e.target.closest("[data-k],[data-day]"); if (!b) return; e.stopPropagation();
  const k = b.dataset.k;
  if (k === "today") { el.__kcView = "month"; el.__kcJump = new Date(); el._csel = null; const g = el.shadowRoot.querySelector(".kc .kcg"); if (g) { jump(el, g, new Date()); g.dispatchEvent(new Event("scroll")); } else render(el); return; }
  if (k === "view") { el.__kcView = (el.__kcView || "month") === "month" ? "agenda" : "month"; const body = el.$("pBody"); const kb = body.querySelector(".kcb"); if (kb) kb.innerHTML = ""; render(el); return; }
  if (k === "set") { const s = el.shadowRoot.querySelector('[data-q="sk-settings"]'); if (s) s.click(); return; }
  if (k === "add") return el._addSheet(el._csel || new Date());
  if (b.dataset.day) { el._csel = new Date(+b.dataset.day); el.shadowRoot.querySelectorAll(".kcd.s").forEach((x) => x.classList.remove("s")); b.classList.add("s"); return el._daySheet(el._csel); }
}
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype; if (P.__stkCal) return; P.__stkCal = true;
  const pc = P._pCalendar;
  P._pCalendar = function () { if (!isOn(this)) return pc.apply(this, arguments); try { return render(this); } catch (e) { return pc.apply(this, arguments); } };
  const t0 = P._tick;
  P._tick = function () { const r = t0.apply(this, arguments); try { if (isOn(this)) this.classList.toggle("stk-calp", this._panel === "calendar"); } catch (e) { /* never break the clock */ } return r; };
  const op = P._open;
  P._open = function (p) { const r = op.apply(this, arguments); try { if (isOn(this)) this.classList.toggle("stk-calp", this._panel === "calendar"); } catch (e) { /* ignore */ } return r; };
});
})();
