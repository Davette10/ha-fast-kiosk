# claude-test-dashboard: how it's built (updated Oct 22, 2026)

## Dashboards that exist now
- **claude-test-dashboard:** the wall tablet (Tab S5e, 1280x800).
- **mobile-dashboard ("Home"):** phones. Kiosk for everyone except Harper.
- **Deleted Sept 25 (16):** the 11 `wall-tablet-*` dashboards, `dashboard-dashboard`, `test-dashboard`, `phone-dashboard`, `map` and `dashboard-map`.
  - **Before deleting:** a full HA backup was taken (`f3301005`, "Before_deleting_16_dashboards_2026-09-25"), plus a per-dashboard ha-mcp edit backup of each: `dashboard.<url_path>.20260926_0222xx.yaml`, restorable with `ha_manage_backup(scope="edits", action="restore")`.

## Day (light) and night (dark) modes (Sept 25–26; verified live on tablet and phone)
- **Helper:** `input_select.dashboard_appearance` with options Auto / Light / Dark.
  - Auto: light while `sun.sun` is `above_horizon`, dark otherwise.
  - The module checks every 3 s, so a change shows within a few seconds on every screen.
- **Dark (night):** near-black AMOLED wallpaper, milky frosted cards. Unchanged from the frosted version below.
- **Light (day):** pale `#eceef4` wallpaper with soft blue/lilac pools. Cards are white frosted glass (`rgba(255,255,255,0.64→0.50)`, `blur(30px) saturate(180%)`), with dark `#1d1d1f` text and `#007aff` accent.
- **How the flip works (all in os-glass):**
  - **Color tokens:** fixed neutrals in the dashboard config were rewritten into variables with the dark value as fallback: `var(--os-c-<hex>, #hex)`, `var(--os-w-<alpha>, rgba(255,255,255,a))`, `--os-g-72` (rgba(28,28,30)), `--os-d-<a>` (rgba(29,29,31)). `os_camera` and `accent_color` keys were left alone.
  - **Component styles:** the module rewrites the `<style>` text of the os-* components the same way (marked `data-osr`).
  - **Inline styles:** attribute selectors catch inline `#f5f5f7`, `#1d1d1f`, `#a1a1a6` and `#2c2c2e`.
  - **HA theme vars:** in light mode, any theme var on `home-assistant` whose value is one of those dark neutrals is flipped (e.g. `--tile-color`, `--state-*-active-color`, `--ha-heading-card-title-color`), and restored in dark.
  - **HA text vars:** `--ha-color-text-*`, `--wa-color-text-*` and `--mdc-theme-text-*-on-background` are set per mode. HA's dark defaults resolve at `html` as #e1e1e1, which made empty-state text invisible by day.
  - **Backgrounds:** `--primary-background-color` is #000 at night (AMOLED; also the Bubble tab-bar fade) and #eceef4 by day. `--card-background-color` is #fff by day so dialogs and map markers stay opaque. Keys used in only one mode are removed when switching.
  - **Cameras:** every advanced-camera-card on both dashboards has card_mod `:host { --advanced-camera-card-background / -exterior: #000 !important }` so letterboxing stays black by day.
  - **Empty states:** the `os_empty` template ("No lights in this room") uses `--os-glass-inner` and `--os-text-2`.
  - **HA controls:** segmented buttons and inputs (`--ha-color-fill-primary-*`, `--wa-color-brand-*`, `--ha-color-form-background`) are monochrome in both modes: white-on-dark at night, graphite-on-light by day.
  - **Maps:** the Weather radar swaps Esri World_Dark_Gray ↔ World_Light_Gray. The family/person maps set the map card's `theme_mode`.
- **Testing without changing the helper:** in a browser console, `window.__osModeOverride='light'` (or `'dark'`) then `window.osGlassApply()`. This affects only that browser tab.
- **Source copy:** `Desktop/ha/os-modules/os-glass.js` is the current two-mode version (15617 bytes). Its dark tokens match the older frosted-only version, which it replaced.

