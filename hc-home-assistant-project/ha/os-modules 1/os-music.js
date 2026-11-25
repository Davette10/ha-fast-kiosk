/* Clark Home OS - Music: a Spotify-style player for the Media tab (tablet and phone).
   Library + playback: Music Assistant (its file share is the Downtify download folder).
   Catalog search, artist and album pages: the public Deezer catalog (no account, JSONP).
   Songs that aren't downloaded yet go to Downtify: the song's album first, then the rest of the artist. */
(() => {
const FONT = '-apple-system, "SF Pro Text", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
const DFONT = '-apple-system, "SF Pro Display", Inter, system-ui, "Segoe UI", Roboto, sans-serif';
const DZ = "https://api.deezer.com/";
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const lsJson = (k, d) => { try { return JSON.parse(lsGet(k, "")) || d; } catch (e) { return d; } };
const ftime = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const flong = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} hr ${m} min` : `${m} min ${s % 60} sec`; };
const fnum = (n) => (n == null ? "" : Number(n).toLocaleString("en-US"));
const norm = (s) => String(s == null ? "" : s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘`´]/g, "'").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const baseT = (t) => norm(String(t || "").replace(/\s*[\(\[].*$/, "").replace(/\s+-\s+.*$/, "")) || norm(t);
const splitArtists = (s) => String(s || "").split(/\s*,\s*|\s*\/\s*|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+x\s+/i).map(norm).filter(Boolean);
const greet = () => { const h = new Date().getHours(); return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
const plIcon = (n) => { n = String(n || "").toLowerCase(); return /favorit/.test(n) ? "mdi:heart-outline" : /infinite/.test(n) ? "mdi:infinity" : /random artist/.test(n) ? "mdi:account-music-outline" : /random album/.test(n) ? "mdi:album" : /random/.test(n) ? "mdi:shuffle-variant" : /recently added/.test(n) ? "mdi:clock-plus-outline" : /recently played/.test(n) ? "mdi:history" : "mdi:playlist-music"; };
const RTYPE = { album: "Album", ep: "EP", single: "Single", compile: "Compilation" };
/* ---------- search ranking: match quality + popularity, Spotify-style ---------- */
const ALIAS = { ye: "kanye west", yeezy: "kanye west", mj: "michael jackson", tswift: "taylor swift", "t swift": "taylor swift", rhcp: "red hot chili peppers", mcr: "my chemical romance", gnr: "guns n roses", biggie: "the notorious b i g", tupac: "2pac", pac: "2pac", bieber: "justin bieber", "j lo": "jennifer lopez", jlo: "jennifer lopez", "tay tay": "taylor swift" };
const osa = (a, b) => {
const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9;
const d = []; for (let i = 0; i <= m; i++) { d[i] = [i]; } for (let j = 1; j <= n; j++) d[0][j] = j;
for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
const c = a[i - 1] === b[j - 1] ? 0 : 1;
d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
}
return d[m][n];
};
/* 100 exact, 96 nickname, 80-92 name starts with it, 64 every word starts a word, 56 small typo, 42 contains, 0 no match */
const mScore = (qn, n) => {
if (!qn || !n) return 0;
const qs = qn.replace(/ /g, ""), ns = n.replace(/ /g, ""), nt = n.replace(/^the /, "");
if (n === qn || nt === qn || ns === qs) return 100;
if (ALIAS[qn] && n === ALIAS[qn]) return 96;
if (n.startsWith(qn) || nt.startsWith(qn) || (qs.length > 2 && ns.startsWith(qs))) return 80 + Math.round((12 * qn.length) / n.length);
const nw = n.split(" "), qw = qn.split(" ");
if (qw.every((w) => nw.some((x) => x.startsWith(w)))) return 64;
if (n.includes(qn)) return 42;
if (qn.length >= 4 && n[0] === qn[0]) { const k = qn.length >= 8 ? 2 : 1; if (osa(qn, n.slice(0, qn.length)) <= k || osa(qn, nt.slice(0, qn.length)) <= k || osa(qn, n) <= k) return 56; }
return 0;
};
const cover = (qn, text) => { const qw = qn.split(" ").filter(Boolean), tw = norm(text).split(" "); return qw.length ? qw.filter((w) => tw.some((x) => x.startsWith(w))).length / qw.length : 0; };
const fanPop = (f) => Math.log10((f || 0) + 1);
/* o: { ar: Deezer artist hits, tr: Deezer track hits, idx: popular-artist index, lib: Set of library artist names, picks: tapped artists } */
const rankArtists = (qn, o) => {
const C = new Map();
const add = (a, pop, fromSearch) => {
if (!a || !a.id || !a.name) return;
const c = C.get(a.id);
if (c) { c.pop = Math.max(c.pop, pop); c.hit = c.hit || fromSearch; if (a.nb_fan != null) c.a.nb_fan = a.nb_fan; if (!c.a.picture_medium && a.picture_medium) c.a.picture_medium = a.picture_medium; return; }
C.set(a.id, { a: { id: a.id, name: a.name, picture_medium: a.picture_medium || "", nb_fan: a.nb_fan }, n: norm(a.name), pop, hit: !!fromSearch });
};
(o.ar || []).forEach((a) => add(a, fanPop(a.nb_fan), true));
(o.idx || []).forEach((e) => { if (mScore(qn, e.n) >= 42) add({ id: e.id, name: e.name, picture_medium: e.pic }, e.pop); });
Object.keys(o.picks || {}).forEach((id) => { const p = o.picks[id]; if (p && p.name && mScore(qn, norm(p.name)) >= 42) add({ id: +id, name: p.name, picture_medium: p.pic }, 5.2); });
(o.tr || []).forEach((t) => { const a = t.artist; if (a && mScore(qn, norm(a.name)) >= 42) add(a, 1.5 + ((t.rank || 0) / 1e6) * 4.6); });
const out = [...C.values()].map((c) => {
let m = mScore(qn, c.n); if (!m && c.hit) m = 14;
const pk = (o.picks || {})[c.a.id];
c.m = m; c.score = m + c.pop * 12 + (o.lib && o.lib.has(c.n) ? 10 : 0) + (pk ? Math.min(3, pk.c || 1) * 6 : 0);
return c;
}).filter((c) => c.m > 0);
out.sort((x, y) => y.score - x.score);
return out;
};
const rankTracks = (qn, tr, topId) => tr.map((t, i) => {
const ti = mScore(qn, norm(t.title_short || t.title)), at = mScore(qn, norm(t.artist && t.artist.name));
const cv = cover(qn, `${t.title} ${(t.artist && t.artist.name) || ""} ${(t.album && t.album.title) || ""}`);
const score = Math.max(ti, at * 0.85, cv * 78) + (ti && at ? 10 : 0) + ((t.rank || 0) / 1e6) * 40 + (topId && t.artist && t.artist.id === topId ? 18 : 0) - i * 1.2;
return { t, ti, cv, score };
}).sort((x, y) => y.score - x.score);
const rankAlbums = (qn, al, topId, focus) => al.map((a, i) => {
const ti = mScore(qn, norm(a.title)), at = mScore(qn, norm(a.artist && a.artist.name));
return { a, score: Math.max(ti, at * 0.85, cover(qn, `${a.title} ${(a.artist && a.artist.name) || ""}`) * 70) + (topId && a.artist && a.artist.id === topId ? (focus ? 45 : 22) : 0) - i * 1.5 };
}).sort((x, y) => y.score - x.score).map((x) => x.a);
/* Artist wins when its name is what you're typing; a song wins when its title matches better than any artist and it's popular. */
const chooseTop = (artists, tracks) => {
const A = artists[0], T = tracks[0];
const aOk = A && A.m >= 56, tOk = T && (T.ti >= 64 || T.cv === 1);
const tScore = T ? Math.max(T.ti, T.cv * 90) + ((T.t.rank || 0) / 1e6) * 70 : 0;
if (aOk && (!tOk || A.score >= tScore)) return { kind: "artist", c: A };
if (T) return { kind: "track", c: T };
if (A) return { kind: "artist", c: A };
return null;
};
/*RANK-END*/

/* ---------- Deezer catalog over JSONP (their API sends no CORS headers) ---------- */
const DQ = { seq: 0, cache: new Map(), q: [], active: 0, times: [] };
const dz = (path, ttl = 15 * 60000) => {
const c = DQ.cache.get(path);
if (c && Date.now() - c.t < ttl) return c.p;
const p = new Promise((res, rej) => { DQ.q.push({ path, res, rej, tries: 0 }); pump(); });
DQ.cache.set(path, { t: Date.now(), p });
p.catch(() => DQ.cache.delete(path));
return p;
};
const pump = () => {
while (DQ.active < 4 && DQ.q.length) {
const now = Date.now();
while (DQ.times.length && now - DQ.times[0] > 5000) DQ.times.shift();
if (DQ.times.length >= 40) { clearTimeout(DQ.wait); DQ.wait = setTimeout(pump, 5000 - (now - DQ.times[0]) + 30); return; }
const job = DQ.q.shift(); DQ.active++; DQ.times.push(now);
const cb = "__osdz" + (++DQ.seq), s = document.createElement("script");
let done = false, to = 0;
const fin = (err, data) => {
if (done) return; done = true; DQ.active--; clearTimeout(to); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove();
if (!err && data && data.error) {
if (data.error.code === 4 && job.tries < 3) { job.tries++; setTimeout(() => { DQ.q.unshift(job); pump(); }, 1200); pump(); return; }
err = new Error(data.error.message || "Catalog error");
}
if (err) job.rej(err); else job.res(data);
pump();
};
window[cb] = (d) => fin(null, d);
s.onerror = () => fin(new Error("Can't reach the music catalog"));
to = setTimeout(() => fin(new Error("The music catalog took too long")), 12000);
s.src = DZ + job.path + (job.path.includes("?") ? "&" : "?") + "output=jsonp&callback=" + cb;
document.head.appendChild(s);
}
};

/* ---------- shared state (one per browser window) ---------- */
const S = window.__osMusic || (window.__osMusic = { picks: lsJson("os-music-picks", {}), logos: new Set(lsJson("os-music-logos", [])), files: null, idx: new Map(), filesAt: 0, jm: new Map(), qAt: 0, lastAct: 0, want: null, cards: new Set(), artists: lsJson("os-music-artists", {}) });

if (!S.picks) S.picks = lsJson("os-music-picks", {});
if (!S.jm) S.jm = new Map();
const VA = (x) => !!x && (x.id === 5080 || /^various artists?$/i.test(x.name || ""));

const CSS = `
:host{display:block;height:100%;--fg:var(--os-text,#f5f5f7);--fg2:var(--os-text-2,#a1a1a6);--fg3:var(--os-text-3,#6e6e73);--acc:var(--os-accent,#2997ff);--on:var(--os-on,#f5f5f7);--ont:var(--os-on-text,#1d1d1f);
--inner:var(--os-glass-inner,rgba(255,255,255,0.06));--hov:rgba(127,127,127,0.12);--hair:var(--os-hairline,rgba(255,255,255,0.08));--ph:rgba(127,127,127,0.18);--popbg:rgba(30,30,33,0.94);
font-family:var(--os-font,${FONT});color:var(--fg);-webkit-font-smoothing:antialiased;text-align:left;user-select:none;-webkit-user-select:none;}
:host(.lt){--popbg:rgba(250,250,252,0.95);--ph:rgba(0,0,0,0.07);}
:host(.nar){height:auto;}
*{box-sizing:border-box;}
button{font:inherit;color:inherit;border:none;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
input{font:inherit;color:inherit;}
ha-icon{display:inline-flex;--mdc-icon-size:24px;width:24px;height:24px;flex:none;}
.app{position:relative;height:100%;display:grid;grid-template-columns:292px minmax(0,1fr);grid-template-rows:minmax(0,1fr) 92px;gap:12px;}
.pane{position:relative;background:var(--os-glass-bg,rgba(255,255,255,0.07));box-shadow:var(--os-glass-shadow,inset 0 0 0 1px rgba(255,255,255,0.08));-webkit-backdrop-filter:var(--os-glass-filter,none);backdrop-filter:var(--os-glass-filter,none);border-radius:18px;min-width:0;min-height:0;overflow:hidden;}
.scr{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
.scr::-webkit-scrollbar,.row::-webkit-scrollbar,.fch::-webkit-scrollbar{display:none;}
.tap{transition:transform 140ms ease,background-color 180ms ease,opacity 180ms ease;}
.tap:active{transform:scale(0.97);}
@media (hover:hover){.hv:hover{background:var(--hov);}}
/* sidebar */
.side{display:flex;flex-direction:column;}
.nav{padding:10px 8px 4px;display:flex;flex-direction:column;gap:2px;flex:none;}
.nv{display:flex;align-items:center;gap:16px;height:48px;padding:0 14px;border-radius:12px;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:var(--fg2);}
.nv ha-icon{--mdc-icon-size:26px;width:26px;height:26px;}
.nv.on{color:var(--fg);}
.libh{display:flex;align-items:center;gap:12px;padding:12px 22px 8px;font-size:16px;font-weight:700;color:var(--fg2);border-top:1px solid var(--hair);margin-top:6px;flex:none;}
.libh ha-icon{--mdc-icon-size:24px;}
.fch{display:flex;gap:8px;padding:4px 14px 10px;overflow-x:auto;flex:none;}
.fc{flex:none;height:34px;padding:0 14px;border-radius:999px;background:var(--inner);font-size:14px;font-weight:600;color:var(--fg);}
.fc.on{background:var(--on);color:var(--ont);}
.libl{flex:1;padding:0 8px 12px;}
.li{width:100%;display:grid;grid-template-columns:52px minmax(0,1fr) 18px;gap:12px;align-items:center;padding:6px 8px;border-radius:10px;text-align:left;}
.im{position:relative;background:var(--ph);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--fg3);flex:none;}
.im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.im ha-icon{--mdc-icon-size:22px;}
.li .im{width:52px;height:52px;border-radius:6px;}
.r{border-radius:50% !important;}
.li .n{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.li .s{font-size:13px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.li.cur .n{color:var(--acc);}
.vol-ic{color:var(--acc);--mdc-icon-size:16px;width:16px;height:16px;}
/* main */
.main{display:flex;flex-direction:column;}
.top{display:flex;align-items:center;gap:10px;padding:14px 18px 8px;flex:none;}
.ib{width:42px;height:42px;border-radius:50%;background:var(--inner);display:flex;align-items:center;justify-content:center;flex:none;}
.ib[disabled]{opacity:0.35;pointer-events:none;}
.sbox{flex:1;max-width:540px;height:48px;border-radius:999px;background:var(--inner);display:flex;align-items:center;gap:10px;padding:0 8px 0 16px;min-width:0;box-shadow:inset 0 0 0 1px transparent;transition:box-shadow 200ms ease;}
.sbox:focus-within{box-shadow:inset 0 0 0 2px var(--fg);}
.sbox ha-icon{color:var(--fg2);}
.sbox input{flex:1;min-width:0;height:100%;border:none;outline:none;background:transparent;font-size:17px;letter-spacing:-0.01em;}
.sbox input::placeholder{color:var(--fg3);}
.sbox .x{width:34px;height:34px;border-radius:50%;display:none;align-items:center;justify-content:center;color:var(--fg2);}
.sbox.has .x{display:flex;}
.dlb{margin-left:auto;height:42px;padding:0 16px 0 12px;border-radius:999px;background:var(--inner);display:none;align-items:center;gap:10px;font-size:14px;font-weight:600;flex:none;}
.dlb.show{display:flex;}
.tabs{display:none;}
.body{flex:1;padding:4px 22px 28px;position:relative;}
.load{padding:60px 0;text-align:center;color:var(--fg3);font-size:15px;}
.empty{padding:56px 24px;text-align:center;color:var(--fg2);display:flex;flex-direction:column;align-items:center;gap:10px;}
.empty .et{font:700 22px/1.2 var(--os-font-display,${DFONT});color:var(--fg);letter-spacing:-0.02em;}
.empty .es{font-size:15px;line-height:1.45;max-width:460px;}
.h1{font:700 32px/1.15 var(--os-font-display,${DFONT});letter-spacing:-0.025em;margin:6px 0 18px;}
.sec{margin-top:28px;}
.sec.first,.sec:first-child{margin-top:6px;}
.sh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px;}
.sh h2{font:700 22px/1.2 var(--os-font-display,${DFONT});letter-spacing:-0.02em;margin:0;}
.sh .more{font-size:14px;font-weight:700;color:var(--fg2);padding:6px 2px;}
.row{display:grid;grid-auto-flow:column;grid-auto-columns:172px;gap:4px;overflow-x:auto;margin:0 -10px;padding:0 0 4px;scroll-snap-type:x proximity;}
.cd{padding:10px;border-radius:12px;min-width:0;text-align:left;scroll-snap-align:start;}
.cd .im{width:100%;aspect-ratio:1;border-radius:8px;box-shadow:0 10px 26px -12px rgba(0,0,0,0.55);}
.cd .im ha-icon{--mdc-icon-size:40px;width:40px;height:40px;}
.cd .t{margin-top:10px;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cd .s{font-size:13px;color:var(--fg2);margin-top:3px;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.cd.now .t{color:var(--acc);}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(164px,1fr));gap:4px;margin:0 -10px;}
.qk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
.q{display:flex;align-items:center;gap:12px;height:64px;border-radius:8px;background:var(--inner);overflow:hidden;font-size:15px;font-weight:700;padding-right:12px;text-align:left;min-width:0;}
.q .im{width:64px;height:64px;}
.q span{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25;}
.q.now span{color:var(--acc);}
/* tracks */
.tl{--tc:30px minmax(0,1fr) minmax(0,0.62fr) 28px 50px;}
.tl.noal{--tc:30px minmax(0,1fr) 28px 50px;}
.th{display:grid;grid-template-columns:var(--tc);gap:14px;padding:0 12px 8px;margin-bottom:6px;border-bottom:1px solid var(--hair);font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--fg3);}
.th .d{text-align:right;}
.trk{display:grid;grid-template-columns:var(--tc);gap:14px;align-items:center;min-height:60px;padding:0 12px;border-radius:10px;cursor:pointer;}
.trk .no{font-size:15px;color:var(--fg2);text-align:center;font-variant-numeric:tabular-nums;display:flex;justify-content:center;}
.trk .ti{display:flex;align-items:center;gap:12px;min-width:0;}
.trk .ti .im{width:44px;height:44px;border-radius:6px;}
.trk .tx{min-width:0;}
.trk .tt{font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.trk .ta{font-size:13px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;display:flex;align-items:center;}
.trk .al{font-size:14px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.trk .du{font-size:14px;color:var(--fg2);text-align:right;font-variant-numeric:tabular-nums;}
.trk.now .tt,.trk.now .no{color:var(--acc);}
.trk.miss .tt{color:var(--fg2);}
.e{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;border-radius:3px;background:var(--fg3);color:var(--os-surface,#121214);font-size:10px;font-weight:800;margin-right:6px;}
:host(.lt) .e{color:#fff;}
.st{display:flex;align-items:center;justify-content:center;width:28px;height:28px;}
.st ha-icon{--mdc-icon-size:22px;width:22px;height:22px;}
.st.have{color:var(--acc);}
.st.none{color:var(--fg3);opacity:0.75;}
.st.err{color:#ff9f0a;}
.ring{width:20px;height:20px;border-radius:50%;background:conic-gradient(var(--acc) calc(var(--p,0) * 1%),var(--ph) 0);-webkit-mask:radial-gradient(circle,transparent 5.5px,#000 6px);mask:radial-gradient(circle,transparent 5.5px,#000 6px);}
.ring.q{background:conic-gradient(var(--acc) 0 22%,var(--ph) 0);animation:spin 1.1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.eq{display:flex;align-items:flex-end;gap:2px;height:14px;}
.eq i{width:3px;background:var(--acc);border-radius:1px;animation:eq 900ms ease-in-out infinite;}
.eq i:nth-child(2){animation-delay:-300ms;}.eq i:nth-child(3){animation-delay:-600ms;}
@keyframes eq{0%,100%{height:4px;}50%{height:14px;}}
.eq.paused i{animation:none;height:4px;}
/* buttons */
.acts{display:flex;align-items:center;gap:14px;margin:20px 0 18px;flex-wrap:wrap;}
.play{width:58px;height:58px;border-radius:50%;background:var(--on);color:var(--ont);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px -8px rgba(0,0,0,0.55);flex:none;}
.play ha-icon{--mdc-icon-size:32px;width:32px;height:32px;}
.pill{height:42px;padding:0 18px;border-radius:999px;background:var(--inner);font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;}
.pill ha-icon{--mdc-icon-size:20px;width:20px;height:20px;}
.pill.done{color:var(--acc);}
.pill .ring{width:18px;height:18px;}
.icb{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--fg2);}
.icb ha-icon{--mdc-icon-size:28px;width:28px;height:28px;}
.note{font-size:14px;color:var(--fg2);line-height:1.45;margin:4px 0 0;}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px;}
.chip{height:36px;padding:0 16px;border-radius:999px;background:var(--inner);font-size:14px;font-weight:600;}
.chip.on{background:var(--on);color:var(--ont);}
/* artist hero */
.hero{position:relative;margin:-4px -22px 0;height:290px;display:flex;align-items:flex-end;gap:28px;padding:0 30px 26px;overflow:hidden;color:#fff;}
.hero .bg{position:absolute;inset:-60px;background:var(--ph) center / cover no-repeat;filter:blur(46px) saturate(140%) brightness(0.7);transform:scale(1.15);}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.35) 100%);}
.hero > *:not(.bg){position:relative;z-index:1;min-width:0;}
.hero .av{width:210px;height:210px;border-radius:50%;flex:none;box-shadow:0 22px 50px -14px rgba(0,0,0,0.6);}
.hero .av ha-icon{--mdc-icon-size:70px;width:70px;height:70px;}
.hero .k{font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;}
.hero .k ha-icon{--mdc-icon-size:22px;color:#4cc2ff;}
.hero .nm{font:800 72px/1 var(--os-font-display,${DFONT});letter-spacing:-0.035em;margin:8px 0 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 24px rgba(0,0,0,0.25);}
.hero .nm.l{font-size:52px;}
.hero .fans{font-size:15px;font-weight:500;opacity:0.92;}
/* album / playlist header */
.ahd{display:flex;gap:26px;align-items:flex-end;margin:8px 0 2px;}
.ahd .cv{width:210px;height:210px;border-radius:10px;box-shadow:0 20px 50px -16px rgba(0,0,0,0.6);}
.ahd .cv ha-icon{--mdc-icon-size:64px;width:64px;height:64px;}
.ahd .tx{min-width:0;}
.ahd .k{font-size:14px;font-weight:600;}
.ahd .nm{font:800 50px/1.05 var(--os-font-display,${DFONT});letter-spacing:-0.03em;margin:8px 0 14px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.ahd .nm.l{font-size:38px;}
.meta{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--fg2);flex-wrap:wrap;}
.meta b{color:var(--fg);font-weight:700;}
.meta .av{width:26px;height:26px;border-radius:50%;}
.meta button{display:inline-flex;align-items:center;gap:8px;}
/* search */
.sr{display:grid;grid-template-columns:minmax(0,0.82fr) minmax(0,1.18fr);gap:24px;}
.top1{position:relative;padding:20px;border-radius:14px;background:var(--inner);text-align:left;min-height:236px;display:flex;flex-direction:column;justify-content:flex-start;gap:18px;width:100%;}
.top1 .im{width:100px;height:100px;border-radius:8px;box-shadow:0 10px 26px -10px rgba(0,0,0,0.5);}
.top1 > div:not(.im):not(.play){padding-right:64px;}
.top1 .nm{font:800 32px/1.1 var(--os-font-display,${DFONT});letter-spacing:-0.025em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.top1 .ty{font-size:14px;color:var(--fg2);margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.tag{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:var(--inner);color:var(--fg);font-size:12px;font-weight:700;}
.top1 .play{position:absolute;right:18px;bottom:18px;width:54px;height:54px;}
.gg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;}
.gt{position:relative;height:118px;border-radius:12px;overflow:hidden;background:var(--inner);padding:14px 16px;font:700 20px/1.15 var(--os-font-display,${DFONT});letter-spacing:-0.015em;text-align:left;}
.gt img{position:absolute;right:-14px;bottom:-10px;width:92px;height:92px;border-radius:6px;transform:rotate(24deg);box-shadow:0 8px 20px rgba(0,0,0,0.35);object-fit:cover;}
.gt span{position:relative;z-index:1;display:block;max-width:64%;text-shadow:0 1px 8px rgba(0,0,0,0.25);}
.recent{display:flex;gap:8px;flex-wrap:wrap;}
/* now playing page */
.npg{display:grid;grid-template-columns:minmax(0,400px) minmax(0,1fr);gap:34px;align-items:start;margin-top:8px;}
.npg .big{width:100%;aspect-ratio:1;border-radius:14px;box-shadow:0 30px 70px -20px rgba(0,0,0,0.65);}
.npg .big ha-icon{--mdc-icon-size:90px;width:90px;height:90px;}
.npg .tt{font:800 40px/1.1 var(--os-font-display,${DFONT});letter-spacing:-0.03em;}
.npg .ss{font-size:18px;color:var(--fg2);margin-top:8px;}
.card2{border-radius:14px;background:var(--inner);padding:16px;margin-top:18px;}
.card2 h3{margin:0 0 12px;font-size:16px;font-weight:700;}
.abt{position:relative;height:200px;border-radius:12px;overflow:hidden;background:var(--ph) center 25%/cover;display:flex;align-items:flex-end;padding:16px;color:#fff;width:100%;text-align:left;}
.abt::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,0.65));}
.abt div{position:relative;}
.abt b{display:block;font-size:22px;font-weight:800;}
/* downloads page */
.dl{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:58px;padding:0 10px;border-radius:10px;}
.dl .im{width:44px;height:44px;border-radius:6px;}
.dl .bar2{height:4px;border-radius:2px;background:var(--ph);margin-top:6px;overflow:hidden;}
.dl .bar2 i{display:block;height:100%;background:var(--acc);border-radius:2px;}
.dl .stt{font-size:13px;color:var(--fg2);white-space:nowrap;}
/* player bar */
.bar{grid-column:1 / 3;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr);align-items:center;gap:18px;padding:0 18px 0 14px;}
.np{display:flex;align-items:center;gap:14px;min-width:0;text-align:left;height:100%;}
.np .im{width:64px;height:64px;border-radius:8px;box-shadow:0 6px 18px -8px rgba(0,0,0,0.5);}
.np .tt{font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.np .ss{font-size:13px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.ctl{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;}
.btns{display:flex;align-items:center;gap:14px;}
.b{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--fg);}
.b.sm{color:var(--fg2);}
.b.sm.on{color:var(--acc);}
.b ha-icon{--mdc-icon-size:26px;width:26px;height:26px;}
.b.sm ha-icon{--mdc-icon-size:22px;width:22px;height:22px;}
.b.pp{width:52px;height:52px;background:var(--on);color:var(--ont);}
.b.pp ha-icon{--mdc-icon-size:30px;width:30px;height:30px;}
.b[disabled]{opacity:0.3;pointer-events:none;}
.prog{display:flex;align-items:center;gap:10px;width:100%;font-size:11px;font-weight:600;color:var(--fg3);font-variant-numeric:tabular-nums;}
.prog.hide{visibility:hidden;}
.sk{flex:1;height:18px;display:flex;align-items:center;cursor:pointer;touch-action:none;}
.sk i{display:block;width:100%;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--fg) var(--p,0%),var(--ph) var(--p,0%));}
.rt{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0;}
.dev{display:flex;align-items:center;gap:8px;height:42px;padding:0 14px 0 10px;border-radius:999px;background:var(--inner);font-size:14px;font-weight:600;min-width:0;max-width:210px;}
.dev span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dev ha-icon{--mdc-icon-size:20px;width:20px;height:20px;}
.dev.live{color:var(--acc);}
.gn{flex:none;font-size:12px;font-weight:700;line-height:20px;padding:0 7px;border-radius:999px;background:var(--acc);color:#fff;}
.gn:empty{display:none;}
input[type=range]{-webkit-appearance:none;appearance:none;width:120px;flex:none;height:30px;background:transparent;cursor:pointer;margin:0;}
input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:linear-gradient(90deg,var(--fg) var(--v,50%),var(--ph) var(--v,50%));}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--fg);margin-top:-6px;box-shadow:0 2px 6px rgba(0,0,0,0.35);}
input[type=range]::-moz-range-track{height:4px;border-radius:2px;background:var(--ph);}
input[type=range]::-moz-range-progress{height:4px;border-radius:2px;background:var(--fg);}
input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--fg);border:none;}
.mini{display:none;}
/* device picker */
.scrim{position:absolute;inset:0;z-index:19;display:none;}
.scrim.show{display:block;}
.pop{position:absolute;right:14px;bottom:108px;width:370px;max-height:calc(100% - 130px);display:none;flex-direction:column;border-radius:18px;background:var(--popbg);-webkit-backdrop-filter:blur(40px) saturate(170%);backdrop-filter:blur(40px) saturate(170%);box-shadow:0 30px 70px -16px rgba(0,0,0,0.6),inset 0 0 0 1px var(--hair);z-index:20;overflow:hidden;}
.pop.show{display:flex;animation:popin 220ms cubic-bezier(.2,.9,.25,1);}
@keyframes popin{from{opacity:0;transform:translateY(10px) scale(0.98);}to{opacity:1;transform:none;}}
.pop .ph{padding:18px 18px 6px;font:700 20px var(--os-font-display,${DFONT});letter-spacing:-0.015em;}
.pop .cur{display:flex;align-items:center;gap:14px;margin:6px 12px 6px;padding:12px;border-radius:12px;background:var(--inner);}
.pop .cur .ic{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--acc);color:#fff;flex:none;}
.pop .cur .n{font-size:16px;font-weight:700;color:var(--acc);}
.pop .cur .s{font-size:13px;color:var(--fg2);margin-top:2px;}
.seg{display:flex;gap:4px;margin:8px 12px 6px;padding:4px;border-radius:12px;background:var(--inner);flex:none;}
.seg button{flex:1;height:36px;border-radius:9px;font-size:14px;font-weight:600;color:var(--fg2);}
.seg button.on{background:var(--hov);color:var(--fg);box-shadow:0 1px 4px rgba(0,0,0,0.15);}
.pl{padding:4px 8px 12px;}
.spk{width:100%;display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:12px;padding:8px 10px;border-radius:10px;text-align:left;cursor:pointer;}
.spk .rt2{display:flex;align-items:center;gap:10px;}
.ck{width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--fg3);display:flex;align-items:center;justify-content:center;color:transparent;flex:none;transition:background-color 180ms ease,box-shadow 180ms ease;}
.ck ha-icon{--mdc-icon-size:18px;width:18px;height:18px;}
.ck.on{background:var(--acc);box-shadow:none;color:#fff;}
.ck.lead{opacity:0.55;pointer-events:none;}
.pop .hint{font-size:13px;color:var(--fg2);padding:2px 22px 4px;line-height:1.4;}
.spk .ic{width:40px;height:40px;border-radius:10px;background:var(--inner);display:flex;align-items:center;justify-content:center;color:var(--fg2);overflow:hidden;position:relative;}
.spk .ic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.spk .n{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.spk .s{font-size:13px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
.spk.sel .n{color:var(--acc);}
.spk.dead{opacity:0.42;}
.toast{position:absolute;left:50%;bottom:112px;transform:translate(-50%,12px);opacity:0;pointer-events:none;transition:all 260ms ease;z-index:30;max-width:min(560px,92%);
padding:12px 20px;border-radius:999px;background:var(--popbg);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);font-size:15px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,0.35),inset 0 0 0 1px var(--hair);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.toast.show{opacity:1;transform:translate(-50%,0);}
.fade{animation:fade 260ms ease;}
.sres{transition:opacity 160ms ease;}
.sres.stale{opacity:0.45;}
@keyframes fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
/* ---------- phone ---------- */
.app.nar{display:flex;flex-direction:column;height:auto;gap:10px;}
.nar .side{display:none;}
.nar .main{overflow:visible;}
.nar .top{padding:12px 12px 4px;flex-wrap:wrap;gap:8px;}
.nar .tabs{display:flex;width:100%;gap:4px;padding:4px;border-radius:14px;background:var(--inner);}
.nar .tabs button{flex:1;height:40px;border-radius:10px;font-size:15px;font-weight:700;color:var(--fg2);display:flex;align-items:center;justify-content:center;gap:6px;}
.nar .tabs button ha-icon{--mdc-icon-size:20px;width:20px;height:20px;}
.nar .tabs button.on{background:var(--hov);color:var(--fg);}
.nar .sbox{max-width:none;height:46px;}
.nar .sbox.hid{display:none;}
.nar .ib.bk{display:none;}
.nar .ib.bk.show{display:flex;}
.nar .dlb{margin-left:0;}
.nar .body{padding:4px 14px 20px;overflow:visible;}
.nar .h1{font-size:26px;margin:4px 0 14px;}
.nar .qk{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.nar .q{height:56px;font-size:14px;}
.nar .q .im{width:56px;height:56px;}
.nar .row{grid-auto-columns:140px;margin:0 -14px;padding:0 4px 4px;}
.nar .grid{grid-template-columns:repeat(2,minmax(0,1fr));}
.nar .sh h2{font-size:20px;}
.nar .gg{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.nar .gt{height:96px;font-size:17px;}
.nar .gt img{width:72px;height:72px;}
.nar .sr{grid-template-columns:minmax(0,1fr);gap:16px;}
.nar .chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-right:-14px;padding-right:14px;}
.nar .chips::-webkit-scrollbar{display:none;}
.nar .chip{flex:none;}
.nar .top1{min-height:0;}
.nar .tl{--tc:minmax(0,1fr) 28px;}
.nar .tl .no,.nar .tl .al,.nar .tl .du,.nar .th{display:none;}
.nar .trk{padding:0 6px;}
.nar .hero{margin:-4px -14px 0;height:auto;padding:28px 18px 20px;flex-direction:column;align-items:center;text-align:center;gap:16px;}
.nar .hero .av{width:170px;height:170px;}
.nar .hero .k{justify-content:center;}
.nar .hero .nm,.nar .hero .nm.l{font-size:40px;white-space:normal;}
.nar .ahd{flex-direction:column;align-items:center;text-align:center;gap:16px;}
.nar .ahd .cv{width:220px;height:220px;}
.nar .ahd .nm{font-size:30px;}
.nar .ahd .meta{justify-content:center;}
.nar .npg{grid-template-columns:minmax(0,1fr);gap:18px;}
.nar .npg .tt{font-size:28px;}
.nar .bar{display:none;}
.nar .mini{background:var(--popbg);-webkit-backdrop-filter:blur(30px) saturate(170%);backdrop-filter:blur(30px) saturate(170%);display:grid;position:sticky;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);z-index:6;grid-template-columns:48px minmax(0,1fr) 44px 48px;gap:10px;align-items:center;padding:8px 8px 10px;border-radius:14px;}
.nar .mini .im{width:48px;height:48px;border-radius:8px;}
.nar .mini .tt{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.nar .mini .ss{font-size:13px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;display:flex;align-items:center;gap:4px;}
.nar .mini .ss ha-icon{--mdc-icon-size:14px;width:14px;height:14px;}
.nar .mini .mp{position:absolute;left:12px;right:12px;bottom:3px;height:3px;border-radius:2px;background:var(--ph);overflow:hidden;}
.nar .mini .mp i{display:block;height:100%;background:var(--fg);width:0;}
.nar .mini.hide{display:none;}
.nar .pop{position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:auto;max-height:70vh;}
.nar .scrim{position:fixed;background:rgba(0,0,0,0.25);}
.nar .toast{position:fixed;bottom:auto;top:16px;}
.full{display:none;}
.nar .full{display:block;}
.full .ctl{margin-top:22px;}
.full .btns{gap:22px;justify-content:center;}
.full .vol2{display:flex;align-items:center;gap:12px;margin-top:18px;}
.full .vol2 input{flex:1;width:auto;}
`;

class OsMusic extends HTMLElement {
setConfig(c) {
if (!c || !c.config_entry_id) throw new Error("config_entry_id required");
this._c = Object.assign({ downtify: "http://192.168.6.170:8582", ma_files: "filesystem_smb--duQdqgsc" }, c);
this._dtu = String(this._c.downtify).replace(/\/+$/, "");
if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._build(); }
}
getCardSize() { return 14; }
getGridOptions() { return { columns: "full", rows: "auto" }; }
connectedCallback() {
S.cards.add(this);
this._tick = setInterval(() => this._progress(), 1000);
this._ro = this._ro || new ResizeObserver(() => this._size());
this._ro.observe(this);
this._ws();
if (this._hass) { this._renderBar(true); }
}
disconnectedCallback() {
S.cards.delete(this);
clearInterval(this._tick); clearTimeout(this._qT);
if (this._ro) this._ro.disconnect();
}
set hass(h) {
const first = !this._hass;
this._hass = h;
this.classList.toggle("lt", document.documentElement.getAttribute("data-os-mode") === "light");
this._renderBar();
if (this._popOpen) this._renderDevices();
if (first) this._boot();
}
_size() {
const nar = this.getBoundingClientRect().width < 700;
if (nar === this._nar) return;
this._nar = nar;
this.classList.toggle("nar", nar);
this.shadowRoot.getElementById("app").classList.toggle("nar", nar);
this._chrome();
}
/* ---------- players ---------- */
_players() {
const h = this._hass, c = this._c, out = [];
const names = c.names || {};
const ma = Object.keys(h.entities || {}).filter((id) => id.startsWith("media_player.") && h.entities[id].platform === "music_assistant"
&& h.states[id] && !id.includes("browser_mod") && !(c.exclude || []).includes(id));
ma.sort((a, b) => (names[a] || a).localeCompare(names[b] || b));
if (c.default_player && ma.includes(c.default_player)) { ma.splice(ma.indexOf(c.default_player), 1); ma.unshift(c.default_player); }
ma.forEach((id) => out.push({ id, kind: "ma", group: "Music", name: names[id] || h.states[id].attributes.friendly_name, icon: (c.icons || {})[id] || "mdi:speaker" }));
(c.groups || []).forEach((g) => (g.entities || []).forEach((e) => {
const id = typeof e === "string" ? e : e.entity;
if (!h.states[id]) return;
out.push({ id, kind: g.kind || "other", group: g.title, name: e.name || h.states[id].attributes.friendly_name, icon: e.icon || g.icon || "mdi:speaker" });
}));
return out;
}
_active(s) { return s && (s.state === "playing" || s.state === "paused" || s.state === "buffering"); }
_target() {
const ps = this._players(), h = this._hass;
if (this._sel && ps.some((p) => p.id === this._sel)) return ps.find((p) => p.id === this._sel);
const stored = lsGet("os-media-target", "");
const alive = (p) => p && h.states[p.id] && h.states[p.id].state !== "unavailable";
const playing = ps.find((p) => p.kind !== "tv" && h.states[p.id].state === "playing");
const st = ps.find((p) => p.id === stored);
const def = ps.find((p) => p.id === this._c.default_player);
const pick = (st && alive(st) && (h.states[st.id].state === "playing" || !playing)) ? st : playing || (alive(st) && st) || (alive(def) && def) || ps.find((p) => p.kind !== "tv" && alive(p)) || ps[0];
this._sel = pick && pick.id;
return pick;
}
_sub(p) {
const s = this._hass.states[p.id];
if (!s || s.state === "unavailable") return "Offline";
const a = s.attributes;
if (s.state === "playing" || s.state === "paused") {
const line = [a.media_title, a.media_artist].filter(Boolean).join(" · ") || a.app_name || "";
return s.state === "paused" ? "Paused" + (line ? " · " + line : "") : line || "Playing";
}
if (p.kind === "tv") return s.state === "off" || s.state === "standby" ? "Off" : a.app_name || "On";
return p.kind === "alexa" ? "Alexa · Ready" : "Ready";
}
_nowKey() {
const t = this._target(); if (!t) return "";
const s = this._hass.states[t.id]; if (!this._active(s)) return "";
return baseT(s.attributes.media_title) + "|" + norm(s.attributes.media_artist);
}
/* ---------- layout ---------- */
_build() {
this.shadowRoot.innerHTML = `<style>${CSS}</style>
<div class="app" id="app">
<div class="pane side" id="side">
<div class="nav"><button class="nv tap hv" data-act="nav" data-p="home"><ha-icon icon="mdi:home-variant-outline"></ha-icon>Home</button>
<button class="nv tap hv" data-act="nav" data-p="search"><ha-icon icon="mdi:magnify"></ha-icon>Search</button></div>
<div class="libh"><ha-icon icon="mdi:bookshelf"></ha-icon>Your Library</div>
<div class="fch" id="fch"></div>
<div class="libl scr" id="libl"><div class="load">Loading…</div></div>
</div>
<div class="pane main" id="mainp">
<div class="top" id="top">
<div class="tabs" id="tabs"><button data-act="nav" data-p="home"><ha-icon icon="mdi:home-variant-outline"></ha-icon>Home</button><button data-act="nav" data-p="search"><ha-icon icon="mdi:magnify"></ha-icon>Search</button><button data-act="nav" data-p="library"><ha-icon icon="mdi:bookshelf"></ha-icon>Library</button></div>
<button class="ib tap bk" id="back" data-act="back" aria-label="Back"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
<label class="sbox" id="sbox"><ha-icon icon="mdi:magnify"></ha-icon><input id="q" placeholder="What do you want to play?" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"><button class="x" id="qx" aria-label="Clear"><ha-icon icon="mdi:close"></ha-icon></button></label>
<button class="dlb tap" id="dlb" data-act="nav" data-p="downloads"><div class="ring" id="dlr"></div><span id="dlt"></span></button>
</div>
<div class="body scr" id="body"><div class="load">Loading…</div></div>
</div>
<div class="pane bar" id="bar">
<button class="np" data-act="nav" data-p="now"><div class="im" id="bart"></div><div style="min-width:0"><div class="tt" id="btt"></div><div class="ss" id="bss"></div></div></button>
<div class="ctl"><div class="btns">
<button class="b sm" data-act="shuffle" id="shuf" aria-label="Shuffle"><ha-icon icon="mdi:shuffle-variant"></ha-icon></button>
<button class="b" data-act="prev" id="prev" aria-label="Previous"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
<button class="b pp" data-act="pp" id="pp" aria-label="Play or pause"><ha-icon icon="mdi:play"></ha-icon></button>
<button class="b" data-act="next" id="next" aria-label="Next"><ha-icon icon="mdi:skip-next"></ha-icon></button>
<button class="b sm" data-act="repeat" id="rep" aria-label="Repeat"><ha-icon icon="mdi:repeat"></ha-icon></button></div>
<div class="prog" id="prog"><span id="pos">0:00</span><div class="sk" data-seek="1"><i id="fill"></i></div><span id="dur">0:00</span></div></div>
<div class="rt"><button class="dev tap" data-act="devices" id="devb"><ha-icon icon="mdi:speaker"></ha-icon><span id="devn"></span><span id="devg" class="gn"></span></button>
<button class="b sm" data-act="mute" id="mute" aria-label="Mute"><ha-icon icon="mdi:volume-high"></ha-icon></button><input type="range" id="vol" min="0" max="100" step="1" aria-label="Volume"></div>
</div>
<div class="pane mini" id="mini"><button class="im" data-act="nav" data-p="now" id="mart"></button><button style="min-width:0;text-align:left" data-act="nav" data-p="now"><div class="tt" id="mtt"></div><div class="ss" id="mss"></div></button>
<button class="b sm" data-act="devices" aria-label="Devices"><ha-icon icon="mdi:speaker-multiple"></ha-icon></button><button class="b" data-act="pp" id="mpp" aria-label="Play or pause"><ha-icon icon="mdi:play"></ha-icon></button><div class="mp"><i id="mfill"></i></div></div>
<div class="scrim" id="scrim" data-act="closepop"></div>
<div class="pop" id="pop"></div>
<div class="toast" id="toast"></div>
</div>`;
const sr = this.shadowRoot, $ = (id) => sr.getElementById(id);
sr.addEventListener("click", (e) => this._click(e));
const q = $("q");
q.addEventListener("focus", () => { if (!this._route || this._route.p !== "search") this._go({ p: "search", q: q.value.trim() }); });
q.addEventListener("input", () => {
const v = q.value.trim();
$("sbox").classList.toggle("has", !!q.value);
clearTimeout(this._deb);
this._deb = setTimeout(() => { if (this._route && this._route.p === "search") { this._route.q = v; this._route.f = this._route.f || "all"; this._render(); } else this._go({ p: "search", q: v }); }, 250);
});
q.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(this._deb); this._remember(q.value.trim()); this._route = { p: "search", q: q.value.trim(), f: (this._route && this._route.f) || "all" }; this._render(); q.blur(); } });
$("qx").addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); q.value = ""; $("sbox").classList.remove("has"); this._go({ p: "search", q: "" }, { replace: true }); q.focus(); });
const vol = $("vol");
vol.addEventListener("input", () => { vol.style.setProperty("--v", vol.value + "%"); this._volBusy = Date.now(); clearTimeout(this._vt); this._vt = setTimeout(() => this._svc("volume_set", { volume_level: vol.value / 100 }), 220); });
sr.addEventListener("pointerdown", (e) => { const sk = e.target.closest("[data-seek]"); if (sk) this._seek(e, sk); });
sr.addEventListener("input", (e) => { if (e.target.id === "vol2") { const v = e.target; v.style.setProperty("--v", v.value + "%"); this._volBusy = Date.now(); clearTimeout(this._vt); this._vt = setTimeout(() => this._svc("volume_set", { volume_level: v.value / 100 }), 220); } });
this._fil = lsGet("os-music-lib", "playlist");
this._hist = [];
}
_chrome() {
const sr = this.shadowRoot; if (!sr) return;
const r = this._route || { p: "home" };
const navP = r.p === "search" ? "search" : r.p === "home" ? "home" : r.p === "library" ? "library" : "";
sr.querySelectorAll("[data-act=nav][data-p]").forEach((b) => { if (b.closest(".nav,.tabs")) b.classList.toggle("on", b.dataset.p === navP); });
sr.querySelectorAll(".nav .nv").forEach((b) => { const ic = b.querySelector("ha-icon"); if (b.dataset.p === "home") ic.setAttribute("icon", navP === "home" ? "mdi:home-variant" : "mdi:home-variant-outline"); });
const bk = sr.getElementById("back");
bk.toggleAttribute("disabled", !this._hist.length);
bk.classList.toggle("show", !!this._hist.length && !["home", "search", "library"].includes(r.p));
sr.getElementById("sbox").classList.toggle("hid", !!this._nar && r.p !== "search");
const q = sr.getElementById("q");
if (r.p === "search" && sr.activeElement !== q && q.value.trim() !== (r.q || "")) { q.value = r.q || ""; sr.getElementById("sbox").classList.toggle("has", !!q.value); }
if (r.p !== "search" && sr.activeElement !== q && q.value) { q.value = ""; sr.getElementById("sbox").classList.remove("has"); }
}
/* ---------- boot / data ---------- */
async _boot() {
this._size();
this._go({ p: "home" }, { replace: true });
this._renderLib();
this._files(true).then(() => this._paintStatus());
}
async _ma(service, data) {
const r = await this._hass.callWS({ type: "call_service", domain: "music_assistant", service, service_data: Object.assign({ config_entry_id: this._c.config_entry_id }, data), return_response: true });
return r && r.response;
}
async _lib(type, opts) {
const key = type + JSON.stringify(opts || {});
this._libc = this._libc || {};
const c = this._libc[key];
if (c && Date.now() - c.t < 180000) return c.p;
const p = this._ma("get_library", Object.assign({ media_type: type, limit: 50 }, opts || {})).then((r) => {
const items = (r && r.items) || [];
if (type === "playlist") {
const n = {}; items.forEach((i) => { if (i.image) n[i.image] = (n[i.image] || 0) + 1; });
let add = false; Object.keys(n).forEach((k) => { if (n[k] >= 3 && !S.logos.has(k)) { S.logos.add(k); add = true; } });
if (add) lsSet("os-music-logos", JSON.stringify([...S.logos].slice(-20)));
}
items.forEach((i) => { if (i.image && S.logos.has(i.image)) { i.image = ""; i._ic = plIcon(i.name); } });
return items;
});
this._libc[key] = { t: Date.now(), p };
p.catch(() => { delete this._libc[key]; });
return p;
}
async _favs() {
if (window.__osFav !== undefined && window.__osFav !== null) return window.__osFav;
try { const r = await this._lib("track", { favorite: true, limit: 1 }); window.__osFav = !!r.length; } catch (e) { window.__osFav = false; }
return window.__osFav;
}
async _browse(id, type) {
return this._hass.callWS({ type: "media_player/browse_media", entity_id: this._maAny(), media_content_id: id, media_content_type: type || "music" });
}
_maAny() {
const ps = this._players().filter((p) => p.kind === "ma");
const t = this._target();
return (t && t.kind === "ma" ? t.id : null) || (ps.find((p) => this._hass.states[p.id].state !== "unavailable") || ps[0] || {}).id;
}
/* Downtify 3 refuses POSTs and its live feed from other web pages (CSRF protection), so changes go through a
   Home Assistant rest_command ("rest_command.downtify") when it exists; HA calls Downtify server-side. */
