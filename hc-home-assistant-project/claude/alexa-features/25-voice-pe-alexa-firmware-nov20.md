# Harper's Echo Dot (Voice PE): custom Alexa firmware (Nov 20, ~8 AM)

Owen asked for the Alexa sounds from his own Echo backup on the Voice PE (wake, volume, mute, finished-listening), and the Alexa light animation if possible. The only way to do both was custom ESPHome firmware. It was built on the Zima and flashed over the network.

## Correction to doc 24
Before today the Voice PE's wake word was **"Okay Nabu"** (on-device), not "Alexa". The pipeline's openWakeWord "alexa" setting never applied to it. The new firmware adds the on-device microWakeWord **"alexa"** model, and the active wake word is now **Alexa**.

## What the firmware changes
It is the official 26.9.0 firmware with a few edits.
- **Sounds:** Owen's own Echo sounds from his Fire OS backup, converted to 48 kHz mono FLAC with the leading silence cut, are built into the firmware.
  - wake = SpeechInteractionManager `7E.mp3`; also used for the center button press.
  - end of listening = `Eh.mp3`, played on the VAD end.
  - mic off / on = KnightSystemUI `privacy_mode_on/off`.
  - volume = `kni_controls_volume_adjust`, played on every volume change from the dial or from HA.
  - timer = `system_alerts_melodic_02`.
  - error = paladin `tts_error_earcon`.
  - The wake and end tones play only while `switch.home_assistant_voice_0a6be6_wake_sound` is on. It is on now.
- **Light ring:** the colours are fixed in the firmware (blue 0,24,255; cyan 0,205,255). The LED Ring light colour no longer changes the voice animations.
  - wake: blue fills out from the front in both directions, with a cyan arc at the front.
  - listening: steady blue with the cyan arc.
  - thinking: alternating cyan and blue blocks spinning.
  - speaking: the whole ring pulses blue to cyan.
  - error: short blue fade-out plus the error tone.
  - mic off: solid red ring.
  - volume: white arc.
  - native timer ringing: a cyan arc spinning on a blue ring.
- `esphome.project.version` = `26.9.0-alexa`. Everything else is stock: OTA, HA-provisioned API encryption, sendspin, button events.

## Files (Zima `/DATA/home/Harper/voicepe-fw/`)
- `src/`: upstream git tag 26.9.0 (untouched), plus the generated `alexa-voice.yaml` and `alexa-dot.yaml`.
- `make_alexa_yaml.py`: regenerates both from upstream. Re-run it after pulling a newer upstream tag.
- `mksounds.sh`: makes `alexa-sounds/*.flac` from `echo-sounds/fireos-sounds/apps/...`.
- `build.sh` / `upload.sh`: compile and OTA (`esphome upload --device 192.168.4.35`).
- `venv/`: ESPHome 2026.6.0 on Python 3.14.
- `bin/patch`: a stand-in for GNU patch, which ZimaOS lacks (needed for the micro-opus patches). It runs `git apply --recount` against a dummy repo.
  - Do not add `--inaccurate-eof`; it corrupted `mathops.h`.
  - A stale staging folder was moved to `old-opus-build-1/`.
- `stock-backup/`: the official 26.9.0 `stock-26.9.0.ota.bin` and `factory.bin`, with md5 checked against the manifest. This is the way back.

## HA side
- `select.home_assistant_voice_0a6be6_wake_word` = Alexa.
- Wake sound switch on.
- `update.home_assistant_voice_0a6be6` shows stock 26.9.0 as an update because the version string differs. It is skipped (26.9.0) so nobody installs it by accident. **Installing that update is the one-click way back to stock.**
- `automation.echo_show_alarms_reminders_timers`: for `sensor.alexa_harper_s_bedroom` the ring sound is `/local/alexa-sounds/alarm.mp3`, `timer.mp3` or `reminder.mp3`, by timer class. The class is read from the `va_timer_expired` event data and falls back to timer.

## Verified
- Build succeeded. OTA succeeded: 3,739,952 bytes in 11.7 s.
- The device reconnected with its encryption key.
- `assist_satellite/get_configuration` lists "Alexa" as an available wake word and reports it active.

## Not verified (no sound tests made from here)
- How the animations look.
- Whether the sounds play at the right moments.
- How well the alexa model wakes, and its false-wake rate on "Slightly sensitive".
- Whether `va_timer_expired` actually carries `timer_class`. If not, alarms ring with the timer sound.
