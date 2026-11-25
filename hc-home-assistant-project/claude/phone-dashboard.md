# Phone dashboard, tablet refresh and day/night cross-fade (Sept 26, 2026)

This doc supersedes the "mobile-dashboard" bullets in `claude/dashboard-architecture.md` (the older Bubble/Mushroom phone design was replaced).

## Phone dashboard (mobile-dashboard, rebuilt Sept 26)
- **User's choices:** tablet set of tabs (Home, Rooms, Cameras, Media, More); keep per-person pinned rooms and the Customize page; Home screen in tablet style. Kiosk: see "Default dashboard and kiosk" below.
- **Structure:** every page is a panel view holding one `ph_page` button-card (12px top padding, 14px row gap, 104px bottom space). `ph_page` carries the tab bar: `ph_tabbar` is a fixed frosted capsule with five `ph_tab` items styled like the tablet's `os_nav_item`. The active tab is worked out from the URL.
- **Templates:** all tablet `os_*` templates were copied (paths pointed at `/mobile-dashboard/`), except `os_nav`, `os_nav_item`, `os_page_header` and `os_status`.
  - `os_climate2` is a phone-width version: 34px buttons, an 8-column grid and one hint label.
  - New phone templates: `ph_page`, `ph_tabbar`, `ph_tab`, `ph_title`, `ph_back`, `ph_heading`, `ph_row` (list row with a tinted icon and chevron), `ph_pin` (pinned-room tile), `ph_pin_row` (Customize row), `ph_seg_btn` (Appearance picker), `ph_net`, `ph_switch` (iOS-style switch row).
