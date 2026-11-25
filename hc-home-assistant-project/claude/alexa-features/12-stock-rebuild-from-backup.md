# Stock Echo Show rebuild from Owen's own Fire OS backup (Nov 17, 2026)

Owen asked: rebuild Alexa from his kitchen Echo's own backup, with Home Assistant filling in what isn't on the device (the AI). He chose all parts plus the wake word and audio processing, and editing the live screens (backup first).

## Backups taken first
- HA: `/config/backups-claude/echo-rebuild-2026-11-17/`: `lovelace.alexa_dashboard`, `lovelace_resources`, `lovelace.view_assist`, `alexa-sounds/`.
- Echo: the LineageOS boot animation was pulled to Zima `/DATA/home/Harper/echo-backup/lineage-bootanimation/bootanimation-lineage-2026-11-17.zip` (sha256 `7c7ea692…`).
- Dashboard photos before: picsum list (in the backup above).

## Source of the files
- Backup image: Zima `/DATA/.media/sda3/alexa backup/echo-crown/raw-backup/full-emmc.img`. The system partition (p12) starts at byte offset **100139008** (sector 195584). Fire OS 6574.1 (NS65741/8151).
- Read without root using pure-Python `ext4` in `/DATA/home/Harper/echo-sounds/venv`. Scripts in `/DATA/home/Harper/echo-fireos/`: `fireos_ls.py` (list), `fireos_get.py OUT /path...` (copy out), `fireos_find.py REGEX` (search). Extracted copies are in `echo-fireos/extracted/`.
- Note: an empty `echo-fireos/system.img` is left over (truncated to 0 B on purpose).

## What lives where
- **Assets** on HA: `/config/www/echo-stock-edU4oOWQEk/` (random folder name; /local is reachable without login through DuckDNS, same as `alexa-sounds`). Contents: `lottie/` (11 bar animations, 960×200 @60 fps), `fonts/` (Ember, Ember Display, Bookerly as woff2), `wx/` (stock weather icons), `bg/` (stock wallpapers as jpg), `img/`, `lottie_light.min.js` (lottie-web 5.12.2, MIT, from npm).
- Bundle builder: Zima `echo-fireos/make_bundle.py`. Transfer route: Zima → Mac `/Users/haclark/ssh-mcp-transfers/` (zima-ssh `sftp-download-file`) → HA (`ha` profile `sftp-upload-file`).

