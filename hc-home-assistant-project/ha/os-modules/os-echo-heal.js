/* os-echo-heal (Nov 22 2026, Claude). Owen: "I want Alexa to report any bugs/errors that occur and have them fixed
   in real time, e.g. the family locations map card broke, I want it to automatically fix itself."
   Runs only on the kitchen Echo Show's alexa-dashboard (never in Puppet or other browsers).
   1. Catches script errors and failed promises from our own screen code (window error / unhandledrejection).
   2. Every 20 s checks the home screen and repairs what is broken, on the spot:
        family map (no tiles, broken tiles, names missing), weather (blank / "--"), front door picture (blank),
        clock frozen, Home Assistant connection lost, the Echo screen card missing (blank page).
      Repair ladder for each problem: 2nd check -> redraw that widget; 4th -> redraw the whole home screen;
      6th -> reload the page (VACA Refresh; shares the watcher's 3-per-20-min limit).
   3. Every problem goes to Home Assistant via script.alexa_screen_problem: logged in todo.alexa_screen_use,
      and anything that did not fix itself (and every code error) is added to todo.alexa_improvements as "Screen: ..."
      and starts a Claude fix run right away (automation "Alexa - fix problems right away").
      The same problem is reported at most once every 6 h; at most 12 reports an hour. */
