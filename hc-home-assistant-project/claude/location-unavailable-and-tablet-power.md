# Location "Unavailable" + tablet screen power (Oct 8, 2026)

## Location unavailable
A person is **Unavailable** when any of these is true:
- `binary_sensor.<name>_location_live` is **off** (added Oct 8 afternoon, see below), or
- `person.<name>` is unknown/unavailable, or
- every tracker in its `device_trackers` is unknown/unavailable.

### Stale-location detection (Life360 stops reporting)
- Life360 keeps the last state (e.g. `home`) when a phone stops reporting; only the `last_seen` attribute stops moving. A healthy phone checks in about every 30 minutes, even overnight (checked on Lauren's tracker, Oct 7-8).
- Five Template helpers (binary_sensor, device_class connectivity): `binary_sensor.jason_location_live`, `..._jill_...`, `..._lauren_...`, `..._harper_...`, `..._hayden_...`. On = at least one of the person's trackers has a valid state AND a fresh timestamp (Life360 `last_seen`, else `last_updated`) within **60 minutes**. Template uses `now()`, so it re-checks every minute.
- First real case: Hayden's Life360 last check-in was Wed Oct 7 23:02; his HA-app tracker is `unknown`. Sensor = off, dashboard shows Unavailable · "Last seen Wed 11:02 PM" (verified in Puppet).
- Still counted as home by `person.hayden` / `zone.home` (state is stale `home`), so the Family "x of 5 home" count and the tablet "someone home" logic still include a stale person.

### Where it shows
- Grey outlined pill with `mdi:map-marker-off-outline` and "Unavailable"; second line "Last seen <time>" (Life360 `last_seen` if present), or "No recent location".
- `os_person_row` button-card template (both dashboards): `pill` and `loc` check the live sensor first. Every row (tablet Home; phone Home + More) has its live sensor added to `triggers_update` so it flips without a page reload.
- Inline resource **os-location** (`2513976c769b4c3db98057f3ed5321e1`, source `Desktop/ha/os-modules/os-location.js`): wraps `os-family-map._render` (Map page list rows, matched by `data-path`) and `os-person-page._render` (hero pill, `.where` = "Location unavailable", `.since` = last seen). Exposes `window.__osLocUnavail` / `window.__osLocLastSeen`.

## Tablet screen power
- Helper `input_boolean.tablet_display_asleep` (on = screen off). `script.tablet_sleep` turns it on at the end; `script.tablet_wake` turns it off.
- `automation.tablet_sleep_display_when_everyone_is_away` (alias "Tablet - sleep display when nobody is home or no motion"): triggers `zone.home` below 1 for 3 min, `binary_sensor.downstairs_motion` off for 10 min, or the screen awake for 10 min; condition screen awake AND (nobody home OR no motion for 10 min).
- `automation.tablet_wake_display_when_someone_gets_home` (alias "Tablet - wake display on motion"): Downstairs motion on, someone home, screen asleep, not 01:00-05:00. Brightness 170 (07-20) / 70.
- `automation.tablet_daytime_and_evening_brightness`: only sets brightness (notify) while awake; never wakes the screen.
- `automation.tablet_night_blackout_window`: 01:00 sleep only; the fixed 05:00 wake was removed.
- `automation.tablet_re_sleep_10_minutes_after_a_night_wake`: disabled (its browser_mod sensor is unavailable; the 10-minute idle rule covers it).
- The old automations listed `device_tracker.life360_emme_laakso`, which no longer exists, so the "all away" condition could never pass. Presence now uses `zone.home`.
- browser_mod entities are all unavailable (update pending), so the "park on /blank" step in tablet_sleep does nothing; screen-off still goes through the Companion App (`command_screen_off`).
- Doorbell automation still wakes the tablet; it goes back to sleep after 10 min without motion.