- **Pages:**
  - **Home:** greeting and Online pill; weather tile; both cameras live side by side (`os_camera` frame around advanced-camera-card, camera `dimensions.layout.fit: cover`); the lights-on panel or At a Glance; both thermostats (`os_climate2`); now playing or scenes; Family; Up Next; My Rooms (per-user pins, Edit → Customize).
  - **Rooms:** `os_room` tiles in two columns, Downstairs and Upstairs, plus a "Choose rooms for Home" button.
  - **Customize (Home Rooms):** a per-user list. It is an auto-entities card per user, shown through a `user` conditional, and uses `script.room_pin_toggle` / `script.room_order_move` with `input_text.room_pins_*` / `room_order_*` (users harper, jill, tablet).
  - **Cameras:** each camera live at 16:9 above its `os-cam-panel`.
  - **Media:** `os-media-app` in its phone layout.
  - **More:** rows for Weather, Calendar and Family Map; the Family list; Appearance (Auto / Light / Dark), which sets `input_select.dashboard_appearance` for every screen; Kiosk Mode switch (Harper only).
  - **Subviews with a back link:** Weather, Family map, the 5 person pages and Calendar.
  - **15 room pages:**
    - Lights: an All Lights toggle plus brightness tiles with short names.
    - Climate: `os_climate2`.
    - Media: tiles.
    - Everything Else: auto-entities by area, two columns.
    - Paths are unchanged (`room-bedroom` is Harper's), so the pin links still work.
- **Panel views and HA cards:** a panel view sets `--ha-card-border-radius: 0` for everything inside it. `ph_page` therefore resets `--ha-card-border-radius: 18px`, `--ha-card-box-shadow` and the stack/grid gaps on `#container`.
- **os-phone module** (resource `86d99b859d2d40ada1c9d3360d92aa0e`, source `Desktop/ha/os-modules/os-phone.js`):
  - It injects `<style id="osp">` with `@media (max-width: 700px)` layouts into os-weather-page, os-family-map, os-person-page, os-cam-panel, os-media-app, os-lights and os-glance, so the same components stack on a phone.
  - The tablet (1280 wide) is unaffected.
- **Backups:**
  - Taken before the rebuild: `dashboard.mobile-dashboard.20260926_180034.yaml` (ha-mcp edits backup) and `Desktop/ha/backups/backup-mobile-dashboard-before-redesign-2026-09-26.json`.
  - The new config is saved as `Desktop/ha/backups/mobile-dashboard-redesign-2026-09-26.json`.
- **Build approach:** the dashboard was written in chunks with `python_transform`. New views were first added under `n-` paths, checked at 390x844 in both modes, then the old views were removed and the `n-` prefixes stripped.

## Top gap and tab bar readability fix (Sept 26, night)
- **Reported on iPhone:** a big empty band at the top of every tab, and tab bar labels that were hard to read, especially with content scrolling behind them.
- **Cause of the gap:** in kiosk mode, HA's `#view` already pads by `var(--safe-area-inset-top)` (kiosk-mode rule `#view { padding-top: calc(var(--kiosk-header-height) + var(--safe-area-inset-top) + ...) }`). `ph_page` also added `env(safe-area-inset-top)`, so the notch inset was applied twice.
  - Fix: `ph_page` padding is now `12px 16px calc(env(safe-area-inset-bottom) + 104px)`. **Don't add the top safe-area inset in cards on this dashboard.**
- **Status-bar scrim:** `ph_page` has a fixed `ha-card::before` (height = safe-area top + 6px, gradient from `--primary-background-color`), so content scrolling under the clock fades out instead of clashing with it.
- **Tab bar:**
  - Background: `var(--os-glass-bg-strong), color-mix(in srgb, var(--primary-background-color) 78%, transparent)` with `blur(30px) saturate(180%)` and a soft shadow. It is nearly opaque, so text behind it no longer shows through.
  - `ph_tab` colors: active `--os-text`, inactive `--os-text-2` (#a1a1a6 dark / #6e6e73 light) instead of the old #6e6e73 in both modes. Icons are 24px and labels 11px, weight 600.
- **Verified** at 390x844 with a simulated 59px notch inset, in dark (Home) and light (Rooms).

## Default dashboard and kiosk (Sept 26, evening)
- **User's request:** the phone dashboard is the default, in kiosk mode, for Jill, Jason, Lauren, Hayden and Harper. Harper gets a kiosk on/off toggle on the More tab.
- **Default dashboard:**
  - The system default (`frontend/set_system_data`, key `core`, `default_panel`) changed from `claude-test-dashboard` to `mobile-dashboard`.
  - The `tablet` user has its own personal default of `claude-test-dashboard` (`frontend/set_user_data`, set as that user through `browser_mod.javascript`), so the wall tablet keeps the tablet dashboard.
  - A personal default that someone picks in their own profile overrides the system default.
- **HA accounts:**
  - Only Harper Clark (owner) and Jill have accounts. Jason, Lauren and Hayden have none yet; the user has to create them in Settings → People.
  - Once those accounts exist, they get the phone dashboard and kiosk with no further changes.
  - They won't have pinned rooms until they get their own `input_text.room_pins_*` / `room_order_*` helpers and a Customize list.
- **Kiosk config** (kiosk-mode v14.2.1, at the root of the mobile-dashboard config): `kiosk_mode: { kiosk: '[[[ user_name !== "Harper Clark" || is_state("input_boolean.harper_kiosk_mode", "on") ]]]' }`
  - Kiosk is on for everyone except Harper. For Harper, it's on only while her switch is on.
  - v14 has no `entity_settings`, and `user_settings` would override the template, so it is a single JS template instead.
  - Checked in the pane: the header and sidebar are hidden for the `tablet` user.
- **Harper's toggle:** `input_boolean.harper_kiosk_mode` (icon `mdi:cellphone-lock`). It was turned on so she starts in kiosk.
  - The More page's `kiosk` slot is a `user` conditional (Harper's id `e3c3b93b6d2e43ee9fe1d1fe4c160a9e`) holding an `os_card` with a `ph_switch` row.
  - `ph_switch`: a 51×31 switch that is green `#30d158` when on; tap to toggle.
- **Gotcha:** a button-card nested in another button-card's `custom_fields` has its `[[[ ]]]` templates evaluated by the parent, where `entity` is the parent's entity. In labels of nested cards, use `states['…']` rather than `entity`.
- **Escape hatch:** adding `?disable_km` to the URL shows the header and sidebar for one load.

## Day/night cross-fade
- **What it does:** when the mode flips (sunset or sunrise on Auto, or a manual change), os-glass wraps the repaint in `document.startViewTransition`. The whole screen cross-fades over 2.2 s instead of snapping.
- **When it animates:** only while the page is visible. Where View Transitions aren't supported, it switches instantly. The tablet WebView is Chrome 156, which supports it.
- **Module:** os-glass is now 16276 bytes; its source is at `Desktop/ha/os-modules/os-glass.js`.

## Refreshing the wall tablet
- **How:** the tablet is browser_mod browser `browser_mod_ad27eaba_45b7e3b1` (SM-T727V, user `tablet`). Reload it with `browser_mod.refresh` and `browser_id: [browser_mod_ad27eaba_45b7e3b1]`.
- **Last done:** Sept 26, after the cross-fade change.

## Gotchas learned
- **python_transform lambdas:** they can't see other top-level names, not even other lambdas. Pass everything in as arguments, or build inside top-level loops.
- **Pasting JSON into python_transform:** defining `true = True; false = False; null = None` lets pasted JSON work as Python.
- **Large dashboard reads:** `ha_config_get_dashboard` output over the size limit is saved to a file, which can be parsed with Python in the workspace.