(() => {
if (window.__osEchoHeal) return; window.__osEchoHeal = 1;
const UA = navigator.userAgent || "";
const ON_ECHO = () => location.pathname.startsWith("/alexa-dashboard") && !location.pathname.endsWith("/replay") && /Android/.test(UA) && !/Headless/.test(UA);
const hassOf = () => { const h = document.querySelector("home-assistant"); return h && h.hass; };
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
function deepFind(root, test, budget) {
  const stack = [root]; let n = 0;
  while (stack.length && n < budget) {
    const el = stack.pop(); n++;
    if (!el) continue;
    if (el.nodeType === 1 && test(el)) return el;
    if (el.shadowRoot) stack.push(el.shadowRoot);
    const k = el.children; if (k) for (let i = k.length - 1; i >= 0; i--) stack.push(k[i]);
  }
  return null;
}
let echoCache = null;
const echoEl = () => { if (echoCache && echoCache.isConnected) return echoCache; echoCache = deepFind(document.body, (n) => n.tagName === "OS-ECHO", 4000); return echoCache; };

/* ---------- reporting ---------- */
function report(o) {
  if (!ON_ECHO()) return;
  const sig = (o.kind + "|" + o.what).slice(0, 160), seen = ls.get("oseh_seen", {}), t = Date.now();
  for (const k in seen) if (t - seen[k] > 6 * 3600e3) delete seen[k];
  if (seen[sig] && !o.always) return;
  const hr = ls.get("oseh_rate", []).filter((x) => t - x < 3600e3);
  if (hr.length >= 12) return;
  hr.push(t); ls.set("oseh_rate", hr); seen[sig] = t; ls.set("oseh_seen", seen);
  const h = hassOf(); if (!h) return;
  h.callService("script", "alexa_screen_problem", {
    kind: o.kind, what: String(o.what).slice(0, 120), detail: String(o.detail || "").slice(0, 900),
    fixed: !!o.fixed, action: String(o.action || "").slice(0, 200),
  }).catch(() => {});
}
window.osEchoHealReport = report;

/* ---------- 1. code errors ---------- */
const OURS = /data:text\/javascript|data:application\/javascript|\/local\/|os-echo|os-alexa|OSEcho/;
const NOISE = /ResizeObserver loop|^Script error\.?$|AbortError|play\(\) request was interrupted|NotAllowedError|The user aborted|Failed to fetch|NetworkError|Load failed|Connection lost|ERR_CONNECTION|Subscription not found|not_found|timeout/i;
function codeErr(msg, stack, where) {
  msg = String(msg || "").replace(/\s+/g, " ").trim(); stack = String(stack || "");
  if (!msg || NOISE.test(msg)) return;
  if (!OURS.test(stack + " " + (where || ""))) return;
  const line = (stack.split("\n").find((l) => /data:|\/local\//.test(l)) || where || "").replace(/data:[^ )]{60,}/g, "<inline resource>").trim();
  const fn = (stack.split("\n")[1] || "").replace(/data:[^ )]{60,}/g, "<inline resource>").trim();
  report({ kind: "code error", what: msg.slice(0, 110), detail: `${msg}\nat ${fn || line}\nscreen: ${(echoEl() && echoEl()._panel) || "home"}\n${stack.replace(/data:[^ )]{60,}/g, "<inline resource>").slice(0, 600)}`, fixed: false, action: "logged for a code fix" });
}
window.addEventListener("error", (e) => { if (!ON_ECHO() || !e) return; if (e.target && e.target !== window && e.target.tagName) return; /* image/script load errors are handled by the checks */
  codeErr(e.message, e.error && e.error.stack, e.filename); }, true);
window.addEventListener("unhandledrejection", (e) => { if (!ON_ECHO() || !e) return; const r = e.reason; codeErr(r && (r.message || r), r && r.stack, ""); });

/* ---------- 2. health checks + repairs ---------- */
const st = {}; /* key -> { n, healed, first } */
function reload(reason) {
  const hist = ls.get("osew_ref", []).filter((t) => Date.now() - t < 20 * 60e3);
  if (hist.length >= 3) return false;
  hist.push(Date.now()); ls.set("osew_ref", hist);
  const h = hassOf();
  try { if (h) h.callService("button", "press", { entity_id: "button.vaca_amzn_echo_show_8_3a31_refresh" }); } catch (e) {}
  setTimeout(() => { try { location.replace(location.pathname + "?r=" + Date.now()); } catch (e) {} }, 5000);
  return true;
}
/* problems: { key, what, detail, fix1(), fix2() } ; returns list of current problems */
function checks(el) {
  const out = [], sr = el && el.shadowRoot, $ = (id) => sr && sr.getElementById(id);
  const h = hassOf();
  if (!el || !sr || !$("home")) { out.push({ key: "page", what: "Echo screen card missing (blank page)", detail: "No os-echo card on the page.", fix1() {}, fix2() {} }); return out; }
  if (h && h.connection && h.connection.connected === false) out.push({ key: "ws", what: "lost connection to Home Assistant", detail: "hass.connection.connected is false.", fix1() { try { h.connection.reconnect(true); } catch (e) {} }, fix2() { try { h.connection.reconnect(true); } catch (e) {} } });
  /* only judge the home widgets when home is what's showing */
  if (el._panel || el._isNight || document.hidden || el.__skOpen) return out;
  /* clock */
  const ck = $("clock"), ct = ck ? ck.textContent : "";
  if (st.__clk && st.__clk.t === ct && Date.now() - st.__clk.at > 75e3) out.push({ key: "clock", what: "clock stopped", detail: `Clock stuck on "${ct}" for over a minute.`,
    fix1() { clearInterval(el._sec); el._sec = setInterval(() => el._tick(), 1000); }, fix2() { el._start(); } });
  if (!st.__clk || st.__clk.t !== ct) st.__clk = { t: ct, at: Date.now() };
  /* family map */
  const box = $("mapbox"), legend = $("mapl");
  let pts = [];
  try { pts = el._people().map((p) => el._loc(p)).filter(Boolean); } catch (e) {}
  if (box && pts.length && box.clientWidth > 0) {
    const imgs = [...box.querySelectorAll("img.t")], bad = imgs.filter((i) => i.complete && !i.naturalWidth).length;
    const mapFix1 = () => { delete box.dataset.k; box.dataset.t = ""; el._pp = null; el._mapAt = 0; el._mapW(true); };
    const mapFix2 = () => { el._pp = null; mapFix1(); el._refresh(); };
    if (!imgs.length) out.push({ key: "map-tiles", what: "family map is blank (no map tiles)", detail: `${pts.length} people to show, map box ${box.clientWidth}x${box.clientHeight}, 0 tiles.`, fix1: mapFix1, fix2: mapFix2 });
    else if (bad && bad >= imgs.length / 2) out.push({ key: "map-bad", what: "family map tiles failed to load", detail: `${bad} of ${imgs.length} map tiles failed (${(imgs.find((i) => i.complete && !i.naturalWidth) || {}).src || ""}).`, fix1: mapFix1, fix2: mapFix2 });
    if (legend && !legend.textContent.trim()) out.push({ key: "map-names", what: "family map names are missing", detail: `${pts.length} people with a location but the name list is empty.`, fix1: mapFix1, fix2: mapFix2 });
    if (window.OSEchoMap && imgs.length && !box.querySelector(".om-pin")) out.push({ key: "map-pins", what: "family map has no people pins", detail: `${pts.length} people with a location, no pins drawn.`, fix1: mapFix1, fix2: mapFix2 });
  }
  /* weather */
  const wx = $("wx1"), ws = h && el._c && h.states[el._c.weather];
  if (wx && ws && !isNaN(parseFloat(ws.attributes.temperature)) && (!wx.textContent.trim() || /--°/.test(wx.textContent))) out.push({ key: "wx", what: "weather widget is blank", detail: `Weather says ${ws.attributes.temperature}°, the widget shows "${wx.textContent.trim().slice(0, 40)}".`,
    fix1() { el._wxWidget(); }, fix2() { el._fc = null; try { el._subForecast(); } catch (e) {} el._wxWidget(); } });
  const wxd = $("wxd");
  if (wxd && ws && !wxd.children.length) out.push({ key: "wx-days", what: "weather forecast days are missing", detail: "The 4-day row under the weather is empty.",
    fix1() { el._fc = null; try { el._subForecast(); } catch (e) {} }, fix2() { el._fc = null; try { el._subForecast(); } catch (e) {} el._refresh(); } });
  /* front door picture */
  const door = $("door");
  if (door && !el._doorLive && !(door.style.backgroundImage || "").includes("url")) out.push({ key: "door", what: "front door picture is blank", detail: "The Front Door widget has no snapshot.",
    fix1() { el._snap(); }, fix2() { el._snap(); } });
  return out;
}
setInterval(() => {
  if (!ON_ECHO()) return;
  let el = null, probs = [];
  try { el = echoEl(); probs = checks(el); } catch (e) { codeErr("os-echo-heal check failed: " + (e && e.message), e && e.stack, "os-echo-heal"); return; }
  const keys = new Set(probs.map((p) => p.key));
  /* problems that went away */
  for (const k of Object.keys(st)) {
    if (k.startsWith("__") || keys.has(k)) continue;
    const s = st[k]; delete st[k];
    if (s.healed) report({ kind: "fixed itself", what: s.what, detail: `${s.detail}\nRepaired automatically after ${Math.round((Date.now() - s.first) / 1000)} s (${s.healed}).`, fixed: true, action: s.healed });
  }
  for (const p of probs) {
    const s = st[p.key] || (st[p.key] = { n: 0, first: Date.now(), what: p.what, detail: p.detail, healed: "" });
    s.n++; s.detail = p.detail;
    try {
      if (s.n === 2) { p.fix1(); s.healed = "redrew it"; }
      else if (s.n === 4) { p.fix2(); s.healed = "redrew the home screen"; }
      else if (s.n === 6) {
        const ok = reload(p.what);
        report({ kind: "not fixed by itself", what: p.what, detail: `${p.detail}\nRedrawing did not fix it for ${Math.round((Date.now() - s.first) / 1000)} s; ${ok ? "reloaded the screen" : "reload limit reached (3 in 20 min)"}.`, fixed: false, action: ok ? "reloaded the screen" : "could not reload (limit)" });
      }
    } catch (e) { codeErr(`repair of "${p.what}" failed: ${e && e.message}`, e && e.stack, "os-echo-heal"); }
  }
}, 20e3);
})();
