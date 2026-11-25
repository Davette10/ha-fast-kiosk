/* os-echo-listen: kitchen listener (Nov 16 2026). Runs only on the kitchen Echo Show's alexa-dashboard.
   Owen asked for it and everyone in the house knows and agreed.
   1. Records the kitchen mic all the time (shares the mic with VACA's wake word; checked with dumpsys: neither is
      silenced). A cheap energy detector cuts one clip per stretch of talking (ends after 1.2 s of quiet, max 30 s)
      and posts it to the Zima (kitchen-listen/server.py) at http://127.0.0.1:8780 via adb reverse. The Zima
      transcribes it locally and saves one text file per clip; the 4 AM Gemini review reads the day.
   2. Wake tuning: Alexa woke but the 2.5 s before it were silent  -> script.kitchen_wake_tune direction "less".
      Someone said "Alexa, <request>" and Alexa never started listening -> direction "more".
   Off switch: input_boolean.kitchen_listener. Nothing is recorded while the Echo's mic is muted. */
(() => {
if (window.__osEchoListen) return; window.__osEchoListen = 1;
const UA = navigator.userAgent || "";
const ON_ECHO = () => location.pathname.startsWith("/alexa-dashboard") && !location.pathname.endsWith("/replay") && /Android/.test(UA) && !/Headless/.test(UA);
const SAT = "assist_satellite.vaca_amzn_echo_show_8_3a31", MUTE = "switch.vaca_amzn_echo_show_8_3a31_mute", ON = "input_boolean.kitchen_listener";
const SRV = "http://127.0.0.1:8780";
const FR = 320;                 /* one frame = 20 ms at 16 kHz */
const PRE = 25, HANG = 60, TAIL = 20, MAXF = 1500, MINSPEECH = 20;  /* frames: 0.5 s pre-roll, 1.2 s quiet ends a clip, keep 0.4 s, 30 s max, 0.4 s speech min */
const hassOf = () => { const h = document.querySelector("home-assistant"); return h && h.hass; };
const st = (h, id) => (h && h.states[id] ? h.states[id].state : "");

let ctx = null, stream = null, node = null, starting = false;
let floor = 0.0005;
const hist = [];                /* last ~3 s of {rms, sp, t} for wake checks */
const pre = [];                 /* pre-roll frames */
let seg = null;                 /* current clip */
const queue = []; let sending = false;
let lastTap = 0, lastSat = "", lastListen = 0;
const dbg = window.__osel = { clips: 0, sent: 0, fail: 0, err: "", tunes: 0, floor: 0, peak: 0 }; /* status for CDP checks */

window.addEventListener("pointerdown", () => { lastTap = Date.now(); }, { capture: true, passive: true });

const WORKLET = `class P extends AudioWorkletProcessor{constructor(){super();this.r=sampleRate/16000;this.acc=0;this.n=0;this.buf=new Int16Array(${FR}*5);this.k=0;this.e=0;this.rms=[];}
process(i){const c=i[0]&&i[0][0];if(!c)return true;for(let j=0;j<c.length;j++){this.acc+=c[j];this.n++;if(this.n>=this.r){const v=this.acc/this.n;this.acc=0;this.n-=this.r;const s=Math.max(-1,Math.min(1,v*2));this.e+=s*s;this.buf[this.k++]=s*32767;if(this.k%${FR}===0){this.rms.push(Math.sqrt(this.e/${FR}));this.e=0;}if(this.k===this.buf.length){this.port.postMessage({pcm:this.buf,rms:this.rms});this.buf=new Int16Array(${FR}*5);this.k=0;this.rms=[];}}}return true;}}
registerProcessor("osel",P);`;

async function start() {
  if (starting || ctx) return; starting = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await ctx.audioWorklet.addModule(url); URL.revokeObjectURL(url);
    const src = ctx.createMediaStreamSource(stream);
    node = new AudioWorkletNode(ctx, "osel");
    node.port.onmessage = (ev) => onBlock(ev.data);
    src.connect(node); /* not connected to the speakers */
  } catch (e) { console.warn("os-echo-listen start", e); dbg.err = "start: " + e; stop(); }
  dbg.running = !!ctx;
  starting = false;
}
function stop() {
  try { if (node) node.port.onmessage = null; } catch (e) {}
  try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
  try { if (ctx) ctx.close(); } catch (e) {}
  ctx = stream = node = null; seg = null; pre.length = 0;
}

function onBlock(d) {
  const h = hassOf(), sat = st(h, SAT) || "idle", t = Date.now();
  for (let f = 0; f < d.rms.length; f++) {
    const rms = d.rms[f], pcm = d.pcm.slice(f * FR, (f + 1) * FR);
    floor = rms < floor ? floor * 0.9 + rms * 0.1 : floor * 0.9995 + rms * 0.0005;
    if (floor < 0.0001) floor = 0.0001;
    const sp = rms > Math.max(floor * 3, 0.0015);
    hist.push({ rms, sp, t }); if (hist.length > 150) hist.shift();
    dbg.floor = floor; if (rms > dbg.peak) dbg.peak = rms;
    if (!seg) {
      pre.push(pcm); if (pre.length > PRE) pre.shift();
      const last = hist.slice(-10).filter((x) => x.sp).length;
      if (last >= 4) seg = { frames: pre.splice(0), t0: t - PRE * 20, quiet: 0, speech: last, sats: new Set([sat]) };
      continue;
    }
    seg.frames.push(pcm); seg.sats.add(sat);
    if (sp) { seg.speech++; seg.quiet = 0; } else seg.quiet++;
    if (seg.quiet >= HANG || seg.frames.length >= MAXF) finish(seg.quiet >= HANG);
  }
}

function finish(trim) {
  const s = seg; seg = null; if (!s) return;
  if (trim) s.frames.splice(s.frames.length - (HANG - TAIL));
  if (s.speech < MINSPEECH) return;
  dbg.clips++;
  const sats = [...s.sats].filter((x) => x && x !== "idle");
  queue.push({ wav: wav(s.frames), ts: s.t0, sat: sats.join("+"), end: Date.now(), tries: 0, woke: sats.includes("listening") });
  if (queue.length > 8) queue.shift(); /* the Zima is unreachable: keep only the newest few */
  send();
}

function wav(frames) {
  const n = frames.length * FR, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  let o = 44; for (const f of frames) for (let i = 0; i < f.length; i++, o += 2) v.setInt16(o, f[i], true);
  return new Blob([b], { type: "audio/wav" });
}

async function send() {
  if (sending) return; sending = true; dbg.sendStart = Date.now();
  while (queue.length) {
    const c = queue[0];
    try {
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 60000); /* never let one stuck upload block the rest */
      const r = await fetch(`${SRV}/chunk?ts=${c.ts}&sat=${encodeURIComponent(c.sat)}`, { method: "POST", body: c.wav, signal: ac.signal }).finally(() => clearTimeout(to));
      queue.shift(); if (r.ok) dbg.sent++; else dbg.fail++;
      if (r.ok) { const j = await r.json(); if (j.text) checkMissed(c, j.text); }
    } catch (e) { dbg.fail++; dbg.err = String(e); if (++c.tries >= 3) queue.shift(); break; } /* retry later; drop a clip after 3 failed tries */
  }
  sending = false;
}

