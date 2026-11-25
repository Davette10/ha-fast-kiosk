// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: map-marker-alt;

/* Clark Home - Family Locations widget (Scriptable)
   Shows where Jason, Jill, Hayden and Lauren are, read from Home Assistant.
   - In a Home Assistant zone: the zone's name (Home, Hayes Barton Place...).
   - Anywhere else: the street address (Apple Maps lookup on the phone; Life360's street as a fallback).
   - When there's room: distance and drive time home (Waze sensors in Home Assistant).
   Sizes: small, medium, large, plus Lock Screen (rectangular / inline).
   Widget parameter (optional): a name such as "Jill" shows just that person.
   Setup: run this script once in the Scriptable app; it asks for your Home Assistant address and an access token.
   The token is stored in the iPhone Keychain and only ever sent to your Home Assistant.
   Needs a token from an administrator account (Home Assistant only answers /api/template for admins). */

const PEOPLE = [
  { id: "jason", name: "Jason", color: "#2997ff" },
  { id: "jill", name: "Jill", color: "#ff375f" },
  { id: "hayden", name: "Hayden", color: "#30d158" },
  { id: "lauren", name: "Lauren", color: "#bf5af2" },
];
const TAP_ALL = "homeassistant://navigate/mobile-dashboard/map";
const TAP_PERSON = (id) => `homeassistant://navigate/mobile-dashboard/person-${id}`;
const REFRESH_MIN = 5;

/* ---------- look ---------- */
const C = {
  bg: Color.dynamic(new Color("#f2f2f7"), new Color("#000000")),
  card: Color.dynamic(new Color("#ffffff"), new Color("#1c1c1e")),
  text: Color.dynamic(new Color("#1d1d1f"), new Color("#f5f5f7")),
  text2: Color.dynamic(new Color("#6e6e73"), new Color("#a1a1a6")),
  text3: Color.dynamic(new Color("#8e8e93"), new Color("#6e6e73")),
  line: Color.dynamic(new Color("#000000", 0.08), new Color("#ffffff", 0.1)),
  drive: Color.dynamic(new Color("#0071e3"), new Color("#0a84ff")),
};
const F = {
  head: Font.semiboldSystemFont(13),
  name: Font.semiboldSystemFont(15),
  nameS: Font.semiboldSystemFont(13),
  body: Font.systemFont(13),
  bodyS: Font.systemFont(12),
  meta: Font.mediumSystemFont(12),
  metaS: Font.mediumSystemFont(11),
  big: Font.boldSystemFont(22),
};

/* ---------- Home Assistant ---------- */
const KEY_URL = "clarkhome_ha_url", KEY_URL2 = "clarkhome_ha_url_away", KEY_TOKEN = "clarkhome_ha_token";
const TEMPLATE = `{%- set ns = namespace(out=[]) -%}
{%- for pid in ${JSON.stringify(PEOPLE.map((p) => p.id))} -%}
{%- set p = states['person.' ~ pid] -%}
{%- set trk = (state_attr('person.' ~ pid, 'device_trackers') or []) | select('match', 'device_tracker.life360') | first | default('') -%}
{%- set a = states[trk].attributes if trk and states[trk] else {} -%}
{%- set w = 'sensor.waze_' ~ pid ~ '_to_home' -%}
{%- set ns.out = ns.out + [{'id': pid, 'state': p.state if p else 'unknown',
 'lat': state_attr('person.' ~ pid, 'latitude'), 'lon': state_attr('person.' ~ pid, 'longitude'),
 'live': states('binary_sensor.' ~ pid ~ '_location_live'), 'address': a.get('address'),
 'since': a.get('at_loc_since') | as_timestamp(none), 'driving': a.get('driving'), 'speed': a.get('speed'),
 'seen': a.get('last_seen') | as_timestamp(none), 'pic': a.get('entity_picture'),
 'mins': states(w) | float(none), 'miles': state_attr(w, 'distance'),
 'changed': as_timestamp(p.last_changed) if p else none}] -%}
{%- endfor -%}
{{ {'people': ns.out, 'now': as_timestamp(now())} | to_json }}`;

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

