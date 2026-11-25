# 28 - Fast standalone Echo screen ("echo-fast"), Nov 23-24 2026

Owen: port the Echo Show dashboard so it runs natively/faster on LineageOS, HA keeps as much control as possible, no UI change. Chose option 2 (standalone lightweight page) over a native Kotlin app.

## Public version (Nov 24)
- Published as a general, reusable project: **https://github.com/Davette10/ha-fast-kiosk** (public, MIT). Commit `2632356`.
- Generic: `config.json` (dashboard, view, card or "all", resource include/exclude regexes, keep_path, dark_mode, view_assist), minimal `ha-card`, default HA dark `theme.css`, `tools/capture-style.js` for a pixel-identical theme, `tools/cdpx.py` benchmarking, `extras/view-assist-guard.js`. Bundles home-assistant-js-websocket (Apache-2.0 notice included).
- Nothing Owen-specific in it: no domain, IPs, keys, names, or Amazon fonts/sounds/images.
- Tested on the Echo for ~30 s (Nov 24 09:56, kitchen idle) with Owen's dashboard: ready in 1.8 s, no errors; Echo then put back on `/local/echo/`.
- The Echo itself still runs the original echo-fast files below (not the repo build).

## What it is
- The Echo no longer loads the HA frontend. VACA loads **`/local/echo/index.html`** (View Assist "Echo Show" entry `01M6YNXN6QVDGKZ9ZCWAVR8NG0`, option **home**; VACA reads it as `ha_dashboard`).
- That page loads `boot.js`, which:
  - signs in through VACA's external-auth bridge (`window.externalApp.getExternalAuth`, same as the HA frontend);
  - opens one HA websocket (home-assistant-js-websocket 9.5.0, vendored in `/local/echo/haws/`);
  - builds a `hass` object with the same shape as the frontend's (states, entities, devices, areas, floors, user, config, callService, callWS, callApi, fetchWithAuth, hassUrl, connection, locale…);
  - provides `<home-assistant>`, `<ha-icon>` and `<ha-svg-icon>` (same markup and styles as HA's; icon paths come from HA's `/static/mdi/` chunks and are cached in localStorage);
  - reads the **live** resource list and `alexa-dashboard` config from HA and loads only the Echo modules (inline resources whose header mentions echo/alexa/amazon orders, plus webrtc-camera; not os-alexa-log). So nightly fixes to os-echo-* still apply with no change here;
  - keeps the URL at `/alexa-dashboard/home` (the modules check that path) and connects to View Assist with the same browser id (`view_assist/connect` → registered);
  - registers a tiny service worker `/local/echo/sw.js` (scope `/local/echo/`) so `version.txt` and `index.html` are never served stale.
- `host.css` reproduces the computed styles the HA frontend gave the os-echo host (CSS variables, Roboto, line-height 1.6 etc.).
- Version bump: edit files in `/config/www/echo/`, then increment `/config/www/echo/version.txt` (index.html appends `?v=` to boot.js/host.css).
- **VACA blocks page-initiated navigation** (`shouldOverrideUrlLoading` returns true for same-origin URLs). So `location.replace/reload` from the page do nothing on the Echo. Reloads must go through `button.vaca_amzn_echo_show_8_3a31_refresh` (now loads the fast page). boot.js retries in place on failure (5 s, 10 s, … up to 60 s; logs `echo-fast-last-fallback` in localStorage).
- Guard resource `2b8125f77fdd4d0c8a12cdc2914905ac` (inline): if the Echo ever shows the normal HA frontend, it keeps it on `/alexa-dashboard/home`. Needed because View Assist navigates to its "home" path, which inside the HA frontend fell through to the default dashboard (that's how the Echo sat on /mobile-dashboard from ~23:20 to 00:58 during the build).

## Verified (silent tests, Echo volume restored to 6)
- Layout: 280/280 home-screen elements identical in position, size, font and colour vs the old dashboard (only diffs: a hint mid-fade, a live light colour). Weather, Smart Home, Family map, Calendar, Climate panels identical. Weather icon size bug found and fixed (ha-icon now renders one microtask late like Lit).
- Real VACA path tested: integration reload → VACA got `ha_dashboard: local/echo/index.html` → Refresh button → fast page ready in 1.5 s with VACA's own token.
- Heal/watch/listener/wake modules running (q_heal, q_osel), VA registered, mic clients normal.

## Numbers (old HA frontend → fast page)
- Screen ready after load: ~10.7 s → ~2.2 s (boot→painted 1.5-2.1 s).
- Idle CPU in the page's main thread: 9.4% → 4.7-5.8%.
- JS heap 35.5 MB → 9-18 MB; DOM nodes 6,065 → 816-1,464; event listeners 800 → 113-131.
- WebView renderer memory ~425 MB → ~325-368 MB.
- Opening panels (first frame): Weather 262 → 118-199 ms, Map 173 → 163-170 ms, Calendar 65 → 39 ms, Climate 140 → 99 ms; long tasks roughly halved. The Weather panel's radar is still the heaviest thing (≈20 fps while it loads tiles) - candidate for a later fix inside os-echo-wx.

## What stays on HA (unchanged)
AI/LLM, STT/TTS, wake-word second stage, device control, automations, calendar, family map data, cameras (go2rtc/ring-mqtt), Amazon cart, nightly review/fix runs, View Assist timers/alarms, every `echo_cmd` the modules react to. HA can still drive the screen exactly as before.

## Files / backups
- Live: HA `/config/www/echo/` (index.html, boot.js, host.css, sw.js, version.txt, haws/). Source: `ha/echo-fast/` in this project.
- Before-change backups: HA `/config/backups-claude/2026-11-23/pre-standalone-echo/` (lovelace storage, resources, automations, scripts, view_assist assets, www.tgz) + HA full backup `80a1f354` (Nov 23 22:28); Zima `/DATA/home/Harper/echo-backup/2026-11-23-pre-standalone/` (Android settings, packages, home activity, VACA package dump, os-echo host style, before screenshot).
- Old extracted module sources: HA `/config/echo-work/src/`.

## Undo (2 steps)
1. View Assist → Echo Show → Configure → Dashboard options → **home** = `/alexa-dashboard/home`.
2. Settings → Integrations → VACA → reload (or restart the Echo). Optionally delete resource `2b8125f77fdd4d0c8a12cdc2914905ac` and `/config/www/echo/`.

## Tools added on the Zima
`/DATA/home/Harper/echo-cdp/cdpx.py` (eval / shot / nav / reload / metrics / perf N), `q_timing.js` (panel open timing), `q_boxes.js` + `cmpb.py` (layout diff), `q_pb_<panel>.js` + `cmpp.py`, `q_ready.js`, `mkhost.py`.
