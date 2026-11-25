// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: lightbulb;

/* Clark Home - Lights On widget (Scriptable)
   Shows which lights are on right now, read from Home Assistant.
   Sizes: small (count + first names), medium (up to 6), large (grouped by room, up to 12), Lock Screen.
   Tap opens the Home dashboard in the Home Assistant app.
   Uses the same connection as Family Locations (saved in the iPhone Keychain); run either script once in Scriptable to set it up. */

const TAP = "homeassistant://navigate/mobile-dashboard/home";
const REFRESH_MIN = 5;
/* names shown on the dashboards (Home Assistant's own names are left unchanged) */
const NAMES = {
  "light.nanoleaf_wi_fi_a19_a60": "Harper's Light 1",
  "light.nanoleaf_wi_fi_a19_a60_2": "Harper's Light 2",
  "light.bed_lights": "Harper's Bed Lights",
  "light.laurens_lamp": "Lauren's Lamp",
  "light.lamp": "Hayden's Lamp",
  "light.haydens_dresser_lamp": "Hayden's Dresser Lamp",
};
/* room shown for each light (Home Assistant area names, or the light itself when it has no area) */
const ROOMS = {
  "Harper Bedroom": "Harper's Room",
  "light.laurens_lamp": "Lauren's Room",
  "light.lamp": "Hayden's Room",
  "light.haydens_dresser_lamp": "Hayden's Room",
};
/* never counted: the tablet screens, speaker LED rings */
const SKIP = ["browser_mod", "_led_ring", "fu_zhi_bkn"];

const C = {
  bg: Color.dynamic(new Color("#f2f2f7"), new Color("#000000")),
  card: Color.dynamic(new Color("#ffffff"), new Color("#1c1c1e")),
  text: Color.dynamic(new Color("#1d1d1f"), new Color("#f5f5f7")),
  text2: Color.dynamic(new Color("#6e6e73"), new Color("#a1a1a6")),
  text3: Color.dynamic(new Color("#8e8e93"), new Color("#6e6e73")),
  track: Color.dynamic(new Color("#000000", 0.08), new Color("#ffffff", 0.12)),
};

const KEY_URL = "clarkhome_ha_url", KEY_URL2 = "clarkhome_ha_url_away", KEY_TOKEN = "clarkhome_ha_token";
const TEMPLATE = `{%- set skip = ${JSON.stringify(SKIP)} -%}
{%- set ns = namespace(out=[], total=0) -%}
{%- for s in states.light | rejectattr('attributes.entity_id', 'defined') -%}
{%- if not (skip | select('in', s.entity_id) | list) and s.state not in ['unavailable', 'unknown'] -%}
{%- set ns.total = ns.total + 1 -%}
{%- if s.state == 'on' -%}
{%- set a = s.attributes -%}
{%- set ns.out = ns.out + [{'id': s.entity_id, 'name': s.name, 'area': area_name(s.entity_id),
 'pct': ((a.get('brightness') / 2.55) | round(0) | int) if a.get('brightness') is not none else none,
 'rgb': a.get('rgb_color') if a.get('color_mode') in ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'] else none,
 'k': a.get('color_temp_kelvin')}] -%}
{%- endif -%}
{%- endif -%}
{%- endfor -%}
{{ {'on': ns.out, 'total': ns.total, 'now': as_timestamp(now())} | to_json }}`;

const fm = FileManager.local();
const dir = fm.joinPath(fm.cacheDirectory(), "clarkhome");
if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
const cachePath = (n) => fm.joinPath(dir, n);
const readJSON = (n, d) => { try { const p = cachePath(n); return fm.fileExists(p) ? JSON.parse(fm.readString(p)) : d; } catch (e) { return d; } };
const writeJSON = (n, v) => { try { fm.writeString(cachePath(n), JSON.stringify(v)); } catch (e) {} };

