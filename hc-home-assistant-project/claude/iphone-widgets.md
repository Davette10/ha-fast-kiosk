# iPhone widgets (Scriptable), Oct 21, 2026

Two Scriptable scripts:
- Source: `outputs/widgets/`.
- Copies on the Mac: `Desktop/ha/widgets/Family Locations.js` and `Lights On.js`.
- Status: built and tested with a mock Scriptable runtime against real HA data (`scratchpad/wg/`: mock.js, run.js, shot.js). **Not yet run on a real iPhone.**

## How they get data
- `POST /api/template` with one Jinja template per widget. The exact template text was verified with `ha_eval_template`. This endpoint needs an **admin** long-lived token.
- Connection is set up when a script is first run in the Scriptable app. Both scripts share the same Keychain keys:
  - `clarkhome_ha_url`, default `https://homeassistant.YOUR-TAILNET.ts.net` (Tailscale Funnel, works anywhere).
  - `clarkhome_ha_url_away`, the backup, default `http://192.168.6.172:8123`.
  - `clarkhome_ha_token`. The user pastes the token himself; Claude never handles it.
- The last good data is cached, and shown as "Offline · time" when HA can't be reached. A refresh is requested every 5 minutes (iOS decides when it actually runs).

## Family Locations
- Shows Jason, Jill, Hayden and Lauren (Harper is not included, per the request).
- **Place:**
  - In an HA zone: the zone name (person state; `home` shows as "Home").
  - Otherwise: the street address from Apple's on-phone reverse geocoder (`Location.reverseGeocode`, house number + street, town), cached in ~50 m buckets. If that fails it falls back to Life360's `address` attribute.
- **Unavailable:** when `binary_sensor.<name>_location_live` is off, it shows "Location unavailable" plus "Last seen".
- **Distance and drive time:** from the existing Waze sensors `sensor.waze_<name>_to_home` (state = minutes, attribute `distance` = miles). Shown when not home and there's room. Under 0.1 mi shows "Nearby".
- **Also shown:** driving (Life360 `driving`, speed when above 2), "since" (`at_loc_since`), and Life360 photos (`entity_picture`, cached 3 days) with a family-colour ring. If there's no photo it draws the initial.
- **Sizes:**
  - small: 4 compact rows.
  - medium: name + place, with miles and minutes on the right.
  - large: cards with the full address and a detail line.
  - Lock Screen: rectangular / inline.
- **Widget parameter** = a name ("Jill") gives a single-person widget.
- **Taps:** each row opens `homeassistant://navigate/mobile-dashboard/person-<id>`; the widget background opens the family map.

## Lights On
- Same exclusions as os-lights: `browser_mod`, `_led_ring`, `fu_zhi_bkn`.
- **Names and rooms:** names come from the dashboard names map. Rooms come from the ROOMS map (Harper Bedroom → Harper's Room; Lauren's and Hayden's lamps have no HA area, so they're mapped by entity).
- **Bulb tint:** the light's colour in colour modes, otherwise warm or cool white.
- **Sizes:**
  - small: count + 3 names.
  - medium: 4 rows with a brightness bar and %.
  - large: grouped by room, up to 9 rows.
  - Lock Screen: rectangular / inline / circular.
- **Tap:** opens the mobile Home dashboard.

## Install (user steps)
1. Install Scriptable (free).
2. Put both .js files in iCloud Drive → Scriptable, or paste each into a new script.
3. Run one in the app and enter the token.
4. Long-press the Home Screen → + → Scriptable. Choose the script, and optionally a name as the Parameter.