## Frosted glass material (Sept 25; replaced the first "liquid glass" attempt)
- **Why it changed:** the user rejected the liquid-glass version ("doesn't look good"). Its border-box rim gradient painted under the whole translucent card, which put a diagonal haze on every panel. The lens refraction was barely visible and added complexity.
- **HACS check:** there are no liquid-glass card packages. The glass options are themes only (Nezz "visionOS & iOS 26 Liquid Glass", wessamlauf "Frosted Glass Theme", studio-prisma, jbsky). They mostly recolor stock HA cards plus a photo wallpaper, don't style the custom os-* panels, and need `frontend: themes` in configuration.yaml. None were installed.
- **Resource:** `d6653aa4a3bb416aa0e1d8e7e836ad6c` (os-glass), scoped to `/claude-test-dashboard` and `/mobile-dashboard`.
- **Dark-mode tokens it sets on `home-assistant`:**
  - Wallpaper (`--os-bg`, `--lovelace-background`, `--view-background`): static graphite with soft cool light pools.
  - `--os-glass-bg`: a single milky tint, `linear-gradient(rgba(255,255,255,0.08), rgba(255,255,255,0.055))`. `-strong` is 0.11/0.08.
  - `--os-glass-filter`: `blur(36px) saturate(150%)`. `-strong` is `blur(44px) saturate(160%)`.
  - `--os-glass-shadow`: an inset 1px hairline, an inset top highlight and a soft drop shadow.
  - `--os-lens-bg` / `--os-lens-shadow` / `--os-pill-filter`: dark frosted caption pills.
  - `--ha-card-background` and `--ha-card-box-shadow` match. It does NOT set `--ha-card-backdrop-filter`, which would blur every ha-card including the page root.
- **Hairline edge:** comes from an inset box-shadow, not a border-box background layer, so nothing bleeds under the tint.
- **Tokens stay on top:** a 3 s re-check re-asserts them if os-theme overwrites them. It writes when the target value changed or the browser's stored value differs, and remembers the theme's original value to restore when leaving the dashboards.
- **Components:** the module injects `<style id="osg">` into os-glance, os-lights, os-cam-panel, os-routines, os-media-app, os-weather-page, os-radar, os-person-page, os-family-map, os-ma-browser, os-clock and os-forecast (`.card` frosted; `.st:not(.on)/.stop/.search` as inner tiles; map `.seg/.lbl` as frosted pills).
- **claude-test-dashboard templates:** `os_card`, `os_glass`, `os_room`, `os_toggle` and `os_climate2` use the vars. `os_camera` has no blur, and its caption pills and LIVE badge use `--os-pill-filter`. `os_nav_item` active and `os_pill` are a flat translucent fill with an inset hairline.
- **mobile-dashboard:** card_mod fills, borders, shadows and blur use the vars, including the room-pin templates (auto-entities `template` strings) and the view-level `--ha-card-*` vars.
  - The Bubble Card tab bar (newer class names: `.bubble-horizontal-buttons-stack-card-container`, `.bubble-background`, `.bubble-background-color`) is one frosted capsule, with a flat highlight on `.highlight`.
  - Camera cards have `:host { background: none }`, because a gradient `--ha-card-background` makes advanced-camera-card fall back to an opaque color.
  - Backup: `dashboard.mobile-dashboard.20260926_024400.yaml`.
- **Old version:** the liquid-glass module is saved at `Desktop/ha/backups/os-glass-liquid-version.js`.
- **Performance check:** the tablet Home page has 12 blurred surfaces and none nested.

