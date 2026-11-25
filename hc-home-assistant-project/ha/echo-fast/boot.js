/* echo-fast boot (Nov 23 2026, Claude): the kitchen Echo Show screen without the Home Assistant frontend.
   Same os-echo modules and config as /alexa-dashboard/home (read live from HA, so nightly fixes still apply),
   but only the Echo modules are loaded and a small hass object over one websocket replaces the HA frontend.
   Anything that fails -> falls back to the normal dashboard. Undo: point View Assist "home" back to /alexa-dashboard/home. */
import { createConnection, subscribeEntities, callService as wsCallService, ERR_INVALID_AUTH } from "/local/echo/haws/index.js";

const EF = (window.__echoFast = { t0: performance.timeOrigin, marks: {}, errors: [] });
const mark = (k) => (EF.marks[k] = Math.round(performance.now()));
const ORIGIN = location.origin;
const HOME = "/alexa-dashboard/home";
const CACHE = "echo-fast-v1";
const fail = (why) => { EF.errors.push(String(why)); console.error("[echo-fast]", why); };
let tries = 0, retryT = 0, liveConn = null;
const fallback = (why) => { fail("retry: " + why); try { localStorage.setItem("echo-fast-last-fallback", new Date().toISOString() + " " + why); } catch (e) {} try { liveConn && liveConn.close(); } catch (e) {} liveConn = null; clearTimeout(retryT); retryT = setTimeout(start, Math.min(60000, 5000 * ++tries)); };
mark("boot");

/* 1) the modules expect to live at /alexa-dashboard/home */
history.replaceState(null, "", HOME);
const keepPath = () => { if (location.pathname !== HOME) history.replaceState(null, "", HOME); };
window.addEventListener("location-changed", keepPath, true);
window.addEventListener("popstate", keepPath, true);

/* 2) auth: VACA's external auth (the same bridge the HA frontend uses); stored HA tokens as a fallback for test browsers */
let token = "", tokenExp = 0, waiting = [];
window.externalAuthSetToken = (ok, data) => {
  if (ok && data && data.access_token) { token = data.access_token; tokenExp = Date.now() + (Number(data.expires_in) || 1800) * 1000; }
  const w = waiting; waiting = []; w.forEach((f) => f(!!ok));
};
window.externalAuthRevokeToken = () => {};
const stored = () => { try { return JSON.parse(localStorage.getItem("hassTokens") || "null"); } catch (e) { return null; } };
async function getToken(force) {
  if (window.externalApp && window.externalApp.getExternalAuth) {
    const ok = await new Promise((res) => {
      waiting.push(res);
      try { window.externalApp.getExternalAuth(JSON.stringify({ callback: "externalAuthSetToken", force: !!force })); } catch (e) { res(false); }
      setTimeout(() => res(!!token), 15000);
    });
    if (!ok && !token) throw new Error("external auth refused");
    return;
  }
  const t = stored(); if (!t) throw new Error("no auth");
  if (!force && t.access_token && Date.now() < t.expires - 10000) { token = t.access_token; tokenExp = t.expires; return; }
  const r = await fetch(ORIGIN + "/auth/token", { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: t.clientId }) });
  if (!r.ok) throw new Error("refresh failed " + r.status);
  const j = await r.json(); token = j.access_token; tokenExp = Date.now() + j.expires_in * 1000;
  localStorage.setItem("hassTokens", JSON.stringify({ ...t, access_token: token, expires: tokenExp }));
}
const auth = {
  wsUrl: ORIGIN.replace(/^http/, "ws") + "/api/websocket",
  get accessToken() { return token; },
  get expired() { return !token || Date.now() > tokenExp - 10000; },
  refreshAccessToken: (force) => getToken(force),
  get data() { return { hassUrl: ORIGIN, access_token: token, expires: tokenExp }; },
};
const authed = async () => { if (auth.expired) await getToken(false); return token; };

