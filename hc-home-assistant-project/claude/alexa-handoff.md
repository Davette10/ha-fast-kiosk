# Kitchen "Alexa" — handoff for a new chat (Nov 12, 2026, afternoon; updated Nov 24)

Start here in a new chat. The other project docs go deeper: `claude/echo-show-dashboard.md`, `claude/alexa-news.md`, `claude/alexa-log.md`, `claude/echo-dot-learnings.md`, `claude/alexa-helper.md`, `claude/voice-assistant-alexa.md`, `claude/alexa-music.md`, `claude/echo-show-android-tuning.md`, and the numbered `claude/alexa-features/` docs (newest last).

## READ FIRST (Nov 24): the "echo" connector = full control of the Echo
- An MCP server **`echo`** gives Claude direct, root access to the Echo (Owen granted full, unrestricted access on Nov 24). Prefer it over zima-ssh + adb one-liners. Tools: `echo_shell` (multi-line, root), `echo_adb` (any adb command: install, reboot, recovery, remount…), `echo_read_file` / `echo_write_file` (any size), `echo_transfer` (Zima ↔ Echo push/pull), `echo_screenshot` (real screen as an image), `echo_logcat`, `echo_page_eval` / `echo_cdp` (JavaScript / DevTools in the screen page, socket found automatically), `echo_input`, `echo_volume`, `echo_status`.
- In a chat its tools appear as `mcp__remote-devices__echo__*` (Owen's PC) once Owen has added it to his PC's Claude config; it is also registered in the Zima's Claude desktop. If the tools are missing, fall back to zima-ssh + adb as below.
- Server: Zima `/DATA/AppData/claude-desktop/config/.local/echo/server.mjs` (+ README.md); source in this project at `claude/echo-mcp/`. Every call is logged to `/DATA/home/Harper/echo-mcp/calls.log`.
- adbd runs as **root** (Rooted debugging is on). Owen's rules below still apply: no sound in the kitchen during tests (`echo_volume set 0`, then put it back), don't interrupt the news.

## READ FIRST (Nov 24): the Echo runs the fast standalone screen ("echo-fast")
- The Echo no longer loads the HA frontend. VACA loads **`/local/echo/index.html`** (HA `/config/www/echo/`; View Assist "Echo Show" option *home*). `boot.js` there opens one websocket, builds the `hass` object, provides `ha-icon` / `ha-svg-icon` / `<home-assistant>`, and loads the `alexa-dashboard` config and dashboard resources **live from HA** on every start.
- **So screen changes are still made in HA dashboard resources (os-echo*, edits + config_hash), exactly as before.** Nothing in LineageOS, the Android build or VACA needs changing for UI work. After editing a resource, press `button.vaca_amzn_echo_show_8_3a31_refresh` (only when the news isn't playing).
- **Rule for NEW screen resources:** the Echo only loads inline modules whose first ~400 characters (header comment) contain "echo", "alexa" or "Amazon orders" (not "Alexa Log"). Start every new module with `/* os-echo-xyz: ... */`.
- **Not available on the Echo:** built-in HA cards, more-info dialogs, `hui-*`, the frontend's `ha-card`, `loadCardHelpers` (except picture-entity). Use custom elements only. The Puppet replay view still uses the full HA frontend, so check the real Echo too (`echo_screenshot`, `camera.echo_show_screen`, or `window.__echoFast` → marks / errors / ready).
- VACA blocks page navigation: `location.reload/replace` do nothing. Reload only via the Refresh button (or `echo_cdp` Page.reload). Files in `/config/www/echo/` changed → bump `version.txt`. Don't remove guard resource `2b8125f77fdd4d0c8a12cdc2914905ac`.
- Details, numbers, backups and undo: `claude/alexa-features/28-fast-standalone-screen-nov23.md`. A general public version is at https://github.com/Davette10/ha-fast-kiosk (the Echo does not use the repo build).
- The Echo's normal media volume is now **6** (it was 3 on Nov 12). Put it back to whatever it was before a silent test.

## Rules Owen set (always follow)
- **No sound in the kitchen during tests.** Tests are text-only. For any playback test, set the Echo's Android media volume to 0 first and put it back afterwards (check the current level first; it was 6 on Nov 24):
  - `echo_volume` (set 0, then the previous value), or `adb -s 192.168.4.44:5555 shell cmd media_session volume --stream 3 --set 0`, then `--set <previous>`.
  - Check it with `adb shell "dumpsys audio | grep -A5 'STREAM_MUSIC:' | grep streamVolume"`.
  - Never test "play the news" or music through the voice pipeline or `conversation.process`. A local sentence trigger has no MCP user, so the test guard does not apply and it would really play.
- **If the news is playing, don't stop or change it.** Check before reloading the Echo (VACA refresh).
- **Credentials:**
  - Owen types all credentials himself. Never enter, use or repeat tokens or keys.
  - That covers the Ring token, the YouTube key (`yt_key` in the alexa-dashboard config), the Tavily key, the Gmail app password, Amazon logins and the HA-MCP secret URL.
  - Don't create HA users.
- **Before anything destructive** (clear, delete, reset, replace, overwrite): say what it destroys and give the backup step first.
- **Complaint pushes go to Harper only** (`notify.mobile_app_harpers_lphone`).
- **Amazon:** add-to-cart only, no paid services, no scraping. No real calendar events created or deleted.
- **Zima commands:**
  - zima-ssh `run-command` takes single-line commands only. Upload files as base64 chunks of 4400 characters or less and check the sha256.
  - Chained adb/python commands sometimes get refused with APPROVAL_UNAVAILABLE; split them into separate calls.
  - `privileged-command` doesn't work. Give Owen the sudo commands instead.
  - Editing the review bot's `.claude/settings.json` was blocked as self-modification. Don't retry.

## Hardware and how to reach it
- **Echo Show 8 (1st gen, "crown")** at `192.168.4.44:5555`.
  - Runs LineageOS 18.1 (Android 11, userdebug), VACA 0.14.1 and View Assist.
  - Dashboard is `/alexa-dashboard/home`, one card `custom:os-echo`, shown through the fast standalone screen (see READ FIRST). The replay view `/alexa-dashboard/replay` is rendered by Puppet for the logs.
- **adb on the Zima:** `/DATA/home/Harper/platform-tools/adb`.
- **CDP (run JS inside the Echo's webview)** without the echo connector:
  - Forward with `adb -s 192.168.4.44:5555 forward tcp:9222 localabstract:webview_devtools_remote_1172`. The pid can change after a VACA restart; find it with `adb shell grep -a devtools /proc/net/unix`.
  - Then run `cd /DATA/home/Harper/echo-cdp && python3 cdp.py 9222 <file.js>` (or `cdpx.py 9222 eval|shot|nav|perf ...`).
  - Probe files there: `q_state.js` (panel/rail state), `q_close.js` (closes the panel), `q_scroll.js`, `q_ef.js` (echo-fast status).
- **See the real Echo screen: `camera.echo_show_screen`** (new, hidden; generic camera).
  - Still URL: `http://192.168.6.170:8766/shot.jpg?k=<trigger key>`.
  - The Zima's `trigger.py` runs `adb screencap` and converts it to JPEG with ffmpeg (~3 s).
  - Use `ha_get_camera_image(camera.echo_show_screen, width=960, height=600)`.
- **Reload the Echo page:** `button.vaca_amzn_echo_show_8_3a31_refresh`. `location.reload()` is ignored inside VACA.

## Voice pipeline
- **Pipeline "Gemini Assist"** (`01m1mv4wd92910191722ek9eyr`):
  - prefer_local_intents is on.
  - Agent `conversation.alexa_with_backup` (alexa_helper) tries, in order: main Gemini → backup Gemini → OpenRouter.
- **Agents.** Google entry `01M1MTZF6HYNNC21PGCSSGWE43`:
  - Main subentry `01M1MTZF6HEBV2SPV45ZGXBTQQ`: gemini-3.5-flash-lite, thinking minimal.
  - Backup subentry `01M74FGJEB96S39B5QB5T47SKV`: gemini-3.1-flash-lite.
  - Both must always have the same prompt.
- **Prompt v3.13 is live on both** (sha256 `dc50689e…`):
  - File: `outputs/ha/gemini-prompt-v3.13.txt`. Zima copy: `alexa-review/prompt/live-prompt.txt`. Backup of v3.12: `prompt/backups/live-prompt-v3.12.txt`.
  - New in v3.13: a HOUSEHOLD NOTES template that injects open items from `todo.alexa_memory` and `todo.alexa_phrases`. Both lists are empty so far, and it renders "None saved yet."
  - Update a prompt with `ha_config_set_helper(helper_type=config_subentry, entry_id, subentry_type=conversation, subentry_id, config={"prompt": …})`.
- **alexa_helper is now 1.1.0** (Owen installed it and restarted). That version adds the two to-do lists Alexa Memory and Alexa Phrases.
- **Local sentence triggers run BEFORE the LLM.** They live in `automation.echo_show_screen_and_device_voice_commands` (no AI, instant): screens, volume, brightness, DND, news, lists, orders.
  - If a voice command acts "wrong" without any LLM trace, check this automation first.
  - Test which trigger a sentence matches without running it: `ha_call_service(ws_command="conversation/agent/homeassistant/debug", data={"sentences":[…],"language":"en"})`.

## News (Alexa+ style daily briefing)
- **Voice routing:**
  - "play the news", "what's the news", "show me the news", "headlines", "play Fox News", "daily briefing" → trigger `news`. It calls `script.alexa_play_news` and says only **"Here's your daily news."**
  - "watch Fox News" / "watch the news live" / other channels → trigger `news_live` → live TV.
  - Off the Echo, the same phrases play Fox News audio on that speaker.
  - **Fixed today:** "play the news" used to open live TV and say "Here's Fox News."
- **`script.alexa_play_news`:**
  - When the caller is the HA-MCP user `47794e4f4bb845e4a0f5aa4412ab70dd` (Claude or the review bot), it returns `test_only` and plays nothing.
  - Kitchen: sets `echo_cmd {panel:news, ch:briefing}` and returns say_first.
  - Fallback: the Fox hourly mp3 through Music Assistant.
- **Curation, in `os-echo-news.js`** (resource `f181935dab8441dc922f37beae4aa482`, hash `d5f98ba5…`):
  - Candidates: Fox uploads from the last 36 h, 75–900 s long.
  - Score: views/hours^0.8. Boosted when the story is also on YouTube's US News & Politics most-popular chart, and for family topics. Opinion shows rank lower.
  - Same-story dedupe, keep 8, cached 20 min.
  - Topics live in `todo.alexa_news_topics` via `script.alexa_news_topics`. Voice control is `script.alexa_news_control` (next / previous / pause / resume / stop).
- **New today:**
  - **Lite player:** the iframe is 62.5% size scaled ×1.6, so YouTube streams about 480p and buffers less.
  - **Next story** reuses the same player with `loadVideoById`: about 3 s instead of about 10 s.
  - **os-echo waits 480 ms** after the panel slides in before it loads YouTube.
  - **A repeat "play the news" while the briefing is playing** is ignored, so the briefing is left alone.
- **Verified at volume 0:** the briefing started at about 11 s, played full-screen with no half-open screen, and next took 3.2 s.

## Screen fixes today
- **The half-open screen was the os-echo page scrolling sideways.** The panel and rail sit off-screen to the right, and the page was scrolled 437 px. Owen saw this as "stuck between the news/Alexa screen and the tabs bar".
- **Fix:** `:host{overflow:clip}`, plus a scroll guard that resets scrollLeft/scrollTop on scroll and every 1.5 s.
- **os-echo** is resource `9347e79764e44f0fafd26fd239d93056`, hash `25ff2cb1…`, 127,611 bytes. The limit for inline resources is 128,000, so remove comments if you need room. Backup: `backups/os-echo-2026-11-12b.js`.

## Cameras
- **The 502 Bad Gateway** happened because the Ring "Live view" entities from the core Ring integration have no stream source. The WebRTC card fell back to camera_proxy_stream, and that failed.
- **Fix:** os-echo now plays ring-mqtt's RTSP stream through go2rtc with the WebRTC card:
  - Front door: `rtsp://127.0.0.1:8554/cc3bfb471de0_live`
  - Downstairs: `rtsp://127.0.0.1:8554/cc3bfbb9d552_live`
  - This applies to the camera panel and the doorbell glance.
  - Verified: a picture in about 6 s.
- **Talk button still broken:** go2rtc's Ring source has an expired refresh token (401). **Owen** must make a new token (`npx -p ring-client-api ring-auth-cli`) and paste it into go2rtc's Ring config himself.

## Family map (`os-echo-map.js`, resource `62091a712e324699b1dd0306916a2739`, hash `2d50befc…`)
- **Full screen:** the map fills the whole Echo screen and the panel header is hidden.
- **Floating controls:** back button and "Family" at top left, an "Everyone" card on the right, and a Trails control at bottom left (Off / Today / 24 hours / 3 days, remembered on the device).
- **Trails come from Life360 tracker history:**
  - Thinned to points about 40 m apart; points with gps accuracy over 250 m are dropped.
  - Each trail is drawn in the person's colour with a white casing and a start dot.
  - People who travelled together get side-by-side lines.
  - Tap a person to see only their trail, plus "Traveled (today)" miles.

## Logs, complaints and review
- **Alexa Log dashboard** `/alexa-logs/log` (`custom:os-alexa-log`, `page: true`). It has a Start review button, which runs `script.alexa_review` → Zima `trigger.py` port 8766 → `run.sh`.
- **Every complaint** (`script.alexa_log_feedback`) now saves a real screenshot of the Echo screen to `/media/alexa_log/feedback/<time>.jpg`, shown as "Snapshot:" in the log. The script description tells the AI never to ask for a screenshot.
- **Turn logs** (`script.alexa_log_turn`) still use the Puppet replay render, not the real screen. That is why the AI review said "standard dashboard instead of the news". A possible next step is switching them to `camera.echo_show_screen`.
- **Screen-use log, hidden photos and red-error watchdog:** `os-echo-watch.js`. One "Screen error · refreshed" happened at 7:22, during Owen's HA restart; that's expected.
- **Zima review bot:** `/DATA/home/Harper/alexa-review/`.
  - Files: `review-prompt.md` (steps 1–12; step 12 covers the prompt copy and `prompt/live-prompt.txt`), `trigger.py` (now also serves `/shot.png` and `/shot.jpg`) and `run.sh`. Its `CLAUDE.md` has the echo-fast rules (added Nov 24).
  - Backups are in `backups/`.
  - Service: `alexa-review-trigger.service` (User=Harper, Restart=always). To reload trigger.py, kill its pid; systemd restarts it in 10 s.
- **"Needs Owen" items from the 12:02 review:** all done except the optional Amazon voice-history export to `/DATA/Downloads/alexa-history/`.

## Owen's complaint from 7:23 AM
Marked fixed in `todo.alexa_feedback` with an explanation of the news trigger, the scroll bug and the automatic screenshots.

## Island detail cards + doorbell live view (Nov 15) — DEPLOYED (resource `2230504843a142ff9a114b62729c9a56`)
- **Code:** project doc `claude/os-echo-glance.js` (sha256 `04e7be39…`), also at `outputs/ha/os-echo-glance.js`. It's a new module resource that patches `os-echo` from outside, because os-echo is at the 128 KB limit.
- **Deploy:**
  1. `ha_config_set_dashboard_resource(content=<file>, resource_type="module")` as a NEW resource.
  2. Check that the live os-echo hash is still `25ff2cb1…` (the module patches `_islClick` and `_door`).
  3. Press `button.vaca_amzn_echo_show_8_3a31_refresh`, but only when the news isn't playing.
  4. Check with `camera.echo_show_screen`.
- **Tapping the resting island** ("dynamic widget") expands it in place into a card (mode `gx`, 25 s, dimmed background):
  - **Weather / sunset / sunrise:** now, high/low, humidity, wind, 5 days with rain %, sunrise/sunset, and a "Full forecast and radar" button.
  - **Packages:** up to 4 open orders from `todo.amazon_orders`, each with picture and arrival, plus an "All orders" button.
  - **Event:** the next 5 events with times and countdown, plus "Open calendar".
  - **Music:** art, title, artist, progress bar, previous/play-pause/next, plus "Open music".
  - **Timers and alarms** keep the old expanded view.
- **Doorbell:** motion or a ring turns the island into a live view of the front door (mode `door`): red LIVE dot, ring-mqtt RTSP through the WebRTC card, orange ring outline and a chime on a ring.
  - Tap it to open the full camera screen with sound and Talk.
  - It shrinks back 30 s after the motion/ring ends.
  - Motion only shows on the resting home screen. A ring shows over anything except an alarm or a camera question.
  - **This replaces the old auto-open of the full camera screen on a ring.** The home Front Door widget stays on its snapshot so the Echo doesn't decode two streams.
- **Tested** in headless Chromium and loaded on the Echo (Nov 15).

## Nov 15 evening: volume, sounds, music screen, voice
- **One volume.** The Music Assistant player `media_player.echo_show_music` had drifted to 22% (−13 dB), so music was far quieter than Alexa's voice and sounds. Owen chose "one volume for all": player set to 100%, Echo media volume 9 → 5 (level 3) so music stays about as loud (measured silently with `dumpsys media.audio_flinger`: track G −34 dB before, −33 dB after). Voice volume follows via `automation.echo_show_sync_volume_sliders` (now 2/7).
  - New `automation.echo_show_one_volume_music_player_follows_the_echo`: if anything sets the player's volume (AI, Music Assistant), it moves that level onto the Echo volume (0.4 → level 4) and puts the player back to 100%.
  - Echo speaker curve (STREAM_MUSIC and notification, `dumpsys media.audio_policy`): 1% −58 dB, 20% −40 dB, 60% −17 dB, 100% 0 dB; index % = idx/15 (media) or idx/7 (voice).
- **Sounds (`os-echo-fx.js`, hash `e24aa772…`):** each file trimmed to at most −17 LUFS (Music Assistant's normalisation), from measured loudness: wake −14.5, end −23, mute −25.8, unmute −22.9, volume −17.4, alarm −16.3, timer −16.1, reminder −19.2, notification −20.4, error −15, shutter −17.3. `play(k, gain)` accepts gain up to 2 with a limiter above 1.
- **Volume blip (`os-echo-glance.js` `_vSnd`, hash `87d0dbe0…`):** plays at the level being set, not the music volume: shift = curve(new) − curve(current) when a key/slider is ahead of the Echo; waits up to 1.5 s when coming up from 0. Checked silently (patched `play`): 9→10 gain 1.386, 9→8 0.643.
- **Music screen (`os-echo-music.js`, hash `37f46494…`; backup `outputs/ha/backups/os-echo-music-2026-11-15.js`):**
  - Blank art fixed: MA's image proxy now only serves sizes 80/160/256/512/1024 (others → 400); `ART()` snaps up. Now-playing art prefers the queue's https Spotify image; background uses a 160 px copy. `window.OSEchoArt` is shared with the glance music card.
  - Redesign: centred now-playing column (back · NOW PLAYING / speaker name · speaker picker), centred controls, always-visible search bar over centred Home / Library / Up Next tabs (Search tab removed; focusing the bar opens search, ✕ returns to the last tab), centred headings, card rows and lists.
  - Its volume slider is now the Echo volume (via `host._setVol` + `_vSnd`), not the player volume.
- **Music script + prompt:** `script.play_on_voice_assistant` (hash `f85d9905…`): a genre shuffles a popular hits playlist (playlists/radio only, +hits words, no radio mode, repeat all) and returns `say` ("Playing Christmas music." / "Playing Dreams by Fleetwood Mac."). Prompt v3.14 (sha `1cc82c4c…`) on both Gemini subentries and the Zima `live-prompt.txt` (backup v3.13): say the tool's sentence, keep-playing-similar only for "songs like".
- **Gemini outage:** the Google integration had been in setup_error since Nov 14 18:13 (no network at boot), so Alexa used the slow free fallback. Reloaded, plus `automation.alexa_restart_gemini_if_it_failed_to_start`.
- **VOICE BROKEN (needs Owen):** Piper can't load `/share/piper/en_US-alexa-medium.onnx` ("INVALID_PROTOBUF … Protobuf parsing failed"), so every spoken reply fails (HA log "Error getting audio for …"). Owen will re-copy `en_US-alexa-medium.onnx` + `.onnx.json` from his zip; then restart the Piper app (`core_piper`) and check with `media_source/resolve_media` on `media-source://tts/tts.piper_3?message=…&voice=en_US-alexa-medium&preferred_format=wav`, then fetch the `/api/tts_proxy/…` URL (500 = still broken).
- **Refresh keeps music playing:** the music plays from Music Assistant, not from the page, so reloading the dashboard doesn't stop it (by design).
- CDP note: the WebView devtools socket is `webview_devtools_remote_5360`; run `adb connect 192.168.4.44:5555` first if adb says "device not found". Split chained zima commands (approval refuses some).

- **Later Nov 15:**
  - Genres are generic now (no hard-coded list): if the request has no artist and the kind isn't track/album/artist/radio, the script asks Spotify for `genre:"<words>"` (decades → `year:1980-1989`, "80s rock" → `genre:"rock" year:1980-1989`), 50 tracks; with 10+ it shuffles them (repeat all) and says "Playing jazz music.". Otherwise the normal search runs. Script hash `10bac043…`. Prompt v3.15 (sha `c204cd72…`, Christmas examples replaced with jazz) on both subentries + Zima live-prompt.
  - Music screen (hash `51066e58…`): "‹ Home" pill goes straight to the home screen (`_close` + `_islHome`); Home tab has Genre chips (Pop, Hip-Hop, Country, Rock, R&B, Jazz, Classical, Chill, 80s, 90s, 2000s) that shuffle Spotify's top songs the same way.
  - Voice still broken after a Piper restart: `/share/piper/en_US-alexa-medium.onnx` is 18,841,600 bytes (Piper's `/api/piper/voices`); a medium voice is ~63 MB, so the copy is truncated. Owen needs to upload the full .onnx + .onnx.json (Piper app → Open Web UI → upload, or Samba `share/piper`).

## Open / next ideas
- Ring token refresh for Talk (Owen).
- Real-screen snapshots for turn reviews.
- Test "Alexa, play the news" by voice with sound when Owen allows it.
- YouTube shows captions on some clips (that's YouTube's own setting).
- Memory and phrase lists are empty until the review bot or Owen adds notes. Alexa has no voice tool yet to "remember X".
- Weather panel radar is the slowest screen on the fast page (~20 fps while tiles load); candidate fix inside os-echo-wx.
