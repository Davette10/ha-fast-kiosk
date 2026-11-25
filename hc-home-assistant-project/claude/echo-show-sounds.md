# Echo Show original sound effects (updated Nov 10, 2026)

Owen wants the real Echo Show sounds, not imitations. Source: **his own Fire OS backup** (`~/echo-crown/raw-backup/full-emmc.img` on the Ubuntu PC; copy on the Zima at `/DATA/.media/sda3/alexa backup/echo-crown/raw-backup/full-emmc.img`). Never download Amazon sounds from websites.

## Extraction
- **Script:** `get-echo-sounds.sh` (in `Desktop/ha/` and `outputs/ha/`): loop-mounts the backup read-only, copies loose audio plus audio inside APKs, sends `fireos-sounds.tgz` (626 files) to the Zima.
- **On the Zima:** `/DATA/home/Harper/echo-sounds/fireos-sounds/` (`files/` = loose, `apps/<apk>/res/` = from apps; resource names are obfuscated, e.g. `7E.mp3`).

## Mapping (file in /config/www/alexa-sounds ← original)
| Name | Original | Length | Used for |
|---|---|---|---|
| **wake.mp3** | SpeechInteractionManager res/7E.mp3 — **confirmed by Owen by ear Nov 10** | 0.70 s | wake word (card plays on `listening`) |
| **end.mp3** | SpeechInteractionManager res/Eh.mp3 — **confirmed by Owen: "finishing tone when you're done talking"** | 0.77 s | end of request (listening → processing); `end_sound: true` now set on the home card |
| wake.ogg / end.ogg | -E.ogg / Ay.ogg — my first pitch-based guess; Owen: -E is NOT the wake sound, Ay "similar to -E, unknown use" | | no longer used (files can stay) |
| mute.mp3 | KnightSystemUI kni_controls_privacy_mode_on | 0.36 s | mic off |
| unmute.mp3 | KnightSystemUI kni_controls_privacy_mode_off | 0.51 s | mic on |
| volume.mp3 | KnightSystemUI kni_controls_volume_adjust | 0.39 s | volume change (plays immediately) |
| alarm.mp3 | com.amazon.alarms system_alerts_melodic_01 | 6.0 s | alarm ring (loops) |
| timer.mp3 | com.amazon.alarms system_alerts_melodic_02 | 6.0 s | timer ring (loops) |
| reminder.mp3 | com.amazon.alarms default_reminder_earcon | 1.5 s | reminder |
| notification.mp3 | knight.blink med_alerts_notification_01 | 1.4 s | not wired yet |
| error.mp3 | paladin tts_error_earcon | 0.9 s | not wired yet |
| shutter.mp3 | zordon ui_camera_shutter | 0.55 s | camera question photo |

- Candidates Owen auditioned (Zima share `Downloads/downtify/alexa-wake-candidates/wake-candidate-1..7.mp3`): 1=-E.ogg (not wake), 2=Eh.mp3 (end tone), 3=7E.mp3 (wake), 4=Ay.ogg (unknown), 5–7 = Sd.wav/Cz.wav/Nv.mp3 (silent).
- Owen said alarm, shutter, mute are right.
- **Not found on the device:** the doorbell chime (cloud audio). The card's synthesized doorbell chime stays.

## Install of wake.mp3 / end.mp3 (Nov 10)
- Prepared on the Zima share: `Downloads/downtify/alexa-sounds-update/wake.mp3` and `end.mp3`.
- Owen uploads both into `/config/www/alexa-sounds/` with Studio Code Server (the old curl-from-Zima-http.server route was refused by the permission classifier this time: "Expose Local Services").
- Then `button.vaca_amzn_echo_show_8_3a31_refresh`.

## Wiring
- **`os-echo-fx`** (resource `0969a981…`, sha256 `7b4d7ce3…`, 7,972 B): `FILES.wake = "wake.mp3"`, `FILES.end = "end.mp3"`; preloads into AudioBuffers, skips leading silence, keep-warm 25 Hz at 1e-4 gain; `play(name)`, `ring(on, kind)`; mute/unmute fall back to a synthesized chime only if their file is missing.
- **os-echo:** wake on `listening` (`wake_sound: false` turns it off); end when `processing` follows `listening` and `end_sound: true`; volume blip; mute/unmute via `_mute`; `_ringSound` by timer class; shutter in `_camStop`.
- VACA's own wake sound select = None.
- **Never test-play:** the Echo is in the kitchen.
