/* os-echo-wake (Nov 17 2026): two-stage wake word for the kitchen Echo Show, like a real Echo.
   Stage 1: VACA's microWakeWord on the Echo (fast; input_number.alexa_wake_word_threshold_normal).
   Stage 2: Amazon's own "Alexa" model from Owen's Fire OS backup, running on the Zima
            (echo-fireos/ww/wake_server.py). The kitchen listener's 16 kHz mic stream (os-echo-listen, via
            window.__oselTap) is sent to ws://127.0.0.1:8781 (adb reverse); a score comes back every 80 ms.
   When stage 1 wakes, os-echo asks OSEchoFX to play the wake chime. We hold the chime (and os-echo-stock holds
   the bar) until stage 2 agrees: the best score in the last 2.5 s (+ up to 0.5 s more) must be >= 0.5.
   If not, the Echo's Interrupt button stops the wake silently: no chime, no bar, nothing sent to the AI.
   Fail-open: if the Zima stream is not live (no score in 1.5 s), wakes go ahead exactly as before.
   Not checked: wakes within 4 s of a screen tap, right after Alexa spoke (follow-ups, start_conversation),
   and our own Wake-button presses. Missed wakes (stage 2 heard "Alexa" at >= 0.92, 0.84 while media plays,
   but stage 1 never woke) are logged; set RECOVER = true to press the Wake button for them.
   Decisions (+ 3 s of audio) are logged on the Zima: echo-fireos/ww/wakelog/. Status: window.__oswake. */
(() => {
if (window.__osEchoWake) return; window.__osEchoWake = 1;
const UA = navigator.userAgent || "";
const ON_ECHO = () => location.pathname.startsWith("/alexa-dashboard") && !location.pathname.endsWith("/replay") && /Android/.test(UA) && !/Headless/.test(UA);
const SAT = "assist_satellite.vaca_amzn_echo_show_8_3a31", INT = "button.kitchen_vaca_amzn_echo_show_8_3a31_interrupt";
const WAKE = "button.vaca_amzn_echo_show_8_3a31_wake", MP = "media_player.echo_show_music", NOISY = "input_boolean.alexa_kitchen_noisy";
/* Nov 17 stress test: over music (even 10 dB below the voice) Amazon's model can miss a real "Alexa" (no echo
   cancellation on this mic stream). So stage 2 only vetoes in a quiet kitchen. While the Echo plays music, or the
   room's background stays well above its usual quiet level (TV, music elsewhere), wakes are not vetoed and the
   listening-guard automation makes stage 1 stricter instead (+1.5 music, +1.0 noisy, via input_boolean NOISY). */
const NOISY_ON_DB = 10, NOISY_OFF_DB = 6, NOISY_ON_MS = 5000, NOISY_OFF_MS = 20000;
const ACCEPT = 0.5, TRIG = 0.92, TRIG_PLAY = 0.84, WAIT = 500, LOOK = 2500;
const RECOVER = false;
const hassOf = () => { const h = document.querySelector("home-assistant"); return h && h.hass; };
const st = (h, id) => (h && h.states[id] ? h.states[id].state : "");

let ws = null, lastScoreAt = 0, lastTap = 0, ownWakeAt = 0, lastFire = 0;
let sat = "", busyAt = 0, listenAt = 0;
const scores = [];
const dbg = window.__oswake = { connected: false, scores: 0, accepts: 0, rejects: 0, skips: 0, missed: 0, last: null };
window.__osWakeOn = () => !!(ws && ws.readyState === 1 && Date.now() - lastScoreAt < 1500);
window.addEventListener("pointerdown", () => { lastTap = Date.now(); }, { capture: true, passive: true });

function connect() {
  if (!ON_ECHO() || ws) return;
  try {
    const s = new WebSocket("ws://127.0.0.1:8781"); s.binaryType = "arraybuffer"; ws = s;
    s.onopen = () => { dbg.connected = true; };
    s.onclose = () => { dbg.connected = false; if (ws === s) ws = null; };
    s.onerror = () => {};
    s.onmessage = (e) => {
      try {
        const j = JSON.parse(e.data), t = Date.now();
        scores.push({ t, s: j.s }); lastScoreAt = t; dbg.scores++;
        while (scores.length && scores[0].t < t - 6000) scores.shift();
        onScore(j.s, t);
      } catch (x) { /* ignore */ }
    };
  } catch (e) { ws = null; }
}
setInterval(connect, 3000); connect();
/* background level: 20th percentile of the last 2.5 s of 100 ms blocks, against the room's slow-tracking quiet floor */
const blocks = []; let floor = 0, noiseDb = 0, noisy = false, flipAt = 0;
function measure(pcm) {
  let e = 0; for (let i = 0; i < pcm.length; i++) e += pcm[i] * pcm[i];
  const r = Math.sqrt(e / Math.max(1, pcm.length));
  if (r < 4) return;                                       /* digital silence (mic starting up): not the room */
  blocks.push(r); if (blocks.length > 25) blocks.shift();
  if (blocks.length < 25) return;                          /* need 2.5 s of real audio first */
  const bg = blocks.slice().sort((a, b) => a - b)[5];
  floor = !floor || bg < floor ? bg : floor * 1.0001;      /* +10 dB takes ~19 min to creep */
  noiseDb = 20 * Math.log10(bg / floor); dbg.noiseDb = Math.round(noiseDb * 10) / 10; dbg.bg = Math.round(bg); dbg.floor = Math.round(floor);
  const t = Date.now(), want = noisy ? noiseDb > NOISY_OFF_DB : noiseDb > NOISY_ON_DB;
  if (want === noisy) { flipAt = 0; return; }
  if (!flipAt) flipAt = t;
  if (t - flipAt >= (want ? NOISY_ON_MS : NOISY_OFF_MS)) {
    noisy = want; flipAt = 0; dbg.noisy = noisy;
    const h = hassOf(); if (h) h.callService("input_boolean", noisy ? "turn_on" : "turn_off", { entity_id: NOISY }).catch(() => {});
  }
}
window.__oselTap = (pcm) => {
  try { measure(pcm); } catch (e) { /* ignore */ }
  if (ws && ws.readyState === 1) { try { ws.send(pcm); } catch (e) { /* ignore */ } }
};
const log = (o) => { dbg.last = o; try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); } catch (e) { /* ignore */ } };
const peak = (from, to) => scores.reduce((m, x) => (x.t >= from && x.t <= to ? Math.max(m, x.s) : m), 0);
const press = (id) => { const h = hassOf(); if (h) h.callService("button", "press", { entity_id: id }).catch(() => {}); };

