/* ha-fast-kiosk: show one Home Assistant dashboard card (or view) without loading the Home Assistant frontend.
   One websocket, a hass object with the same shape the frontend gives cards, and only the dashboard resources you choose.
   https://github.com/Davette10/ha-fast-kiosk  (MIT) */
import { createConnection, subscribeEntities, callService as wsCallService, ERR_INVALID_AUTH } from "home-assistant-js-websocket";

const BASE = new URL(".", import.meta.url).pathname; /* e.g. /local/fast-kiosk/ */
const FK = (window.__fastKiosk = { t0: performance.timeOrigin, marks: {}, errors: [] });
const mark = (k) => (FK.marks[k] = Math.round(performance.now()));
const ORIGIN = location.origin;
const CACHE = "ha-fast-kiosk-v1";
const fail = (why) => { FK.errors.push(String(why)); console.error("[fast-kiosk]", why); };
let tries = 0, retryT = 0, liveConn = null;
/* Retry in place. Some kiosk apps (e.g. View Assist Companion App) block page-initiated navigation, so a reload is not an option. */
const retry = (why) => {
  fail("retry: " + why);
  try { localStorage.setItem("fast-kiosk-last-error", new Date().toISOString() + " " + why); } catch (e) {}
  try { liveConn && liveConn.close(); } catch (e) {}
  liveConn = null; clearTimeout(retryT); retryT = setTimeout(start, Math.min(60000, 5000 * ++tries));
};
mark("boot");

/* ---------- auth: Home Assistant's external-auth bridge (Companion app, VACA, other kiosk apps), else the tokens the HA frontend stored ---------- */
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
  const t = stored();
  if (!t) throw new Error("not signed in: open Home Assistant in this browser once and tick 'Keep me logged in'");
  if (!force && t.access_token && Date.now() < t.expires - 10000) { token = t.access_token; tokenExp = t.expires; return; }
  const r = await fetch(ORIGIN + "/auth/token", { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: t.clientId }) });
  if (!r.ok) throw new Error("token refresh failed " + r.status);
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

/* ---------- ha-icon / ha-svg-icon: same markup and styles as the HA frontend; paths from HA's own /static/mdi chunks, cached ---------- */
const ICONS_KEY = "fast-kiosk-icons";
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
      const d = (await chunks[file])[name] || "";
      icons[name] = d; saveIcons(); return d;
    } catch (e) { delete pending[name]; return ""; }
  })());
}
const sheet = (css) => { const s = new CSSStyleSheet(); s.replaceSync(css); return s; };
const SVG_CSS = sheet(":host{display:var(--ha-icon-display,inline-flex);vertical-align:middle;fill:var(--icon-primary-color,currentcolor);width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);justify-content:center;align-items:center;position:relative}svg{pointer-events:none;width:100%;height:100%;display:block}path.primary-path{opacity:var(--icon-primary-opactity,1)}path.secondary-path{fill:var(--icon-secondary-color,currentcolor);opacity:var(--icon-secondary-opactity,.5)}");
const ICON_CSS = sheet(":host{fill:currentcolor}");
const CARD_CSS = sheet(":host{display:block;position:relative;box-sizing:border-box;background:var(--ha-card-background,var(--card-background-color,#1c1c1c));border-radius:var(--ha-card-border-radius,12px);border-width:var(--ha-card-border-width,1px);border-style:solid;border-color:var(--ha-card-border-color,var(--divider-color,#e0e0e0));box-shadow:var(--ha-card-box-shadow,none);color:var(--primary-text-color);transition:all .3s ease-out}.card-header{color:var(--ha-card-header-color,var(--primary-text-color));font-family:var(--ha-card-header-font-family,inherit);font-size:var(--ha-card-header-font-size,24px);letter-spacing:-.012em;line-height:48px;padding:12px 16px 16px;display:block;margin-block:0;font-weight:400}");
/* Like Lit, shadow content appears one microtask after connect (some cards measure icons before they render). */
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
/* minimal ha-card (header + slot), for custom cards that wrap themselves in one */
class HaCard extends HTMLElement {
  static get observedAttributes() { return ["header"]; }
  connectedCallback() {
    if (this._r) return; this._r = this.attachShadow({ mode: "open" }); this._r.adoptedStyleSheets = [CARD_CSS];
    this._r.innerHTML = `<h1 class="card-header" hidden></h1><slot></slot>`; this._h();
  }
  attributeChangedCallback() { this._h(); }
  set header(v) { if (v) this.setAttribute("header", v); else this.removeAttribute("header"); }
  get header() { return this.getAttribute("header"); }
  _h() { if (!this._r) return; const h = this._r.querySelector("h1"), t = this.getAttribute("header"); h.textContent = t || ""; h.hidden = !t; }
}
const define = (n, c) => { if (!customElements.get(n)) customElements.define(n, c); };
define("ha-svg-icon", HaSvgIcon);
define("ha-icon", HaIcon);
define("ha-card", HaCard);

