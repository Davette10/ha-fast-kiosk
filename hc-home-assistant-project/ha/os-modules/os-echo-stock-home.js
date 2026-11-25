/* os-echo-stock-home (Nov 19 2026): the stock Echo Show home screen for os-echo (skin: "stock").
   Owen chose the stock rotating home (7:05 AM). What his own kitchen Echo rotated (Paladin "alexa-anchor" impression log in
   his Fire OS backup, Sept 30 2025): photos, news, Daily Dose, music picks, trending topics, food inspiration, trending
   info, popular questions, hourly weather, jokes, lists, notifications. Layout of a content card as on Fire OS Echo Show 8
   (measured from straight-on video frames): clock + weather icon + temperature top left; header, 2-3 line title,
   subtitle and a round-ended pill with play / thumbs up / thumbs down on the left; the picture on the right with rounded
   corners; a background colour taken from the picture; Try "Alexa, ..." in italics bottom left; the cards cross-fade
   every 12 s. Photo cards fill the screen with the clock on top. Swipe left = the widget page (os-echo's own widgets:
   weather, up next, family map, front door), swipe right or 45 s later = back to the content.
   Content comes from Home Assistant (weather, calendar, music library, the Fox News briefing list the news
   module already keeps) and from free public feeds the Echo fetches itself: Wikipedia's daily feed (featured article,
   most read = trending, picture of the day, on this day) and TheMealDB (food inspiration). */