## Views
- **Home:** panel view built from one `custom:button-card` grid.
  - Two dynamic slots use `custom:os-switch`:
    - Lights: shows `os-lights` while any real light is on. Otherwise it shows `os-glance` (package alert, camera activity, inside temperature, latest Amazon delivery, sunrise or sunset; max 4 rows). Since Oct 22 the Amazon row replaces the old eero network row and opens the Orders page (see `claude/amazon-orders.md`).
    - Dock media: shows now playing while something plays. Otherwise it shows `os-routines` (Good Morning, Goodnight, Home, Away).
  - **Front Door tile (cam1):** shows the snapshot normally. It has an extra `live` custom field: an `os-switch` (`recheck: 5`, `badge: LIVE`) that overlays an advanced-camera-card live view of `camera.front_door_live_view`, muted (`auto_unmute: []`, Oct 16: the user doesn't want front door audio to start on its own).
    - **Live when:** front door motion is on, motion ended less than 60 s ago, or `event.front_door_ding` rang less than 60 s ago.
    - The overlay has `pointer-events: none`, so a tap still goes to the Cameras page.
- **Weather, Calendar, Cameras, Media, Map and the 5 person pages:** panel views built with the PAGE pattern. That's an `os_bare` grid with a `header` row (`os_page_header`) above a `body` row that holds one full-screen component.
- **Calendar Lists:** the second list (`todo.user_example_com_to_do_list`) no longer exists in HA, so it is wrapped in an os-switch that only shows it if the entity comes back; its title hides too.
- **Rooms overview:** a sections view that uses `os_page_header`.
- **The 15 room pages (Oct 15, Apple Home style):** each is now one `custom:os-room` card.
  - **Tablet:** sections view = [the `os_page_header` section, one `column_span: 3` grid section holding os-room with `grid_options: {columns: full, rows: auto}`].
  - **Phone:** the `ph_page` button-card keeps its `header`; the old `hl/lights/hc/climate/hm/media/he/else` fields were replaced by one `room` field (grid areas `"header" "room" "tabbar"`, extra_styles `#room > * { display: block; }`). Harper's Room is `room-bedroom` on the phone and `room-harper-bedroom` on the tablet.
  - **Config keys:** `title`, `area` (name or id), `lights[]`, `climate`, `climate_label`, `media[]`, `extra[]`, `exclude[]`, `names{}`. The Kitchen's old Do Not Disturb/Repeat tiles were dropped on purpose.
  - **Sections, in order:** status chips; Lights (tiles, tap toggles, slide sideways to dim, hold for details, Turn All Off/On pill); Climate (embedded os-thermo) and Media (prev/play/next plus a draggable volume bar); Cameras (snapshot every 10 s); Accessories (switches, fans and input_booleans toggle; locks and sirens only open details, never toggle).
  - **Discovery:** area entities come from `hass.entities/devices/areas`; hidden, entity_category, unavailable and noisy domains (update, event, select, number, button, stt, tts…) are skipped.
  - **Phone layout:** 2 columns below 700 px. Light mode follows `data-os-mode`.
  - **Before the switch:** ha-mcp edit backups `dashboard.claude-test-dashboard.20261015_175503.yaml` and `dashboard.mobile-dashboard.20261015_175506.yaml`.
- **Back buttons:** removed everywhere; the centered tab bar handles navigation.
- **Map tab:** points to `/claude-test-dashboard/map`.
- **Tablet nav (`os_nav`):** 8 tabs, Home, Rooms, Cameras, Media, Calendar, Energy, Weather, Map (areas `"n0 n1 n2 n3 n4 n7 n5 n6"`, `repeat(8, 68px)`). The Orders tab added Oct 16 was removed Oct 22; `orders` is now a subview.

## Lights panel (os-lights)
- **Controls:** tap a tile to turn it off, slide sideways to dim, hold to open details.
- **All Off:** turns off only the lights shown. It excludes `browser_mod*` (the tablet screens), `*_led_ring` and `fu_zhi_bkn*`, so the tablet display never goes dark.
- **Display names:** set in the card config (`names` map), not renamed in HA. Examples: Harper's Light 1 and 2, Harper's Bed Lights, Lauren's Lamp, Hayden's Lamp.

## Family colours (map trails, marker rings, names)
| Person | Colour |
|---|---|
| Jason | #2997ff (blue) |
| Jill | #ff375f (pink) |
| Lauren | #bf5af2 (purple) |
| Harper | #ffd60a (yellow) |
| Hayden | #30d158 (green) |

- **How it works:** these are set with `--graph-color-N` on the component host. HA's map card reads them in entity order.

## Inline module resources (Lovelace resources)
| Resource id | What it holds |
|---|---|
| cbd86d1b85b841389c49d827ed43ff9e | os-theme: theme vars, os-clock, os-forecast, os-ma-browser (legacy) |
| a71b7d352f0b497882e65211c2afae02 | os-media-app (Spotify-style media page) |
| 2843407bf2c844efa3fb6b450c7ac19f | os-weather-page and os-radar (Leaflet + RainViewer), coloured forecast icons |
| 0e241d1792754213b08fc120ca799859 | os-person-page and os-family-map |
| a1d0eba8a880457ca5fd066fdf549311 | os-switch, os-glance, os-routines, os-cam-panel |
| d0f703a03eb34322bd657a8726f667ac | os-lights (Home lights panel) |
| 421c3ee649fc427494b0faf54d7002dd | os-fixes: prototype patches (see below) |
| d6653aa4a3bb416aa0e1d8e7e836ad6c | os-glass: frosted glass + day/night modes (both dashboards), 15617 bytes |
| 6187955349a0426194f559fb84b9ace3 | os-room: Apple Home-style room page (Oct 15), 32059 bytes |
| 5cfa88f7a2f54d1a879ef7bf076f8e0e | os-apple: global Apple layer (Oct 15): Inter variable font with optical sizing, press-scale 0.97 on every os-* button, blue focus ring for keyboards only, reduced motion / reduced transparency / increased contrast support. Rules use `:where()` so components' own styles win. |
| e8942a037e6c441ba7ed6d45e9457c0d | os-calendar (with Edit Event, Oct 15) |
| d8a45d6c47514b399ac82aba375dd2db | os-music (Downtify relay via `rest_command.downtify`) |

- **os-fixes patches:**
  - Map re-fit and family colours.
  - Offline-speaker skip, and MA artwork at size=256.
  - Esri radar basemap, and a rain-amount fallback on the Weather page.
  - Places reload every 60 s, plus a Life360 refresh when a person page or the Map opens (away phones only, at most every 2 min).
  - Friendly Media errors via `connection.sendMessagePromise` (no raw HA toast); favorites mixes hidden until favorites exist.
  - At a Glance: package row with "Got it", and (since Oct 22) an Amazon row (`x-amz`) showing the most relevant order from `todo.amazon_orders`, which taps through to the orders view. The old eero/MySpeed network row (`x-net`) was removed; os-home's "Internet is down" alert still appears when the WAN drops.
  - os-switch: an optional `recheck` (seconds) timer that re-evaluates time-based cases, and an optional `badge` pill shown while a case is active.
- os-fixes is 17,474 bytes (Oct 22); the Mac copy is in sync.
- **Source copies:** `Desktop/ha/os-modules/` (os-glass.js included).
- **Backups:** `Desktop/ha/backups/`. The doorbell change is backed up in `backup-doorbell-before-live-view-2026-09-25.json`.

## Automations and helpers added or changed Sept 25
- **input_select.dashboard_appearance:** Auto / Light / Dark (see Day and night modes).
- **automation.front_door_package_check:**
  - Runs 20 s after front door motion or a ding ends.
  - Presses `button.front_door_take_snapshot`, then asks `ai_task.google_ai_task` (Gemini) whether a package is on the porch, retrying up to 3 times if Gemini is busy.
  - Sets `input_boolean.front_door_package` and `input_text.front_door_package_note`.
- **automation.family_locations_refresh_away_phones:** every 5 min, calls `life360.update_location` for family trackers that are `not_home`. Life360 has no polling-interval option.
- **automation.doorbell_tablet_chime_and_cameras (changed):** on a ring it wakes the tablet, sends it to `/claude-test-dashboard/home` and plays the TTS announcement. It no longer opens `/wall-tablet-cameras` (now deleted) and no longer runs the 2-minute return step.

## Known blockers (as of Sept 25)
- **HA can't reach the ZimaOS server:** from HA, 192.168.6.170 and 192.168.6.171 both refuse or time out, while the Mac reaches .170:5216 fine. HA runs as a KVM VM (likely on ZimaOS, where a macvtap NIC can't talk to its host).
  - **Music Assistant:** the Supervisor media mount `zimamusic` (cifs, server 192.168.6.171, share ZimaOS-HD) is inactive, so MA says "There is nothing to play here". (On Sept 26 the Media page did list MA playlists, so this may have recovered.)
  - **MySpeed:** once HA can reach 192.168.6.170:5216, add a Scrape integration on `/api/speedtests?limit=1` (the API needs no auth). The browser can't fetch it directly because MySpeed sends no CORS headers.