/* <home-assistant>: many cards find the hass object with document.querySelector("home-assistant").hass */
define("home-assistant", class extends HTMLElement {});
const root = document.createElement("home-assistant");
(document.body ? Promise.resolve() : new Promise((r) => addEventListener("DOMContentLoaded", r))).then(() => document.body.appendChild(root));
window.customCards = window.customCards || [];

/* loadCardHelpers: only picture-entity is supported (camera stream as an <img>); anything else becomes an empty box */
window.loadCardHelpers = window.loadCardHelpers || (async () => ({
  createCardElement(cfg) {
    const el = document.createElement("div");
    if (cfg.type !== "picture-entity") { fail("built-in card not supported: " + cfg.type); return el; }
    const img = document.createElement("img"); img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block"; el.appendChild(img);
    Object.defineProperty(el, "hass", { set(h) { const s = h.states[cfg.entity]; const u = s && s.attributes.access_token ? `/api/camera_proxy_stream/${cfg.entity}?token=${s.attributes.access_token}` : ""; if (u && img.getAttribute("src") !== u) img.src = u; } });
    return el;
  },
}));

/* ---------- helpers ---------- */
async function cacheGet(k) { try { const r = await (await caches.open(CACHE)).match(k); return r ? r.json() : null; } catch (e) { return null; } }
async function cachePut(k, v) { try { await (await caches.open(CACHE)).put(k, new Response(JSON.stringify(v), { headers: { "content-type": "application/json" } })); } catch (e) {} }
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what + " timeout")), ms))]);
/* Matchable text for a resource: its URL, plus the first ~400 characters of an inline (data:) module, where its header comment usually is. */
function resourceText(u) {
  if (!u.startsWith("data:")) return u;
  const i = u.indexOf(","); if (i < 0) return "";
  try { return /;base64$/.test(u.slice(0, i)) ? atob(u.slice(i + 1, i + 1 + 560).replace(/[^A-Za-z0-9+/]/g, "").slice(0, 556)) : decodeURIComponent(u.slice(i + 1, i + 401)); } catch (e) { return ""; }
}
function pickResources(items, rule) {
  const re = (list) => (list || []).map((s) => new RegExp(s, "i"));
  const inc = rule && rule !== "all" ? re(rule.include) : null, exc = rule && rule !== "all" ? re(rule.exclude) : [];
  return items.filter((r) => {
    if (r.type !== "module" && r.type !== "js") return false;
    const t = resourceText(r.url || "");
    if (exc.some((x) => x.test(t))) return false;
    return !inc || inc.some((x) => x.test(t));
  }).map((r) => ({ url: r.url, type: r.type }));
}
const loadScript = (r) => new Promise((res) => {
  const s = document.createElement("script"); if (r.type === "module") s.type = "module"; s.src = r.url;
  s.onload = () => res(true); s.onerror = () => { fail("resource failed " + r.url.slice(0, 80)); res(false); };
  document.head.appendChild(s);
});
async function loadConfig() {
  try { const r = await fetch(BASE + "config.json", { cache: "no-cache" }); if (r.ok) { const c = await r.json(); cachePut("/fast-kiosk/config", c); return c; } } catch (e) {}
  const c = await cacheGet("/fast-kiosk/config"); if (c) return c;
  throw new Error("config.json missing");
}

