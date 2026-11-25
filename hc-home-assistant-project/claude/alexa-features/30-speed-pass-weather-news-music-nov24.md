# Speed pass: weather, news, music pages and system (Nov 24, 2026)

Owen (3:55 PM): "look through every page on the alexa and optimize them as much as possible to reduce any lag. I've noticed lag on the news player and weather page. Fix both. Don't play any audio, don't change the screen in case someone uses it."
Owen (4:23 PM, continued at 8:51 PM): "you should have a new connector. use it to optimize EVERYTHING more." The new connector is the Echo MCP (root adb, page eval, CDP, logcat).

## How it was tested (silent, nothing on screen)
- Each page was mounted on the real Echo inside an invisible test layer: `opacity:0.001`, `pointer-events:none`, on top. Below one pixel level, so nothing changes on screen, but the GPU still draws it fully.
- News tests were triple-muted:
  - the player was created with `mute=1`;
  - `unMute` and `setVolume` were blocked;
  - `_quiet` was forced true.
- No volume was changed.
- Measured with CDP tracing (`DrawFn_DrawGL` frame gaps).
- Tools are in Zima `/DATA/home/Harper/echo-cdp/perf1124/`:
  - `run.py <plan.json>` runs a test plan and always tears down;
  - `plan_*.json`, `h_*.js`;
  - `paints.py` shows which layers repaint;
  - `inval.py` traces invalidation;
  - `idle.sh <label>` takes a 25 s idle trace;
  - `sum.py`.
- **Gotcha:** a trace cut off mid-run (by the 60 s run-command timeout) can leave a run hanging. Run long plans with `nohup … &` and poll.

## Results (real Echo)
| Page | Before | After |
|---|---|---|
| Weather, radar running | 7.7 frames/s, 65 ms GPU per frame | 24 frames/s, 9.5 ms |
| Weather, opening | 10 frames/s, median gap 84 ms | 18.5 frames/s, 19 ms |
| News, video with controls or story pill showing | 16–18 frames/s, about 60 janky frames per 5 s | 31–32 frames/s (full video rate), 8 janky. Rechecked live at 8:55 PM: 32.2 frames/s. |
| News, video alone | about 31 frames/s | unchanged |
| Home idle | GPU thread about 16%, about 1.4 s of raster per 20 s | GPU thread about 9%. First A/B pair; the second idle pair was too quiet to compare. |

## Changes (all live in HA resources)
- **os-echo-wx** `ccef3e2b…`, hash `765467ff…`:
  - Removed `backdrop-filter: blur(20px)` from the cards. They sit on a plain gradient, so the change is pixel-identical; this was checked in Chrome.
  - Radar: one canvas per layer (base, 6 rain frames, labels) instead of about 100 `<img>` tiles. Tiles are decoded asynchronously.
  - The radar starts 480 ms after open, once the slide-in has finished.
  - A ResizeObserver re-centres the radar if the card resizes. This also fixes the old bug where home sat off-centre: the map was laid out before the forecast rows arrived.
  - Forecast redraws are merged with rAF; only changed blocks are rebuilt.
  - Added an `isConnected` guard.
- **os-echo-news** `f181935d…`, hash `4c4eca04…`:
  - No backdrop blur over the video: back and mode buttons, story dock, story-topic pill. Their fills went from .72/.78 to .82/.86 instead. This is the only slight visual change.
  - Faded controls and the pill get `visibility:hidden` after fading.
  - The LIVE dot animation pauses while hidden.
- **os-echo-music** `af5a44ef…`, hash `df0d5dfc…`:
  - The full-screen album-art backdrop (CSS `filter: blur(48px) saturate(1.4) brightness(.4)`, re-blurred by the GPU on every redraw) is now painted once into a quarter-size canvas with the same filter (`_bgPaint`).
  - Side-by-side difference is 1.3/255 on average. Tested on the Echo.
- **NEW os-echo-perf** `2bc7bf63…`, hash `5dc3dc4f…`, 1.5 KB:
  - Adds `.isl{will-change:transform,opacity}`, `.hint{will-change:opacity}` and `.bg{will-change:opacity}` inside os-echo's shadow root, so they keep permanent layers.
  - It works by wrapping os-echo's prototype `hass` setter. It is its own module because os-echo is over the 128 KB inline limit.
  - **Why:** island resizes, hint fades and photo cross-fades made Chrome create and drop layers each time, re-rasterising big parts of the 1280×800 screen (43 full-screen Paints in 25 s at idle).
  - **Undo:** delete the resource and press Refresh.

### Hot-loading into the running page (no reload, no screen change)
New prototype members were copied onto the live classes. Chrome keeps the `connected`/`disconnectedCallback`s it saw at `define()` time, so:
- Weather and music are fully live.
- News: its CSS lives in `connectedCallback`, so a temporary in-page wrapper on `play`, `briefing`, `_wake` and `_head` rewrites the old style text on first use. It is gone after the next reload, when the deployed module applies.
- os-echo-perf: applied live (its style was injected with the same id).

## Reviewed, left as is (with reasons)
- **Audio HAL (about 60% CPU):**
  - `readThread0` (about 40%) is Amazon's 6-mic, 24-bit, 16 kHz capture with beamforming/AEC (`audio.primary.amazon_wrapper`). The wake word depends on it.
  - `writer` (about 17%) is the speaker stream, deliberately kept warm by os-echo-fx (25 Hz at -80 dB) so sounds aren't late, plus the listener's AudioContext.
  - Don't touch either.
- **GPU clock:** MT8163 Mali OPPs are 299/416/520 MHz, all at 1.15 V. DVFS sits mostly at 299 MHz. Fixing it at 520 MHz (`echo 520000 > /proc/gpufreq/gpufreq_opp_freq`) made no difference on the GPU-heavy news test, because the bottleneck is the CPU-side compositor (RenderThread `DrawFn_DrawGL`). Left on DVFS.
- **CPU:** already on the `performance` governor at 1.3 GHz. Temperature is about 50 °C.
- **Wi-Fi:** 5 ms average and 10 ms maximum to HA, signal -45 dBm. Verbose Wi-Fi logging is on: harmless, about 6 log lines per second.
- **HA traffic to the Echo:** 0.2 entity updates per second, which is negligible. The Echo volume-sync automations only run on real volume changes.
- **Bluetooth:** no paired devices, but VACA's Bluetooth proxy is on (BLE scans). Uses about 0.6% CPU. Left on.
- **VACA settings:** motion detection, video stream and diagnostics are off. Noise suppression is low and mic gain is 3 (both wake-word related, left alone).
- **os-echo island mask:** the no-op `-webkit-mask-image` hack is still in os-echo. os-echo is over the inline limit, and the benefit is small.
- **Other pages:** climate, calendar, map, chat, glance and the rail (blur already disabled by the stock skin) have no expensive effects. The music sheet blur only shows while the sheet is open.

## Backups and undo
- All 44 inline resources from before the change are in Zima `/DATA/home/Harper/echo-backup/2026-11-24-perf/<resource_id>.js`. Hashes match HA's previous config hashes:
  - wx `56e976c2…`
  - news `7b8fb69c…`
  - music `51066e58…`
- **Undo:** `ha_config_set_dashboard_resource(resource_id=…, content=<backup file>)`, then press the Echo Refresh button. For os-echo-perf, delete the resource.