/* 3) ha-icon / ha-svg-icon, identical markup and styles to the HA frontend; icon paths come from HA's own /static/mdi chunks */
const ICONS_KEY = "echo-fast-icons";
let icons = {}; try { icons = JSON.parse(localStorage.getItem(ICONS_KEY) || "{}"); } catch (e) {}
let meta = null, saveT = 0; const chunks = {}, pending = {};
const saveIcons = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(ICONS_KEY, JSON.stringify(icons)); } catch (e) {} }, 2000); };
async function iconPath(name) {
  if (icons[name] !== undefined) return icons[name];
  if (pending[name]) return pending[name];
  return (pending[name] = (async () => {
    try {
      if (!meta) meta = fetch("/static/mdi/iconMetadata.json").then((r) => r.json());
      const m = await meta; let file = m.parts[0].file;
      for (const p of m.parts) if (p.start && name >= p.start) file = p.file;
      if (!chunks[file]) chunks[file] = fetch(`/static/mdi/${file}.json`).then((r) => r.json());
      const c = await chunks[file]; const d = c[name] || "";
      icons[name] = d; saveIcons(); return d;
    } catch (e) { delete pending[name]; return ""; }
  })());
}
const SVG_CSS = new CSSStyleSheet();
SVG_CSS.replaceSync(":host{display:var(--ha-icon-display,inline-flex);vertical-align:middle;fill:var(--icon-primary-color,currentcolor);width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);justify-content:center;align-items:center;position:relative}svg{pointer-events:none;width:100%;height:100%;display:block}path.primary-path{opacity:var(--icon-primary-opactity,1)}path.secondary-path{fill:var(--icon-secondary-color,currentcolor);opacity:var(--icon-secondary-opactity,.5)}");
const ICON_CSS = new CSSStyleSheet();
ICON_CSS.replaceSync(":host{fill:currentcolor}");
/* Lit timing: like the HA frontend, the shadow content appears one microtask after the element connects
   (os-echo-stock measures a weather ha-icon before it has rendered and sizes its replacement image from that) */
class HaSvgIcon extends HTMLElement {
  connectedCallback() { if (!this._r) queueMicrotask(() => this._render()); }
  _render() {
    if (this._r) return; const r = (this._r = this.attachShadow({ mode: "open" })); r.adoptedStyleSheets = [SVG_CSS];
    r.innerHTML = `<svg preserveAspectRatio="xMidYMid meet" focusable="false" role="img" aria-hidden="true" viewBox="0 0 24 24"><g></g></svg>`;
    this._g = r.querySelector("g"); this.path = this._d;
  }
  set path(d) {
    this._d = d; if (!this._g) return;
    if (d) { if (!this._p) { this._p = document.createElementNS("http://www.w3.org/2000/svg", "path"); this._p.setAttribute("class", "primary-path"); this._g.appendChild(this._p); } this._p.setAttribute("d", d); }
    else if (this._p) { this._p.remove(); this._p = null; }
  }
  get path() { return this._d; }
}
class HaIcon extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  connectedCallback() { if (!this._r) queueMicrotask(() => this._render()); }
  attributeChangedCallback(n, o, v) { if (o !== v) this.icon = v; }
  _render() { if (this._r) return; this._r = this.attachShadow({ mode: "open" }); this._r.adoptedStyleSheets = [ICON_CSS]; this._apply(); }
  _apply() {
    if (!this._r) return; const v = this._icon;
    if (!v) { if (this._s) { this._s.remove(); this._s = null; } return; }
    if (!this._s) { this._s = document.createElement("ha-svg-icon"); this._r.appendChild(this._s); }
    if (!/^(mdi|hass):/.test(v)) { this._s.path = ""; return; }
    const name = v.replace(/^(mdi|hass):/, "");
    if (icons[name] !== undefined) { this._s.path = icons[name]; return; }
    this._s.path = ""; iconPath(name).then((d) => { if (this._icon === v && this._s) this._s.path = d; });
  }
  get icon() { return this._icon; }
  set icon(v) { if (v === this._icon) return; this._icon = v; this._apply(); }
}
customElements.define("ha-svg-icon", HaSvgIcon);
customElements.define("ha-icon", HaIcon);

/* 4) <home-assistant>: modules look for document.querySelector("home-assistant").hass */
class HomeAssistantEl extends HTMLElement {}
customElements.define("home-assistant", HomeAssistantEl);
const root = document.createElement("home-assistant");
(document.body ? Promise.resolve() : new Promise((r) => addEventListener("DOMContentLoaded", r))).then(() => document.body.appendChild(root));
window.customCards = window.customCards || [];

/* fallback for picture-entity (only used when webrtc-camera is missing) */
window.loadCardHelpers = async () => ({
  createCardElement(cfg) {
    const el = document.createElement("div"); const img = document.createElement("img");
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block"; el.appendChild(img);
    Object.defineProperty(el, "hass", { set(h) { const s = h.states[cfg.entity]; const u = s && s.attributes.access_token ? `/api/camera_proxy_stream/${cfg.entity}?token=${s.attributes.access_token}` : ""; if (u && img.getAttribute("src") !== u) img.src = u; } });
    return el;
  },
});

