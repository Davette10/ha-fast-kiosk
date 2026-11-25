# Wall tablet deep sleep (Oct 12, 2026)

User request: when nobody is home, or at night with no motion on the Downstairs camera, turn the tablet as close to "off" as possible (unload everything, display off, sensors off).

## Rules now
- **Sleep** (`automation.tablet_sleep_display_when_everyone_is_away`): nobody home (`zone.home` < 1 for 3 min) OR (sun below horizon AND `binary_sensor.downstairs_motion` off 10 min). Triggers: away, motion idle 10 min, tablet awake 10 min (re-check), sunset. Daytime with someone home = stays on (user's rule; previously it also slept on 10 min of no motion by day).
- **Wake** (`automation.tablet_wake_display_when_someone_gets_home`): someone home, tablet asleep, battery > 15 %, and either motion outside 01:00–05:00, or (first arrival / sunrise) while the sun is up. Brightness 170 (07–20) / 70.
- Battery-recovery branches of both emergency-parking automations now only wake when someone is home and it is daytime (the first one also dropped the dead `life360_emme_laakso` tracker).
- Doorbell still wakes the tablet; it re-sleeps 10 min later if the sleep conditions hold. 01:00 blackout unchanged.

## script.tablet_sleep (deep sleep)
1. `browser_mod.navigate` → `/claude-test-dashboard/blank` (browser_mod entities unavailable; harmless).
2. `command_webview` `/claude-test-dashboard/blank` — unloads the dashboard (cameras/live video/cards) in the Companion App web view.
3. Brightness 0.
4. `command_screen_on` with command `release` — clears "keep screen on" (any value other than `keep_screen_on`).
5. `command_screen_off_timeout` 15000 ms — Android turns the panel off and the tablet can doze; the hidden frontend then drops its HA connection.
6. `command_persistent_connection` `screen_on` — app websocket only while the screen is on; commands arrive by FCM while off (app is the full Play flavor `io.homeassistant.companion.android`).
7. Bluetooth off, BLE transmitter off, high-accuracy GPS `force_off`.
8. `input_boolean.tablet_display_asleep` on.
All notify steps `continue_on_error`.
- Note: the Companion App has **no `command_screen_off`**; the old script sent one, which did nothing.

## script.tablet_wake
`command_screen_on keep_screen_on` → screen timeout 1 800 000 ms (fallback) → adaptive brightness off → brightness → `command_webview /claude-test-dashboard/home` → browser_mod navigate home → boolean off.

## Tablet sensors disabled in HA (stops the app sending them; re-enable in Settings → Entities if ever needed)
`sensor.sm_t727v_light_sensor`, `_geocoded_location`, `device_tracker.display` (GPS tracker, not used by any person), `_app_memory`, `_audio_mode`, `_volume_level_system`, `_internal_storage`, `_ble_transmitter`, `_ringer_mode`, `binary_sensor.sm_t727v_bluetooth_state`, `_battery_health`.
Kept (used by battery automations): battery level, battery state, is charging, charger type, battery power, remaining charge time, battery temperature, screen brightness, power save.
Enabled: `binary_sensor.sm_t727v_interactive` (screen on/off, event-driven) to confirm sleep works.

## Previous versions (for rollback)
- Old sleep script: browser_mod navigate blank → brightness 0 → `command_screen_off` → boolean on.
- Old wake script: browser_mod navigate home → `command_screen_on` → auto brightness off → brightness → boolean off.
- Old sleep automation: triggers away 3 min / motion off 10 min / awake 10 min; condition awake AND (nobody home OR motion off 10 min) at any time of day.
- Old wake automation: motion on; conditions someone home, asleep, 05:00–01:00.

## Needs the user (on the tablet)
- Screen lock type **None** (Settings → Lock screen), otherwise a real screen-off brings up the lock screen on wake.
- Companion App → Settings → Manage sensors → turn off **Location** (background/zone) tracking; disabling the tracker in HA may not stop GPS.
- Possible one-time permission prompts the first time (display over other apps, modify system settings).
- First run of the new sleep script: Oct 12 18:31 UTC (nobody home); HA side delivered all commands.
