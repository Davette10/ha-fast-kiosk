/* os-echo-fx: the Alexa light bar (look and motion) and the original Echo Show sound effects for os-echo.
   Kept as its own resource so the main os-echo card stays under the inline size limit.
   Light bar, modelled on the Echo Show bar:
   - listening: a deep-blue bar grows out from the centre with a bright cyan core that breathes, plus a soft glow
   - processing (thinking): cyan highlights sweep from the centre out to both edges over the blue bar
   - responding: the whole bar shimmers between blue and cyan
   - closing: the bar collapses back to the centre and fades
   - muted: solid red; unmuting collapses the RED bar (it never flashes blue) */
(() => {
const css = `
.ax .bar{position:absolute;left:0;right:0;bottom:0;height:2.1vh;opacity:0;transform:scaleX(0);transform-origin:50% 50%;
background:linear-gradient(90deg,#071d86,#0f3fd0 22%,#1450e6 50%,#0f3fd0 78%,#071d86);clip-path:inset(-12vh 0 0 0);
transition:opacity .18s ease-out,transform .34s cubic-bezier(.2,.9,.25,1);}
.ax .gl{position:absolute;left:-5%;right:-5%;bottom:100%;height:9vh;pointer-events:none;
background:radial-gradient(60% 100% at 50% 100%,rgba(30,110,255,.55),rgba(30,110,255,.18) 55%,rgba(30,110,255,0) 100%);transition:opacity .3s;}
.ax .spot{position:absolute;top:0;bottom:0;left:50%;width:30%;transform:translateX(-50%);
background:linear-gradient(90deg,rgba(0,205,255,0),#00cdff 28%,#a6f6ff 50%,#00cdff 72%,rgba(0,205,255,0));transition:opacity .2s;}
.ax .sp{position:absolute;top:0;bottom:0;width:18%;opacity:0;background:linear-gradient(90deg,rgba(0,205,255,0),#3ee0ff 50%,rgba(0,205,255,0));}
.ax .sp.l{right:50%;}.ax .sp.r{left:50%;}
:host([unmuting]) .ax .bar{background:#d70f1f;opacity:0;transform:scaleX(0);transition:opacity .38s .08s,transform .46s cubic-bezier(.4,0,.2,1);}
:host([unmuting]) .ax .gl{background:radial-gradient(60% 100% at 50% 100%,rgba(255,40,50,.5),rgba(255,40,50,0));}
:host([unmuting]) .ax .spot,:host([unmuting]) .ax .sp{display:none;}
:host([ax=listening]) .ax .bar,:host([ax=processing]) .ax .bar,:host([ax=responding]) .ax .bar{opacity:1;transform:scaleX(1);}
:host([ax=listening]) .ax .spot{animation:fxb 1.9s ease-in-out infinite;}
:host([ax=listening]) .ax .gl{animation:fxg 1.9s ease-in-out infinite;}
@keyframes fxb{0%,100%{width:26%}50%{width:38%}}
@keyframes fxg{0%,100%{opacity:.75}50%{opacity:1}}
:host([ax=processing]) .ax .spot{opacity:.35;width:14%;}
:host([ax=processing]) .ax .sp.l{animation:fxl .95s cubic-bezier(.45,.05,.55,.95) infinite;}
:host([ax=processing]) .ax .sp.r{animation:fxr .95s cubic-bezier(.45,.05,.55,.95) infinite;}
@keyframes fxl{0%{transform:translateX(0);opacity:1}100%{transform:translateX(-285%);opacity:.15}}
@keyframes fxr{0%{transform:translateX(0);opacity:1}100%{transform:translateX(285%);opacity:.15}}
:host([ax=responding]) .ax .spot{width:100%;animation:fxs 1.05s ease-in-out infinite;}
:host([ax=responding]) .ax .gl{animation:fxs 1.05s ease-in-out infinite;}
@keyframes fxs{0%,100%{opacity:.3}45%{opacity:1}70%{opacity:.6}}
:host([ax=closing]) .ax .bar{opacity:0;transform:scaleX(0);transition:opacity .4s .12s,transform .52s cubic-bezier(.4,0,.2,1);}
:host([ax=closing]) .ax .spot{width:100%;}
:host([muted]) .ax .bar{opacity:1;transform:scaleX(1);background:#d70f1f;transition:opacity .15s,transform .3s cubic-bezier(.2,.9,.25,1);}
:host([muted]) .ax .gl{background:radial-gradient(60% 100% at 50% 100%,rgba(255,40,50,.5),rgba(255,40,50,.15) 55%,rgba(255,40,50,0));animation:none;opacity:1;}
:host([muted]) .ax .spot,:host([muted]) .ax .sp{display:none;}
@media (prefers-reduced-motion:reduce){.ax .spot,.ax .sp,.ax .gl{animation:none!important;}}
`;
/* Original Echo Show sounds, copied from Owen's own Fire OS backup into /config/www/alexa-sounds (served at /local/).
   They are decoded once and played from memory, so they start instantly. If a file is missing, nothing plays,
   except mute / unmute, which fall back to a short synthesized chime. */
const BASE = "/local/alexa-sounds/";
const FILES = { wake: "wake.ogg", end: "end.ogg", mute: "mute.mp3", unmute: "unmute.mp3", volume: "volume.mp3", alarm: "alarm.mp3",
  timer: "timer.mp3", reminder: "reminder.mp3", notification: "notification.mp3", error: "error.mp3", shutter: "shutter.mp3" };
const buf = {}, lead = {};
/* the files start with 50–90 ms of silence (encoder padding); skip it so the sound lands on the button press */
const quiet = (d) => { const x = d.getChannelData(0), n = Math.min(x.length, Math.floor(d.sampleRate * 0.25)); for (let i = 0; i < n; i++) if (Math.abs(x[i]) > 0.004) return Math.max(0, i / d.sampleRate - 0.004); return 0; };
let ctx = null, loading = null;
const ac = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }); if (ctx.state === "suspended") ctx.resume(); return ctx; } catch (e) { return null; } };
function load() {
  if (loading) return loading;
  const c = ac(); if (!c) return Promise.resolve();
  loading = Promise.all(Object.entries(FILES).map(([k, f]) => fetch(BASE + f, { cache: "force-cache" })
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((b) => c.decodeAudioData(b)).then((d) => { buf[k] = d; lead[k] = quiet(d); }).catch(() => {})))
    .then(() => { if (Object.keys(buf).length < Object.keys(FILES).length) setTimeout(() => { loading = null; }, 60000); });
  return loading;
}
function chime(kind) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + 0.02, out = c.createGain(); out.gain.value = 0.3; out.connect(c.destination);
  (kind === "mute" ? [[740, 0], [494, 0.12]] : [[494, 0], [740, 0.12]]).forEach(([f, d]) => {
    const o = c.createOscillator(), g = c.createGain(), t = t0 + d; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.36);
  });
}
/* play("wake" | "end" | "mute" | "unmute" | "volume" | "notification" | "error" | "shutter" | ...) */
function play(k) {
  const c = ac(); if (!c) return null;
  if (!buf[k]) { load(); if (k === "mute" || k === "unmute") chime(k); return null; }
  const s = c.createBufferSource(); s.buffer = buf[k]; s.connect(c.destination); s.start(0, lead[k] || 0); return s;
}
/* ring(true, "alarm" | "timer" | "reminder") repeats the original alert until ring(false). Returns null when the
   sound is not loaded, so the card can use its own fallback tone. */