## Screen changes (resource `b944839c92804c5aad3207dd3a6c5efa` = `os-echo-stock.js`, copy at `ha/os-modules/os-echo-stock.js`)
- Patches `os-echo` from outside: wraps `_tick` (first tick injects CSS and the bar) and replaces `_islRing`. No edit to os-echo itself.
- Fonts: Amazon Ember for text, Ember Display Light for the clock and countdowns, Bookerly for the alarm time.
- Alexa bar: the stock Lottie files driven by os-echo's `ax`/`muted`/`unmuting` attributes: listening = ListeningEntry → ListeningRamp (loop); processing = ThinkingLoop; responding = ListeningRamp; closing = ListeningExit; mute = MuteEntry or ListeningToMute (holds); unmute = MuteExit. The old CSS bar is hidden only after the animations load (`.stk-ok`).
- Timers/alarms: stock accent `#00C9FF`, slate `#232F3E`, outlined pills; new full-screen ringing card (timer: pulsing blue radial + 0:00 + Stop; alarm/reminder: Bookerly time, stock weather icon + temperature, Snooze/Stop). Same `data-snz`/`data-stp` buttons, so os-echo's handlers still work.
- Weather: `ha-icon mdi:weather-*` on the home widget and weather page are swapped for the stock PNG icons (sized from the icon's rendered box).
- Dashboard `alexa-dashboard` home `photos` now = 10 stock wallpapers from `bg/`.
- Checked silently on the Echo (CDP probes `echo-cdp/q_stock*.js`, screenshots): fonts loaded, 7 animations ready, listening/thinking/exit bars, timer and alarm ring screens, then `q_stock_ring_home.js` put the island back.

## Boot animation
- Installed the Fire OS `bootanimation.zip` (sha256 `9b2ec908…`) at `/system/media/bootanimation.zip` via `adb root` + `adb remount` (no reboot needed for the remount). adb was put back to non-root afterwards.
- **Rebooted Nov 17 ~9:56 AM with Owen's OK** (nobody in the kitchen): logcat shows the boot animation ran ~47 s and exited with status 0 (no load errors). No frame was captured: adb over Wi-Fi only came up after it finished.
- Undo: `adb root; adb remount; adb push <lineage backup> /system/media/bootanimation.zip; adb unroot`.

## Silent end-to-end test after the reboot (Nov 17, ~10 AM, Owen's OK)
- Volumes saved first (`echo-backup/volumes-before-silent-test.txt`: media 4, alarm 1). Media set to 0 with `cmd media_session volume --stream 3 --set 0` (`media volume …` silently does nothing on this build). Alarm stream refuses 0 (range 3–7); the Echo page plays everything through media anyway. Media put back to 4 afterwards.
- After the reboot: dashboard loaded the stock module (fonts, 7 animations, weather icons), the kitchen listener's `adb reverse tcp:8780` came back by itself.
- Real 20 s timer (`view_assist.set_timer`): stock countdown ring, then the stock ringing card; pressing Stop (the page's own `[data-stp]` button via CDP) turned the alarm switch off, cleared the timer and returned home.
- Real listening (`assist_satellite.start_conversation`, start_message "Test."): stock listening bar + dim, back to idle by itself, bar cleared. This test turn may appear in the Alexa log / recorder at ~10:00 AM Nov 17.
- Side note: `weather.forecast_home` went unavailable at 9:54 AM (before the reboot); the weather service, not this work.

## Wake word: Amazon's own on-device model (working offline, side-by-side test running)
- Backup has `/system/local/models/keyword/en-US/ALEXA/` (Pryon): `encoder/primed_encoder.int8-streaming.onnx` (in [1,8,64] → embedding 100, streaming conv buffers), `alexa-wakeworddecoder/alexa.streaming.fixed.int8.onnx` (LSTM, `ww_scores` [16,1,3], **class 1 = "Alexa"**), plus DVAD (device-directed speech), speaker-ID, stop-word and playback (self-wake) models.
- Front end (audiofrontendconfig): LFBE 64 bins, 80–7200 Hz, 25/10 ms, povey window, pre-emphasis 0.96875, DC removal, natural log, **int16-scale samples** (BN mean ≈10 matches).
- Thresholds from `alexa_spotter.cfg.json`: accept 0.92; 0.84 while audio plays; 0.65 while an alarm rings; lock period 132 frames.
- Custom ops HybridGemm/HybridLSTM converted to standard MatMul/LSTM by `echo-fireos/ww/convert.py` → `ww/enc_B.onnx`, `ww/dec_B.onnx`. **Correct dequantisation: W = scale × (q − zp)**, rows = outputs (always transpose for MatMul). ReduceSum axes moved to an input. (Mode A, W = scale × q, gives garbage.)
- Runner: `ww/ww.py` (front end + streaming, 80 ms per step). Gotcha: onnxruntime lists default-valued inputs only in `get_overridable_initializers()`; the conv-buffer state must be fed from there or the encoder never updates.
- **Evaluation over all 542 kitchen-listener clips (Nov 16–17), `ww/evalclips.py` → `ww/eval.jsonl`:** all 4 real commands 0.99+; "What are you doing with Alexa?" 0.0015 (correctly not a command); 0 false wakes in 537 other clips (max 0.05).

### Side-by-side (shadow) test, started Nov 17 9:50 AM
- `ww/shadow.py` runs on the Zima (`setsid nohup nice -n 15 …`, pid in `ww/shadow/shadow.pid`, log `ww/shadow/shadow.log`). Every 20 s it scores new kitchen-listener clips and appends to `ww/shadow/shadow.jsonl`: Amazon score / would-wake (≥0.92), whether the live wake word woke (`sat` contains listening), Whisper text, "Alexa" first vs only mentioned. Nothing is sent to the Echo or HA.
- **Not supervised:** if the Zima restarts it stops; restart with the same command from `ww/`. Kitchen audio is kept only 2 days, so clips are scored as they arrive.
- Summary: `cd /DATA/home/Harper/echo-fireos/ww && /DATA/home/Harper/echo-sounds/venv/bin/python -I summary.py [day ...]`.
- **First result (backfill of Nov 16–17, 542 clips):** 4 real commands: Amazon would wake 4, live woke 4. Live wake word also woke 6 times without a command (TV/kitchen talk, incl. "What are you doing with Alexa?"); Amazon scored all 6 below 0.01. Amazon false wakes: 0.
- Limits: clips only exist when the kitchen listener's loudness detector fires, so very quiet wakes may be missing from both columns; "live woke" on a clip can also be follow-up listening.
- Next: review after a day or two of real use; if it holds, wire Amazon's detector in as the real wake trigger (decide where it runs: on the Echo page vs the Zima).