/* ---------- wake tuning ---------- */
const CALL = /^\W*(?:hey\W+|ok\W+)?alexa\b[\s,.!?]+(?:\w+\W+){1,}/i;
function checkMissed(c, text) {
  if (c.woke || !CALL.test(text)) return;
  if (lastListen > c.ts - 1000) return; /* Alexa did start listening around then */
  tune("more", "said \"Alexa\" but it did not wake", text);
}
function tune(direction, reason, heard) {
  const h = hassOf(); if (!h) return; dbg.tunes++;
  h.callService("script", "kitchen_wake_tune", { direction, reason, heard: String(heard || "").slice(0, 200) }).catch(() => {});
}
function satWatch() {
  const h = hassOf(), s = st(h, SAT);
  if (s === "listening" && lastSat !== "listening") {
    lastListen = Date.now();
    const win = hist.filter((x) => x.t > Date.now() - 2500);
    const loud = win.filter((x) => x.sp).length;
    const peak = win.reduce((m, x) => Math.max(m, x.rms), 0);
    /* silent before the wake, no tap on the screen, and our mic is actually running */
    if (ctx && win.length > 60 && loud < 3 && peak < Math.max(floor * 2.5, 0.0015) && Date.now() - lastTap > 4000)
      tune("less", "woke up when the kitchen was silent", "");
  }
  lastSat = s;
}

/* ---------- run / pause ---------- */
setInterval(() => {
  if (!ON_ECHO()) { if (ctx) stop(); return; }
  const h = hassOf(); if (!h) return;
  const want = st(h, ON) !== "off" && st(h, MUTE) !== "on";
  if (want && !ctx) start(); else if (!want && ctx) stop();
  satWatch();
}, 250);
setInterval(() => { if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {}); if (queue.length) send(); }, 5000);
})();