let ringSrc = null, ringT = null;
function ring(on, kind) {
  clearTimeout(ringT); if (ringSrc) { try { ringSrc.stop(); } catch (e) { /* already stopped */ } ringSrc = null; }
  if (!on) return false;
  const k = kind === "timer" || kind === "reminder" ? kind : "alarm", d = buf[k];
  if (!d) { load(); return null; }
  const again = () => { ringSrc = play(k); ringT = setTimeout(again, Math.max(1500, d.duration * 1000 + (k === "reminder" ? 1500 : 250))); };
  again();
  return ac().state === "running";
}
/* Keep the speaker path awake. Android's browser closes the audio output after a few seconds of pure silence,
   and reopening it is what made the mute and volume sounds start late. A far-below-hearing 25 Hz signal
   (about -80 dB) keeps it open so every sound starts at once. */
let warm = null;
function keepWarm() {
  const c = ac(); if (!c || warm) return;
  try { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 25; g.gain.value = 0.0001; o.connect(g); g.connect(c.destination); o.start(); warm = o; } catch (e) { warm = null; }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) { const c = ac(); if (c) c.resume(); } });
load(); keepWarm();
window.OSEchoFX = { css, chime, play, ring, load };
if (!customElements.get("os-echo-fx")) customElements.define("os-echo-fx", class extends HTMLElement {});
})();