/* satellite state, every 100 ms */
setInterval(() => {
  const s = st(hassOf(), SAT); if (!s) return;
  const t = Date.now();
  if (s === "processing" || s === "responding") busyAt = t;
  if (s === "listening" && sat !== "listening") listenAt = t;
  sat = s;
}, 100);
/* keep the HA switch in step with what this page measures (e.g. after a reload) */
let syncAt = 0;
setInterval(() => {
  const h = hassOf(); if (!h || !ON_ECHO() || blocks.length < 25 || flipAt) return;
  const ha = st(h, NOISY) === "on";
  if (ha !== noisy && Date.now() - syncAt > 20000) { syncAt = Date.now(); h.callService("input_boolean", noisy ? "turn_on" : "turn_off", { entity_id: NOISY }).catch(() => {}); }
}, 5000);

function verify() {
  const t0 = Date.now();
  const h = hassOf();
  const why = !window.__osWakeOn() ? "detector offline" : t0 - lastTap < 4000 ? "screen tap" : t0 - ownWakeAt < 4000 ? "wake button"
    : (sat === "processing" || sat === "responding" || t0 - busyAt < 3000) ? "follow-up"
    : st(h, MP) === "playing" ? "music on the Echo" : (noisy || noiseDb > NOISY_ON_DB) ? "noisy kitchen" : "";
  if (why) { dbg.skips++; log({ type: "decision", action: "skip", why, score: peak(t0 - LOOK, t0), noiseDb: dbg.noiseDb }); return Promise.resolve(true); }
  return new Promise((res) => {
    const done = (ok) => {
      const p = peak(t0 - LOOK, Date.now()), ms = Date.now() - t0;
      if (ok) { dbg.accepts++; log({ type: "decision", action: "accept", score: p, ms, noiseDb: dbg.noiseDb }); }
      else { dbg.rejects++; window.__osWakeRejectedAt = Date.now(); log({ type: "decision", action: "reject", score: p, ms, noiseDb: dbg.noiseDb }); press(INT); }
      res(ok);
    };
    if (peak(t0 - LOOK, t0) >= ACCEPT) return done(true);
    const iv = setInterval(() => {
      if (peak(t0 - LOOK, Date.now()) >= ACCEPT) { clearInterval(iv); done(true); }
      else if (Date.now() - t0 >= WAIT || !window.__osWakeOn()) { clearInterval(iv); done(!window.__osWakeOn()); }
    }, 40);
  });
}

/* stage 2 heard "Alexa" but stage 1 never woke */
function onScore(s, t) {
  const h = hassOf(), playing = st(h, MP) === "playing";
  if (s < (playing ? TRIG_PLAY : TRIG) || t - lastFire < 2500 || sat === "responding" || t - busyAt < 2000) return;
  lastFire = t;
  setTimeout(() => {
    if (listenAt >= t - 1500) return;           /* stage 1 woke too */
    dbg.missed++; log({ type: "decision", action: RECOVER ? "recover" : "missed", score: s, playing });
    if (RECOVER) { ownWakeAt = Date.now(); press(WAKE); }
  }, 700);
}

/* hold the wake chime until stage 2 agrees; os-echo-stock reads __osWakeVerdict to hold the bar too */
const hook = () => {
  const fx = window.OSEchoFX; if (!fx) return false; if (fx.__wk) return true;
  const orig = fx.play;
  fx.play = function (k, g) {
    if (k !== "wake" || !ON_ECHO()) return orig.call(this, k, g);
    const p = verify(); window.__osWakeVerdict = { p, t: Date.now() };
    p.then((ok) => { if (ok) orig.call(fx, "wake", g); });
    return null;
  };
  fx.__wk = true; return true;
};
const hi = setInterval(() => { if (hook()) clearInterval(hi); }, 500); hook();
})();