async function setup() {
  const a = new Alert();
  a.title = "Connect to Home Assistant";
  a.message = "The first address works anywhere; the second is a backup on your home Wi-Fi. Paste a long-lived access token from Home Assistant (your profile → Security → Long-lived access tokens). It is saved only in this iPhone's Keychain.";
  a.addTextField("Address", Keychain.contains(KEY_URL) ? Keychain.get(KEY_URL) : "https://homeassistant.YOUR-TAILNET.ts.net");
  a.addTextField("Backup address (home Wi-Fi)", Keychain.contains(KEY_URL2) ? Keychain.get(KEY_URL2) : "http://192.168.6.172:8123");
  a.addSecureTextField("Access token", "");
  a.addAction("Save");
  a.addCancelAction("Cancel");
  if ((await a.presentAlert()) === -1) return false;
  const u = a.textFieldValue(0).trim().replace(/\/+$/, ""), u2 = a.textFieldValue(1).trim().replace(/\/+$/, ""), t = a.textFieldValue(2).trim();
  if (u) Keychain.set(KEY_URL, u);
  if (u2) Keychain.set(KEY_URL2, u2); else if (Keychain.contains(KEY_URL2)) Keychain.remove(KEY_URL2);
  if (t) Keychain.set(KEY_TOKEN, t);
  return Keychain.contains(KEY_URL) && Keychain.contains(KEY_TOKEN);
}

async function render(template) {
  const token = Keychain.contains(KEY_TOKEN) ? Keychain.get(KEY_TOKEN) : null;
  if (!token) throw new Error("setup");
  const urls = [KEY_URL, KEY_URL2].filter((k) => Keychain.contains(k)).map((k) => Keychain.get(k));
  let last;
  for (const u of urls) {
    try {
      const r = new Request(`${u}/api/template`);
      r.method = "POST";
      r.timeoutInterval = 6;
      r.headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      r.body = JSON.stringify({ template });
      const s = await r.loadString();
      if (r.response && r.response.statusCode === 401) throw new Error("auth");
      if (r.response && r.response.statusCode >= 400) throw new Error(`HTTP ${r.response.statusCode}`);
      return JSON.parse(s);
    } catch (e) { last = e; if (String(e.message) === "auth") break; }
  }
  throw last || new Error("offline");
}