- **eero:** only the UPnP integration is installed (WAN status, external IP, uptime). There are no client counts or speeds without a separate eero integration that requires an eero account login.

## Cleanup done on Sept 25
- **Templates:** removed 14 unused button-card templates (about 25 KB less config).
- **Unused Lovelace resources removed:** config-template-card, mini-graph-card, vertical-stack-in-card, hourly-weather, week-planner-card, alarmo-card and ha-map-card. No dashboard used them.
  - **To restore:** the list is in `Desktop/ha/backups/removed-resources-2026-09-25.json`.
  - **What wasn't touched:** the HACS files themselves are still installed.

## Gotchas learned
- **Nested lazy cards:** button-card can't host lazy built-in cards (calendar, todo-list) directly. Wrap them in `custom:os-switch` with a single case, because it waits for the card to be defined.
- **Nested button-card width:** button-card gives nested cards the inline style `max-width: fit-content`. To stretch one, use `extra_styles`: `#field > * { width:100% !important; max-width:none !important }`.
- **Text alignment:** button-card centers text by default. Set `text-align:left` on custom fields; it is inherited into the components' shadow DOM.
- **Camera cards:** advanced-camera-card rejects `menu.style: hidden-top`. Use `none`. Its background vars are declared on its own `:host`, so override them with card_mod `!important`, not from an ancestor.
- **RainViewer:** the free API now serves one colour scheme and tiles only up to zoom 7 (higher zooms return "zoom level not supported" tiles).
- **Thermostats:** they come in through homebridge-alexa-smarthome and expose no fan modes, so constant-fan control isn't possible.
- **Browser pane testing:**
  - It blocks page subresources unless a site approval immediately precedes the navigate. A "Could not load Home Assistant" page there is the pane, not HA.
  - The HA address needs a fresh one-time approval before every pane action.
  - With viewport emulation, pane clicks can land on `<html>`; verify buttons with a script `.click()` instead.
  - For full-frame shots, emulate 1280x800 and navigate in-page with `history.pushState` + `location-changed`. Don't use CSS zoom. The pane may render the 1280x800 page small in a corner; region zoom isn't supported.
  - Puppet (0f1cc410_puppet 2.6.0) is installed but fragile: its Chromium times out on launch when the host is busy. Don't loop restarts and keep its watchdog off: on Oct 15, restarts plus a briefly enabled watchdog made the Supervisor rebuild the image, which pegged the CPU. As of Oct 15 it's in an error state.