/* ---------- start ---------- */
let cards = null, CFG = null;
async function start() {
  if (FK.ready) return;
  const guard = setTimeout(() => { if (!FK.ready) retry("not ready after 45 s"); }, 45000);
  try {
    CFG = CFG || (await loadConfig());
    if (!CFG.dashboard) throw new Error("config.json: set \"dashboard\"");
    await withTimeout(getToken(false), 20000, "auth"); mark("auth");
    const conn = await withTimeout(createConnection({ auth, setupRetry: 5 }), 20000, "connect"); mark("ws"); liveConn = conn;
    conn.addEventListener("reconnect-error", async (c, err) => { if (err === ERR_INVALID_AUTH) { try { await getToken(true); c.reconnect(true); } catch (e) {} } });

    const callWS = (msg) => conn.sendMessagePromise(msg);
    const handle = async (r) => {
      const body = (r.headers.get("content-type") || "").includes("json") ? await r.json() : await r.text();
      if (!r.ok) throw { error: "Request error", status_code: r.status, body };
      return body;
    };
    const fetchWithAuth = async (path, init = {}) => { await authed(); const headers = new Headers(init.headers || {}); headers.set("authorization", "Bearer " + token); return fetch(ORIGIN + path, { ...init, headers }); };
    const callApiRaw = (method, path, params, headers) => fetchWithAuth("/api/" + path, { method, headers: { ...(params ? { "content-type": "application/json" } : {}), ...(headers || {}) }, body: params ? JSON.stringify(params) : undefined });
    const callApi = async (method, path, params, headers) => handle(await callApiRaw(method, path, params, headers));
    const attr = (s, a, v) => { const x = v !== undefined ? v : s && s.attributes ? s.attributes[a] : undefined; return Array.isArray(x) ? x.join(", ") : x == null ? "" : String(x); };
    const lang = CFG.language || (navigator.language || "en").split("-")[0];

    let hass = {
      auth, connection: conn, connected: true, states: {}, entities: {}, devices: {}, areas: {}, floors: {},
      config: null, themes: { default_theme: "default", default_dark_theme: null, themes: {}, darkMode: CFG.dark_mode !== false, theme: "default" },
      selectedTheme: null, panels: {}, services: {}, user: null, userData: {}, systemData: {}, panelUrl: CFG.dashboard,
      language: lang, selectedLanguage: null,
      locale: { language: lang, number_format: "language", time_format: "language", date_format: "language", time_zone: "local", first_weekday: "language" },
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
    const provide = (patch) => { hass = { ...hass, ...patch }; root.hass = hass; if (cards) cards.forEach((c) => (c.hass = hass)); };
    root.hass = hass;
    conn.addEventListener("ready", () => provide({ connected: true }));
    conn.addEventListener("disconnected", () => provide({ connected: false }));

    /* registries, user, config: same shapes as the HA frontend */
    const loadEntities = async () => {
      const r = await callWS({ type: "config/entity_registry/list_for_display" }); const E = {};
      for (const e of r.entities) E[e.ei] = { entity_id: e.ei, name: e.en, icon: e.ic, platform: e.pl, translation_key: e.tk, area_id: e.ai, device_id: e.di, labels: e.lb || [], hidden: e.hb, entity_category: e.ec !== undefined ? r.entity_categories[e.ec] : undefined, display_precision: e.dp, has_entity_name: e.hn };
      return E;
    };
    const asMap = (list, key) => { const m = {}; for (const x of list) m[x[key]] = x; return m; };
    const loadDevices = async () => asMap(await callWS({ type: "config/device_registry/list" }), "id");
    const loadAreas = async () => asMap(await callWS({ type: "config/area_registry/list" }), "area_id");
    const loadFloors = async () => { try { return asMap(await callWS({ type: "config/floor_registry/list" }), "floor_id"); } catch (e) { return {}; } };
    const regT = {};
    const reload = (k, fn) => { clearTimeout(regT[k]); regT[k] = setTimeout(async () => { try { provide({ [k]: await fn() }); } catch (e) {} }, 1500); };
    conn.subscribeEvents(() => reload("entities", loadEntities), "entity_registry_updated");
    conn.subscribeEvents(() => reload("devices", loadDevices), "device_registry_updated");
    conn.subscribeEvents(() => reload("areas", loadAreas), "area_registry_updated");
    conn.subscribeEvents(async () => { try { provide({ config: await callWS({ type: "get_config" }) }); } catch (e) {} }, "core_config_updated");

    const firstStates = new Promise((res) => subscribeEntities(conn, (states) => { if (cards) provide({ states }); else hass = { ...hass, states }; res(); }));
    const [entities, devices, areas, floors, user, config, resources, lovelace] = await Promise.all([
      loadEntities(), loadDevices(), loadAreas(), loadFloors(), callWS({ type: "auth/current_user" }), callWS({ type: "get_config" }),
      callWS({ type: "lovelace/resources" }).then((r) => { const p = pickResources(r, CFG.resources); cachePut("/fast-kiosk/resources", p); return p; })
        .catch(async (e) => (await cacheGet("/fast-kiosk/resources")) || Promise.reject(e)),
      callWS({ type: "lovelace/config", url_path: CFG.dashboard }).then((c) => { cachePut("/fast-kiosk/lovelace", c); return c; })
        .catch(async (e) => (await cacheGet("/fast-kiosk/lovelace")) || Promise.reject(e)),
      firstStates,
    ]);
    mark("data");
    provide({ entities, devices, areas, floors, user, config });

    const views = lovelace.views || [];
    const view = (CFG.view != null && views.find((v, i) => v.path === CFG.view || String(i) === String(CFG.view))) || views[0];
    if (!view) throw new Error("dashboard has no views");
    /* Cards that check location.pathname see the real dashboard path. */
    const path = CFG.keep_path || `/${CFG.dashboard}/${view.path || views.indexOf(view)}`;
    history.replaceState(null, "", path);
    const keepPath = () => { if (location.pathname !== path) history.replaceState(null, "", path); };
    window.addEventListener("location-changed", keepPath, true);
    window.addEventListener("popstate", keepPath, true);

    /* View Assist display link, as view_assist.js does it (only if this browser was registered with View Assist before) */
    if (CFG.view_assist !== false) {
      try {
        const bid = localStorage.getItem("view_assist_browser_id");
        if (bid) conn.subscribeMessage((m) => { FK.va = m && m.event; }, { type: "view_assist/connect", browser_id: bid }).catch(() => {});
      } catch (e) {}
    }

    const all = view.cards || (view.sections || []).flatMap((s) => s.cards || []);
    const picked = CFG.card === "all" ? all : [all[Number(CFG.card) || 0]].filter(Boolean);
    if (!picked.length) throw new Error("no card in view " + (view.path || ""));
    await Promise.all(resources.map(loadScript)); mark("modules");
    if (!cards) {
      const made = [];
      for (const cfg of picked) {
        if (!/^custom:/.test(cfg.type || "")) { fail("skipped built-in card: " + cfg.type); continue; }
        const tag = cfg.type.slice(7);
        await withTimeout(customElements.whenDefined(tag), 15000, "custom element " + tag);
        const el = document.createElement(tag); el.setConfig(cfg); el.hass = hass; root.appendChild(el); made.push(el);
      }
      if (!made.length) throw new Error("nothing to show: only custom: cards are supported");
      cards = made;
      if (made.length > 1) root.classList.add("stack");
    } else cards.forEach((c) => (c.hass = hass));
    clearTimeout(guard); FK.ready = true; tries = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => mark("painted")));
  } catch (e) {
    clearTimeout(guard); retry(e && e.message ? e.message : e);
  }
}
start();
window.addEventListener("error", (e) => { if (FK.errors.length < 50) FK.errors.push(String(e.message).slice(0, 200)); });

/* own service worker so index.html / version.txt / config.json are never served stale */
try { navigator.serviceWorker && navigator.serviceWorker.register(BASE + "sw.js", { scope: BASE }).catch(() => {}); } catch (e) {}
