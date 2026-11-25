/* Clark Home OS - place names. When someone is away from a saved zone, look up the business or building they are at
   (Target, a Sheetz, a restaurant...) from OpenStreetMap via Photon, and show it on the Map tab list, the person page
   and "Places today". Lookups are cached on each screen (about 11 m grid, 30 days) and only made while someone is
   stopped somewhere, so it's a handful of requests a day. */
(() => {
if (window.__osPlaces) return;
const LS = "os-places-v1", TTL = 30 * 864e5, MISS_TTL = 864e5;
const dist = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r; return Math.sqrt(x * x + y * y) * 6371000; };
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ABBR = { Street: "St", Road: "Rd", Drive: "Dr", Avenue: "Ave", Lane: "Ln", Court: "Ct", Boulevard: "Blvd", Parkway: "Pkwy", Place: "Pl", Circle: "Cir", Highway: "Hwy", Terrace: "Ter", Trail: "Trl" };
const shortSt = (s) => String(s || "").replace(/\b(Street|Road|Drive|Avenue|Lane|Court|Boulevard|Parkway|Place|Circle|Highway|Terrace|Trail)\b/g, (m) => ABBR[m]);
const SKIP = new Set(["parking", "parking_space", "parking_entrance", "bench", "waste_basket", "vending_machine", "bicycle_parking", "toilets", "post_box", "atm",
"drinking_water", "shelter", "fountain", "recycling", "charging_station", "public_bookcase", "picnic_table", "grit_bin", "telephone", "clock", "waste_disposal", "bus_station", "taxi", "vacant", "construction"]);
const POIK = new Set(["shop", "amenity", "leisure", "tourism", "office", "craft", "healthcare", "club"]);
const HOUSE = new Set(["house", "detached", "residential", "apartments", "semidetached_house", "terrace", "bungalow", "yes"]);
/* category -> pill label, icon, colour for Places today */
const cat = (k, v) => {
if (v === "fuel") return ["Gas", "mdi:gas-station-outline", "#30d158"];
if (["supermarket", "grocery", "convenience", "greengrocer", "butcher", "wholesale"].includes(v)) return ["Groceries", "mdi:cart-outline", "#ff9f0a"];
if (["restaurant", "fast_food", "food_court", "bbq", "pub", "bar", "biergarten"].includes(v)) return ["Eating", "mdi:silverware-fork-knife", "#ff6482"];
if (["cafe", "ice_cream", "bakery", "coffee", "bubble_tea", "pastry", "confectionery"].includes(v)) return ["Café", "mdi:coffee-outline", "#ff6482"];
if (["school", "college", "university", "kindergarten", "childcare"].includes(v)) return ["School", "mdi:school-outline", "#bf5af2"];
if (v === "place_of_worship") return ["Church", "mdi:church-outline", "#a1a1a6"];
if (["hospital", "clinic", "doctors", "dentist", "pharmacy", "chemist", "veterinary", "optician"].includes(v) || k === "healthcare") return ["Health", "mdi:medical-bag", "#64d2ff"];
if (["park", "playground", "nature_reserve", "garden", "dog_park", "beach_resort"].includes(v)) return ["Park", "mdi:pine-tree", "#30d158"];
if (["sports_centre", "fitness_centre", "pitch", "stadium", "swimming_pool", "ice_rink", "golf_course", "track", "bowling_alley", "trampoline_park"].includes(v)) return ["Sports", "mdi:run", "#30d158"];
if (["bank", "post_office"].includes(v)) return ["Errand", "mdi:bank-outline", "#64d2ff"];
if (v === "library") return ["Library", "mdi:library-outline", "#64d2ff"];
if (["cinema", "theatre", "arts_centre", "museum", "amusement_arcade", "escape_game"].includes(v)) return ["Fun", "mdi:ticket-outline", "#bf5af2"];
if (["hotel", "motel", "guest_house"].includes(v)) return ["Hotel", "mdi:bed-outline", "#a1a1a6"];
if (["hairdresser", "beauty", "nails", "car_wash", "car_repair", "laundry", "dry_cleaning", "tailor"].includes(v)) return ["Errand", "mdi:storefront-outline", "#64d2ff"];
if (k === "shop" || (k === "landuse" && ["retail", "commercial"].includes(v))) return ["Shopping", "mdi:shopping-outline", "#ff9f0a"];
if (k === "office") return ["Office", "mdi:office-building-outline", "#a1a1a6"];
return ["Visiting", "mdi:map-marker-outline", "#ff9f0a"];
};
/* ---- cache ---- */
let cache = [];
try { cache = JSON.parse(localStorage.getItem(LS) || "[]").filter((e) => Date.now() - e.t < (e.r ? TTL : MISS_TTL)); } catch (e) { cache = []; }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(cache.slice(-500))); } catch (e) {} };
const near = (la, lo) => { let best = null; cache.forEach((e) => { const d = dist(la, lo, e.la, e.lo); if (d <= 30 && (!best || d < best.d)) best = { d, e }; }); return best && best.e; };
/* ---- pick the place from Photon's nearby features ---- */
const pick = (la, lo, acc, feats) => {
const reach = Math.max(45, Math.min(110, (acc || 15) + 40));
let best = null, house = null, road = null;
feats.forEach((f) => {
const p = f.properties || {}, c = (f.geometry || {}).coordinates || [];
let d = dist(la, lo, c[1], c[0]);
const ex = p.extent; /* [west, north, east, south] for areas */
if (ex && lo >= ex[0] - 0.0002 && lo <= ex[2] + 0.0002 && la <= ex[1] + 0.0002 && la >= ex[3] - 0.0002) d = Math.min(d, 10);
const k = p.osm_key, v = p.osm_value;
if (p.name && (POIK.has(k) && !SKIP.has(v) || (k === "landuse" && ["retail", "commercial"].includes(v)) || (k === "building" && !HOUSE.has(v)))) {
const score = d + (k === "landuse" || k === "building" ? 25 : 0) + (k === "office" ? 10 : 0);
if (d <= reach + (ex ? 60 : 0) && (!best || score < best.score)) best = { score, name: p.name, k, v };
}
if (!house && p.housenumber && p.street && d <= 45) house = `${p.housenumber} ${shortSt(p.street)}`;
if (!road && k === "highway" && p.name && d <= 120) road = shortSt(p.name);
if (!road && p.street && d <= 120) road = shortSt(p.street);
});
if (best) { const [label, icon, color] = cat(best.k, best.v); return { name: best.name, label, icon, color, poi: 1 }; }
if (house) return { name: `Near ${house}`, label: "Away", icon: "mdi:map-marker-outline", color: "#ff9f0a", poi: 0 };
if (road) return { name: `Near ${road}`, label: "Away", icon: "mdi:map-marker-outline", color: "#ff9f0a", poi: 0 };
return null;
};
/* ---- request queue: one at a time, at least 1.2 s apart ---- */
const queue = [], pending = new Set(), subs = new Set();
let busy = false, lastAt = 0;
const notify = () => subs.forEach((cb) => { try { cb(); } catch (e) {} });
const pump = async () => {
if (busy || !queue.length) return;
busy = true;
const wait = Math.max(0, 1200 - (Date.now() - lastAt)); if (wait) await new Promise((r) => setTimeout(r, wait));
const job = queue.shift(); lastAt = Date.now();
try {
const u = `https://photon.komoot.io/reverse?lat=${job.la.toFixed(6)}&lon=${job.lo.toFixed(6)}&limit=15&radius=0.15&lang=en`;
const r = await fetch(u).then((x) => x.json());
const res = pick(job.la, job.lo, job.acc, (r && r.features) || []);
cache.push({ la: job.la, lo: job.lo, t: Date.now(), r: res }); save(); notify();
} catch (e) { /* offline or rate-limited: try again on a later render */ }
pending.delete(job.key); busy = false;
if (queue.length) setTimeout(pump, 50);
};
const lookup = (la, lo, acc) => {
la = parseFloat(la); lo = parseFloat(lo);
if (isNaN(la) || isNaN(lo)) return null;
const hit = near(la, lo); if (hit) return hit.r || null;
if (acc && acc > 250) return null;
const key = la.toFixed(4) + "," + lo.toFixed(4);
if (!pending.has(key) && queue.length < 12) { pending.add(key); queue.push({ la, lo, acc, key }); pump(); }
return undefined; /* still looking */
};
window.__osPlaces = { lookup, onChange: (cb) => { subs.add(cb); return () => subs.delete(cb); } };

