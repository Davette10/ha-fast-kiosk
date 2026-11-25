/* Clark Home OS - design system runtime for /claude-test-dashboard
   1) Scoped dark AMOLED theme tokens (only applied on this dashboard)
   2) Inter typeface (SF Pro substitute on Android, per DESIGN.md)
   3) <os-clock>, <os-forecast>, <os-ma-browser> minimal custom cards  */
(() => {
  const SCOPE = "/claude-test-dashboard";
  const FONT_TEXT = '-apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
  const FONT_DISPLAY = '-apple-system, "SF Pro Display", Inter, system-ui, "Segoe UI", Roboto, sans-serif';

  const VARS = {
    /* design tokens */
    "--os-bg": "#000000",
    "--os-surface": "#121214",
    "--os-surface-2": "#1c1c1e",
    "--os-surface-3": "#2c2c2e",
    "--os-hairline": "rgba(255,255,255,0.07)",
    "--os-glass": "rgba(28,28,30,0.72)",
    "--os-text": "#f5f5f7",
    "--os-text-2": "#a1a1a6",
    "--os-text-3": "#6e6e73",
    "--os-accent": "#2997ff",
    "--os-on": "#f5f5f7",
    "--os-on-text": "#1d1d1f",
    "--os-on-text-2": "rgba(29,29,31,0.6)",
    "--os-warm": "#ff9f0a",
    "--os-alert": "#ff453a",
    "--os-radius": "18px",
    "--os-radius-sm": "11px",
    "--os-font": FONT_TEXT,
    "--os-font-display": FONT_DISPLAY,
    "--os-ease": "cubic-bezier(0.25, 0.1, 0.25, 1)",

    /* Home Assistant theme variables */
    "--primary-background-color": "#000000",
    "--secondary-background-color": "#121214",
    "--lovelace-background": "#000000",
    "--view-background": "#000000",
    "--card-background-color": "#121214",
    "--ha-card-background": "#121214",
    "--ha-card-border-radius": "18px",
    "--ha-card-border-width": "1px",
    "--ha-card-border-color": "rgba(255,255,255,0.07)",
    "--ha-card-box-shadow": "none",
    "--primary-text-color": "#f5f5f7",
    "--secondary-text-color": "#a1a1a6",
    "--disabled-text-color": "#6e6e73",
    "--text-primary-color": "#ffffff",
    "--divider-color": "rgba(255,255,255,0.08)",
    "--outline-color": "rgba(255,255,255,0.12)",
    "--primary-color": "#2997ff",
    "--accent-color": "#2997ff",
    "--rgb-primary-color": "41, 151, 255",
    "--rgb-accent-color": "41, 151, 255",
    "--rgb-primary-text-color": "245, 245, 247",
    "--rgb-card-background-color": "18, 18, 20",
    "--state-icon-color": "#a1a1a6",
    "--paper-item-icon-color": "#a1a1a6",
    "--state-active-color": "#f5f5f7",
    "--state-inactive-color": "#6e6e73",
    "--state-light-active-color": "#ffe3b8",
    "--state-switch-active-color": "#f5f5f7",
    "--state-input_boolean-active-color": "#f5f5f7",
    "--state-media_player-active-color": "#f5f5f7",
    "--state-climate-cool-color": "#2997ff",
    "--state-climate-heat-color": "#ff9f0a",
    "--state-climate-heat_cool-color": "#f5f5f7",
    "--state-climate-auto-color": "#f5f5f7",
    "--state-climate-off-color": "#6e6e73",
    "--state-binary_sensor-active-color": "#f5f5f7",
    "--state-person-home-color": "#f5f5f7",
    "--state-sensor-battery-high-color": "#f5f5f7",
    "--ha-font-family-body": FONT_TEXT,
    "--ha-font-family-heading": FONT_DISPLAY,
    "--mdc-typography-font-family": FONT_TEXT,
    "--paper-font-common-base_-_font-family": FONT_TEXT,
    "--ha-heading-card-title-font-size": "21px",
    "--ha-heading-card-title-font-weight": "600",
    "--ha-heading-card-title-color": "#f5f5f7",
    "--ha-heading-card-subtitle-font-size": "17px",
    "--ha-heading-card-subtitle-font-weight": "600",
    "--ha-heading-card-subtitle-color": "#a1a1a6",
    "--ha-view-sections-column-gap": "24px",
    "--ha-view-sections-row-gap": "12px",
    "--ha-section-grid-column-gap": "12px",
    "--ha-section-grid-row-gap": "12px",
    "--tile-color": "#f5f5f7",
    "--mdc-theme-surface": "#1c1c1e",
    "--ha-dialog-surface-background": "#1c1c1e",
    "--dialog-backdrop-filter": "blur(20px) saturate(180%)",
    "--mdc-dialog-scrim-color": "rgba(0,0,0,0.6)",
    "--input-fill-color": "#1c1c1e",
    "--mdc-text-field-fill-color": "#1c1c1e",
    "--ha-color-fill-neutral-quiet-resting": "#1c1c1e",
    "--ha-slider-thumb-color": "#f5f5f7",
    "--mdc-theme-primary": "#2997ff",
    "--scrollbar-thumb-color": "rgba(255,255,255,0.12)",
    "--app-header-background-color": "#000000",
    "--app-header-text-color": "#f5f5f7",
    "--sidebar-background-color": "#000000",
    "--sidebar-text-color": "#a1a1a6",
    "--sidebar-selected-text-color": "#f5f5f7",
    "--sidebar-selected-icon-color": "#f5f5f7",
    "--sidebar-icon-color": "#6e6e73",
    "--code-editor-background-color": "#121214",
    "--mush-rgb-state-person-home": "245, 245, 247",
    "--mush-card-primary-font-weight": "600",
    "--mush-chip-background": "#1c1c1e",
    "--mush-chip-border-radius": "999px",
    "--mush-icon-border-radius": "999px",
    "color-scheme": "dark",
  };

  const inScope = () => location.pathname.startsWith(SCOPE);

  function loadFont() {
    if (document.getElementById("os-font-inter")) return;
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.gstatic.com";
    pre.crossOrigin = "anonymous";
    const l = document.createElement("link");
    l.id = "os-font-inter";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap";
    document.head.append(pre, l);
  }

  let applied = null;
  function apply() {
    const ha = document.querySelector("home-assistant");
    if (!ha) return false;
    const on = inScope();
    if (on === applied) return true;
    applied = on;
    for (const [k, v] of Object.entries(VARS)) {
      if (on) ha.style.setProperty(k, v);
      else ha.style.removeProperty(k);
    }
    document.documentElement.style.backgroundColor = on ? "#000000" : "";
    document.body.style.backgroundColor = on ? "#000000" : "";
    if (on) loadFont();
    return true;
  }

  let tries = 0;
  const boot = () => { if (!apply() && tries++ < 100) setTimeout(boot, 100); };
  boot();
  window.addEventListener("location-changed", () => setTimeout(apply, 0));
  window.addEventListener("popstate", () => setTimeout(apply, 0));
  setInterval(apply, 2000); /* cheap guard: re-asserts after theme reloads */

  /* ---------------------------------------------------------------- */
  const BASE_CSS = `
    :host { display:block; font-family: var(--os-font, ${FONT_TEXT}); color: var(--os-text, #f5f5f7);
            -webkit-font-smoothing: antialiased; font-feature-settings: "ss03", "cv11"; }
  `;

  /* <os-clock mode="time|greeting|date"> */
  class OsClock extends HTMLElement {
    setConfig(c) { this._c = c || {}; if (!this.shadowRoot) this.attachShadow({ mode: "open" }); this._render(); }
    set hass(h) { this._hass = h; }
    connectedCallback() { this._render(); this._timer = setInterval(() => this._render(), 10000); }
    disconnectedCallback() { clearInterval(this._timer); }
    getCardSize() { return 1; }
    _render() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const c = this._c || {};
      const d = new Date();
      const mode = c.mode || "time";
      let html = "";
      if (mode === "time") {
        const parts = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).split(" ");
        html = `<div class="time">${parts[0]}<span class="ampm">${parts[1] || ""}</span></div>`;
      } else {
        const h = d.getHours();
        const g = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Good night";
        const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        html = mode === "date"
          ? `<div class="date">${date}</div>`
          : `<div class="greet">${c.title || g}</div><div class="date">${date}</div>`;
      }
      const key = html;
      if (key === this._last) return;
      this._last = key;
      this.shadowRoot.innerHTML = `<style>${BASE_CSS}
        .time { font-family: var(--os-font-display, ${FONT_DISPLAY}); font-size: ${c.size || 34}px; font-weight: 300;
                letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; text-align: ${c.align || "right"}; }
        .ampm { font-size: 0.45em; font-weight: 600; letter-spacing: 0.02em; margin-left: 4px; color: var(--os-text-2, #a1a1a6); }
        .greet { font-family: var(--os-font-display, ${FONT_DISPLAY}); font-size: ${c.size || 28}px; font-weight: 600;
                 letter-spacing: -0.02em; line-height: 1.1; }
        .date { font-size: 15px; font-weight: 400; letter-spacing: -0.01em; color: var(--os-text-2, #a1a1a6); margin-top: 4px; }
      </style>${html}`;
    }
  }

  /* <os-forecast entity forecast_type days> */
  const WX = {
    "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline",
    fog: "mdi:weather-fog", hail: "mdi:weather-hail", lightning: "mdi:weather-lightning",
    "lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy",
    pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
    "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy",
    "windy-variant": "mdi:weather-windy-variant",
  };
  window.osWeatherIcon = (s) => WX[s] || "mdi:weather-cloudy";

  class OsForecast extends HTMLElement {
    setConfig(c) {
      if (!c || !c.entity) throw new Error("entity required");
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    }
    set hass(h) { this._hass = h; if (this.isConnected && !this._unsub) this._subscribe(); }
    connectedCallback() { if (this._hass && !this._unsub) this._subscribe(); }
    disconnectedCallback() { if (this._unsub) { this._unsub.then((u) => u && u()).catch(() => {}); this._unsub = null; } }
    getCardSize() { return 2; }
    _subscribe() {
      const c = this._c;
      this._unsub = this._hass.connection.subscribeMessage(
        (ev) => { this._fc = ev.forecast || []; this._render(); },
        { type: "weather/subscribe_forecast", entity_id: c.entity, forecast_type: c.forecast_type || "daily" }
      ).catch(() => null);
    }
    _render() {
      const c = this._c;
      const hourly = (c.forecast_type || "daily") === "hourly";
      const n = c.days || 5;
      const items = (this._fc || []).slice(0, n);
      const cells = items.map((f, i) => {
        const d = new Date(f.datetime);
        let label;
        if (hourly) label = i === 0 ? "Now" : d.toLocaleTimeString("en-US", { hour: "numeric" }).replace(" ", "");
        else label = i === 0 && d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
        const pp = f.precipitation_probability;
        const hi = f.temperature != null ? Math.round(f.temperature) + "°" : "";
        const lo = !hourly && f.templow != null ? Math.round(f.templow) + "°" : "";
        return `<div class="cell">
          <div class="lbl">${label}</div>
          <ha-icon icon="${WX[f.condition] || "mdi:weather-cloudy"}"></ha-icon>
          <div class="pp">${pp >= 20 ? pp + "%" : "&nbsp;"}</div>
          <div class="hi">${hi}</div>${lo ? `<div class="lo">${lo}</div>` : ""}
        </div>`;
      }).join("");
      this.shadowRoot.innerHTML = `<style>${BASE_CSS}
        .row { display: grid; grid-template-columns: repeat(${Math.max(items.length, 1)}, 1fr); gap: 4px; }
        .cell { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
        .lbl { font-size: 13px; font-weight: 600; color: var(--os-text-2, #a1a1a6); letter-spacing: -0.01em; }
        ha-icon { --mdc-icon-size: ${c.icon_size || 22}px; color: var(--os-text, #f5f5f7); margin: 4px 0 0; }
        .pp { font-size: 11px; font-weight: 600; color: var(--os-accent, #2997ff); line-height: 13px; }
        .hi { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .lo { font-size: 15px; font-weight: 400; color: var(--os-text-3, #6e6e73); font-variant-numeric: tabular-nums; }
      </style><div class="row">${cells || '<div class="lbl">Loading forecast…</div>'}</div>`;
    }
  }


  /* <os-ma-browser config_entry_id> : Spotify-style Music Assistant library, search and player picker */
  const MA_TABS = [["playlist", "Playlists"], ["album", "Albums"], ["artist", "Artists"], ["radio", "Radio"], ["track", "Songs"]];
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  class OsMaBrowser extends HTMLElement {
    setConfig(c) {
      if (!c || !c.config_entry_id) throw new Error("config_entry_id required");
      this._c = c;
      this._tab = (() => { try { return localStorage.getItem("os-ma-tab") || "playlist"; } catch (e) { return "playlist"; } })();
      this._q = "";
      this._cache = {};
      if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
    }
    getCardSize() { return 8; }
    getGridOptions() { return { columns: "full", rows: "auto" }; }
    set hass(h) {
      const first = !this._hass;
      this._hass = h;
      const players = this._players();
      const sig = players.map((p) => p.id + p.state).join("|");
      if (sig !== this._psig) { this._psig = sig; this._renderPlayers(); }
      if (first) this._load();
    }
    connectedCallback() { this._timer = setInterval(() => { this._cache = {}; if (!this._q) this._load(); }, 600000); }
    disconnectedCallback() { clearInterval(this._timer); }
    _players() {
      const h = this._hass; if (!h) return [];
      const ids = Object.keys(h.entities || {}).filter((id) => id.startsWith("media_player.") && h.entities[id].platform === "music_assistant");
      const list = ids.filter((id) => h.states[id] && !(this._c.exclude || []).includes(id))
        .filter((id) => !id.includes("browser_mod") || (this._c.include || []).includes(id))
        .map((id) => ({ id, name: (this._c.names || {})[id] || h.states[id].attributes.friendly_name || id, state: h.states[id].state }));
      return list;
    }
    _target() {
      const ps = this._players();
      let t; try { t = localStorage.getItem("os-ma-player"); } catch (e) {}
      if (t && ps.some((p) => p.id === t)) return t;
      const playing = ps.find((p) => p.state === "playing");
      return (playing || ps.find((p) => p.id === this._c.default_player) || ps[0] || {}).id;
    }
    _build() {
      this.shadowRoot.innerHTML = `<style>${BASE_CSS}
        :host { display: block; }
        .card { background: var(--os-surface, #121214); border: 1px solid var(--os-hairline, rgba(255,255,255,0.07)); border-radius: var(--os-radius, 18px); padding: 20px 22px 22px; }
        .row { display: flex; align-items: center; gap: 12px; }
        .lbl { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--os-text-2, #a1a1a6); margin-right: 4px; }
        .chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip { height: 36px; padding: 0 16px; border-radius: 999px; border: none; background: var(--os-surface-3, #2c2c2e); color: var(--os-text, #f5f5f7);
                font: 600 14px/1 var(--os-font, system-ui); letter-spacing: -0.01em; cursor: pointer; transition: transform 140ms ease, background-color 200ms ease; display: inline-flex; align-items: center; gap: 6px; }
        .chip:active { transform: scale(0.94); }
        .chip.on { background: var(--os-on, #f5f5f7); color: var(--os-on-text, #1d1d1f); }
        .chip .eq { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .6; }
        .search { flex: 1; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 18px; border-radius: 999px; background: var(--os-surface-2, #1c1c1e); }
        .search ha-icon { --mdc-icon-size: 22px; width: 22px; height: 22px; color: var(--os-text-2, #a1a1a6); }
        .search input { flex: 1; background: transparent; border: none; outline: none; color: var(--os-text, #f5f5f7); font: 400 17px var(--os-font, system-ui); letter-spacing: -0.02em; }
        .search input::placeholder { color: var(--os-text-3, #6e6e73); }
        .clear { background: none; border: none; color: var(--os-text-2, #a1a1a6); cursor: pointer; padding: 4px; display: none; }
        .top { margin-bottom: 16px; justify-content: space-between; flex-wrap: wrap; row-gap: 12px; }
        .tabs { margin: 18px 0 16px; }
        h3 { font: 600 21px/1.2 var(--os-font-display, system-ui); letter-spacing: -0.01em; margin: 18px 0 12px; color: var(--os-text, #f5f5f7); }
        .grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 18px 16px; }
        .item { cursor: pointer; min-width: 0; transition: transform 160ms ease; -webkit-tap-highlight-color: transparent; }
        .item:active { transform: scale(0.96); }
        .art { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--os-surface-3, #2c2c2e); display: flex; align-items: center; justify-content: center; }
        .art.round { border-radius: 50%; }
        .art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .art ha-icon { --mdc-icon-size: 34px; width: 34px; height: 34px; color: var(--os-text-3, #6e6e73); }
        .play { position: absolute; right: 8px; bottom: 8px; width: 40px; height: 40px; border-radius: 50%; background: var(--os-on, #f5f5f7); color: var(--os-on-text, #1d1d1f);
                display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateY(6px); transition: all 200ms ease; }
        .play ha-icon { --mdc-icon-size: 22px; width: 22px; height: 22px; color: inherit; }
        .item:hover .play, .item.busy .play { opacity: 1; transform: none; }
        .t { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .s { font-size: 12px; color: var(--os-text-2, #a1a1a6); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .empty { color: var(--os-text-3, #6e6e73); font-size: 15px; padding: 24px 0; text-align: center; }
        .toast { position: sticky; bottom: 0; margin-top: 14px; font-size: 14px; font-weight: 600; color: var(--os-accent, #2997ff); min-height: 18px; }
      </style>
      <div class="card">
        <div class="row top"><div class="row"><span class="lbl">Play on</span><div class="chips" id="players"></div></div></div>
        <div class="row"><label class="search"><ha-icon icon="mdi:magnify"></ha-icon><input id="q" placeholder="What do you want to play?" autocomplete="off"><button class="clear" id="clr"><ha-icon icon="mdi:close"></ha-icon></button></label></div>
        <div class="chips tabs" id="tabs"></div>
        <div id="body"><div class="empty">Loading your music…</div></div>
        <div class="toast" id="toast"></div>
      </div>`;
      const q = this.shadowRoot.getElementById("q");
      q.addEventListener("input", () => {
        this._q = q.value.trim();
        this.shadowRoot.getElementById("clr").style.display = this._q ? "block" : "none";
        clearTimeout(this._deb); this._deb = setTimeout(() => this._load(), 450);
      });
      q.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(this._deb); this._load(); q.blur(); } });
      this.shadowRoot.getElementById("clr").addEventListener("click", (e) => { e.preventDefault(); q.value = ""; this._q = ""; e.currentTarget.style.display = "none"; this._load(); });
      this._renderTabs();
    }
    _renderTabs() {
      const el = this.shadowRoot.getElementById("tabs");
      el.style.display = this._q ? "none" : "flex";
      el.innerHTML = MA_TABS.map(([k, n]) => `<button class="chip ${k === this._tab ? "on" : ""}" data-k="${k}">${n}</button>`).join("");
      el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        this._tab = b.dataset.k; try { localStorage.setItem("os-ma-tab", this._tab); } catch (e) {}
        this._renderTabs(); this._load();
      }));
    }
    _renderPlayers() {
      const el = this.shadowRoot && this.shadowRoot.getElementById("players"); if (!el) return;
      const t = this._target();
      const ps = this._players();
      el.innerHTML = ps.length ? ps.map((p) => `<button class="chip ${p.id === t ? "on" : ""}" data-id="${p.id}">${p.state === "playing" ? '<span class="eq"></span>' : ""}${esc(p.name)}</button>`).join("")
                               : `<span class="s">No Music Assistant players found</span>`;
      el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        try { localStorage.setItem("os-ma-player", b.dataset.id); } catch (e) {}
        this._renderPlayers();
      }));
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
      try {
        let html;
        if (this._cache[key]) html = this._cache[key];
        else if (this._q) {
          const r = await this._call("search", { name: this._q, limit: 8 });
          const groups = [["Songs", r.tracks], ["Artists", r.artists], ["Albums", r.albums], ["Playlists", r.playlists], ["Radio", r.radio]]
            .filter(([, v]) => v && v.length);
          html = groups.length ? groups.map(([n, v]) => `<h3>${n}</h3>${this._grid(v.slice(0, 6))}`).join("") : `<div class="empty">No results for “${esc(this._q)}”</div>`;
        } else {
          let r = await this._call("get_library", { media_type: this._tab, favorite: true, limit: 18, order_by: "last_played_desc" });
          let items = (r && r.items) || [];
          if (items.length < 6) {
            const more = await this._call("get_library", { media_type: this._tab, limit: 18, order_by: "last_played_desc" });
            const seen = new Set(items.map((i) => i.uri));
            items = items.concat(((more && more.items) || []).filter((i) => !seen.has(i.uri))).slice(0, 18);
          }
          html = items.length ? this._grid(items) : `<div class="empty">Nothing here yet. Add some to your Music Assistant library.</div>`;
        }
        this._cache[key] = html;
        if (token !== this._tok) return;
        body.innerHTML = html;
        body.querySelectorAll(".item").forEach((it) => it.addEventListener("click", () => this._play(it)));
      } catch (e) {
        if (token === this._tok) body.innerHTML = `<div class="empty">Music Assistant isn't responding right now.</div>`;
      }
    }
    _grid(items) {
      return `<div class="grid">${items.map((i) => {
        const sub = i.artists && i.artists.length ? i.artists.map((a) => a.name).join(", ") : (i.owner || ({ playlist: "Playlist", album: "Album", artist: "Artist", radio: "Radio", track: "Song" }[i.media_type] || ""));
        const icon = { artist: "mdi:account-music-outline", radio: "mdi:radio", playlist: "mdi:playlist-music", album: "mdi:album", track: "mdi:music-note-outline" }[i.media_type] || "mdi:music-note-outline";
        return `<div class="item" data-uri="${esc(i.uri)}" data-type="${esc(i.media_type)}" data-name="${esc(i.name)}">
          <div class="art ${i.media_type === "artist" ? "round" : ""}"><ha-icon icon="${icon}"></ha-icon>${i.image ? `<img src="${esc(i.image)}" onerror="this.remove()">` : ""}
            <div class="play"><ha-icon icon="mdi:play"></ha-icon></div></div>
          <div class="t">${esc(i.name)}</div><div class="s">${esc(sub)}</div></div>`;
      }).join("")}</div>`;
    }
    async _play(it) {
      const target = this._target();
      const toast = this.shadowRoot.getElementById("toast");
      if (!target) { toast.textContent = "Pick a speaker first"; return; }
      it.classList.add("busy");
      try {
        await this._hass.callService("music_assistant", "play_media", { media_id: it.dataset.uri, media_type: it.dataset.type }, { entity_id: target });
        const p = this._players().find((x) => x.id === target);
        toast.textContent = `Playing ${it.dataset.name} on ${p ? p.name : "speaker"}`;
      } catch (e) { toast.textContent = "Couldn't start playback"; }
      setTimeout(() => { it.classList.remove("busy"); }, 1200);
      clearTimeout(this._tt); this._tt = setTimeout(() => { toast.textContent = ""; }, 5000);
    }
  }

  if (!customElements.get("os-ma-browser")) customElements.define("os-ma-browser", OsMaBrowser);
  if (!customElements.get("os-clock")) customElements.define("os-clock", OsClock);
  if (!customElements.get("os-forecast")) customElements.define("os-forecast", OsForecast);
  window.customCards = window.customCards || [];
  window.customCards.push(
    { type: "os-clock", name: "OS Clock", description: "Minimal live clock / greeting" },
    { type: "os-forecast", name: "OS Forecast", description: "Minimal monochrome forecast row" }
  );
})();
