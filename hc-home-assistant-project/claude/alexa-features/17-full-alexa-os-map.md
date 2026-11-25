# Full Alexa OS rebuild (Nov 18, 2026)

Owen (12:12 PM): "using the backup, completely build all of the alexa OS in home assistant/on the alexa. transfer ALL features, design, UI, EVERYTHING."

## Owen's decisions (Nov 18, ~12:30 PM)
- **HA extras stock Alexa never had** (family map, cameras grid, dynamic island, climate dial, news videos): **keep them all, restyled in the Echo's design**.
- **Rollout: a NEW dashboard.** The current `alexa-dashboard` stays untouched for his mom until the new one is ready. Switching = pointing VACA at the new dashboard (one-step undo: point it back).

## How it's being built (and the boundary)
- **Our own code**, written to look and work like the stock Echo. Amazon's decompiled app code and APL templates are NOT ported or copied; they and the stock screenshots are only looked at for the general look. Assets already on the Echo from Owen's own backup (Ember fonts, sounds, bar animations, wallpapers, weather icons) keep being used on that same Echo only.
- One shared logic base: **os-echo** (all voice, timers, music, cameras, map, news, chat). The new look is a separate module that only acts when the os-echo card config has `skin: "stock"`, so the old dashboard can't change.

## Done (Nov 18)
- **Dashboard `alexa-dashboard-os`** (title "Alexa OS (new)", not in the sidebar): one panel view `home`, `custom:os-echo` with the same config as `alexa-dashboard` plus `skin: "stock"` and `home_path: "/alexa-dashboard-os/home"`.
  - The path starts with `/alexa-dashboard`, so os-echo-listen, os-echo-wake and the Echo watcher (they check `location.pathname.startsWith("/alexa-dashboard")`) also run there once the Echo is switched.
  - **`yt_key` copied in (3:05 PM, after Owen lifted the no-keys rule)**: same key as `alexa-dashboard`, verified by a dashboard search matching both. YouTube news/live TV works the same on both dashboards.
- **Resource `os-alexa-skin.js`** `dcded8688866460982d691b21147dd9b` (19,608 B, sha `d62d4972…`; project copy `ha/os-modules/os-alexa-skin.js`). Patches os-echo from outside (wraps `_tick`, `_setHass`, `_cmd`):
  - Home: Ember Display clock, greeting line ("Good afternoon"), darker Echo-style widget tiles, sentence-case tile titles with cyan icons, status icons top right (DND, red mic-off, Wi-Fi off, alarm set).
  - Swipe-down drawer: Echo navy, round buttons, Kiosk button hidden, **Settings** button added.
  - All Screens: navy, uppercase header, Settings tile added. Panel headers: uppercase small Echo style on navy. Island: navy pill, cyan ring outline.
  - **Settings app** (left category list + right rounded pane, cyan toggles), wired to real controls: Alexa (wake word shown, Microphone on/off, Follow-Up Mode = `switch.…_continue_conversation`, assistant shown), Display & Appearance (brightness via os-echo `_setBright`, Adaptive Brightness = `automation.echo_show_adaptive_brightness`, Night Mode, Screen Always On, Turn Screen Off), Notifications & Sound (volume, Do Not Disturb, alarm volume, alarm sound), Device Options (name, model, software, network, room light, Restart Screen, Kiosk Mode), Accessibility (note), Help (things to try, gestures). Closes after 2 min idle, on Back, a left-edge swipe or any voice command.
- **Not yet verified visually:** Puppet couldn't render (timeouts). Cause found: on the Zima, `ww/wake_server.py` (stage-2 wake word with the Nov 18 16-lane fix) runs at ~445% CPU, load ~9.4, starving the HA VM (qemu) and Puppet. Owen to decide (it's log-only, VETO false).

## Next (in order)
1. Visual check of the new dashboard at 961×601 (once the Zima has CPU headroom), fix what looks off.
2. Alarms & Timers screen (list of timers/alarms in Echo style), notification center, Things to Try rotation on home.
3. Smart Home, Music, Calendar, Weather, Map, Cameras, Climate, News, Chat panels restyled inside their own modules (their shadow roots aren't reached by the skin's CSS).
4. Switch VACA to `/alexa-dashboard-os/home` with Owen's OK.

## Reference material on the Zima
- Backup analysis: `echo-fireos/apkinfo/` (strings, asset lists), `echo-fireos/apks/priv-app/` (27 UI apps), `echo-fireos/ux/` (unzipped assets, decompiled home bundle `ambienthome.js`), `inventory/` (full file lists).
- Stock screenshots from Owen's Echo (task thumbnails): `echo-fireos/userdata-x/system_ce/0/recent_images/`, sheets `ux/rs-a.jpg`, `ux/rs-b.jpg`. Viewed Nov 18 via a temporary generic camera (removed again): Settings list/detail (dark navy, cyan toggles, uppercase small headers with back chevron), split Settings (left nav + right rounded card), Music & More, month calendar, doorbell live view, In the Spotlight tip card, Help list.
- Live os-echo resources decoded: `echo-fireos/osx/res/<resource id>.js` (from a copy of `.storage/lovelace_resources`; read-only).

## Can't come from the backup (Amazon cloud)
Alexa's brain/voice (Gemini + Piper replace them), the For You content feed, Amazon Photos, Prime Video/Amazon Music/Audible account playback, calling/Drop In/announcements, skills, shopping beyond add-to-cart, Alexa routines stored in the Amazon account.