/* ---------- place text ---------- */
const round = (v) => Math.round(v * 2000) / 2000; // ~50 m buckets
async function streetAddress(lat, lon, fallback) {
  if (lat == null || lon == null) return cleanLife360(fallback);
  const geo = readJSON("geocode.json", {});
  const key = `${round(lat)},${round(lon)}`;
  if (geo[key]) return geo[key];
  try {
    const res = await Location.reverseGeocode(lat, lon, "en_US");
    const p = res && res[0];
    if (p) {
      const street = [p.subThoroughfare, p.thoroughfare].filter(Boolean).join(" ");
      const town = p.locality || p.subAdministrativeArea || "";
      const text = street ? (town ? `${street}, ${town}` : street) : (p.name || town);
      if (text) {
        geo[key] = text;
        const keys = Object.keys(geo); if (keys.length > 300) delete geo[keys[0]];
        writeJSON("geocode.json", geo);
        return text;
      }
    }
  } catch (e) {}
  return cleanLife360(fallback);
}
const cleanLife360 = (a) => (a ? String(a).replace(/,\s*(North Carolina|NC)$/i, "") : "Unknown location");
const zoneName = (s) => (s === "home" ? "Home" : s);
const inZone = (s) => s && !["not_home", "unknown", "unavailable"].includes(s);
const fmtTime = (ts) => { const d = new Date(ts * 1000); const f = new DateFormatter(); f.useNoDateStyle(); f.useShortTimeStyle(); return f.string(d); };
const fmtSeen = (ts) => {
  if (!ts) return "No recent location";
  const d = new Date(ts * 1000), now = new Date();
  const f = new DateFormatter();
  if (d.toDateString() === now.toDateString()) { f.useNoDateStyle(); f.useShortTimeStyle(); return `Last seen ${f.string(d)}`; }
  f.dateFormat = "EEE h:mm a"; return `Last seen ${f.string(d)}`;
};
const fmtMiles = (m) => (m == null ? null : m < 0.1 ? "Nearby" : m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m)} mi`);
const fmtMins = (m) => { if (m == null) return null; m = Math.round(m); if (m < 1) return "<1 min"; if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} hr ${r} min` : `${h} hr`; };

async function buildPeople(data) {
  const out = [];
  for (const meta of PEOPLE) {
    const d = (data.people || []).find((x) => x.id === meta.id) || {};
    const live = d.live !== "off" && !["unknown", "unavailable"].includes(d.state);
    const home = d.state === "home";
    const zone = inZone(d.state);
    let place, kind;
    if (!live) { place = "Location unavailable"; kind = "off"; }
    else if (zone) { place = zoneName(d.state); kind = home ? "home" : "zone"; }
    else { place = await streetAddress(d.lat, d.lon, d.address); kind = "away"; }
    const away = live && !home;
    out.push({
      ...meta, kind, place,
      driving: live && !!d.driving,
      speed: d.speed && d.speed > 2 ? Math.round(d.speed) : null,
      miles: away ? fmtMiles(d.miles) : null,
      mins: away && d.mins != null && d.miles != null && d.miles >= 0.1 ? fmtMins(d.mins) : null,
      since: live && d.since ? fmtTime(d.since) : null,
      seen: !live ? fmtSeen(d.seen) : null,
      pic: d.pic || null,
    });
  }
  return out;
}

/* ---------- faces ---------- */
async function face(p, size) {
  if (p.pic) {
    const name = `face-${p.id}.jpg`, path = cachePath(name), meta = readJSON("faces.json", {});
    try {
      const fresh = meta[p.id] && meta[p.id].url === p.pic && Date.now() - meta[p.id].t < 3 * 864e5 && fm.fileExists(path);
      if (fresh) return fm.readImage(path);
      const img = await new Request(p.pic).loadImage();
      fm.writeImage(path, img); meta[p.id] = { url: p.pic, t: Date.now() }; writeJSON("faces.json", meta);
      return img;
    } catch (e) { if (fm.fileExists(path)) return fm.readImage(path); }
  }
  return initial(p, size);
}
function initial(p, size) {
  const s = size * 3, ctx = new DrawContext();
  ctx.size = new Size(s, s); ctx.opaque = false; ctx.respectScreenScale = false;
  ctx.setFillColor(new Color(p.color));
  ctx.fillEllipse(new Rect(0, 0, s, s));
  ctx.setFont(Font.semiboldSystemFont(s * 0.46)); ctx.setTextColor(Color.white()); ctx.setTextAlignedCenter();
  ctx.drawTextInRect(p.name[0], new Rect(0, s * 0.2, s, s * 0.62));
  return ctx.getImage();
}
async function avatar(stack, p, size) {
  const ring = stack.addStack();
  ring.size = new Size(size + 4, size + 4); ring.cornerRadius = (size + 4) / 2;
  ring.borderWidth = 2; ring.borderColor = new Color(p.color, p.kind === "off" ? 0.35 : 1);
  ring.centerAlignContent();
  const im = ring.addImage(await face(p, size));
  im.imageSize = new Size(size, size); im.cornerRadius = size / 2;
  if (p.kind === "off") im.imageOpacity = 0.4;
}

