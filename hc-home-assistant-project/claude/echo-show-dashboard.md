# Echo Show 8 dashboard (v3.9, Nov 10, 2026)

Jailbroken Echo Show 8 (gen 1, LineageOS) running VACA 0.14.1. See [[echo-show-android-tuning]] for the Android side (kiosk, buttons) and [[echo-show-sounds]] for the original Echo sounds.
- Device stem: `vaca_amzn_echo_show_8_3a31`, device id `ec03f4d2ee9afa40eaee338d45e57228`, area Kitchen.
- HA user "alexa" is not admin: it can upload images but can't delete them.
- **Pipeline:** "Gemini Assist" `01m1mv4wd92910191722ek9eyr` (agent `conversation.google_ai_conversation`, Groq Whisper STT, Piper TTS, prefer_local_intents on).
- **Webview:** 961×601 CSS px, dpr 1.33, origin **https**://YOUR-HOST.duckdns.org:8443, which is a secure context.
- **Owen's full Echo backup:** Zima `/DATA/.media/sda3/alexa backup/` (`echo-crown/raw-backup` = full eMMC image, `echo-backup/mmcblk0-full.img`, boot0/boot1). Nothing else is needed from him.

## v3.9 (Nov 10): map, weather, climate, calendar, cameras, sound latency
- **Three new modules** (os-echo is ~125 KB, near the inline limit):
  - `os-echo-map` `62091a712e324699b1dd0306916a2739` (11,239 B, sha `2fae216b…`): `OSEchoMap.pins()` groups people within 30 px into ONE pin with stacked Life360 photos (tracker `entity_picture`, initial fallback, "+N" after 3). `<os-echo-map>` = Family panel: map left, people right; tap a person or single pin → detail (photo, place, here-since, battery, driving/speed, miles from home, last update, Wi-Fi) and the map zooms to them; tapping a group pin highlights those rows. Home widget pins use it too.
  - `os-echo-wx` `ccef3e2bfbdd4b14abd646a1c059c97f` (12,209 B, sha `56e976c2…`): `<os-echo-weather>` full-screen: big now + 7-day (left), 12-hour strip, live **RainViewer radar** (last 6 frames looped over ArcGIS dark-gray tiles, z7 centred on zone.home, refresh 10 min) and 4 tiles (wind, humidity/dew point, UV, sunrise/sunset). Subscribes to daily + hourly forecasts itself. Verified on the Echo: 96/96 radar tiles load.
  - `os-echo-climate` `86774a72528e435aa941e955f4db3f51` (12,924 B, sha `291c6ebe…`): `<os-echo-climate>` one big card per thermostat: drag dial (drag only starts on/near a handle so stray taps can't jump the setpoint), − / +, inside-temp dot, "Heating now/Holding", Off/Heat/Cool/Auto (Auto = two handles + Heat to/Cool to). Sends 900 ms after the last change. Header shows "Outside NN°".
- **Calendar add-event** is now a centred floating card (`.sheet.evs`, `_sheetMode(center)`), title centred, rows grouped in one rounded panel with every control in the same centred column, segmented No/Yes and length. (Class `.ev` was already used by the home event list, hence `evs`.)
- **Cameras:** go2rtc `ring:` source (refresh token) returns 401 invalid_grant, so the live view now uses `webrtc-camera` with `entity: c.live` (ring-mqtt `camera.*_live_view`). Two-way talk still uses go2rtc `front_door`/`downstairs` and needs Owen to generate a new Ring refresh token himself.
- **Sounds:** VACA's own wake sound select = None (it was the 2nd wake sound). fx: keep-warm 25 Hz at 1e-4 gain so Android never closes the audio output; leading silence (50–90 ms) is skipped per file; `latencyHint: interactive`; volume blip plays immediately; key volume set debounce 60 ms.
- **Light bar** 2.1vh (was 1.25), glow 9vh.
- **Rainbow bar:** View Assist `assist_prompt: flashing_bar` (no "none" option). os-echo hides `view-assist-overlays` with a !important style; verified display none on the Echo. If Owen still sees it, check `/DATA/home/Harper/echo-cdp/wake_*.png` from `watch.py`.
- **Night clock:** `night_lux: 2`, `day_lux: 3` (Owen: the kitchen level at 07:09 Nov 10, reading 2, is the max for night mode). Still needs 90 s dark to enter, 3 s at ≥ 3 to leave.
- Tested in the harness (1280×800 and 961×601) and Puppet via a temporary `zz-test` view with `start_panel` (removed afterwards). Puppet blocks external images (tiles, Life360 photos) and icons; the Echo itself loads them.

## Alexa Recorder (v3.7): beta-test data for later review
- **Integration:** custom `alexa_recorder` 1.1.0, written by Claude. It lives in `/config/custom_components/alexa_recorder`; source is in `outputs/ha/alexa_recorder/` and `Desktop/ha/alexa_recorder/`. Config entry `01M71N2114KG4XS0W28CQ8W06Q` (UI, no YAML).
- **Installed by Owen:** Terminal app, `curl … | sh` from a temporary http.server on the Zima at :8765. Claude may not write into custom_components itself; the Downloader route was denied.
- **How it works:** polls `hass.data["assist_pipeline"].pipeline_debug` every 2 s; sets `debug_recording_dir = /media/alexa_log/raw`; reply audio from `/api/tts_proxy/<token>`.
- **Folder layout:** `/media/alexa_log/conversations/<date>/<HH-MM-SS>_<device>/` with `turnNN_user.wav`, `turnNN_alexa.wav`, `conversation.wav`, `turnNN.json`, `turnNN_events.json`, `turnNN_screen.png`, `turnNN_notes.json`, `transcript.md`; `index.jsonl` in the root. Kept forever.
- Fires `alexa_recorder_turn_saved`; service `alexa_recorder.add_notes`. `automation.alexa_activity_logger` → `script.alexa_log_turn` (screenshot + review into the folder).

## v3.8 (light bar, mute, volume keys)
- `os-echo-fx` holds the light bar CSS and the sound player (`OSEchoFX.play/ring/chime/load`).
- Light bar: `.bar` > `.gl` `.sp.l` `.sp.r` `.spot`; attributes `ax=listening|processing|responding|closing`, `muted`, `unmuting` (700 ms red collapse, never blue).
- `_mute(on, local)`: F3 key and HA state; first sync after load is silent; HA state ignored 2.5 s after a local press.

## v3.7 card changes
- "All Screens" grid replaces the tab rail. Control Center volume slider sets live while dragging.

## Gemini agent prompt (v3.6, approved by Owen Nov 9)
- Conversation subentry `01M1MTZF6HEBV2SPV45ZGXBTQQ` of entry `01M1MTZF6HYNNC21PGCSSGWE43` (gemini-3.5-flash-lite). Backup: `claude/gemini-prompt-backup-2026-11-09.txt`.

## Wake word and listening (v3.6)
- VACA `continue_conversation` OFF, `wake_word_threshold` 7.5, `noise_suppression` low, `wake_word_sound` None.

## Dashboard config (`alexa-dashboard`)
- **View `home`:** `custom:os-echo` (calendars, `yt_key`, va, vaca, weather, night_lux 2, day_lux 3). **Subview `replay`:** `replay: true`.

## Resources
- **os-echo:** `9347e79764e44f0fafd26fd239d93056`, 125,431 bytes, sha256 `adbb42f1…`.
- **os-echo-fx:** `0969a981679a412c9833a5e3085e4a69`, 7,860 bytes, sha256 `17c2c504…`.
- **os-echo-map / -wx / -climate:** see v3.9.
- **os-echo-chat:** `4ae5c92c68164ff290188f4c8c7981c6`, 14,801 bytes. **os-echo-news:** `f181935dab8441dc922f37beae4aa482`, 11,107 bytes.
- **Sources:** `outputs/ha/` and `Desktop/ha/os-modules/`.
- **Deploying:** `edits` + `config_hash` (for big diffs generate line hunks against the deployed copy and verify the returned hash), then `button.<vaca>_refresh`.

## Testing rule
- **Never play audio on the Echo** (kitchen). Use the harness (`scratchpad/echo/t7.html`, `python3 -m http.server 8765` + Playwright), CDP on the Zima (`echo-cdp/cdp.py 9222 <js>`), and Puppet via a temporary view.

## Open items
- Owen: new Ring refresh token for two-way talk (go2rtc).
- Original Alexa voice: not possible (Amazon cloud voice, not in the backup). Offered Google AI TTS / other Piper voices.
- Confirm the recorder on the first real voice turn; confirm wake shows one bar and one sound.
- Kiosk exit via the ADB integration; Amazon cart (proposal only); free web search.
