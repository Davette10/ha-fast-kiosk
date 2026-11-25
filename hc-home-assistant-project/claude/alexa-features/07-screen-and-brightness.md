# Screen on/off + brightness (Nov 16)

- **Cause 1 (screen "coming on and off"):** the 9:28 PM false activation turned `switch.vaca_amzn_echo_show_8_3a31_screen` OFF. With "screen on with wake word" ON and screen timeout 60 s, the screen then only lit on activity and went dark after 60 s. Fixed: switch back on; screen switches unexposed from Assist; "turn it off" now = stop.
- **Cause 2 (flicker):** `automation.echo_show_adaptive_brightness` (brightness = 8 + 30·log10(lux+1) + offset `input_number.echo_show_brightness_offset`) chased the light sensor flickering 0↔1 lux in the dark → 27%↔36% every ~5 s all night (465 changes in 10 h). Fixed: raw lux trigger (id `lux`) only changes brightness if it differs by ≥10; new trigger `lux_settled` (reading held 90 s) applies smaller changes (≥2).
- VACA settings of note: auto_brightness off (custom curve instead), screen_always_on on, screen_on_with_wake_word on, timeout 60, motion detection none.
- Android events buffer is tiny (256 KB) and flooded; see 08 for the collector.