/* 5) cache helpers (offline fallback for the module list and card config) */
async function cacheGet(k) { try { const c = await caches.open(CACHE); const r = await c.match(k); return r ? r.json() : null; } catch (e) { return null; } }
async function cachePut(k, v) { try { const c = await caches.open(CACHE); await c.put(k, new Response(JSON.stringify(v), { headers: { "content-type": "application/json" } })); } catch (e) {} }
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what + " timeout")), ms))]);

/* only the Echo's own modules: inline resources whose header names the Echo / Alexa / Amazon orders, plus the WebRTC card */
function pickEcho(items) {
  return items.filter((r) => {
    const u = r.url || "";
    if (u.includes("/webrtc/webrtc-camera.js")) return true;
    if (!u.startsWith("data:text/javascript;base64,")) return false;
    let head = "";
    try { head = atob(u.slice(28, 28 + 560).replace(/[^A-Za-z0-9+/]/g, "").slice(0, 556)); } catch (e) { return false; }
    return /echo|alexa|amazon orders/i.test(head) && !/Alexa Log/.test(head);
  }).map((r) => ({ url: r.url, type: r.type }));
}
const loadModule = (url) => new Promise((res) => {
  const s = document.createElement("script"); s.type = "module"; s.src = url;
  s.onload = () => res(true); s.onerror = () => { fail("module failed " + url.slice(0, 80)); res(false); };
  document.head.appendChild(s);
});

