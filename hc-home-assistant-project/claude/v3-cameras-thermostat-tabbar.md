# v3 update (Oct 1, 2026): recordings timeline, fast thermostat, persistent phone tab bar, light map trails, kiosk for all

Applies to both `claude-test-dashboard` (tablet) and `mobile-dashboard` (phone). Supplements `claude/phone-dashboard.md` and `claude/dashboard-architecture.md`.

## New Lovelace resources
| Resource id | What it holds |
|---|---|
| 5edbd87be72245beb756b0276b0dfb7a | os-v3 (42.6 KB): `os-thermo`, `os-cam`, `os-tabbar`, map-trail patches, `os-cam-panel` dense option. Sets `window.__osV3 = true`. |
| 3e31a2ddc74944529e5e5edac14cc831 | os-v3-fixes (1.9 KB): thumbnail loading fix, "No motion clips yet" text, thermostat skips a send when nothing changed. |

- Source copies: `Desktop/ha/os-modules/os-v3.js` and `os-v3-fixes.js`.
- Small changes should go in os-v3-fixes (prototype patches), because re-uploading os-v3 means re-sending all 42 KB.

## Thermostat (`custom:os-thermo`)
- Replaces every `os_climate2` button-card on both dashboards (template still exists, unused). Config: `entity`, `label`, optional `compact: true` and `height: '124px'` (phone).
- Taps change the number instantly. The command is sent after 2 s with no taps (mode changes after 0.7 s). It shows the pending value until the thermostat reports it, or for 25 s at most. If the final value equals the current one, nothing is sent.
- Verified on the tablet: +3 then −3 showed 74° then 71° immediately and settled with no change.

## Camera recordings
- **Source:** Home Assistant records the clips itself. Frigate is installed but stopped and not used. HomeKit Secure Video clips (Scrypted) live in iCloud and can't be read by HA.
- **Recorder cameras:** two Generic Camera entries pointing at ring-mqtt's RTSP: `camera.front_door_rec` (`rtsp://03cabcc9-ring-mqtt:8554/cc3bfb471de0_live`) and `camera.downstairs_rec` (`.../cc3bfbb9d552_live`). The core Ring `*_live_view` cameras are WebRTC-only, so `camera.record` fails on them.
- **Automations:**
  - `automation.camera_clips_front_door_motion`: on `event.front_door_motion`, `event.front_door_ding` or `binary_sensor.front_door_motion` on → 25 s clip + snapshot, then 25 s pause.
  - `automation.camera_clips_downstairs_motion`: on `event.downstairs_motion` or motion on → 30 s clip + snapshot, then a 10 min pause (the room has near-constant motion).
  - Files: `/media/cameras/<front_door|downstairs>/YYYYMMDD_HHMMSS.mp4` and `.jpg` (local time).
- **Retention:** the `os-cam` card deletes clips older than 7 days (`media_source/local_source/remove`) when an admin user's screen is showing it, at most every 3 hours. The wall tablet is admin, so it does this.
- **Not verified:** the front door automation has not fired yet (no motion during the session). Downstairs was verified end to end.
- **Cost:** each front door clip starts a second Ring live stream (Scrypted starts its own), which uses doorbell battery.

## Camera card (`custom:os-cam`)
- Config: `name`, `entity` (live camera), `dir` (`cameras/front_door`), `motion`, `sound` (true = start unmuted), `ratio: '16 / 9'` + `compact: true` on the phone; on the tablet it fills its cell.
- Live view is an embedded advanced-camera-card with `fit: cover` (no black bars). Since Oct 16 every camera starts muted (`sound: false` on all four cards; the user doesn't want front door audio to play on its own). The speaker button turns sound on.
- Timeline strip: thumbnails oldest → newest with a Live tile at the right end and a fixed yellow playhead in the middle. Scrolling shows each preview instantly with "Today 7:12 PM · 8 min ago"; after ~0.25 s it plays the clip in place of the live view with a scrub bar. When a clip ends it moves to the next one, then back to Live. A LIVE button jumps back.
- Tablet Cameras page layout is now two columns (`"c1 c2" / "p1 p2"`, rows `1fr 190px`); `os-cam-panel` has `dense: true` (4 tiles in one row).

## Two-way talk
- Not set up. ring-mqtt and the HA Ring integration give no microphone path from a dashboard. Realistic routes: answer in the Ring app or Apple Home (Scrypted supports talk there), or add Scrypted's own camera card/WebRTC to HA, which needs HA to reach the ZimaOS host.

## Phone tab bar
- `os-tabbar` is one persistent element appended to `home-assistant`'s shadow root, shown on `/mobile-dashboard/*`. It highlights the tapped tab immediately and never re-renders between views. This also fixed the Rooms tab bar sitting higher.
- The per-view `ph_tabbar` template now has `display: [[[ return window.__osV3 ? 'none' : 'block' ]]]`, so it comes back if os-v3 fails to load.
- Measured view switches in the desktop pane: 30–60 ms once a view has been visited, ~200 ms first time. HA caches visited views.

## Map trails
- `os-family-map` and `os-person-page` now create the HA map with `hours_to_show: 0` and draw one canvas polyline per person (points thinned to ≥30/70/140 m apart for Today/3 Days/Week, max ~600 points each, cached 2 min). Before, HA drew a marker for every history point.
- Person pages have the Now / Today / 3 Days / Week picker (stored in `localStorage` `os-person-hours`).

## Kiosk for everyone
- Helpers: `input_boolean.{harper,jill,hayden,lauren,jason}_kiosk_mode`, all on.
- `kiosk_mode.kiosk` is a JS template mapping `user_name` (Harper Clark, Jill, Hayden, Lauren, Jason) to its helper; anyone else (the tablet) is always kiosk.
- More page `kiosk` slot: a vertical-stack of four `user` conditionals (Harper, Jill, Hayden, Lauren). Jason has no HA account yet; add a conditional with his user id once he does.
- Accounts now exist for Hayden (`e0fb336fbdcc4188a6ca273470801b91`) and Lauren (`3a9399d265d346feab3d73100ba35103`).

## Day/night
- `input_select.dashboard_appearance` had been left on Dark, which stops the sunrise/sunset switch. It was set back to Auto on Oct 1. Choosing Light or Dark on the phone's More page turns the automatic switch off for every screen.

## Gotchas
- `ha_set_integration` with `verify_ssl: false` is blocked by the safety classifier; leave it out.
- An `Image()` with `loading="lazy"` that isn't in the DOM never loads.
- button-card nested custom elements: use `:host{display:block !important;width:100% !important;max-width:none !important}` to beat its inline `max-width: fit-content`.