(() => {
if (window.__osStockHome) return; window.__osStockHome = true;
const B = "/local/echo-stock-edU4oOWQEk/";
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const WX = { sunny: "sunny", "clear-night": "clear_night", partlycloudy: "partly_cloudy", cloudy: "cloudy", fog: "cloudy", rainy: "rainy", pouring: "rainy", lightning: "lightning", "lightning-rainy": "lightning", snowy: "snow", "snowy-rainy": "snow", hail: "snow", windy: "wind", "windy-variant": "wind", exceptional: "cloudy" };
const WXN = { sunny: "sunny", "clear-night": "clear", partlycloudy: "partly cloudy", cloudy: "cloudy", fog: "foggy", rainy: "rainy", pouring: "pouring rain", lightning: "thunderstorms", "lightning-rainy": "thunderstorms", snowy: "snowy", "snowy-rainy": "sleet", hail: "hail", windy: "windy", "windy-variant": "windy", exceptional: "unusual weather" };
const wxIcon = (st, night) => { let f = WX[st] || "cloudy"; if (night && f === "partly_cloudy") f = "partly_cloudy_night"; return `${B}wx/ic_weather_${f}_144dp.png`; };
const QUESTIONS = ["How far away is the moon?", "What's the tallest mountain in the world?", "How many ounces are in a cup?", "What's the population of the United States?", "How do you say thank you in Spanish?", "What time is it in London?", "How many days until Christmas?", "What's 15 percent of 80?", "Who won the Super Bowl last year?", "How many teaspoons are in a tablespoon?", "What's the weather this weekend?", "How long do you boil an egg?", "What's the capital of Australia?", "How many miles is a 5K?", "When is sunset today?"];
const FUN = [["Laugh a Little", "Want to hear a joke?", "Try “Alexa, tell me a joke”"], ["Games", "Play a quick game of trivia", "Try “Alexa, let's play a game”"], ["Fun Fact", "Learn something new today", "Try “Alexa, tell me a fun fact”"], ["Sounds", "Relax with ocean sounds", "Try “Alexa, play ocean sounds”"], ["Music", "Start your day with some music", "Try “Alexa, play some morning music”"]];
const CSS = `
.sh{position:absolute;inset:0;z-index:4;overflow:hidden;color:#fff;font-family:"Amazon Ember",Roboto,sans-serif;transition:transform .45s cubic-bezier(.2,.8,.2,1);background:#232f3e;touch-action:pan-y;}
:host(.sh-w) .sh{transform:translateX(-100%);}
:host(.sh-g:not(.sh-w)) .isl{opacity:0!important;pointer-events:none!important;}
.sh .zcd{position:absolute;inset:0;opacity:0;transition:opacity .9s ease;pointer-events:none;}
.sh .zcd.zon{opacity:1;pointer-events:auto;}
.sh .zcbg{position:absolute;inset:0;}
.sh .zph{position:absolute;inset:0;background:#000 center/cover no-repeat;}
.sh .zph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 70%,rgba(0,0,0,.35) 100%);}
.sh .ztx{position:absolute;left:5.2vw;top:28vh;width:41vw;display:flex;flex-direction:column;align-items:flex-start;}
.sh .zhd{font-size:3.6vh;line-height:1.2;color:rgba(255,255,255,.88);}
.sh .zti{margin-top:.8vh;font-size:5.75vh;font-weight:500;line-height:1.16;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.sh .zsu{margin-top:.8vh;font-size:3.2vh;font-weight:700;line-height:1.25;color:rgba(255,255,255,.82);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.sh .zap{margin-top:2.6vh;height:10.6vh;padding:0 1.6vw;border-radius:99px;background:rgba(0,0,0,.24);display:flex;align-items:center;gap:.4vw;}
.sh .zap button{width:7.4vw;height:10.6vh;display:flex;align-items:center;justify-content:center;border:0;background:none;color:#fff;padding:0;}
.sh .zap ha-icon{--mdc-icon-size:5.2vh;}
.sh .zim{position:absolute;left:50vw;right:5.2vw;top:15vh;height:50vh;display:flex;align-items:center;justify-content:center;}
.sh .zim img{max-width:100%;max-height:100%;border-radius:1.6vh;object-fit:contain;display:block;}
.sh .zim img.zic{width:26vh;height:26vh;}
.sh .zhint{position:absolute;left:5.2vw;right:12vw;bottom:12vh;font-size:3.6vh;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sh .zmore{position:absolute;right:3.6vw;bottom:22vh;font-size:3.4vh;line-height:1;color:rgba(255,255,255,.8);}
.sh .zclk{position:absolute;left:5.2vw;top:8vh;display:flex;align-items:center;gap:1vw;font-size:6vh;font-weight:500;letter-spacing:.01em;z-index:2;text-shadow:0 0 1.5vh rgba(0,0,0,.18);}
.sh .zclk img{width:5.4vh;height:5.4vh;}
.sh .zclk .ztp{font-size:6vh;}
.sheet:not(.open):not(.evs){box-shadow:none;transition:transform .45s cubic-bezier(.32,.72,0,1),box-shadow 0s .45s;}
`;
const avgColor = (src) => new Promise((res) => {
  const im = new Image(); im.crossOrigin = "anonymous";
  im.onload = () => { try { const N = 24, cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d"); g.drawImage(im, 0, 0, N, N); const d = g.getImageData(0, 0, N, N).data; const H = Array.from({ length: 12 }, () => [0, 0, 0, 0]); let r = 0, gg = 0, b = 0, n = 0, tw = 0; for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], Bl = d[i + 2], mx = Math.max(R, G, Bl), mn = Math.min(R, G, Bl), l = (mx + mn) / 510, s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255)); r += R; gg += G; b += Bl; n++; if (s < .28 || l < .12 || l > .85) continue; let h = mx === R ? (G - Bl) / (mx - mn) : mx === G ? 2 + (Bl - R) / (mx - mn) : 4 + (R - G) / (mx - mn); h = ((h * 60) + 360) % 360; const k = Math.floor(h / 30) % 12, w = s * s, e = H[k]; e[0] += R * w; e[1] += G * w; e[2] += Bl * w; e[3] += w; tw += w; } const top = H.reduce((a, e) => (e[3] > a[3] ? e : a)); res(top[3] > n * .02 ? [top[0] / top[3], top[1] / top[3], top[2] / top[3]] : [r / n, gg / n, b / n]); } catch (e) { res(null); } };
  im.onerror = () => res(null); im.src = src;
});
const shade = ([r, g, b], f) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
const cardBg = (c) => {
  if (!c) return "linear-gradient(110deg,#1d2a3a 0%,#2c3e55 100%)";
  /* keep the colour, but make sure white text stays readable: scale the brightest channel to about 150-190 */
  const m = (c[0] + c[1] + c[2]) / 3, sat = c.map((v) => m + (v - m) * 1.25), mx = Math.max(sat[0], sat[1], sat[2], 1), k = Math.min(1.6, 175 / mx), base = sat.map((v) => Math.max(0, v * k));
  return `linear-gradient(115deg,${shade(base, .62)} 0%,${shade(base, .82)} 55%,${shade(base, .95)} 100%)`;
};
const getJSON = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
/* Wikipedia pictures at screen size (originals can be several MB) */
const wimg = (o) => { const t = o.thumbnail, g = o.originalimage; if (t && g && g.width > 960 && /\/\d+px-/.test(t.source)) return t.source.replace(/\/\d+px-/, "/960px-"); return (g || t).source; };

function setup(el) {
  const sr = el.shadowRoot; if (!sr || sr.querySelector(".sh")) return;
  const st = document.createElement("style"); st.textContent = CSS; sr.appendChild(st);
  const sh = document.createElement("div"); sh.className = "sh";
  sh.innerHTML = `<div class="zclk"><span class="ztm"></span><img alt=""><span class="ztp"></span></div>`;
  const home = sr.querySelector(".home"); sr.insertBefore(sh, home ? home.nextSibling : null);
  const S = el.__sh = { cards: [], i: -1, nodes: [], t: 0, src: {}, idleW: 0, drop: new Set() };
  const hass = () => el._hass, C = () => el._c;
  /* ---- content sources ---- */
  async function refresh() {
    const h = hass(), c = C(); if (!h || !c) return;
    const d = new Date(), out = {};
    /* news: the Fox News briefing list os-echo-news keeps */
    try { const b = JSON.parse(localStorage.getItem("osecho-brief2") || "null"); const items = Array.isArray(b) ? b : (b && (b.items || b.v)) || [];
      out.news = items.slice(0, 6).map((x) => ({ k: "news", hd: "News", ti: x.t, su: "Fox News", img: `https://i.ytimg.com/vi/${x.id}/hq720.jpg`, alt: `https://i.ytimg.com/vi/${x.id}/mqdefault.jpg`, hint: "Try “Alexa, play the news”", act: "news", play: true })); } catch (e) { out.news = []; }
    /* Wikipedia daily feed: Daily Insights, Trending Now, Picture of the Day, On This Day */
    if (!S.src.wikiAt || Date.now() - S.src.wikiAt > 3 * 3600e3) {
      const w = await getJSON(`https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`);
      if (w) {
        S.src.wikiAt = Date.now(); const L = [];
        if (w.tfa && w.tfa.thumbnail) L.push({ k: "daily", hd: "Daily Insights", ti: w.tfa.normalizedtitle || w.tfa.titles.normalized, su: w.tfa.description || "Today's featured article", img: wimg(w.tfa), alt: w.tfa.thumbnail.source, hint: `Try “Alexa, tell me about ${w.tfa.normalizedtitle || ""}”` });
        (w.mostread && w.mostread.articles || []).filter((a) => a.thumbnail && !/^(Main_Page|Special:)/.test(a.title)).slice(0, 5).forEach((a) => L.push({ k: "trend", hd: "Trending Now", ti: a.normalizedtitle, su: a.description || "", img: wimg(a), alt: a.thumbnail.source, hint: `Try “Alexa, who is ${a.normalizedtitle}?”`.replace("who is", /\bborn\b|\b1[0-9]{3}[–-]|\b20[0-9]{2}[–-]|actor|actress|singer|rapper|musician|player|politician|footballer|athlete|president|writer|author|comedian|presenter|model/i.test(a.description || "") ? "who is" : "what is") }));
        if (w.image && w.image.thumbnail) L.push({ k: "daily", hd: "Picture of the Day", ti: (w.image.description && w.image.description.text || "").replace(/<[^>]+>/g, "").slice(0, 140) || "Wikimedia Commons", su: "Wikimedia Commons", img: w.image.thumbnail.source, hint: "Try “Alexa, what's the picture of the day?”" });
        (w.onthisday || []).filter((o) => o.pages && o.pages[0] && o.pages[0].thumbnail).slice(0, 2).forEach((o) => L.push({ k: "daily", hd: "On This Day", ti: `${o.year}: ${o.text}`, su: "Wikipedia", img: wimg(o.pages[0]), alt: o.pages[0].thumbnail.source, hint: "Try “Alexa, what happened on this day in history?”" }));
        S.src.wiki = L;
      }
    }
    out.wiki = S.src.wiki || [];
    /* food inspiration */
    if (!S.src.foodAt || Date.now() - S.src.foodAt > 6 * 3600e3) {
      const F = (await Promise.all([1, 2, 3].map(() => getJSON("https://www.themealdb.com/api/json/v1/1/random.php")))).map((r) => r && r.meals && r.meals[0]).filter(Boolean);
      if (F.length) { S.src.foodAt = Date.now(); S.src.food = F.map((m) => ({ k: "food", hd: "Food Inspiration", ti: m.strMeal, su: [m.strArea, m.strCategory].filter(Boolean).join(" · "), img: m.strMealThumb, hint: `Try “Alexa, show me a recipe for ${m.strMeal.toLowerCase()}”` })); }
    }
    out.food = S.src.food || [];
    /* weather */
    const w = h.states[c.weather]; out.weather = [];
    if (w) { const a = w.attributes || {}, f = (S.fc && S.fc[0]) || {}, night = ((h.states[c.sun] || {}).state === "below_horizon");
      out.weather.push({ k: "weather", hd: "Weather", ti: `${Math.round(a.temperature)}° and ${WXN[w.state] || w.state}`, su: f.temperature != null ? `High ${Math.round(f.temperature)}° · Low ${Math.round(f.templow)}°` : "", img: wxIcon(w.state, night), icon: true, bg: night ? "linear-gradient(115deg,#0d1a3a 0%,#1f3566 100%)" : "linear-gradient(115deg,#1c5fae 0%,#3d8fd9 100%)", hint: "Try “Alexa, what's the weather this week?”", act: "weather" }); }
    /* calendar */
    out.cal = [];
    try { (Array.isArray(el._events) ? el._events : []).filter((e) => e && e.t && new Date(e.last || e.e || e.d) >= new Date(d.toDateString())).slice(0, 2).forEach((e) => {
        const s = new Date(e.d), day = s.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        out.cal.push({ k: "cal", hd: "Calendar", ti: e.t, su: e.all ? `${day} · All day` : `${day} · ${s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`, hint: "Try “Alexa, what's on my calendar?”", act: "calendar", noimg: true, bg: "linear-gradient(115deg,#123a4a 0%,#1d5c70 100%)" }); }); } catch (e) { /* no calendar card */ }
    /* music picks from the library (Music Assistant) */
    if (c.ma_entry && (!S.src.musicAt || Date.now() - S.src.musicAt > 30 * 60e3)) {
      try { const r = await h.callWS({ type: "call_service", domain: "music_assistant", service: "get_library", service_data: { config_entry_id: c.ma_entry, media_type: "album", limit: 10, offset: 0, order_by: "last_played_desc" }, return_response: true });
        const items = ((r && r.response) || r || {}).items || []; S.src.musicAt = Date.now();
        S.src.music = items.filter((x) => x.image || (x.metadata && x.metadata.images && x.metadata.images[0])).slice(0, 4).map((x) => ({ k: "music", hd: "Recommended for You", ti: x.name, su: (x.artists && x.artists[0] && x.artists[0].name) || "", img: (window.OSEchoArt ? window.OSEchoArt(x.image || x.metadata.images[0].path, 512) : x.image), hint: `Try “Alexa, play ${x.name}”`, act: "music", uri: x.uri, mtype: x.media_type, play: true })).filter((x) => x.img);
      } catch (e) { /* keep the last list */ }
    }
    out.music = S.src.music || [];
    /* popular questions + fun */
    out.q = QUESTIONS.slice().sort(() => Math.random() - .5).slice(0, 3).map((q) => ({ k: "q", hd: "Popular Questions", ti: q, su: "Ask Alexa", hint: `Try “Alexa, ${q.charAt(0).toLowerCase() + q.slice(1)}”`, noimg: true }));
    out.fun = FUN.slice().sort(() => Math.random() - .5).slice(0, 2).map(([hd, ti, hint]) => ({ k: "fun", hd, ti, su: "", hint, noimg: true }));
    /* photos */
    out.photo = (c.photos || []).slice().sort(() => Math.random() - .5).slice(0, 6).map((p) => ({ k: "photo", img: p }));
    /* the order roughly follows his Echo's mix: photos and news most, then daily dose / trending, music, food, weather */
    const pat = ["photo", "news", "wiki", "music", "photo", "news", "food", "weather", "wiki", "q", "photo", "news", "wiki", "fun", "music", "photo", "news", "food", "wiki", "cal", "q"];
    const pools = {}; Object.keys(out).forEach((k) => (pools[k] = out[k].slice()));
    const list = []; for (let pass = 0; pass < 3; pass++) for (const k of pat) { const p = pools[k]; if (p && p.length) list.push(p.shift()); }
    if (!list.length) list.push({ k: "fun", hd: "Welcome", ti: "Ask Alexa anything", su: "", hint: "Try “Alexa, what can you do?”", noimg: true });
    const kept = list.filter((x) => !S.drop.has(x.ti || x.img)); S.cards = kept.length ? kept : list; if (S.i >= S.cards.length) S.i = -1;
  }
  async function forecast() {
    const h = hass(), c = C(); if (!h || !c || !c.weather) return;
    try { const r = await h.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", target: { entity_id: c.weather }, service_data: { type: "daily" }, return_response: true });
      S.fc = (((r && r.response) || r || {})[c.weather] || {}).forecast || []; } catch (e) { /* no forecast */ }
  }
  /* ---- render ---- */
  async function show(n) {
    if (!S.cards.length) return;
    S.i = (n + S.cards.length) % S.cards.length; const cd = S.cards[S.i];
    const node = document.createElement("div"); node.className = "zcd";
    if (cd.k === "photo") node.innerHTML = `<div class="zph" style="background-image:url('${esc(cd.img)}')"></div>`;
    else node.innerHTML = `<div class="zcbg"></div><div class="ztx"><div class="zhd">${esc(cd.hd)}</div><div class="zti">${esc(cd.ti)}</div>${cd.su ? `<div class="zsu">${esc(cd.su)}</div>` : ""}<div class="zap">${cd.play ? `<button data-x="play" aria-label="Play"><ha-icon icon="mdi:play"></ha-icon></button>` : ""}<button data-x="up" aria-label="Like"><ha-icon icon="mdi:thumb-up-outline"></ha-icon></button><button data-x="down" aria-label="Not interested"><ha-icon icon="mdi:thumb-down-outline"></ha-icon></button></div></div>${cd.noimg ? "" : `<div class="zim"><img class="${cd.icon ? "zic" : ""}" alt=""></div>`}<div class="zhint">${esc(cd.hint || "")}</div><div class="zmore">⋮</div>`;
    const img = node.querySelector(".zim img");
    if (img) { img.crossOrigin = cd.icon ? null : "anonymous"; img.src = cd.img; img.onerror = () => { if (cd.alt && img.src !== cd.alt) img.src = cd.alt; else img.remove(); }; }
    const bg = node.querySelector(".zcbg");
    if (bg) { bg.style.background = cd.bg || (cd.noimg ? "linear-gradient(115deg,#1f3a5f 0%,#2d5a8a 100%)" : cardBg(null)); if (!cd.bg && !cd.noimg) avgColor(img.src).then((col) => { if (col) bg.style.background = cardBg(col); }); }
    if (img && !cd.icon) await new Promise((r) => { if (img.complete) r(); else { img.onload = r; setTimeout(r, 2500); } });
    sh.appendChild(node); requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add("zon")));
    const old = S.nodes; S.nodes = [node]; setTimeout(() => old.forEach((o) => o.remove()), 1000);
    sh.classList.toggle("photo", cd.k === "photo");
  }
  function act(cd, x) {
    if (x === "down") { S.drop.add(cd.ti || cd.img); S.cards.splice(S.i, 1); S.i--; return next(); }
    if (x === "up") return next();
    if (cd.act === "news" && x === "play") { if (el._open) el._open("news", { ch: "briefing" }); return; }
    if (cd.act === "music" && cd.uri) { hass().callWS({ type: "call_service", domain: "music_assistant", service: "play_media", service_data: { media_id: cd.uri, media_type: cd.mtype || "album" }, target: { entity_id: C().music_player } }).catch(() => {}); if (el._open) el._open("music"); return; }
    if (cd.act && el._open) el._open(cd.act);
  }
  function next() { S.t = Date.now(); show(S.i + 1); }
  sh.addEventListener("click", (e) => {
    const b = e.target.closest("[data-x]"), cd = S.cards[S.i]; if (!cd) return;
    if (b) { e.stopPropagation(); return act(cd, b.dataset.x); }
    if (e.target.closest(".zclk")) return;
    if (cd.act && cd.act !== "news" && cd.act !== "music") act(cd, "open");
  });
  /* swipe left: widgets; swipe right on the widgets: back */
  let x0 = null, y0 = 0;
  const down = (e) => { const p = e.touches ? e.touches[0] : e; x0 = p.clientX; y0 = p.clientY; };
  const up = (e) => { if (x0 == null) return; const p = e.changedTouches ? e.changedTouches[0] : e; const dx = p.clientX - x0, dy = p.clientY - y0; x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx)) return;
    const w = el.classList.contains("sh-w");
    if (!w && dx < 0) { el.classList.add("sh-w"); S.idleW = Date.now(); }
    else if (w && dx > 0) el.classList.remove("sh-w"); };
  sr.addEventListener("touchstart", down, { passive: true }); sr.addEventListener("touchend", up, { passive: true });
  sr.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") down(e); }); sr.addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") up(e); });
  sr.addEventListener("pointerdown", () => { if (el.classList.contains("sh-w")) S.idleW = Date.now(); }, true);
  /* ---- clock, rotation, upkeep ---- */
  const tm = sh.querySelector(".ztm"), wi = sh.querySelector(".zclk img"), tp = sh.querySelector(".ztp");
  function tick() {
    const d = new Date(); tm.textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
    const h = hass(), c = C(), w = h && c && h.states[c.weather];
    if (w) { const night = (h.states[c.sun] || {}).state === "below_horizon", src = wxIcon(w.state, night); if (wi.dataset.s !== src) { wi.dataset.s = src; wi.src = src; } tp.textContent = `${Math.round(w.attributes.temperature)}°`; }
    el.classList.toggle("sh-g", !!(el._isl && el._isl.m === "glance"));
    if (el.classList.contains("sh-w") && Date.now() - S.idleW > 45000) el.classList.remove("sh-w");
    const busy = !!el._panel || !!el._isNight || el.classList.contains("sh-w") || document.hidden;
    if (!busy && S.cards.length && Date.now() - S.t > 12000) next();
  }
  forecast().then(refresh).then(() => next());
  setInterval(tick, 1000); setInterval(() => forecast().then(refresh), 20 * 60e3); tick();
}
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype; if (P.__stkHome) return; P.__stkHome = true;
  const t = P._tick;
  P._tick = function () { try { if (this._c && this._c.skin === "stock" && !this.__shDone && this.shadowRoot && this.shadowRoot.querySelector(".home")) { this.__shDone = true; setup(this); } } catch (e) { /* never break the clock */ } return t.apply(this, arguments); };
});
})();