/* ---------- pieces ---------- */
function symbol(stack, name, size, color) {
  const s = SFSymbol.named(name); if (!s) return;
  s.applyFont(Font.mediumSystemFont(size));
  const im = stack.addImage(s.image); im.imageSize = new Size(size, size); im.tintColor = color; im.resizable = true;
}
function text(stack, t, font, color, lines) {
  const x = stack.addText(t); x.font = font; x.textColor = color; x.lineLimit = lines || 1; x.minimumScaleFactor = 0.8; return x;
}
const placeColor = (p) => (p.kind === "off" ? C.text3 : p.kind === "home" ? C.text : C.text);
const metaLine = (p, withSince) => {
  const bits = [];
  if (p.driving) bits.push(p.speed ? `Driving · ${p.speed} mph` : "Driving");
  if (p.miles) bits.push(p.mins ? `${p.miles} · ${p.mins}` : p.miles);
  if (withSince && p.since && !p.driving) bits.push(`since ${p.since}`);
  if (p.seen) bits.push(p.seen);
  return bits.join(" · ");
};

function header(w, title, sub) {
  const h = w.addStack(); h.centerAlignContent();
  symbol(h, "location.fill", 12, C.text2); h.addSpacer(5);
  text(h, title.toUpperCase(), F.metaS, C.text2);
  h.addSpacer();
  if (sub) text(h, sub, F.metaS, C.text3);
}

/* small: four compact rows */
async function small(w, people) {
  w.setPadding(14, 14, 14, 14);
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const r = w.addStack(); r.centerAlignContent(); r.spacing = 8;
    await avatar(r, p, 22);
    const col = r.addStack(); col.layoutVertically();
    text(col, p.name, F.nameS, C.text);
    const where = p.kind === "away" && p.driving ? "Driving" : p.place;
    text(col, where, F.bodyS, p.kind === "off" ? C.text3 : C.text2);
    r.addSpacer();
    if (i < people.length - 1) w.addSpacer();
  }
}

/* medium: name + place on the left, distance and time on the right */
async function medium(w, people) {
  w.setPadding(12, 16, 12, 16);
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const r = w.addStack(); r.centerAlignContent(); r.spacing = 10; r.url = TAP_PERSON(p.id);
    await avatar(r, p, 24);
    const col = r.addStack(); col.layoutVertically();
    const top = col.addStack(); top.centerAlignContent(); top.spacing = 5;
    text(top, p.name, F.nameS, C.text);
    if (p.driving) symbol(top, "car.fill", 10, C.drive);
    text(col, p.place, F.bodyS, placeColor(p) === C.text3 ? C.text3 : C.text2);
    r.addSpacer();
    const right = r.addStack(); right.layoutVertically();
    if (p.miles) { const a = text(right, p.miles, F.metaS, C.text); a.rightAlignText(); }
    if (p.mins) { const b = text(right, p.mins, F.metaS, C.text3); b.rightAlignText(); }
    if (!p.miles && p.since && p.kind !== "off") { const c = text(right, `since ${p.since}`, F.metaS, C.text3); c.rightAlignText(); }
    if (i < people.length - 1) w.addSpacer();
  }
}

/* large: header, then rows with full address and a detail line */
async function large(w, people, updated) {
  w.setPadding(16, 16, 16, 16);
  header(w, "Family", updated);
  w.addSpacer(10);
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const r = w.addStack(); r.spacing = 12; r.url = TAP_PERSON(p.id);
    r.setPadding(10, 12, 10, 12); r.cornerRadius = 16; r.backgroundColor = C.card;
    r.centerAlignContent();
    await avatar(r, p, 38);
    const col = r.addStack(); col.layoutVertically(); col.spacing = 1;
    const top = col.addStack(); top.centerAlignContent(); top.spacing = 6;
    text(top, p.name, F.name, C.text);
    if (p.driving) symbol(top, "car.fill", 11, C.drive);
    text(col, p.place, F.body, p.kind === "off" ? C.text3 : C.text, 2);
    const m = metaLine(p, true);
    if (m) text(col, m, F.metaS, p.driving ? C.drive : C.text2);
    r.addSpacer();
    if (i < people.length - 1) w.addSpacer(8);
  }
  w.addSpacer();
}