/* ---- helpers shared by the patches ---- */
const live = new Set();
subs.add(() => live.forEach((el) => { if (!el.isConnected) { live.delete(el); return; } try { el._render(true); if (el.__osStops) el.__osDrawStops(); } catch (e) {} }));
const unavail = (h, pid) => { try { return window.__osLocUnavail ? window.__osLocUnavail(h, pid) : false; } catch (e) { return false; } };
const placeFor = (h, pid, tid) => {
const p = h.states[pid], t = tid && h.states[tid];
if (!p || p.state !== "not_home" || unavail(h, pid)) return null;
const ta = (t && t.attributes) || {}, a = p.attributes || {};
if (ta.driving || (ta.speed && ta.speed > 2)) return null;
const la = a.latitude != null ? a.latitude : ta.latitude, lo = a.longitude != null ? a.longitude : ta.longitude;
return lookup(la, lo, a.gps_accuracy || ta.gps_accuracy) || null;
};
const clock = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const dur = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`; };
const pill = (el, pl) => { if (!el || !pl) return; el.className = "p zone"; el.innerHTML = `<ha-icon icon="${pl.icon}"></ha-icon>${esc(pl.label)}`; };
const patch = (tag, fn) => customElements.whenDefined(tag).then(() => setTimeout(() => { const P = customElements.get(tag).prototype; if (!P.__osPlaces) { P.__osPlaces = true; fn(P); } }, 0));

/* ---- Map tab list ---- */
patch("os-family-map", (P) => {
const r = P._render;
P._render = function () {
const out = r.apply(this, arguments);
live.add(this);
const h = this._hass, sr = this.shadowRoot; if (!h || !sr || !this._c) return out;
this._c.people.forEach((cfg) => {
const pl = placeFor(h, cfg.person, cfg.tracker); if (!pl || !pl.poi) return;
const row = [...sr.querySelectorAll(".row")].find((b) => b.dataset.path === (cfg.path || "")); if (!row) return;
const t = cfg.tracker && h.states[cfg.tracker], since = t && t.attributes.at_loc_since;
const s = row.querySelector(".s"); if (s) s.textContent = pl.name + (since ? ` · since ${clock(since)}` : "");
pill(row.querySelector(".p"), pl);
});
return out;
};
});

/* ---- person page: hero line + Places today ---- */
patch("os-person-page", (P) => {
const r = P._render;
P._render = function () {
const out = r.apply(this, arguments);
live.add(this);
const h = this._hass, sr = this.shadowRoot, c = this._c; if (!h || !sr || !c) return out;
const pl = placeFor(h, c.person, c.tracker); if (!pl) return out;
const w = sr.querySelector("#hero .where"); if (w) w.textContent = pl.poi ? `At ${pl.name}` : pl.name;
if (pl.poi) pill(sr.querySelector("#hero .nm .p"), pl);
return out;
};
/* Places today: real stops (Target, a friend's house...) instead of one "Out and about" block */
P._loadPlaces = async function () {
if (!this._hass || this._placesBusy) return;
this._placesBusy = true; this._placesAt = Date.now();
const id = this._c.person, start = new Date(); start.setHours(0, 0, 0, 0);
try {
const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), entity_ids: [id], minimal_response: false, no_attributes: false, significant_changes_only: false });
const arr = ((res && res[id]) || []).map((x) => ({ t: ((x.lu ?? x.lc) || 0) * 1000, s: x.s, la: x.a && x.a.latitude, lo: x.a && x.a.longitude, acc: x.a && x.a.gps_accuracy }))
.filter((x) => x.s && x.s !== "unknown" && x.s !== "unavailable").sort((a, b) => a.t - b.t);
/* group into stops: same zone, or (when away) points within 110 m of each other */
const stops = [];
let cur = null;
arr.forEach((p) => {
const ok = cur && (p.s !== "not_home" ? cur.s === p.s : cur.s === "not_home" && p.la != null && cur.la != null && dist(cur.la, cur.lo, p.la, p.lo) <= 110);
if (ok) { cur.n++; if (p.s === "not_home" && p.la != null) { cur.la += (p.la - cur.la) / cur.n; cur.lo += (p.lo - cur.lo) / cur.n; } cur.last = p.t; return; }
if (cur) cur.end = p.t;
cur = { s: p.s, la: p.la, lo: p.lo, acc: p.acc, start: Math.max(p.t, start.getTime()), last: p.t, end: null, n: 1 };
stops.push(cur);
});
const now = Date.now();
this.__osStops = stops.filter((g) => !g.end || (g.end - g.start) >= (g.s === "not_home" ? 5 : 3) * 60000);
/* merge back-to-back blocks of the same zone that a short drive split up */
const m = [];
this.__osStops.forEach((g) => { const l = m[m.length - 1]; if (l && l.s === g.s && g.s !== "not_home") { l.end = g.end; } else m.push(Object.assign({}, g)); });
this.__osStops = m.reverse();
this.__osDrawStops();
} catch (e) {
this.shadowRoot.getElementById("pl").innerHTML = `<div class="empty">History isn't available right now.</div>`;
}
this._placesBusy = false;
};
P.__osDrawStops = function () {
const el = this.shadowRoot && this.shadowRoot.getElementById("pl"); if (!el || !this.__osStops) return;
const now = Date.now();
const zcol = (s) => s === "home" ? "var(--os-text, #f5f5f7)" : /work/i.test(s) ? "#2997ff" : /school/i.test(s) ? "#bf5af2" : "#a1a1a6";
const html = this.__osStops.length ? this.__osStops.slice(0, 12).map((g, i) => {
let name, col;
if (g.s !== "not_home") { name = g.s === "home" ? "Home" : g.s; col = zcol(g.s); }
else {
const pl = g.la != null ? lookup(g.la, g.lo, g.acc) : null;
name = pl ? pl.name : pl === undefined ? "Finding place…" : "Out and about"; col = pl ? pl.color : "#ff9f0a";
}
return `<div class="stop ${!g.end ? "now" : ""}">
<div class="sn"><i style="background:${col}"></i>${esc(name)}</div>
<div class="sd">${dur((g.end || now) - g.start)}</div>
<div class="st">${clock(g.start)} – ${g.end ? clock(g.end) : "Now"}</div></div>`;
}).join("") : `<div class="empty">No places recorded yet today.</div>`;
if (html !== this.__osStopsHtml) { this.__osStopsHtml = html; el.innerHTML = html; }
};
});
})();