const fmtTime = (ts) => { const f = new DateFormatter(); f.useNoDateStyle(); f.useShortTimeStyle(); return f.string(new Date(ts * 1000)); };
/* bulb tint: the light's colour when it's in a colour mode, otherwise warm or cool white */
const tint = (l) => {
  if (l.rgb && Math.max(...l.rgb) - Math.min(...l.rgb) > 40) return new Color(`#${l.rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`);
  if (l.k && l.k >= 5200) return new Color("#d6e4ff");
  if (l.k && l.k >= 3800) return new Color("#ffe2b0");
  return new Color("#ffc470");
};
/* drop the room (or its owner, "Harper's") from the light name when it's shown under that room */
const short = (name, room) => {
  if (!room) return name;
  const owner = (room.match(/^(\S+'s)\s/) || [])[1];
  for (const pre of [room, owner]) if (pre && name.toLowerCase().startsWith(pre.toLowerCase() + " ")) { const n = name.slice(pre.length + 1); if (n.length > 1) return n.charAt(0).toUpperCase() + n.slice(1); }
  return name;
};

function symbol(stack, name, size, color) {
  const s = SFSymbol.named(name); if (!s) return null;
  s.applyFont(Font.mediumSystemFont(size));
  const im = stack.addImage(s.image); im.imageSize = new Size(size, size); im.tintColor = color; im.resizable = true; return im;
}
function text(stack, t, font, color, lines) { const x = stack.addText(t); x.font = font; x.textColor = color; x.lineLimit = lines || 1; x.minimumScaleFactor = 0.8; return x; }
function bar(stack, pct, color, width) {
  const tr = stack.addStack(); tr.size = new Size(width, 4); tr.cornerRadius = 2; tr.backgroundColor = C.track;
  const fill = tr.addStack(); fill.size = new Size(Math.max(4, Math.round(width * (pct == null ? 100 : pct) / 100)), 4); fill.cornerRadius = 2; fill.backgroundColor = color;
  tr.addSpacer();
}
function header(w, count, updated) {
  const h = w.addStack(); h.centerAlignContent();
  symbol(h, "lightbulb.fill", 12, C.text2); h.addSpacer(5);
  text(h, "LIGHTS", Font.mediumSystemFont(11), C.text2);
  h.addSpacer();
  if (updated) text(h, updated, Font.mediumSystemFont(11), C.text3);
}
function allOff(w, big) {
  w.addSpacer();
  const r = w.addStack(); r.centerAlignContent(); r.spacing = 8;
  symbol(r, "lightbulb.slash", big ? 22 : 18, C.text3);
  text(r, "All lights off", Font.semiboldSystemFont(big ? 17 : 15), C.text2);
  w.addSpacer();
}
function lightRow(stack, l, nameText, wide) {
  const r = stack.addStack(); r.centerAlignContent(); r.spacing = 10;
  const dot = r.addStack(); dot.size = new Size(28, 28); dot.cornerRadius = 14; dot.backgroundColor = new Color(tint(l).hex, 0.22); dot.centerAlignContent();
  symbol(dot, "lightbulb.fill", 14, tint(l));
  const col = r.addStack(); col.layoutVertically(); col.spacing = 3;
  text(col, nameText, Font.semiboldSystemFont(13), C.text);
  if (wide) bar(col, l.pct, tint(l), wide);
  r.addSpacer();
  if (l.pct != null) text(r, `${l.pct}%`, Font.mediumSystemFont(12), C.text2);
  return r;
}

async function build(family) {
  const w = new ListWidget();
  w.backgroundColor = C.bg; w.url = TAP;
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60000);
  let data, stale = false;
  try { data = await render(TEMPLATE); writeJSON("lights.json", data); }
  catch (e) {
    if (String(e.message) === "setup") { w.addSpacer(); text(w, "Open Scriptable and run Lights On to connect Home Assistant.", Font.systemFont(12), C.text2, 4); w.addSpacer(); return w; }
    data = readJSON("lights.json", null); stale = true;
    if (!data) { w.addSpacer(); text(w, "Can't reach Home Assistant", Font.semiboldSystemFont(13), C.text, 2); w.addSpacer(); return w; }
  }
  const on = (data.on || []).map((l) => ({ ...l, name: NAMES[l.id] || l.name, area: ROOMS[l.id] || ROOMS[l.area] || l.area }))
    .sort((a, b) => (a.area || "~").localeCompare(b.area || "~") || a.name.localeCompare(b.name));
  const n = on.length;
  const updated = data.now ? (stale ? `Offline · ${fmtTime(data.now)}` : fmtTime(data.now)) : null;

  if (family === "accessoryInline") { text(w, n ? `${n} light${n > 1 ? "s" : ""} on` : "All lights off", Font.systemFont(12), Color.white()); return w; }
  if (family === "accessoryCircular") {
    w.addSpacer(); const c = w.addStack(); c.layoutVertically(); c.centerAlignContent();
    const t = text(c, String(n), Font.boldRoundedSystemFont(22), Color.white()); t.centerAlignText();
    const s = text(c, "on", Font.mediumSystemFont(10), Color.white()); s.centerAlignText();
    w.addSpacer(); return w;
  }
  if (family === "accessoryRectangular") {
    text(w, n ? `${n} light${n > 1 ? "s" : ""} on` : "All lights off", Font.semiboldSystemFont(13), Color.white());
    on.slice(0, 2).forEach((l) => text(w, l.name, Font.systemFont(12), Color.white()));
    return w;
  }

  if (family === "small") {
    w.setPadding(14, 14, 14, 14);
    const top = w.addStack(); top.centerAlignContent();
    const d = top.addStack(); d.size = new Size(30, 30); d.cornerRadius = 15; d.centerAlignContent();
    d.backgroundColor = n ? new Color("#ffc470", 0.22) : C.track;
    symbol(d, n ? "lightbulb.fill" : "lightbulb.slash", 15, n ? new Color("#ffc470") : C.text3);
    top.addSpacer();
    text(top, String(n), Font.boldRoundedSystemFont(30), n ? C.text : C.text3);
    w.addSpacer(4);
    text(w, n ? (n === 1 ? "Light On" : "Lights On") : "All lights off", Font.semiboldSystemFont(15), C.text);
    w.addSpacer(6);
    on.slice(0, 3).forEach((l) => text(w, l.name, Font.systemFont(12), C.text2));
    if (n > 3) text(w, `+${n - 3} more`, Font.mediumSystemFont(12), C.text3);
    w.addSpacer();
    return w;
  }

  if (family === "medium") {
    w.setPadding(14, 16, 14, 16);
    header(w, n, updated);
    if (!n) { allOff(w, false); return w; }
    w.addSpacer(8);
    const show = on.slice(0, n > 4 ? 3 : 4);
    show.forEach((l, i) => {
      const r = w.addStack(); r.centerAlignContent(); r.spacing = 10;
      const dot = r.addStack(); dot.size = new Size(24, 24); dot.cornerRadius = 12; dot.backgroundColor = new Color(tint(l).hex, 0.22); dot.centerAlignContent();
      symbol(dot, "lightbulb.fill", 12, tint(l));
      text(r, l.name, Font.semiboldSystemFont(13), C.text);
      r.addSpacer();
      bar(r, l.pct, tint(l), 54);
      const pc = text(r, l.pct != null ? `${l.pct}%` : "On", Font.mediumSystemFont(12), C.text2); pc.rightAlignText();
      if (i < show.length - 1) w.addSpacer(5);
    });
    if (n > 4) { w.addSpacer(5); text(w, `+${n - 3} more`, Font.mediumSystemFont(12), C.text3); }
    w.addSpacer();
    return w;
  }

  /* large: grouped by room */
  w.setPadding(16, 16, 16, 16);
  header(w, n, updated);
  w.addSpacer(10);
  const big = w.addStack(); big.centerAlignContent(); big.spacing = 8;
  text(big, String(n), Font.boldRoundedSystemFont(34), n ? C.text : C.text3);
  text(big, n === 1 ? "light on" : n ? "lights on" : "All lights off", Font.semiboldSystemFont(17), C.text2);
  if (!n) { w.addSpacer(); return w; }
  w.addSpacer(10);
  let rows = 0, shown = 0;
  const groups = [];
  on.forEach((l) => { const g = groups.find((x) => x.area === (l.area || "Other")); if (g) g.list.push(l); else groups.push({ area: l.area || "Other", list: [l] }); });
  for (const g of groups) {
    if (rows >= 9) break;
    const card = w.addStack(); card.layoutVertically(); card.setPadding(10, 12, 10, 12); card.cornerRadius = 14; card.backgroundColor = C.card; card.spacing = 8;
    text(card, g.area.toUpperCase(), Font.mediumSystemFont(11), C.text3);
    rows++;
    for (const l of g.list) {
      if (rows >= 9) break;
      lightRow(card, l, short(l.name, g.area), 120); rows++; shown++;
    }
    w.addSpacer(8);
  }
  if (shown < n) text(w, `+${n - shown} more`, Font.mediumSystemFont(12), C.text3);
  w.addSpacer();
  return w;
}

async function inApp() {
  const ready = Keychain.contains(KEY_URL) && Keychain.contains(KEY_TOKEN);
  if (!ready && !(await setup())) return;
  const a = new Alert();
  a.title = "Lights On";
  a.addAction("Preview Small"); a.addAction("Preview Medium"); a.addAction("Preview Large"); a.addAction("Change Connection");
  a.addCancelAction("Done");
  const i = await a.presentSheet();
  if (i === 3) await setup();
  else if (i >= 0) { const fam = ["small", "medium", "large"][i]; const w = await build(fam); if (fam === "small") await w.presentSmall(); else if (fam === "medium") await w.presentMedium(); else await w.presentLarge(); }
}
if (config.runsInApp) {
  await inApp();
} else {
  Script.setWidget(await build(config.widgetFamily || "medium"));
}
Script.complete();