/* 6) start (retries itself; VACA ignores page navigation, so there is no reload to fall back on) */
let card = null;
async function start() {
  if (EF.ready) return;
  const guard = setTimeout(() => { if (!EF.ready) fallback("not ready after 45 s"); }, 45000);
  try {
    await withTimeout(getToken(false), 20000, "auth"); mark("auth");
    const conn = await withTimeout(createConnection({ auth, setupRetry: 5 }), 20000, "connect"); mark("ws"); liveConn = conn;
    conn.addEventListener("reconnect-error", async (c, err) => { if (err === ERR_INVALID_AUTH) { try { await getToken(true); c.reconnect(true); } catch (e) {} } });

    const callWS = (msg) => conn.sendMessagePromise(msg);
    const handle = async (r) => {
      const ct = r.headers.get("content-type") || ""; const body = ct.includes("json") ? await r.json() : await r.text();
      if (!r.ok) throw { error: "Request error", status_code: r.status, body };
      return body;
    };
    const fetchWithAuth = async (path, init = {}) => { await authed(); const headers = new Headers(init.headers || {}); headers.set("authorization", "Bearer " + token); return fetch(ORIGIN + path, { ...init, headers }); };
    const callApiRaw = (method, path, params, headers) => fetchWithAuth("/api/" + path, { method, headers: { ...(params ? { "content-type": "application/json" } : {}), ...(headers || {}) }, body: params ? JSON.stringify(params) : undefined });
    const callApi = async (method, path, params, headers) => handle(await callApiRaw(method, path, params, headers));
    const attr = (s, a, v) => { const x = v !== undefined ? v : s && s.attributes ? s.attributes[a] : undefined; return Array.isArray(x) ? x.join(", ") : x == null ? "" : String(x); };

    let hass = {
      auth, connection: conn, connected: true, states: {}, entities: {}, devices: {}, areas: {}, floors: {},
      config: null, themes: { default_theme: "default", default_dark_theme: null, themes: {}, darkMode: true, theme: "default" },
      selectedTheme: null, panels: {}, services: {}, user: null, userData: {}, systemData: {}, panelUrl: "alexa-dashboard",
      language: "en", selectedLanguage: null,
      locale: { language: "en", number_format: "language", time_format: "language", date_format: "language", time_zone: "local", first_weekday: "language" },
      localize: () => "", translationMetadata: { fragments: [], translations: {} }, kioskMode: true, dockedSidebar: "docked",
      vibrate: false, debugConnection: false, suspendWhenHidden: false, enableShortcuts: false,
      hassUrl: (p = "") => ORIGIN + p,
      callService: (domain, service, data, target, notify, ret) => wsCallService(conn, domain, service, data, target, ret),
      callApi, callApiRaw, fetchWithAuth, callWS, sendWS: (m) => conn.sendMessage(m),
      loadBackendTranslation: async () => () => "", loadFragmentTranslation: async () => () => "",
      formatEntityState: (s, st) => (st !== undefined ? st : s ? s.state : ""), formatEntityStateToParts: (s, st) => [{ type: "value", value: st !== undefined ? st : s ? s.state : "" }],
      formatEntityAttributeName: (s, a) => a, formatEntityAttributeValue: attr, formatEntityAttributeValueToParts: (s, a, v) => [{ type: "value", value: attr(s, a, v) }],
      formatEntityName: (s) => (s && s.attributes && s.attributes.friendly_name) || "",
    };
    const provide = (patch) => { hass = { ...hass, ...patch }; root.hass = hass; if (card) card.hass = hass; };
    root.hass = hass;
    conn.addEventListener("ready", () => provide({ connected: true }));
    conn.addEventListener("disconnected", () => provide({ connected: false }));

    /* registries, user, config: same shapes as the HA frontend */
    const loadEntities = async () => {
      const r = await callWS({ type: "config/entity_registry/list_for_display" }); const E = {};
      for (const e of r.entities) E[e.ei] = { entity_id: e.ei, name: e.en, icon: e.ic, platform: e.pl, translation_key: e.tk, area_id: e.ai, device_id: e.di, labels: e.lb || [], hidden: e.hb, entity_category: e.ec !== undefined ? r.entity_categories[e.ec] : undefined, display_precision: e.dp, has_entity_name: e.hn };
      return E;
    };
    const loadDevices = async () => { const D = {}; for (const d of await callWS({ type: "config/device_registry/list" })) D[d.id] = d; return D; };
    const loadAreas = async () => { const A = {}; for (const a of await callWS({ type: "config/area_registry/list" })) A[a.area_id] = a; return A; };
    const loadFloors = async () => { const F = {}; try { for (const f of await callWS({ type: "config/floor_registry/list" })) F[f.floor_id] = f; } catch (e) {} return F; };
    const regT = {};
    const reload = (k, fn) => { clearTimeout(regT[k]); regT[k] = setTimeout(async () => { try { provide({ [k]: await fn() }); } catch (e) {} }, 1500); };
    conn.subscribeEvents(() => reload("entities", loadEntities), "entity_registry_updated");
    conn.subscribeEvents(() => reload("devices", loadDevices), "device_registry_updated");
    conn.subscribeEvents(() => reload("areas", loadAreas), "area_registry_updated");
    conn.subscribeEvents(async () => { try { provide({ config: await callWS({ type: "get_config" }) }); } catch (e) {} }, "core_config_updated");

    const firstStates = new Promise((res) => subscribeEntities(conn, (states) => { if (card) provide({ states }); else hass = { ...hass, states }; res(); }));
    const [entities, devices, areas, floors, user, config, resources, lovelace] = await Promise.all([
      loadEntities(), loadDevices(), loadAreas(), loadFloors(), callWS({ type: "auth/current_user" }), callWS({ type: "get_config" }),
      callWS({ type: "lovelace/resources" }).then((r) => { const p = pickEcho(r); cachePut("/echo-fast/resources", p); return p; }).catch(async (e) => (await cacheGet("/echo-fast/resources")) || Promise.reject(e)),
      callWS({ type: "lovelace/config", url_path: "alexa-dashboard" }).then((c) => { cachePut("/echo-fast/lovelace", c); return c; }).catch(async (e) => (await cacheGet("/echo-fast/lovelace")) || Promise.reject(e)),
      firstStates,
    ]);
    mark("data");
    provide({ entities, devices, areas, floors, user, config, language: "en" });

    /* View Assist display link, exactly as view_assist.js does it (navigation is not needed: everything lives on this one screen) */
    try {
      const bid = localStorage.getItem("view_assist_browser_id");
      if (bid) conn.subscribeMessage((m) => { EF.va = m && m.event; }, { type: "view_assist/connect", browser_id: bid }).catch(() => {});
    } catch (e) {}

    const view = (lovelace.views || []).find((v) => v.path === "home") || lovelace.views[0];
    const cfg = view.cards[0];
    await Promise.all(resources.map((r) => loadModule(r.url))); mark("modules");
    const tag = cfg.type.replace(/^custom:/, "");
    await withTimeout(customElements.whenDefined(tag), 15000, "define " + tag);
    if (!card) { card = document.createElement(tag); card.setConfig(cfg); root.appendChild(card); }
    card.hass = hass;
    clearTimeout(guard); EF.ready = true; tries = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => mark("painted")));
  } catch (e) {
    clearTimeout(guard); fallback(e && e.message ? e.message : e);
  }
}
start();
window.addEventListener("error", (e) => { if (EF.errors.length < 50) EF.errors.push(String(e.message).slice(0, 200)); });

/* own service worker for /local/echo/ so HA's cache-first worker never serves a stale version.txt / index.html */
try { navigator.serviceWorker && navigator.serviceWorker.register("/local/echo/sw.js", { scope: "/local/echo/" }).catch(() => {}); } catch (e) {}