/* one person (widget parameter = a name) */
async function single(w, p, family, updated) {
  w.url = TAP_PERSON(p.id);
  w.setPadding(14, 14, 14, 14);
  const top = w.addStack(); top.centerAlignContent(); top.spacing = 8;
  await avatar(top, p, family === "small" ? 30 : 36);
  const n = top.addStack(); n.layoutVertically();
  text(n, p.name, F.name, C.text);
  if (p.driving) { const d = n.addStack(); d.spacing = 4; d.centerAlignContent(); symbol(d, "car.fill", 10, C.drive); text(d, p.speed ? `${p.speed} mph` : "Driving", F.metaS, C.drive); }
  else if (p.since) text(n, `since ${p.since}`, F.metaS, C.text3);
  w.addSpacer();
  text(w, p.place, family === "small" ? F.nameS : F.name, p.kind === "off" ? C.text3 : C.text, family === "small" ? 3 : 2);
  if (p.miles || p.seen) {
    w.addSpacer(4);
    const line = p.seen ? p.seen : p.mins ? `${p.miles} · ${p.mins} home` : `${p.miles} from home`;
    text(w, line, F.metaS, C.text2, 2);
  }
  if (family !== "small" && updated) { w.addSpacer(6); text(w, `Updated ${updated}`, F.metaS, C.text3); }
}

/* Lock Screen */
function lockRect(w, people) {
  const show = people.slice(0, 3);
  show.forEach((p) => {
    const r = w.addStack(); r.spacing = 4;
    text(r, `${p.name}:`, Font.semiboldSystemFont(12), Color.white());
    text(r, p.kind === "away" && p.driving ? "Driving" : p.place, Font.systemFont(12), Color.white());
  });
}

/* ---------- main ---------- */
async function build(family, param) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.url = TAP_ALL;
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60000);
  let data, stale = false;
  try { data = await render(TEMPLATE); writeJSON("family.json", data); }
  catch (e) {
    if (String(e.message) === "setup") { w.addSpacer(); text(w, "Open Scriptable and run Family Locations to connect Home Assistant.", F.bodyS, C.text2, 4); w.addSpacer(); return w; }
    data = readJSON("family.json", null); stale = true;
    if (!data) { w.addSpacer(); text(w, "Can't reach Home Assistant", F.nameS, C.text, 2); w.addSpacer(); return w; }
  }
  let people = await buildPeople(data);
  const updated = data.now ? (stale ? `Offline · ${fmtTime(data.now)}` : fmtTime(data.now)) : null;
  const pick = (param || "").trim().toLowerCase();
  const one = pick ? people.find((p) => p.id === pick || p.name.toLowerCase() === pick) : null;
  if (family === "accessoryInline") { const p = one || people[0]; text(w, `${p.name} · ${p.place}`, Font.systemFont(12), Color.white()); return w; }
  if (family === "accessoryRectangular") { w.backgroundColor = new Color("#000000", 0); lockRect(w, one ? [one] : people); return w; }
  if (one) { await single(w, one, family, updated); return w; }
  if (family === "small") await small(w, people);
  else if (family === "medium") await medium(w, people);
  else await large(w, people, updated);
  return w;
}

async function inApp() {
  const ready = Keychain.contains(KEY_URL) && Keychain.contains(KEY_TOKEN);
  if (!ready && !(await setup())) return;
  const a = new Alert();
  a.title = "Family Locations";
  a.addAction("Preview Small"); a.addAction("Preview Medium"); a.addAction("Preview Large"); a.addAction("Change Connection");
  a.addCancelAction("Done");
  const i = await a.presentSheet();
  if (i === 3) await setup();
  else if (i >= 0) { const fam = ["small", "medium", "large"][i]; const w = await build(fam, args.widgetParameter); if (fam === "small") await w.presentSmall(); else if (fam === "medium") await w.presentMedium(); else await w.presentLarge(); }
}
if (config.runsInApp) {
  await inApp();
} else {
  Script.setWidget(await build(config.widgetFamily || "medium", args.widgetParameter));
}
Script.complete();