async _post(path, body) {
const [dom, svc] = String(this._c.downtify_relay || "rest_command.downtify").split(".");
const sv = this._hass && this._hass.services;
if (dom && svc && sv && sv[dom] && sv[dom][svc]) { await this._hass.callService(dom, svc, { path, body: JSON.stringify(body) }); return true; }
const r = await fetch(this._dtu + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
if (!r.ok) throw new Error("Downtify " + r.status);
return true;
}
async _dt(path, opts) {
const r = await fetch(this._dtu + path, opts);
if (!r.ok) throw new Error("Downtify " + r.status);
const ct = r.headers.get("content-type") || "";
return ct.includes("json") ? r.json() : r.text();
}
async _files(force) {
if (!force && S.files && Date.now() - S.filesAt < 60000) return S.files;
if (S.filesP) return S.filesP;
S.filesP = this._dt("/list").then((list) => {
S.files = Array.isArray(list) ? list : [];
S.filesAt = Date.now();
const idx = new Map();
S.files.forEach((path) => {
const name = path.split("/").pop().replace(/\.[a-z0-9]+$/i, "");
const i = name.indexOf(" - ");
const art = i > 0 ? name.slice(0, i) : "", ttl = i > 0 ? name.slice(i + 3) : name;
const e = { path, a: splitArtists(art), t: norm(ttl), root: !path.includes("/") };
[baseT(ttl), norm(ttl)].forEach((k) => { if (!k) return; const l = idx.get(k) || []; if (!l.includes(e)) l.push(e); idx.set(k, l); });
});
S.idx = idx;
return S.files;
}).catch(() => { S.filesAt = Date.now() - 45000; return S.files || []; }).finally(() => { S.filesP = null; });
return S.filesP;
}
_have(m) {
if (!m) return null;
if (m.uri) return m.uri;
if (!S.idx || !S.idx.size) return null;
const an = splitArtists(m.artist), keys = [baseT(m.title), norm(m.title)];
let best = null;
keys.forEach((k) => (S.idx.get(k) || []).forEach((e) => {
const ok = !an.length || !e.a.length || e.a.some((x) => an.includes(x)) || an.some((x) => e.a.join(" ").includes(x));
if (ok && (!best || (e.root && !best.root))) best = e;
}));
return best ? this._fileUri(best.path) : null;
}
_fileUri(path) { return this._c.ma_files ? `${this._c.ma_files}://track/${path}` : `${this._dtu}/downloads/${path.split("/").map(encodeURIComponent).join("/")}`; }
_httpUri(uri) { const pre = (this._c.ma_files || "") + "://track/"; return uri && uri.startsWith(pre) ? `${this._dtu}/downloads/${uri.slice(pre.length).split("/").map(encodeURIComponent).join("/")}` : uri; }
_job(m) { return m && m.dzid ? this._jobFor(m.dzid) : null; }
/* A song can have two jobs: its normal one ("dz<id>", maybe deep in the backlog) and a priority one ("dzp<id>") */
_jobFor(dzid) {
const a = S.jm.get("dzp" + dzid), b = S.jm.get("dz" + dzid);
if (!a || !b) return a || b || null;
const rank = { done: 4, downloading: 3, queued: 2, error: 1 };
return (rank[a.status] || 0) >= (rank[b.status] || 0) ? a : b;
}
_status(m) {
if (this._have(m)) return { k: "have" };
const j = this._job(m);
if (j) { if (j.status === "error") return { k: "err" }; if (j.status === "downloading") return { k: "dl", p: Math.round(j.progress || 0) }; if (j.status === "queued") return { k: "q" }; if (j.status === "done") return { k: "have" }; }
return { k: m && m.dzid ? "none" : "have" };
}
_stHtml(st) {
if (st.k === "have") return `<ha-icon icon="mdi:arrow-down-circle"></ha-icon>`;
if (st.k === "dl") return `<div class="ring" style="--p:${st.p}"></div>`;
if (st.k === "q") return `<div class="ring q"></div>`;
if (st.k === "err") return `<ha-icon icon="mdi:alert-circle-outline"></ha-icon>`;
return `<ha-icon icon="mdi:arrow-down-circle-outline"></ha-icon>`;
}
/* ---------- models ---------- */
_mDz(t, al, ctx) {
const a = t.album || al || {};
const art = t.artist || (al && al.artist) || {};
const own = ctx && ctx.id && ((t.artist && t.artist.id === ctx.id) || (t.contributors || []).some((c) => c.id === ctx.id));
return { dzid: t.id, dz: t, al: a, title: t.title, artist: art.name || "", artistId: own ? ctx.id : art.id, artistName: own ? ctx.name : art.name || "", album: a.title || "", albumId: a.id, art: a.cover_medium || a.cover_big || (al && (al.cover_medium || al.cover_big)) || "", dur: t.duration || 0, explicit: !!t.explicit_lyrics, pos: t.track_position };
}
_mBrowse(c) {
const s = String(c.title || ""), i = s.indexOf(" - ");
return { uri: c.media_content_id, title: i > 0 ? s.slice(i + 3) : s, artist: i > 0 ? s.slice(0, i).replace(/\//g, ", ") : "", art: c.thumbnail || "", dur: 0 };
}
_img(src, round, icon) {
return `<div class="im${round ? " r" : ""}"><ha-icon icon="${icon || "mdi:music-note-outline"}"></ha-icon>${src ? `<img src="${esc(this._imgUrl(src))}" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</div>`;
}
_imgUrl(u) { return String(u).replace(/size=0(?=$|&)/, "size=256"); }
/* ---------- navigation ---------- */
_go(route, opts) {
opts = opts || {};
if (this._route && !opts.replace) {
const same = JSON.stringify(this._route) === JSON.stringify(route);
if (same && !opts.force) { const b = this.shadowRoot.getElementById("body"); b.scrollTo({ top: 0, behavior: "smooth" }); return; }
this._route.sy = this._scrollY();
this._hist.push(this._route);
if (this._hist.length > 30) this._hist.shift();
}
if (["home", "library"].includes(route.p)) this._hist = [];
if (route.p === "search" && this._route && this._route.p === "search") this._hist.pop();
this._route = route;
if (route.p !== "search") { const q = this.shadowRoot.getElementById("q"); if (this.shadowRoot.activeElement === q) q.blur(); }
this._render();
}
_back() {
const r = this._hist.pop(); if (!r) return;
this._route = r; this._render(r.sy || 0);
}
_scrollY() { return this._nar ? window.scrollY : this.shadowRoot.getElementById("body").scrollTop; }
async _render(restoreY) {
const body = this.shadowRoot.getElementById("body"), r = this._route;
const tok = (this._tok = (this._tok || 0) + 1);
this._chrome();
this._lists = {};
const prevRes = r.p === "search" ? body.querySelector(".sres") : null;
const ph = setTimeout(() => { if (tok !== this._tok) return; if (prevRes && prevRes.isConnected) prevRes.classList.add("stale"); else body.innerHTML = `<div class="load">Loading…</div>`; }, 140);
let html;
try {
html = await ({ home: () => this._pHome(), search: () => this._pSearch(r), library: () => this._pLibrary(), artist: () => this._pArtist(r), album: () => this._pAlbum(r), maalbum: () => this._pMaAlbum(r), playlist: () => this._pPlaylist(r), genre: () => this._pGenre(r), now: () => this._pNow(), downloads: () => this._pDownloads(), maartist: () => this._pMaArtist(r) }[r.p] || (() => this._pHome()))();
} catch (e) {
html = `<div class="empty"><div class="et">Something went wrong</div><div class="es">${esc((e && e.message) || "Please try again in a moment.")}</div><button class="chip on tap" data-act="retry">Try again</button></div>`;
}
clearTimeout(ph);
if (tok !== this._tok) return;
body.innerHTML = prevRes && /class="sres"/.test(html) ? html : `<div class="fade">${html}</div>`;
if (this._nar) { if (restoreY != null) window.scrollTo(0, restoreY); else if (r.p !== "search") { const top = this.getBoundingClientRect().top + window.scrollY - 80; if (window.scrollY > top) window.scrollTo(0, Math.max(0, top)); } }
else body.scrollTop = restoreY || 0;
this._paintStatus();
this._afterRender && this._afterRender();
this._afterRender = null;
}
/* ---------- sidebar / library ---------- */
async _renderLib() {
const el = this.shadowRoot.getElementById("libl"), fch = this.shadowRoot.getElementById("fch");
const F = [["playlist", "Playlists"], ["artist", "Artists"], ["album", "Albums"], ["radio", "Radio"]];
fch.innerHTML = F.map(([k, n]) => `<button class="fc tap ${k === this._fil ? "on" : ""}" data-act="fil" data-k="${k}">${n}</button>`).join("");
try {
const html = await this._libHtml(this._fil);
el.innerHTML = html;
} catch (e) { el.innerHTML = `<div class="load">Music Assistant isn't responding.</div>`; }
}
async _libHtml(type, big) {
let items = await this._lib(type, { limit: type === "radio" ? 40 : 80, order_by: type === "radio" ? "last_played_desc" : "name" });
if (type === "playlist") { const fav = await this._favs(); if (!fav) items = items.filter((i) => !/favorit/i.test(i.name || "")); }
if (!items.length) return `<div class="load" style="padding:30px 12px">${type === "radio" ? "No saved stations yet. Search for one." : "Nothing here yet. Search for music to add some."}</div>`;
const nk = this._nowKey();
return items.map((i) => {
const artist = (i.artists || []).map((a) => a.name).join(", ");
const sub = { playlist: "Playlist" + (i.owner ? " · " + i.owner : ""), artist: "Artist", album: "Album" + (artist ? " · " + artist : ""), radio: "Radio station" }[type];
const cur = type === "album" && nk && false;
return `<button class="li tap hv${cur ? " cur" : ""}" data-act="ma" data-type="${type}" data-uri="${esc(i.uri)}" data-name="${esc(i.name)}" data-artist="${esc(artist)}" data-img="${esc(i.image || "")}">${this._img(i.image, type === "artist", i._ic || { playlist: "mdi:playlist-music", artist: "mdi:account-music-outline", album: "mdi:album", radio: "mdi:radio" }[type])}<div style="min-width:0"><div class="n">${esc(i.name)}</div><div class="s">${esc(sub)}</div></div><span></span></button>`;
}).join("");
}
async _pLibrary() {
const F = [["playlist", "Playlists"], ["artist", "Artists"], ["album", "Albums"], ["radio", "Radio"]];
return `<div class="h1">Your Library</div><div class="chips">${F.map(([k, n]) => `<button class="chip tap ${k === this._fil ? "on" : ""}" data-act="fil" data-k="${k}">${n}</button>`).join("")}</div><div class="libl">${await this._libHtml(this._fil, true)}</div>`;
}
/* ---------- pages ---------- */
_sec(title, inner, more) {
return `<div class="sec"><div class="sh"><h2>${esc(title)}</h2>${more ? `<button class="more tap" ${more}>Show all</button>` : ""}</div>${inner}</div>`;
}
_cardMa(i, type) {
const artist = (i.artists || []).map((a) => a.name).join(", ");
const sub = { album: artist || "Album", playlist: "Playlist", artist: "Artist", radio: "Radio" }[type] || artist;
return `<button class="cd tap hv" data-act="ma" data-type="${type}" data-uri="${esc(i.uri)}" data-name="${esc(i.name)}" data-artist="${esc(artist)}" data-img="${esc(i.image || "")}">${this._img(i.image, type === "artist", i._ic || { playlist: "mdi:playlist-music", artist: "mdi:account-music-outline", album: "mdi:album", radio: "mdi:radio" }[type])}<div class="t">${esc(i.name)}</div><div class="s">${esc(sub)}</div></button>`;
}
_cardDzAlbum(a, sub) {
return `<button class="cd tap hv" data-act="album" data-id="${a.id}">${this._img(a.cover_medium || a.cover_big, false, "mdi:album")}<div class="t">${esc(a.title)}</div><div class="s">${esc(sub != null ? sub : (a.artist && a.artist.name) || "")}</div></button>`;
}
_cardDzArtist(a) {
return `<button class="cd tap hv" data-act="artist" data-id="${a.id}">${this._img(a.picture_medium || a.picture_big, true, "mdi:account-music-outline")}<div class="t">${esc(a.name)}</div><div class="s">Artist</div></button>`;
}
_cardTrack(lid, i, m) {
return `<button class="cd tap hv trk2" data-act="track" data-l="${lid}" data-i="${i}">${this._img(m.art, false)}<div class="t">${esc(m.title)}</div><div class="s">${esc(m.artist)}</div></button>`;
}
async _pHome() {
const [recA, recP, artists, added, radio, chart, fav] = await Promise.all([
this._lib("album", { limit: 12, order_by: "last_played_desc" }).catch(() => []),
this._lib("playlist", { limit: 8, order_by: "last_played_desc" }).catch(() => []),
this._lib("artist", { limit: 14, order_by: "last_played_desc" }).catch(() => []),
this._lib("album", { limit: 14, order_by: "timestamp_added_desc" }).catch(() => []),
this._lib("radio", { limit: 14, order_by: "last_played_desc" }).catch(() => []),
dz("chart/0/tracks?limit=20").then((r) => r.data || []).catch(() => []),
this._favs(),
]);
const pls = recP.filter((p) => fav || !/favorit/i.test(p.name || ""));
const quick = [];
for (let i = 0; quick.length < 8 && (i < recA.length || i < pls.length); i++) { if (recA[i]) quick.push(["album", recA[i]]); if (pls[i] && quick.length < 8) quick.push(["playlist", pls[i]]); }
let html = `<div class="h1">${greet()}</div>`;
if (quick.length) html += `<div class="qk">${quick.map(([t, i]) => `<button class="q tap hv" data-act="ma" data-type="${t}" data-uri="${esc(i.uri)}" data-name="${esc(i.name)}" data-artist="${esc((i.artists || []).map((a) => a.name).join(", "))}" data-img="${esc(i.image || "")}">${this._img(i.image, false, i._ic || (t === "album" ? "mdi:album" : "mdi:playlist-music"))}<span>${esc(i.name)}</span></button>`).join("")}</div>`;
if (recA.length) html += this._sec("Jump back in", `<div class="row">${recA.map((i) => this._cardMa(i, "album")).join("")}</div>`);
if (chart.length) { const lid = this._list(chart.map((t) => this._mDz(t))); html += this._sec("Popular right now", `<div class="row">${this._lists[lid].map((m, i) => this._cardTrack(lid, i, m)).join("")}</div>`); }
const arts = artists.filter((a) => !/\//.test(a.name));
if (arts.length) { html += this._sec("Your artists", `<div class="row" id="homeart">${arts.map((i) => this._cardMa(i, "artist")).join("")}</div>`, `data-act="fil" data-k="artist" data-go="1"`); this._afterRender = () => this._fillArtistPics(); }
if (added.length) html += this._sec("Recently added", `<div class="row">${added.map((i) => this._cardMa(i, "album")).join("")}</div>`, `data-act="fil" data-k="album" data-go="1"`);
if (radio.length) html += this._sec("Radio", `<div class="row">${radio.map((i) => this._cardMa(i, "radio")).join("")}</div>`, `data-act="fil" data-k="radio" data-go="1"`);
if (!quick.length && !chart.length) html += `<div class="empty"><div class="et">Find something to play</div><div class="es">Search for any song, artist or album. If it isn't downloaded yet, it's fetched for you automatically.</div><button class="chip on tap" data-act="nav" data-p="search">Search</button></div>`;
return html;
}
async _fillArtistPics() {
const row = this.shadowRoot.getElementById("homeart"); if (!row) return;
const btns = [...row.querySelectorAll(".cd")].filter((b) => !b.dataset.img).slice(0, 14);
for (const b of btns) {
try {
const r = await dz("search/artist?q=" + encodeURIComponent(b.dataset.name) + "&limit=1", 7 * 864e5);
const a = r.data && r.data[0];
if (a && norm(a.name) === norm(b.dataset.name) && b.isConnected) { const im = b.querySelector(".im"); im.insertAdjacentHTML("beforeend", `<img src="${esc(a.picture_medium)}" onerror="this.remove()">`); }
} catch (e) {}
}
}
_list(models) { const id = "l" + (this._lseq = (this._lseq || 0) + 1); this._lists[id] = models; return id; }
_rows(lid, opts) {
opts = opts || {};
const ms = this._lists[lid], nk = this._nowKey();
const head = opts.head === false ? "" : `<div class="th"><div style="text-align:center">#</div><div>Title</div>${opts.album === false ? "" : "<div>Album</div>"}<div></div><div class="d"><ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:16px;width:16px;height:16px"></ha-icon></div></div>`;
return `<div class="tl${opts.album === false ? " noal" : ""}">${head}${ms.map((m, i) => {
const now = nk && nk === baseT(m.title) + "|" + norm(m.artist);
const no = now ? `<div class="eq"><i></i><i></i><i></i></div>` : (opts.num === "pos" && m.pos ? m.pos : i + 1);
return `<div class="trk hv${now ? " now" : ""}" data-act="track" data-l="${lid}" data-i="${i}">
<div class="no">${no}</div>
<div class="ti">${opts.art === false ? "" : this._img(m.art, false)}<div class="tx"><div class="tt">${esc(m.title)}</div><div class="ta">${m.explicit ? '<span class="e">E</span>' : ""}<span style="overflow:hidden;text-overflow:ellipsis">${esc(m.artist)}</span></div></div></div>
${opts.album === false ? "" : `<div class="al">${esc(m.album || "")}</div>`}
<div class="st" data-st="1"></div><div class="du">${m.dur ? ftime(m.dur) : ""}</div></div>`;
}).join("")}</div>`;
}
_paintStatus() {
const sr = this.shadowRoot; if (!sr || !this._lists) return;
sr.querySelectorAll(".trk[data-l]").forEach((row) => {
const m = (this._lists[row.dataset.l] || [])[+row.dataset.i]; if (!m) return;
const st = this._status(m), cell = row.querySelector("[data-st]");
row.classList.toggle("miss", st.k !== "have");
if (!cell) return;
const k = st.k + (st.p != null ? st.p : "");
if (cell.dataset.k === k) return;
cell.dataset.k = k; cell.className = "st " + (st.k === "dl" || st.k === "q" ? "" : st.k); cell.innerHTML = this._stHtml(st);
});
sr.querySelectorAll("[data-pill]").forEach((el) => this._paintPill(el));
this._paintDlb();
}
_dlRemember(key, dzids) { this._pillSets = this._pillSets || {}; this._pillSets[key] = dzids; }
_paintPill(el) {
const key = el.dataset.pill;
if (key.startsWith("artist")) {
const id = +key.slice(6), name = norm((this._pillArtist || {})[key] || "");
const mine = []; S.jm.forEach((j) => { if (j.song && norm(j.song.album_artist) === name) mine.push(j); });
const left = mine.filter((j) => j.status === "queued" || j.status === "downloading").length;
const done = mine.filter((j) => j.status === "done").length;
let html, cls = "pill tap";
if (left || (S.restBusy && S.restBusy[id])) html = `<div class="ring" style="--p:${mine.length ? Math.round((done / mine.length) * 100) : 0}"></div>${left ? `Downloading · ${left} left` : "Finding songs…"}`;
else if (S.artists[id]) { html = `<ha-icon icon="mdi:arrow-down-circle"></ha-icon>Downloaded`; cls += " done"; }
else html = `<ha-icon icon="mdi:arrow-down-circle-outline"></ha-icon>Download all`;
if (el.innerHTML !== html) el.innerHTML = html;
el.className = cls;
return;
}
const ids = (this._pillSets || {})[key] || [];
if (!ids.length) return;
let have = 0, busy = 0;
ids.forEach((m) => { const st = this._status(m); if (st.k === "have") have++; else if (st.k === "dl" || st.k === "q") busy++; });
let html, cls = "pill tap";
if (have === ids.length) { html = `<ha-icon icon="mdi:arrow-down-circle"></ha-icon>Downloaded`; cls += " done"; }
else if (busy) html = `<div class="ring" style="--p:${Math.round((have / ids.length) * 100)}"></div>Downloading ${have} of ${ids.length}`;
else html = `<ha-icon icon="mdi:arrow-down-circle-outline"></ha-icon>${have ? `Download the rest (${ids.length - have})` : "Download"}`;
if (el.innerHTML !== html) el.innerHTML = html;
el.className = cls;
}
_paintDlb() {
const sr = this.shadowRoot, b = sr && sr.getElementById("dlb"); if (!b) return;
/* Counts are exact only after the Downloads page has fetched the whole queue; otherwise the live feed shows activity */
let left = 0, cur = null;
const known = Date.now() - S.qAt < 10 * 60000;
S.jm.forEach((j) => { if (j.status === "queued" || j.status === "downloading") { left++; if (j.status === "downloading" && (!cur || (j.progress || 0) > (cur.progress || 0))) cur = j; } });
const busy = Date.now() - S.lastAct < 90000;
b.classList.toggle("show", busy || (known && left > 0) || (this._route && this._route.p === "downloads"));
sr.getElementById("dlt").textContent = known && left ? `Downloading · ${fnum(left)} left` : busy ? "Downloading" : "Downloads";
const ring = sr.getElementById("dlr");
ring.className = busy && !cur ? "ring q" : "ring";
ring.style.setProperty("--p", cur ? Math.round(cur.progress || 0) : busy ? 0 : 100);
}
/* search */
_remember(q) { if (!q || q.length < 2) return; const r = lsJson("os-music-recent", []).filter((x) => x.toLowerCase() !== q.toLowerCase()); r.unshift(q); lsSet("os-music-recent", JSON.stringify(r.slice(0, 8))); }
async _pSearch(r) {
const q = (r.q || "").trim();
if (!q) {
const rec = lsJson("os-music-recent", []);
const genres = await dz("genre", 864e5).then((x) => (x.data || []).filter((g) => g.id !== 0)).catch(() => []);
let html = "";
if (rec.length) html += `<div class="sec first"><div class="sh"><h2>Recent searches</h2><button class="more tap" data-act="clrrecent">Clear</button></div><div class="recent">${rec.map((x) => `<button class="chip tap" data-act="q" data-q="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>`;
html += `<div class="sec${rec.length ? "" : " first"}"><div class="sh"><h2>Browse all</h2></div><div class="gg">${genres.map((g) => `<button class="gt tap" data-act="genre" data-id="${g.id}" data-name="${esc(g.name)}"><span>${esc(g.name)}</span><img src="${esc(g.picture_medium)}" loading="lazy" onerror="this.remove()"></button>`).join("")}</div></div>`;
return html;
}
const f = r.f || "all", enc = encodeURIComponent(q);
const chips = [["all", "All"], ["song", "Songs"], ["artist", "Artists"], ["album", "Albums"], ["radio", "Radio"]].map(([k, n]) => `<button class="chip tap ${k === f ? "on" : ""}" data-act="sf" data-k="${k}">${n}</button>`).join("");
if (f === "radio") {
const res = await this._ma("search", { name: q, media_type: ["radio"], limit: 24 }).catch(() => null);
const items = (res && res.radio) || [];
return `<div class="chips">${chips}</div>` + (items.length ? `<div class="grid">${items.map((i) => this._cardMa(i, "radio")).join("")}</div>` : `<div class="empty"><div class="et">No stations found</div><div class="es">Try a station name or a style like “jazz” or “news”.</div></div>`);
}
const qn = norm(q);
let errs = 0;
const soft = (pr) => pr.then((x) => (x && x.data) || []).catch(() => { errs++; return []; });
const wantAl = f === "all" || f === "album";
const [tr, ar, al, alias, idx, lib] = await Promise.all([
soft(dz(`search/track?q=${enc}&limit=${f === "song" ? 50 : 25}`)),
soft(dz(`search/artist?q=${enc}&limit=25`)),
wantAl ? soft(dz(`search/album?q=${enc}&limit=${f === "album" ? 40 : 15}`)) : [],
ALIAS[qn] ? soft(dz(`search/artist?q=${encodeURIComponent(ALIAS[qn])}&limit=3`)) : [],
this._aidx(),
this._libNames(),
]);
if (errs >= 2 && !tr.length && !ar.length) throw new Error("Can't reach the music catalog right now");
const artists = rankArtists(qn, { ar: ar.concat(alias), tr, idx, lib, picks: S.picks });
const lead = artists[0] && artists[0].m >= 56 ? artists[0] : null;
const ranked = rankTracks(qn, tr, lead && lead.a.id);
const top = chooseTop(artists, ranked);
const topA = top && top.kind === "artist" ? top.c.a : null;
/* When you're typing an artist's name, show their hits and albums like Spotify does */
const focus = topA && !(ranked[0] && ranked[0].ti >= 82);
const [info, hits, disc] = topA ? await Promise.all([
topA.nb_fan == null || !topA.picture_medium ? dz(`artist/${topA.id}`, 864e5).catch(() => null) : null,
focus && f !== "album" ? soft(dz(`artist/${topA.id}/top?limit=5`)) : [],
focus && wantAl ? soft(dz(`artist/${topA.id}/albums?limit=25`)) : [],
]) : [null, [], []];
if (info) { if (info.nb_fan != null) topA.nb_fan = info.nb_fan; if (!topA.picture_medium) topA.picture_medium = info.picture_medium; }
const seenT = new Set(), songs = [];
hits.concat(ranked.map((x) => x.t)).forEach((t) => { if (t && !seenT.has(t.id)) { seenT.add(t.id); songs.push(t); } });
const seenA = new Set(), albs = [];
al.concat(disc.filter((x) => x.record_type === "album" || x.record_type === "ep").slice(0, 8)).forEach((x) => { if (x && !seenA.has(x.id)) { seenA.add(x.id); albs.push(x); } });
const albums = rankAlbums(qn, albs, topA && topA.id, focus);
if (!songs.length && !artists.length && !albums.length) return `<div class="sres"><div class="chips">${chips}</div><div class="empty"><div class="et">No results for “${esc(q)}”</div><div class="es">Check the spelling, or try fewer or different words.</div></div></div>`;
this._srA = {}; artists.forEach((c) => { this._srA[c.a.id] = c.a; });
const ctx = topA && focus ? { id: topA.id, name: topA.name } : null;
const lid = this._list(songs.map((t) => this._mDz(t, null, ctx)));
const wrap = (h) => `<div class="sres"><div class="chips">${chips}</div>${h}</div>`;
if (f === "song") return wrap(this._rows(lid));
if (f === "artist") return wrap(`<div class="grid">${artists.slice(0, 40).map((c) => this._cardDzArtist(c.a)).join("")}</div>`);
if (f === "album") return wrap(`<div class="grid">${albums.map((x) => this._cardDzAlbum(x, `${(x.artist && x.artist.name) || ""}`)).join("")}</div>`);
let topH = "";
if (topA) topH = `<button class="top1 tap" data-act="artist" data-id="${topA.id}">${this._img(topA.picture_medium, true, "mdi:account-music-outline")}<div><div class="nm">${esc(topA.name)}</div><div class="ty"><span class="tag">Artist</span>${topA.nb_fan ? fnum(topA.nb_fan) + " fans" : ""}</div></div><div class="play" data-act="artistplay" data-id="${topA.id}"><ha-icon icon="mdi:play"></ha-icon></div></button>`;
else if (songs.length) { const m = this._lists[lid][0]; topH = `<button class="top1 tap" data-act="track" data-l="${lid}" data-i="0">${this._img(m.art, false)}<div><div class="nm">${esc(m.title)}</div><div class="ty"><span class="tag">Song</span>${m.explicit ? '<span class="e">E</span>' : ""}${esc(m.artist)}</div></div><div class="play"><ha-icon icon="mdi:play"></ha-icon></div></button>`; }
let html = `<div class="sr"><div><div class="sh"><h2>Top result</h2></div>${topH}</div><div><div class="sh"><h2>Songs</h2>${songs.length > 4 ? `<button class="more tap" data-act="sf" data-k="song">Show all</button>` : ""}</div>${this._rowsSlice(lid, 4)}</div></div>`;
if (artists.length) html += this._sec("Artists", `<div class="row">${artists.slice(0, 12).map((c) => this._cardDzArtist(c.a)).join("")}</div>`, `data-act="sf" data-k="artist"`);
if (albums.length) html += this._sec("Albums", `<div class="row">${albums.slice(0, 14).map((x) => this._cardDzAlbum(x, `${(x.release_date || "").slice(0, 4) ? (x.release_date || "").slice(0, 4) + " · " : ""}${(x.artist && x.artist.name) || ""}`)).join("")}</div>`, `data-act="sf" data-k="album"`);
return wrap(html);
}
_aidx() {
if (S.aidx) return Promise.resolve(S.aidx);
if (S.aidxP) return S.aidxP;
const mk = (v) => v.map(([id, name, pic, pop]) => ({ id, name, pic, pop, n: norm(name) }));
const c = lsJson("os-music-aidx", null);
if (c && c.v && Date.now() - c.t < 864e5) { S.aidx = mk(c.v); return Promise.resolve(S.aidx); }
S.aidxP = dz("chart/0/artists?limit=100", 864e5).then((x) => {
const v = (x.data || []).map((a, i) => [a.id, a.name, a.picture_medium, +(7.3 - i * 0.012).toFixed(3)]);
if (v.length) lsSet("os-music-aidx", JSON.stringify({ t: Date.now(), v }));
return (S.aidx = mk(v.length ? v : (c && c.v) || []));
}).catch(() => (S.aidx = mk((c && c.v) || []))).finally(() => { S.aidxP = null; });
return S.aidxP;
}
async _libNames() {
try { const items = await this._lib("artist", { limit: 300, order_by: "name" }); const set = new Set(); items.forEach((i) => String(i.name || "").split("/").forEach((x) => set.add(norm(x)))); return set; }
catch (e) { return new Set(); }
}
_notePick(a) {
if (!a || !a.id || !a.name) return;
const p = S.picks[a.id] || { c: 0 };
p.c = Math.min(9, (p.c || 0) + 1); p.name = a.name; p.pic = a.picture_medium || p.pic || ""; p.t = Date.now();
S.picks[a.id] = p;
const ks = Object.keys(S.picks);
if (ks.length > 80) ks.sort((x, y) => S.picks[x].t - S.picks[y].t).slice(0, ks.length - 80).forEach((k) => delete S.picks[k]);
lsSet("os-music-picks", JSON.stringify(S.picks));
}
_rowsSlice(lid, n) { const sub = this._list(this._lists[lid].slice(0, n)); return this._rows(sub, { head: false, album: false }); }
/* genre */
async _pGenre(r) {
const [arts, chart] = await Promise.all([dz(`genre/${r.id}/artists?limit=24`).then((x) => x.data || []).catch(() => []), dz(`chart/${r.id}/tracks?limit=10`).then((x) => x.data || []).catch(() => [])]);
let html = `<div class="h1">${esc(r.name)}</div>`;
if (chart.length) { const lid = this._list(chart.map((t) => this._mDz(t))); html += this._sec("Popular songs", this._rows(lid)); }
if (arts.length) html += this._sec("Artists", `<div class="grid">${arts.map((a) => this._cardDzArtist(a)).join("")}</div>`);
return html || `<div class="empty"><div class="et">Nothing here right now</div></div>`;
}
/* artist */
async _pArtist(r) {
const id = r.id;
const [a, top, albs, rel] = await Promise.all([dz(`artist/${id}`), dz(`artist/${id}/top?limit=10`).then((x) => x.data || []).catch(() => []), dz(`artist/${id}/albums?limit=100`).then((x) => x.data || []).catch(() => []), dz(`artist/${id}/related?limit=12`).then((x) => x.data || []).catch(() => [])]);
this._artistName = a.name; this._notePick(a);
const lid = this._list(top.map((t) => this._mDz(t, null, { id, name: a.name })));
const showAll = r.all;
const vis = this._list(this._lists[lid].slice(0, showAll ? 10 : 5));
const kind = r.disc || "album";
const albums = albs.filter((x) => x.record_type === "album" || x.record_type === "compile"), singles = albs.filter((x) => x.record_type === "single" || x.record_type === "ep");
const disc = (kind === "album" ? albums : singles).slice(0, 30);
this._pillArtist = this._pillArtist || {}; this._pillArtist["artist" + id] = a.name;
const pic = a.picture_xl || a.picture_big || "";
let html = `<div class="hero"><div class="bg" style="background-image:url('${esc(a.picture_medium || pic)}')"></div><div class="im av r">${pic ? `<img src="${esc(pic)}">` : `<ha-icon icon="mdi:account-music-outline"></ha-icon>`}</div><div><div class="k"><ha-icon icon="mdi:check-decagram"></ha-icon>Artist</div><div class="nm${(a.name || "").length > 14 ? " l" : ""}">${esc(a.name)}</div><div class="fans">${a.nb_fan ? fnum(a.nb_fan) + " fans" : ""}</div></div></div>`;
const req = S.artists[id];
html += `<div class="acts"><button class="play tap" data-act="artistplay" data-id="${id}" aria-label="Play"><ha-icon icon="mdi:play"></ha-icon></button><button class="pill tap" data-act="dlartist" data-id="${id}" data-pill="artist${id}"></button>${req ? `<span class="note">Getting all of ${esc(a.name)}'s music in the background</span>` : ""}</div>`;
html += `<div class="sec first"><div class="sh"><h2>Popular</h2></div>${this._rows(vis, { head: false, album: false })}${top.length > 5 ? `<button class="more tap" style="font-size:14px;font-weight:700;color:var(--fg2);padding:12px" data-act="artistall" data-id="${id}">${showAll ? "Show less" : "See more"}</button>` : ""}</div>`;
if (albums.length || singles.length) html += `<div class="sec"><div class="sh"><h2>Discography</h2></div><div class="chips">${albums.length ? `<button class="chip tap ${kind === "album" ? "on" : ""}" data-act="disc" data-k="album">Albums</button>` : ""}${singles.length ? `<button class="chip tap ${kind === "single" ? "on" : ""}" data-act="disc" data-k="single">Singles and EPs</button>` : ""}</div><div class="row">${disc.map((x) => this._cardDzAlbum(x, `${(x.release_date || "").slice(0, 4)} · ${RTYPE[x.record_type] || "Album"}`)).join("")}</div></div>`;
if (rel.length) html += this._sec("Fans also like", `<div class="row">${rel.map((x) => this._cardDzArtist(x)).join("")}</div>`);
return html;
}
/* album */
async _pAlbum(r) {
const al = await dz(`album/${r.id}`);
let tracks = (al.tracks && al.tracks.data) || [];
if (al.nb_tracks > tracks.length) tracks = await dz(`album/${r.id}/tracks?limit=300`).then((x) => x.data || tracks).catch(() => tracks);
const lid = this._list(tracks.map((t) => Object.assign(this._mDz(t, al), { art: "", album: al.title })));
this._dlRemember("album" + al.id, this._lists[lid]);
const yr = (al.release_date || "").slice(0, 4), art = al.artist || {};
const long = (al.title || "").length > 28;
let html = `<div class="ahd"><div class="im cv">${al.cover_xl || al.cover_big ? `<img src="${esc(al.cover_xl || al.cover_big)}">` : `<ha-icon icon="mdi:album"></ha-icon>`}</div><div class="tx"><div class="k">${esc(RTYPE[al.record_type] || "Album")}</div><div class="nm${long ? " l" : ""}">${esc(al.title)}</div>
<div class="meta"><button class="tap" data-act="artist" data-id="${art.id}">${art.picture_small ? `<img class="av" src="${esc(art.picture_small)}">` : ""}<b>${esc(art.name || "")}</b></button>${yr ? ` · ${yr}` : ""} · ${al.nb_tracks || tracks.length} songs${al.duration ? ", " + flong(al.duration) : ""}</div></div></div>`;
html += `<div class="acts"><button class="play tap" data-act="playlist" data-l="${lid}" aria-label="Play"><ha-icon icon="mdi:play"></ha-icon></button><button class="pill tap" data-act="dlalbum" data-id="${al.id}" data-pill="album${al.id}"></button></div>`;
html += this._rows(lid, { album: false, art: false, num: "pos" });
if (al.label || al.release_date) html += `<div class="note" style="margin-top:18px">${al.release_date ? new Date(al.release_date + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}${al.label ? `<br>© ${esc(al.label)}` : ""}</div>`;
return html;
}
/* Music Assistant album / playlist (already in the library) */
async _pPlaylist(r) {
const b = await this._browse(r.uri, "music");
const kids = (b.children || []).filter((c) => c.media_class === "track" || c.can_play);
const lid = this._list(kids.map((c) => this._mBrowse(c)));
const img = [r.img, b.thumbnail, kids[0] && kids[0].thumbnail].find((u) => u && !S.logos.has(u));
let html = `<div class="ahd"><div class="im cv">${img ? `<img src="${esc(this._imgUrl(img))}">` : `<ha-icon icon="${plIcon(r.name)}"></ha-icon>`}</div><div class="tx"><div class="k">${r.kind === "album" ? "Album" : "Playlist"}</div><div class="nm${(r.name || "").length > 28 ? " l" : ""}">${esc(r.name || b.title)}</div><div class="meta">${r.artist ? `<b>${esc(r.artist)}</b> · ` : ""}${kids.length} songs</div></div></div>`;
html += `<div class="acts"><button class="play tap" data-act="maplay" data-type="${r.kind || "playlist"}" data-uri="${esc(r.uri)}" data-name="${esc(r.name || "")}" aria-label="Play"><ha-icon icon="mdi:play"></ha-icon></button><button class="icb tap" data-act="mashuffle" data-type="${r.kind || "playlist"}" data-uri="${esc(r.uri)}" data-name="${esc(r.name || "")}" aria-label="Shuffle"><ha-icon icon="mdi:shuffle-variant"></ha-icon></button></div>`;
html += kids.length ? this._rows(lid, { album: false }) : `<div class="empty"><div class="es">This is empty right now.</div></div>`;
return html;
}
_pMaAlbum(r) { return this._pPlaylist(Object.assign({}, r, { kind: "album" })); }
async _pMaArtist(r) {
const res = await dz("search/artist?q=" + encodeURIComponent(r.name) + "&limit=5");
const a = (res.data || []).find((x) => norm(x.name) === norm(r.name)) || (res.data || [])[0];
if (!a) return `<div class="empty"><div class="et">${esc(r.name)}</div><div class="es">This artist isn't in the catalog.</div></div>`;
this._route = { p: "artist", id: a.id };
return this._pArtist(this._route);
}
/* now playing */
async _pNow() {
const t = this._target();
if (!t) return `<div class="empty"><div class="et">Nothing playing</div></div>`;
const s = this._hass.states[t.id], a = s.attributes, act = this._active(s);
const pic = act && (a.entity_picture_local || a.entity_picture);
let next = null;
if (t.kind === "ma" && act) { try { const q = await this._hass.callWS({ type: "call_service", domain: "music_assistant", service: "get_queue", target: { entity_id: t.id }, return_response: true }); const v = q && q.response && Object.values(q.response)[0]; next = v && v.next_item; } catch (e) {} }
let artist = null;
if (act && a.media_artist) { try { const r = await dz("search/artist?q=" + encodeURIComponent(String(a.media_artist).split(/,|\//)[0]) + "&limit=1", 864e5); artist = r.data && r.data[0]; } catch (e) {} }
let html = `<div class="npg"><div class="im big">${pic ? `<img src="${esc(pic)}">` : `<ha-icon icon="mdi:music-note-outline"></ha-icon>`}</div><div style="min-width:0">
<div class="k" style="font-size:14px;font-weight:600;color:var(--fg2)">${act ? `Playing on ${esc(t.name)}` : esc(t.name)}</div>
<div class="tt" style="margin-top:8px">${esc(act ? a.media_title || a.app_name || "Playing" : "Not playing")}</div><div class="ss">${esc(act ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") : "Pick a song to start")}</div>
<div class="full"><div class="prog" style="margin-top:20px"><span data-np="pos">0:00</span><div class="sk" data-seek="1"><i data-np="fill"></i></div><span data-np="dur">0:00</span></div>
<div class="ctl"><div class="btns"><button class="b sm" data-act="shuffle"><ha-icon icon="mdi:shuffle-variant"></ha-icon></button><button class="b" data-act="prev"><ha-icon icon="mdi:skip-previous"></ha-icon></button><button class="b pp" data-act="pp" data-np="pp"><ha-icon icon="mdi:play"></ha-icon></button><button class="b" data-act="next"><ha-icon icon="mdi:skip-next"></ha-icon></button><button class="b sm" data-act="repeat"><ha-icon icon="mdi:repeat"></ha-icon></button></div></div>
<div class="vol2"><ha-icon icon="mdi:volume-low" style="color:var(--fg2)"></ha-icon><input type="range" id="vol2" min="0" max="100" step="1" value="${a.volume_level != null ? Math.round(a.volume_level * 100) : 50}" style="--v:${a.volume_level != null ? Math.round(a.volume_level * 100) : 50}%"><ha-icon icon="mdi:volume-high" style="color:var(--fg2)"></ha-icon></div>
<button class="dev tap" data-act="devices" style="margin-top:16px"><ha-icon icon="mdi:speaker"></ha-icon><span>${esc(t.name)}</span></button></div>`;
if (next) { const mi = next.media_item || {}; html += `<div class="card2"><h3>Next up</h3><div class="li" style="cursor:default">${this._img(mi.image, false)}<div style="min-width:0"><div class="n">${esc(mi.name || next.name)}</div><div class="s">${esc((mi.artists || []).map((x) => x.name).join(", "))}</div></div><span></span></div></div>`; }
if (artist) html += `<div class="card2"><h3>About the artist</h3><button class="abt tap" data-act="artist" data-id="${artist.id}" style="background-image:url('${esc(artist.picture_big)}')"><div><b>${esc(artist.name)}</b>${artist.nb_fan ? fnum(artist.nb_fan) + " fans" : ""}</div></button></div>`;
html += `</div></div>`;
this._afterRender = () => this._progress();
return html;
}
/* downloads */
async _pDownloads() {
await this._fetchQueue(true);
const J = [...S.jm.values()];
const act = J.filter((j) => j.status === "downloading"), q = J.filter((j) => j.status === "queued"), err = J.filter((j) => j.status === "error"), done = J.filter((j) => j.status === "done").reverse();
const row = (j) => { const s = j.song || {}; const p = Math.round(j.progress || 0);
const st = j.status === "downloading" ? `<div class="stt">${p}%</div>` : j.status === "queued" ? `<div class="stt">Waiting</div>` : j.status === "error" ? `<div class="stt" style="color:#ff9f0a">Couldn't get it</div>` : `<div class="stt" style="color:var(--acc)">Done</div>`;
return `<div class="dl">${this._img(s.cover_url, false)}<div style="min-width:0"><div class="tt" style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name || "")}</div><div style="font-size:13px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((s.artists || []).join(", "))}${s.album_name ? " · " + esc(s.album_name) : ""}</div>${j.status === "downloading" ? `<div class="bar2"><i style="width:${p}%"></i></div>` : ""}</div>${st}</div>`; };
let html = `<div class="h1">Downloads</div>`;
if (!J.length) return html + `<div class="empty"><div class="et">Nothing downloading</div><div class="es">When you pick a song that isn't saved yet, its album downloads first, then the rest of the artist's music. Progress shows up here.</div></div>`;
html += `<div class="note" style="margin:-8px 0 14px">${act.length + q.length ? `${act.length + q.length} song${act.length + q.length === 1 ? "" : "s"} to go. New songs show up in your library as they finish.` : "All caught up."}</div>`;
if (act.length) html += this._sec("Downloading", act.map(row).join(""));
if (q.length) html += this._sec(`Up next · ${q.length}`, q.slice(0, 60).map(row).join("") + (q.length > 60 ? `<div class="note" style="padding:8px 10px">and ${q.length - 60} more</div>` : ""));
if (err.length) html += this._sec("Couldn't download", err.slice(0, 30).map(row).join(""));
if (done.length) html += this._sec("Finished", done.slice(0, 40).map(row).join(""));
return html;
}
/* ---------- player bar ---------- */
_renderBar(force) {
if (!this._hass || !this.shadowRoot) return;
const t = this._target(); if (!t) return;
const s = this._hass.states[t.id]; if (!s) return;
const a = s.attributes, act = this._active(s);
const pic = act && (a.entity_picture_local || a.entity_picture);
const sig = [t.id, (a.group_members || []).join(","), s.state, a.media_title, a.media_artist, pic, a.volume_level, a.is_volume_muted, a.media_duration, a.media_position, a.shuffle, a.repeat].join("|");
if (!force && sig === this._barSig) return;
const songChanged = this._barSong !== [t.id, a.media_title, a.media_artist].join("|");
this._barSong = [t.id, a.media_title, a.media_artist].join("|");
this._barSig = sig;
const sr = this.shadowRoot, $ = (id) => sr.getElementById(id);
const imgH = pic ? `<img src="${esc(pic)}" onerror="this.remove()">` : `<ha-icon icon="${t.kind === "tv" ? "mdi:television" : "mdi:music-note-outline"}"></ha-icon>`;
if ($("bart").dataset.src !== (pic || "")) { $("bart").dataset.src = pic || ""; $("bart").innerHTML = imgH; $("mart").innerHTML = imgH; }
const title = act ? a.media_title || a.app_name || t.name : "Not playing";
const sub = act ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") || (s.state === "paused" ? "Paused" : "") : s.state === "unavailable" ? `${t.name} is offline` : "Pick something to play";
$("btt").textContent = title; $("bss").textContent = sub;
$("mtt").textContent = title;
$("mss").innerHTML = act ? `<ha-icon icon="mdi:speaker" style="color:var(--acc)"></ha-icon><span style="overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>` : esc(`${t.name} · ${s.state === "unavailable" ? "offline" : "ready"}`);
const ppI = s.state === "playing" ? "mdi:pause" : "mdi:play";
sr.querySelectorAll("[data-act=pp] ha-icon").forEach((i) => i.setAttribute("icon", ppI));
["prev", "next"].forEach((b) => $(b).toggleAttribute("disabled", !act));
$("pp").toggleAttribute("disabled", s.state === "unavailable");
const isMa = t.kind === "ma";
sr.querySelectorAll("[data-act=shuffle]").forEach((b) => { b.classList.toggle("on", !!a.shuffle); b.style.visibility = isMa ? "" : "hidden"; });
sr.querySelectorAll("[data-act=repeat]").forEach((b) => { b.classList.toggle("on", !!(a.repeat && a.repeat !== "off")); b.querySelector("ha-icon").setAttribute("icon", a.repeat === "one" ? "mdi:repeat-once" : "mdi:repeat"); b.style.visibility = isMa ? "" : "hidden"; });
const dev = $("devb"); dev.classList.toggle("live", act);
dev.querySelector("ha-icon").setAttribute("icon", t.kind === "tv" ? "mdi:television" : t.kind === "alexa" ? "mdi:speaker-wireless" : t.icon || "mdi:speaker");
const gm = t.kind === "ma" ? this._groupOf(t.id).length : 0;
$("devn").textContent = t.name; $("devg").textContent = gm ? `+${gm}` : "";
const v = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
const vol = $("vol"); vol.disabled = v == null; vol.style.opacity = v == null ? 0.3 : 1;
if (v != null && (!this._volBusy || Date.now() - this._volBusy > 2000)) { vol.value = v; vol.style.setProperty("--v", v + "%"); const v2 = $("vol2"); if (v2) { v2.value = v; v2.style.setProperty("--v", v + "%"); } }
$("mute").querySelector("ha-icon").setAttribute("icon", a.is_volume_muted ? "mdi:volume-off" : v != null && v < 35 ? "mdi:volume-low" : "mdi:volume-high");
this._progress();
if (songChanged) {
const nk = this._nowKey();
sr.querySelectorAll(".trk[data-l]").forEach((row) => {
const m = (this._lists[row.dataset.l] || [])[+row.dataset.i]; if (!m) return;
const now = !!nk && nk === baseT(m.title) + "|" + norm(m.artist), was = row.classList.contains("now");
if (now === was) return;
row.classList.toggle("now", now);
const no = row.querySelector(".no"); if (no) no.innerHTML = now ? `<div class="eq"><i></i><i></i><i></i></div>` : (m.pos || +row.dataset.i + 1);
});
if (this._route && this._route.p === "now") this._render();
}
sr.querySelectorAll(".eq").forEach((e) => e.classList.toggle("paused", s.state !== "playing"));
}
_progress() {
if (!this._hass || !this.shadowRoot) return;
const t = this._target(); if (!t) return;
const s = this._hass.states[t.id]; if (!s) return;
const a = s.attributes, dur = a.media_duration, sr = this.shadowRoot, $ = (id) => sr.getElementById(id);
const on = this._active(s) && dur;
$("prog").classList.toggle("hide", !on);
let pos = a.media_position || 0;
if (s.state === "playing" && a.media_position_updated_at) pos += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
pos = Math.min(pos, dur || 0);
if (this._seekHold && Date.now() - this._seekHold.at < 2500) pos = this._seekHold.pos;
const pct = on ? ((pos / dur) * 100).toFixed(2) + "%" : "0%";
$("pos").textContent = ftime(pos); $("dur").textContent = ftime(dur);
$("fill").style.setProperty("--p", pct);
$("mfill").style.width = pct;
const np = (k) => sr.querySelector(`[data-np="${k}"]`);
if (np("fill")) { np("fill").style.setProperty("--p", pct); np("pos").textContent = ftime(pos); np("dur").textContent = ftime(dur); }
}
_seek(e, sk) {
const t = this._target(); if (!t) return;
const s = this._hass.states[t.id], dur = s && s.attributes.media_duration; if (!dur) return;
e.preventDefault();
const calc = (ev) => { const r = sk.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * dur; };
const show = (pos) => { this._seekHold = { pos, at: Date.now() }; this._progress(); };
show(calc(e));
const mv = (ev) => show(calc(ev));
const up = (ev) => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); const pos = calc(ev); show(pos); this._svc("media_seek", { seek_position: Math.round(pos) }); };
window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
}
_svc(service, data) {
const t = this._target(); if (!t) return Promise.resolve();
return this._hass.callService("media_player", service, Object.assign({ entity_id: t.id }, data || {})).catch(() => this._toast("That speaker didn't respond"));
}
/* ---------- device picker ---------- */
_openDevices() {
this._popOpen = true;
const ps = this._players(), t = this._target();
this._grp = (t && t.group) || "Music";
this._renderDevices();
this.shadowRoot.getElementById("pop").classList.add("show");
this.shadowRoot.getElementById("scrim").classList.add("show");
}
_closeDevices() {
this._popOpen = false;
this.shadowRoot.getElementById("pop").classList.remove("show");
this.shadowRoot.getElementById("scrim").classList.remove("show");
}
_renderDevices() {
const pop = this.shadowRoot.getElementById("pop"), ps = this._players(), t = this._target();
const groups = [...new Set(ps.map((p) => p.group))];
const ts = t && this._hass.states[t.id];
const pic = t && this._active(ts) && (ts.attributes.entity_picture_local || ts.attributes.entity_picture);
let html = `<div class="ph">Connect to a device</div>`;
if (t) html += `<div class="cur"><div class="ic"><ha-icon icon="${t.kind === "tv" ? "mdi:television" : "mdi:speaker"}"></ha-icon></div><div style="min-width:0"><div class="s">Current device</div><div class="n">${esc(t.name)}</div></div></div>`;
if (groups.length > 1) html += `<div class="seg">${groups.map((g) => `<button class="${g === this._grp ? "on" : ""}" data-act="grp" data-g="${esc(g)}">${esc(g)}</button>`).join("")}</div>`;
/* Speakers that Music Assistant can sync get a circle: tap it to add that speaker to what's playing, in sync */
const lead = t && t.kind === "ma" && this._canSync(t.id) ? t : null;
const members = lead ? (ts.attributes.group_members || []).filter((x) => x !== lead.id) : [];
const others = lead ? ps.filter((p) => p.kind === "ma" && p.id !== lead.id && this._canSync(p.id)) : [];
if (others.length && (this._grp === "Music" || groups.length < 2)) html += `<div class="hint">Tap a circle to add a speaker. Grouped speakers play in perfect sync.</div>`;
html += `<div class="pl scr">${ps.filter((p) => p.group === this._grp || groups.length < 2).map((p) => {
const s = this._hass.states[p.id], on = s.state === "playing", dead = s.state === "unavailable";
const img = this._active(s) && (s.attributes.entity_picture_local || s.attributes.entity_picture);
const inGrp = members.includes(p.id);
const ck = lead && p.kind === "ma" && this._canSync(p.id) ? (p.id === lead.id ? `<span class="ck on lead"><ha-icon icon="mdi:check"></ha-icon></span>` : `<button class="ck tap ${inGrp ? "on" : ""}" data-act="sync" data-id="${p.id}" aria-label="${inGrp ? "Remove from group" : "Add to group"}"><ha-icon icon="mdi:check"></ha-icon></button>`) : "";
return `<div class="spk tap hv ${t && t.id === p.id ? "sel" : ""} ${dead ? "dead" : ""}" role="button" data-act="pick" data-id="${p.id}"><div class="ic">${img ? `<img src="${esc(img)}" onerror="this.remove()">` : `<ha-icon icon="${p.icon}"></ha-icon>`}</div><div style="min-width:0"><div class="n">${esc(p.name)}</div><div class="s">${esc(inGrp ? "In sync with " + lead.name : this._sub(p))}</div></div><div class="rt2">${on && !inGrp ? `<div class="eq"><i></i><i></i><i></i></div>` : ""}${ck}</div></div>`;
}).join("")}</div>`;
if (pop.innerHTML !== html) { const sc = pop.querySelector(".pl"); const y = sc ? sc.scrollTop : 0; pop.innerHTML = html; const sc2 = pop.querySelector(".pl"); if (sc2) sc2.scrollTop = y; }
}
_canSync(id) { const s = this._hass.states[id]; return !!s && s.state !== "unavailable" && ((s.attributes.supported_features || 0) & 524288) !== 0; }
_groupOf(id) { const s = this._hass.states[id]; return ((s && s.attributes.group_members) || []).filter((x) => x !== id); }
async _sync(id) {
const t = this._target(); if (!t) return;
const p = this._players().find((x) => x.id === id); const name = (p && p.name) || id;
const mem = this._groupOf(t.id), on = mem.includes(id);
try {
if (on) await this._hass.callService("media_player", "unjoin", { entity_id: id });
else await this._hass.callService("media_player", "join", { entity_id: t.id, group_members: mem.concat(id) });
this._toast(on ? `${name} left the group` : `${name} is now playing in sync with ${t.name}`);
} catch (e) { this._toast(on ? `Couldn't remove ${name}` : `${name} can't sync with ${t.name}`); }
setTimeout(() => this._popOpen && this._renderDevices(), 800);
}
async _pick(id) {
const old = this._target(), ps = this._players(), nw = ps.find((p) => p.id === id);
if (!nw) return;
const os = old && this._hass.states[old.id];
this._sel = id; lsSet("os-media-target", id);
this._closeDevices();
this._renderBar(true);
if (old && old.id !== id && old.kind === "ma" && nw.kind === "ma" && os && os.state === "playing" && this._hass.states[id].state !== "playing") {
try {
await this._hass.callService("music_assistant", "transfer_queue", { source_player: old.id, auto_play: true }, { entity_id: id });
this._toast(`Moved the music to ${nw.name}`);
} catch (e) { this._toast(`Now controlling ${nw.name}`); }
} else this._toast(nw.kind === "tv" ? `Controlling ${nw.name}` : `Playing on ${nw.name}`);
}
/* ---------- clicks ---------- */
_click(e) {
const el = e.target.closest("[data-act]"); if (!el) return;
const d = el.dataset, act = d.act;
if (act !== "devices" && act !== "grp" && act !== "pick" && act !== "sync" && this._popOpen && act !== "closepop") this._closeDevices();
switch (act) {
case "nav": if (d.p === "now" && this._route && this._route.p === "now") return; this._go({ p: d.p }); break;
case "back": this._back(); break;
case "retry": this._render(); break;
case "fil": this._fil = d.k; lsSet("os-music-lib", d.k); this._renderLib(); if (d.go || (this._route && this._route.p === "library")) this._go({ p: "library" }, { replace: this._route && this._route.p === "library" }); break;
case "ma": e.stopPropagation(); this._openMa(d); break;
case "maplay": this._playMa(d.uri, d.type, d.name); break;
case "mashuffle": this._playMa(d.uri, d.type, d.name, true); break;
case "artist": e.stopPropagation(); if (d.id && d.id !== "undefined") this._go({ p: "artist", id: +d.id }); break;
case "artistall": this._route.all = !this._route.all; this._render(this._scrollY()); break;
case "disc": this._route.disc = d.k; this._render(this._scrollY()); break;
case "album": this._go({ p: "album", id: +d.id }); break;
case "genre": this._go({ p: "genre", id: +d.id, name: d.name }); break;
case "q": { const q = this.shadowRoot.getElementById("q"); q.value = d.q; this.shadowRoot.getElementById("sbox").classList.add("has"); this._remember(d.q); this._go({ p: "search", q: d.q, f: "all" }); break; }
case "clrrecent": lsSet("os-music-recent", "[]"); this._render(); break;
case "sf": this._route.f = d.k; this._remember(this._route.q); this._render(); break;
case "track": e.stopPropagation(); { const l = this._lists[d.l]; if (this._route && this._route.p === "search") this._remember(this._route.q); if (l) this._playFrom(l, +d.i); } break;
case "playlist": { const l = this._lists[d.l]; if (l) this._playFrom(l, 0, true); } break;
case "artistplay": e.stopPropagation(); this._artistPlay(+d.id); break;
case "dlartist": this._artistDownload(+d.id); break;
case "dlalbum": this._download({ albumId: +d.id }, { toast: true }); break;
case "pp": { const t = this._target(); if (!t) return; const s = this._hass.states[t.id]; if (s.state === "playing") this._svc("media_pause"); else if (s.state === "paused") this._svc("media_play"); else this._toast("Pick something to play"); break; }
case "prev": this._svc("media_previous_track"); break;
case "next": this._svc("media_next_track"); break;
case "shuffle": { const t = this._target(); if (t) this._svc("shuffle_set", { shuffle: !this._hass.states[t.id].attributes.shuffle }); break; }
case "repeat": { const t = this._target(); if (!t) return; const r = this._hass.states[t.id].attributes.repeat || "off"; this._svc("repeat_set", { repeat: r === "off" ? "all" : r === "all" ? "one" : "off" }); break; }
case "mute": { const t = this._target(); if (t) this._svc("volume_mute", { is_volume_muted: !this._hass.states[t.id].attributes.is_volume_muted }); break; }
case "devices": if (this._popOpen) this._closeDevices(); else this._openDevices(); break;
case "closepop": this._closeDevices(); break;
case "grp": this._grp = d.g; this._renderDevices(); break;
case "pick": this._pick(d.id); break;
case "sync": e.stopPropagation(); this._sync(d.id); break;
}
}
_openMa(d) {
const t = d.type;
if (t === "radio") return this._playMa(d.uri, "radio", d.name);
if (t === "artist") return this._go({ p: "maartist", name: d.name });
this._go({ p: t === "album" ? "maalbum" : "playlist", uri: d.uri, name: d.name, artist: d.artist, img: d.img, kind: t });
}
/* ---------- playback ---------- */
_canPlay() {
const t = this._target();
if (!t) { this._toast("Pick a speaker first"); this._openDevices(); return null; }
if (t.kind === "tv") { this._toast("Pick a speaker to play music"); this._openDevices(); return null; }
if (this._hass.states[t.id].state === "unavailable") { this._toast(`${t.name} is offline. Pick another speaker.`); this._openDevices(); return null; }
return t;
}
async _alexa(say, label) {
const t = this._target(); if (!t) return;
try { await this._hass.callService("media_player", "play_media", { entity_id: t.id, media_content_id: say, media_content_type: "custom" }); this._toast(`Asking Alexa for ${label} on ${t.name}`); }
catch (e) { this._toast("Alexa didn't respond"); }
}
async _maSend(t, ids, enqueue) {
const data = { media_id: ids.length === 1 ? ids[0] : ids, media_type: "track" };
if (enqueue) data.enqueue = enqueue;
return this._hass.connection.sendMessagePromise({ type: "call_service", domain: "music_assistant", service: "play_media", service_data: data, target: { entity_id: t.id } });
}
async _playUris(t, uris, label, enqueue) {
S.want = enqueue === "add" ? S.want : null;
try { await this._maSend(t, uris, enqueue || "replace"); }
catch (e) {
try { await this._maSend(t, uris.map((u) => this._httpUri(u)), enqueue || "replace"); }
catch (e2) { this._toast(`Couldn't play on ${t.name}`); return false; }
}
if (label) this._toast(`Playing ${label} on ${t.name}`);
return true;
}
async _playMa(uri, type, name, shuffle) {
const t = this._canPlay(); if (!t) return;
if (t.kind === "alexa") return this._alexa(type === "radio" ? `${name} radio` : name, name);
S.want = null;
try {
if (shuffle) await this._hass.callService("media_player", "shuffle_set", { entity_id: t.id, shuffle: true }).catch(() => {});
await this._hass.connection.sendMessagePromise({ type: "call_service", domain: "music_assistant", service: "play_media", service_data: { media_id: uri, media_type: type }, target: { entity_id: t.id } });
this._toast(`Playing ${name} on ${t.name}`);
} catch (e) { this._toast(/nothing to play/i.test(String((e && e.message) || "")) ? "Your music library is offline right now" : `Couldn't play on ${t.name}`); }
}
async _playFrom(list, i, whole) {
const m = list[i]; if (!m) return;
const t = this._canPlay(); if (!t) return;
if (t.kind === "alexa") return this._alexa(`${m.title} by ${m.artist}`, m.title);
await this._files();
const uri0 = this._have(m);
const rest = list.slice(i + 1).map((x) => this._have(x)).filter(Boolean);
if (uri0) {
await this._playUris(t, [uri0, ...rest].slice(0, 150), whole ? null : m.title);
if (whole) this._toast(`Playing on ${t.name}`);
const miss = list.slice(i).filter((x) => x.dzid && !this._have(x));
if (miss.length && whole) this._download({ track: miss[0].dz, albumId: miss[0].albumId }, { quiet: true });
return;
}
if (!m.dzid) { this._toast("That song isn't available yet"); return; }
if (whole && rest.length) { await this._playUris(t, rest.slice(0, 150), null); this._toast(`Playing on ${t.name}. Getting the rest…`); this._download({ track: m.dz, albumId: m.albumId }, { quiet: true }); return; }
this._download({ track: m.dz, albumId: m.albumId, artistId: m.artistId, artistName: m.artistName }, { play: { player: t.id, follow: list.slice(i + 1).filter((x) => x.dzid).map((x) => ({ id: "dz" + x.dzid, title: x.title, artist: x.artist })) }, toast: true, label: m.title });
}
async _artistPlay(id) {
const t = this._canPlay(); if (!t) return;
const [a, top] = await Promise.all([dz(`artist/${id}`).catch(() => ({})), dz(`artist/${id}/top?limit=10`).then((x) => x.data || []).catch(() => [])]);
if (t.kind === "alexa") return this._alexa(a.name || "", a.name || "");
const ms = top.map((x) => this._mDz(x, null, { id, name: a.name }));
await this._files();
const uris = ms.map((m) => this._have(m)).filter(Boolean);
if (uris.length) { await this._playUris(t, uris, a.name); if (uris.length < ms.length) this._download({ track: top[0], albumId: top[0].album && top[0].album.id }, { quiet: true }); return; }
if (ms[0]) this._playFrom(ms, 0);
}
_artistDownload(id) {
Promise.all([dz(`artist/${id}`), dz(`artist/${id}/top?limit=1`)]).then(([a, x]) => { const t0 = (x.data || [])[0]; if (!t0) return this._toast("Couldn't find this artist's music"); this._download({ track: t0, albumId: t0.album && t0.album.id, artistId: id, artistName: a.name, force: true }, { toast: true }); }).catch(() => this._toast("Can't reach the music catalog"));
}
/* ---------- downloads (Downtify) ---------- */
_song(t, al, artistName) {
const a = Object.assign({}, al || {}, t.album || {});
if (al) Object.assign(a, al);
const names = (t.contributors && t.contributors.length ? t.contributors.map((c) => c.name) : [(t.artist && t.artist.name) || artistName]).filter(Boolean);
const rd = a.release_date || (t.release_date || "");
return { song_id: "dz" + t.id, name: t.title, artists: names, album_name: a.title || "", album_artist: (a.artist && a.artist.name) || artistName || names[0] || "", cover_url: a.cover_xl || a.cover_big || a.cover_medium || "", duration: t.duration || 0, track_number: t.track_position || undefined, disc_number: t.disk_number || undefined, album_track_total: a.nb_tracks || undefined, release_date: rd, year: rd.slice(0, 4), isrc: t.isrc || "", explicit: !!t.explicit_lyrics, url: t.link || "" };
}
_need(t, extra) {
const m = this._mDz(t);
if (this._have(m)) return false;
const j = this._jobFor(t.id);
if (j && j.status !== "error") return false;
const k = baseT(t.title) + "|" + norm((t.artist && t.artist.name) || "");
if (extra) { if (extra.has(k)) return false; extra.add(k); }
return true;
}
async _lane() {
/* Downtify can't pause or reorder its queue, but saving the parallel-downloads setting starts a fresh line.
   Songs sent right after it get the next free download slot instead of waiting behind the whole backlog. */
try {
const st = await this._dt("/api/settings");
const n = Math.max(1, parseInt(st && st.max_parallel_downloads, 10) || 3);
await this._post("/api/settings/update", { max_parallel_downloads: n });
} catch (e) {}
}
async _send(songs, prio) {
if (!songs.length) return 0;
if (prio) await this._lane();
await this._post("/api/download/batch", { songs, generate_m3u: false });
songs.forEach((s) => { if (!S.jm.has(s.song_id)) S.jm.set(s.song_id, { song: s, status: "queued", progress: 0 }); });
S.lastAct = Date.now();
this._broadcastStatus();
this._ws();
return songs.length;
}
async _download(o, opts) {
opts = opts || {};
try {
await this._files();
const al = await dz(`album/${o.albumId}`);
let tracks = (al.tracks && al.tracks.data) || [];
if (al.nb_tracks > tracks.length) tracks = await dz(`album/${al.id}/tracks?limit=300`).then((x) => x.data || tracks).catch(() => tracks);
/* A song from a "Various Artists" compilation: get just that song, then its own artist, not the whole compilation */
const comp = al.record_type === "compile" || VA(al.artist);
if (comp && o.track) tracks = [o.track];
const ta = o.track && o.track.artist && !VA(o.track.artist) ? o.track.artist : null;
const artistId = comp ? o.artistId || (ta && ta.id) || null : o.artistId || (al.artist && al.artist.id) || (ta && ta.id);
const artistName = (o.artistId && o.artistName) || (comp ? (ta && ta.name) || "" : (al.artist && al.artist.name) || (ta && ta.name) || "");
const seen = new Set();
let order = tracks.slice();
if (o.track) { order = order.filter((x) => x.id !== o.track.id); order.unshift(Object.assign({}, o.track, { track_position: (tracks.find((x) => x.id === o.track.id) || {}).track_position || o.track.track_position })); }
const first = order.filter((x) => this._need(x, seen)).map((x) => this._song(x, al, artistName));
if (o.track && !first.some((s) => s.song_id === "dz" + o.track.id)) {
const j = this._jobFor(o.track.id);
if (!j || j.status === "error" || j.song.song_id.startsWith("dz") && !j.song.song_id.startsWith("dzp")) first.unshift(this._song(o.track, al, artistName));
}
let n = 0;
if (opts.play && o.track) {
/* Priority: the tapped song goes first in a fresh download line, then its album. They get their own ids ("dzp…") so they
   don't just join a copy of the same song waiting deep in the backlog. */
const pri = first.map((x) => Object.assign({}, x, { song_id: x.song_id.replace(/^dz(?!p)/, "dzp") }));
const i0 = pri.findIndex((x) => x.song_id === "dzp" + o.track.id);
const lead = i0 >= 0 ? pri.splice(i0, 1) : [Object.assign(this._song(o.track, al, artistName), { song_id: "dzp" + o.track.id })];
first.length = 0;
n += await this._send(lead, true);
n += await this._send(pri);
S.want = { dzid: o.track.id, player: opts.play.player, title: o.track.title, artist: (o.track.artist && o.track.artist.name) || artistName, follow: opts.play.follow || [], at: Date.now() };
this._checkWant();
} else n += await this._send(first);
const rest = artistId && (o.force || !S.artists[artistId] || Date.now() - S.artists[artistId] > 12 * 3600e3);
if (opts.toast !== false && !opts.quiet) {
const what = opts.label ? `“${opts.label}”` : `“${al.title}”`;
this._toast(opts.play ? `Getting ${what}. It'll start playing in a moment.` : n ? `Downloading ${al.title}${rest ? `, then the rest of ${artistName}` : ""}` : rest ? `Getting the rest of ${artistName}'s music` : `${al.title} is already downloaded`);
}
this._paintStatus();
if (rest) this._artistRest(artistId, artistName, al.id, seen);
} catch (e) {
this._toast(/Downtify|Failed to fetch|NetworkError/i.test(String(e && e.message)) ? "Can't reach Downtify right now" : "Couldn't start that download");
}
}
async _artistRest(artistId, artistName, skipAlbum, seen) {
if (!artistId || artistId === 5080 || (S.restBusy && S.restBusy[artistId])) return;
S.restBusy = S.restBusy || {}; S.restBusy[artistId] = true; this._broadcastStatus();
S.artists[artistId] = Date.now(); lsSet("os-music-artists", JSON.stringify(S.artists));
try {
const [top, albs] = await Promise.all([dz(`artist/${artistId}/top?limit=50`).then((x) => x.data || []).catch(() => []), dz(`artist/${artistId}/albums?limit=300`).then((x) => x.data || []).catch(() => [])]);
let buf = top.filter((x) => (!x.artist || x.artist.id === artistId || (x.contributors || []).some((c) => c.id === artistId)) && this._need(x, seen)).map((x) => this._song(x, x.album, artistName));
const flush = async (min) => { if (buf.length >= min) { const b = buf; buf = []; await this._send(b).catch(() => {}); } };
await flush(1);
const keep = albs.filter((x) => x.id !== skipAlbum && x.record_type !== "compile");
const best = new Map();
keep.forEach((x) => { const k = baseT(x.title) + "|" + x.record_type; const o = best.get(k); if (!o || (x.explicit_lyrics && !o.explicit_lyrics)) best.set(k, x); });
const list = [...best.values()].sort((a, b) => String(b.release_date || "").localeCompare(String(a.release_date || "")));
for (const al of list) {
const tr = await dz(`album/${al.id}/tracks?limit=300`).then((x) => x.data || []).catch(() => []);
const full = Object.assign({}, al, { artist: { id: artistId, name: artistName }, nb_tracks: tr.length });
tr.forEach((x) => { if (this._need(x, seen)) buf.push(this._song(x, full, artistName)); });
await flush(40);
}
await flush(1);
} finally { S.restBusy[artistId] = false; this._broadcastStatus(); }
}
_broadcastStatus() { S.cards.forEach((c) => c._paintStatus()); }
/* ---------- live download status (Downtify's WebSocket feed) ---------- */
_ws() {
if (S.ws && (S.ws.readyState === 0 || S.ws.readyState === 1)) return;
if (S.wsWait) return;
if (S.wsFails >= 2 && Date.now() - S.wsFailAt < 5 * 60000) return;
let ws;
try { ws = new WebSocket(this._dtu.replace(/^http/, "ws") + "/api/ws?client_id=osmusic-" + Math.random().toString(36).slice(2, 10)); }
catch (e) { return; }
S.ws = ws; ws._open = false;
ws.onopen = () => { ws._open = true; S.wsFails = 0; };
ws.onmessage = (e) => {
let d; try { d = JSON.parse(e.data); } catch (x) { return; }
const sid = d && d.song && d.song.song_id; if (!sid || !d.status) return;
const j = S.jm.get(sid) || { song: d.song };
j.song = d.song; j.status = d.status; j.progress = d.progress || 0; j.message = d.message || "";
if (d.filename) j.filename = d.filename;
S.jm.set(sid, j);
if (d.status === "downloading") S.lastAct = Date.now();
if (d.status === "done") { S.lastAct = Date.now(); S.filesDirty = true; this._onDone(j); }
this._paintSoon();
};
ws.onclose = () => { if (!ws._open) { S.wsFails = (S.wsFails || 0) + 1; S.wsFailAt = Date.now(); } if (S.ws === ws) S.ws = null; if (S.wsFails >= 2) return; S.wsWait = setTimeout(() => { S.wsWait = 0; if (S.cards.size) [...S.cards][0]._ws(); }, 5000); };
}
_paintSoon() {
if (S.paintT) return;
S.paintT = setTimeout(() => { S.paintT = 0; this._broadcastStatus(); if (S.cards.size && [...S.cards].some((c) => c._route && c._route.p === "downloads")) [...S.cards].forEach((c) => { if (c._route && c._route.p === "downloads") c._render(c._scrollY()); }); }, 900);
}
_onDone(j) {
/* New files show up in the library list; refresh it at most every 30 s, right away when someone is waiting on a song */
const waiting = S.want && (j.song.song_id === "dzp" + S.want.dzid || j.song.song_id === "dz" + S.want.dzid || (S.want.follow || []).some((x) => j.song.song_id === x.id || j.song.song_id === x.id.replace(/^dz/, "dzp")));
if (waiting || Date.now() - S.filesAt > 30000) this._files(true).then(() => this._broadcastStatus());
if (waiting) this._checkWant();
}
async _fetchQueue(force) {
/* The whole queue can be tens of thousands of songs, so it's only fetched for the Downloads page */
if (!force && Date.now() - S.qAt < 20000) return;
if (S.qP) return S.qP;
S.qP = (async () => {
try {
const rows = await this._dt("/api/queue");
if (!Array.isArray(rows)) return;
const m = new Map();
rows.forEach((r) => { if (r.song && r.song.song_id) m.set(r.song.song_id, r); });
S.jm.forEach((j, k) => { if (!m.has(k) && j.status === "queued" && Date.now() - S.lastAct < 20000) m.set(k, j); });
S.jm = m; S.qAt = Date.now();
} catch (e) {}
})().finally(() => { S.qP = null; });
return S.qP;
}
async _checkWant() {
const w = S.want; if (!w || w.busy) return;
if (Date.now() - w.at > 15 * 60000) { S.want = null; return; }
const t = this._players().find((p) => p.id === w.player); if (!t) { S.want = null; return; }
const live = !!(S.ws && S.ws._open && S.ws.readyState === 1);
/* With the live feed a finished job names its file; without it, look for the song in the library list */
const fileFor = (dzid, title, artist) => { const j = this._jobFor(dzid); if (j && j.status === "done" && j.filename) return this._fileUri(j.filename); return this._have({ title, artist }); };
const again = (ms) => { clearTimeout(this._qT); this._qT = setTimeout(() => this._files(true).then(() => this._checkWant()), ms); };
if (!w.started) {
const j = this._jobFor(w.dzid);
if (j && j.status === "error") { S.want = null; this._toast(`Couldn't download “${w.title}”`); return; }
const uri = fileFor(w.dzid, w.title, w.artist);
if (!uri) { if (!live) again(10000); return; }
w.busy = true;
const ok = await this._playUris(t, [uri], null, "replace").catch(() => false);
S.want = w; w.busy = false;
if (ok) { w.started = true; this._toast(`Now playing “${w.title}” on ${t.name}`); }
else { S.want = null; return; }
}
while (w.follow && w.follow.length) {
const f = w.follow[0], id = String(f.id).replace(/^dz/, "");
const j = this._jobFor(id);
if (j && j.status === "error") { w.follow.shift(); continue; }
const uri = fileFor(id, f.title, f.artist);
if (!uri) { if (!w.waitAt) w.waitAt = Date.now(); if (Date.now() - w.waitAt > (j && j.status !== "done" ? 900000 : 600000)) { w.follow.shift(); w.waitAt = 0; continue; } break; }
w.waitAt = 0; w.follow.shift();
w.busy = true;
await this._maSend(t, [uri], "add").catch(() => this._maSend(t, [this._httpUri(uri)], "add").catch(() => {}));
w.busy = false;
}
if (w.started && (!w.follow || !w.follow.length)) { S.want = null; return; }
if (!live) again(15000);
}
_toast(msg) {
const t = this.shadowRoot.getElementById("toast");
t.textContent = msg; t.classList.add("show");
clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove("show"), 3600);
}
}
if (!customElements.get("os-music")) customElements.define("os-music", OsMusic);
})();