- **Injected rows in re-rendering components:** HA pushes state several times a second. Reuse injected nodes (keyed) instead of rebuilding them on every render, or taps on their buttons get lost.
- **Nested cards inside button-card:** they only get hass when a `triggers_update` entity changes (about once every 8 s here). Time-based conditions need os-switch `recheck`.
- **Glass layering:** a border-box background layer under translucent padding-box layers tints the whole card, not just the edge. Use an inset box-shadow for hairlines.
- **Theme var writes:** when re-asserting CSS vars, compare against the new target value too, not only against the last-written value, or a mode switch half-applies.
- **HA 2026 controls:** segmented buttons and text inputs are Web Awesome (`wa-*`). Their colors come from `--ha-color-fill-primary-*`, `--wa-color-brand-*` (both must be set, because the `--wa-*` aliases resolve at `html`) and `--ha-color-form-background`.
- **python_transform:** `rstrip` is not allowed (`strip` is). Traverse the config with `for node in stack:` while appending to `stack`.
- **Media play testing:** only on `media_player.voice_pe_music` (the user's rule).
- **ha-mcp component updates:** when HACS updates `ha_mcp_tools`, `ha_config_set_dashboard` fails with "load_failed" (ModuleNotFoundError) until Home Assistant restarts. Check repairs for `restart_required_*` first.
- **os-room inside button-card:** nested cards get stale hass, so os-room reads `document.querySelector('home-assistant').hass` every 400 ms.
