# Alexa light bar (os-echo-stock), Nov 18–19

## Current version (Nov 19, ~7:00 AM, live): correct stock artwork + stock behaviour, drawn by a worker
Owen (6:34 AM): "The bars aren't identical. When alexa is activated, it still has the same issue. The mute is way too thin. Retry on this. Double check/fact check your work."

### What was wrong with the 1:35 AM version (and the original)
- **The look was a renderer bug.**
  - The artwork's gradient-stroke track mattes get an objectBoundingBox mask region in lottie-web's SVG renderer. For these flat paths that region is a sliver.
  - Result: listening was only partly drawn; mute, exit and listening-to-mute were a **1 px line**; thinking was blank.
- **Fact check:** I rendered all 7 clips three ways:
  - lottie-web SVG with mask regions opened (`maskUnits=userSpaceOnUse`, −5000/10000);
  - **rlottie** (Samsung's renderer, independent);
  - the old sliver render.
  - Opened-SVG ≈ rlottie in geometry and colour (only rlottie's glow is a bit weaker). The sliver render matches neither.
  - So the opened version is the real artwork. Mute is a **14 px red band**, not a line.
  - The Echo's own capture of the opened version equals the desktop one (16×4 colour signatures within 1–3/255).
- **The activation glitch was the behaviour:** ListeningRamp was looped (grows 1 s, snaps back, repeat) and replayed while Alexa spoke.
- **A shadow darkened the bar.** os-echo's closed bottom sheet (`.sheet`, z 18, parked just below the screen) casts `0 -12px 36px rgba(0,0,0,.55)` up over the bottom ~50 px. It made the middle of the bar up to ~35% darker (earlier I wrongly guessed a FireOS layer). Fixed with `:host(.stk-ok) .ax{z-index:19}`.

### What it is now
- Resource `b944839c92804c5aad3207dd3a6c5efa`, hash `34c8f619…`, 25,880 bytes.
  - Sections 1, 3 and 4 are byte-identical to the original file.
  - Local copy: session file `os-echo-stock3.js`.
- **Frames:**
  - `/config/www/echo-stock-edU4oOWQEk/bar2.bin`, 2.48 MB, sha256 `be1c4ea1…`.
  - All 323 frames are captured from the Echo's own web view with masks opened: Zima `echo-cdp/cap2.py`, frames in `echo-fireos/barcap_fx/`, packed by `pack2.py`.
  - Same format as bar1.bin.
- **Behaviour = stock Bamboo voice chrome** (logic from the Nov 18 canvas port). Constants were re-checked against the decompiled bytecode on Nov 19 (float bits decoded):
  - ProgressSmoothing: base 0.0015, max 0.002, min change 0.05, weight/gain threshold 0.4, gain 0.2, 3 samples.
  - ExponentialMovingAverageHelper: 50 samples, history 0.6, far-field initial max 0.0043.
  - LISTENING: ListeningEntry, then **ListeningRamp scrubbed by the kitchen-mic level** (`__oselTap`, 512-sample RMS). It never plays on a timer.
  - THINKING: ThinkingLoop, which leaves at the end of a loop.
  - PRIVACY: MuteEntry, held; MuteExit to leave; ListeningToMute from listening.
  - **RESPONDING: no visual.** `AttentionStateVisualsFactory` creates none for RESPONDING (only CONTINUOUS_RESPONDING). So the bar leaves when Alexa speaks.
  - Transitions: exit→enter, one on deck, 4 s cap.
  - The os-echo-wake verdict hold is kept: tested accept (bar after the verdict) and reject (no bar).
- **Worker:**
  - The state machine, smoothing and drawing run in a Web Worker with `transferControlToOffscreen()`, using the worker's `requestAnimationFrame`.
  - Frames are kept as textures: decode, draw into a scratch OffscreenCanvas, then `transferToImageBitmap`.
  - The page only sends the wanted state and the RMS values (only while `ax=listening`).
- Debug: `window.__stkbar` = {state, raf, err, worker, dump()}. `dump()` returns the last 300 worker events: want/go/play/end/now/gap(>34 ms)/slow(draw >6 ms)/lvlpeak.

### Verified on the Echo (visual only, attributes set by hand, voice level injected, no sound)
- **On-screen pixels** (adb screencap, compared with the expected frame composited on a second screencap taken with the canvas hidden):
  - mute held, listening at rest, thinking, loud listening: all mean diff ≤ 0.009/255, max 1/255.
  - Mute band is rows 76–90 at the bottom.
- **State sequence:** entry 0.55 s → ramp follows the injected level (peak 0.95) → thinking at once → exit at the loop end → idle; mute in/out works.
- **Smoothness:**
  - A 600 ms main-thread stall during listening caused **no** dropped bar frame.
  - No draw took over 6 ms.
  - Remaining drops: 0–4 single frames (35–46 ms) per 5 s cycle. A bare worker that draws 1 pixel on the idle page drops the same (3–6 per 8 s), so this is the device's baseline.
- Not testable without speaking: a real wake. Check `__stkbar.dump()` right after one.

### Backups (`/config/backups-claude/2026-11-19/`)
- `lovelace_resources.before-bar2`
- `os-echo-stock.bar1-svg-capture.js` (1:35 AM version)
- `lovelace_resources.before-bar-revert`
- `os-echo-stock.canvas-port.js` (Nov 18 11:35 PM)
- `os-echo-stock.original-svg.js` (pre-Nov-18)

### Notes
- CDP `Page.captureScreenshot` does not show the canvas; use `adb exec-out screencap -p`. `screenrecord` adds enough load to drop frames itself.
- The adb forward `tcp:9222` disappears now and then. Re-add with `adb forward tcp:9222 localabstract:webview_devtools_remote_1169`.
- os-echo's `.dim` (42% black while listening/thinking) is not stock (the stock overlay has no dim-behind flag). It sits under the bar and was left as is.
- No longer used (left in place): bar1.bin, lottie_light_canvas.min.js, lottie JSON.

## Superseded
- **Nov 19, 1:35 AM:** the original sliver-SVG look, pre-captured (bar1.bin), original looping logic. Mute was 1 px; ramp loop snapping.
- **Nov 18, 11:35 PM:** stock logic with lottie-web's canvas renderer (0.75 scale, cropped). Owen: "not close to what the bar on the real echo looks like."
- **Nov 18, 8:30 PM:** pre-rendered canvas frames at 30 fps.

## Found while testing (not changed)
- Since ~4 PM Nov 18 the kitchen Echo false-woke ~60–90 times an hour (stage 2 scored them 0.000 while VETO was off). Another chat has since backed up `os-echo-wake.js.before-veto-on`.
