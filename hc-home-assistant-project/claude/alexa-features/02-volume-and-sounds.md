# Volume and sounds (Nov 15, rebalanced Nov 24)

## CURRENT (Nov 24 night): everything on the Echo plays at ONE loudness at every volume level
Owen: "match all media, volume, mute, wake sound, ALL sfx to be equal volume" (news was quieter than everything else), then "double check … at all volume levels", then chose the voice gain stage.

### Measured (silently: ffmpeg ebur128 on the Zima; YouTube watch-page `perceptualLoudnessDb`)
| Source | Loudness | Stream |
|---|---|---|
| Fox News briefing clips (YouTube) | −23.7 … −28.3, avg ≈ −25 LUFS (YouTube never turns quiet videos up) | media (page iframe) |
| Music Assistant music | −17 LUFS (MA normalisation; not verified, MA API needs a login) | media (Sendspin) |
| Alexa's voice (Piper `tts.piper_3`, core_piper add-on, no volume option) | −12.3 LUFS (six cached replies −11.9…−12.5), 22050 Hz mono | notification ("voice volume", 0–7) |
| SFX, momentary max (400 ms, padded) | wake −12.4, end −19.4, mute −23.8, unmute −20.7, volume −15.9, alarm −11.9, timer −14.4, reminder −16.8, notification −18.1, error −12.9, shutter −13.8 | media (WebAudio) |
- The news can't go louder (cross-origin YouTube iframe, max volume 100), so −25 LUFS is the common target.
- Both streams use the same speaker curve (dumpsys media.audio_policy): 1% −58, 20% −40, 60% −17, 100% 0 dB; percent = 100·index // max (integer division).

### Changes
1. **News** `os-echo-news` (resource `f181935d…`): YouTube `setVolume` 70 → **100**.
2. **SFX** `os-echo-fx` (resource `0969a981…`, hash `69dc6484…`): TRIM = 10^((−25 − LOUD)/20) per file. No special case for the volume blip. (old: trimmed to −17 max; volume fixed 0.316)
3. **Music** `automation.echo_show_one_volume_music_player_follows_the_echo`: MA player rests at **41%** (−7.7 dB, linear). Condition: not 0.405–0.415; a set to ≥0.995 only goes back to 41% without touching the Echo volume. (old: rest 1.0, condition below 0.995)
4. **Alexa's voice — gain stage** (alexa_helper **1.5.0**, `tts.py`, entity `tts.alexa_voice_echo_show`; source copy `claude/alexa-helper/tts.py`):
   - Runs Piper (`tts.piper_3`, voice en_US-alexa-medium) unchanged, then scales the 16-bit PCM by gain = (−25 + curve(media)) − (−12.3 + curve(voice)), clamped to [−40, 0] dB. Never boosts; any failure passes audio through unchanged. Handles both normal and streamed TTS (WAV header detection, per-sentence headers).
   - The gain is a TTS option (`gain_db`, from `default_options`), so HA's TTS cache keeps one copy per volume level. An explicit `gain_db` in a media-source URL overrides it (for silent tests).
   - New pipeline **"Gemini Assist (Echo Show)"** `01m887mj5n7kzeg1x3yrhfpype` (clone of Gemini Assist `01m1mv4wd92910191722ek9eyr` with this TTS). Only `select.vaca_amzn_echo_show_8_3a31_assistant` uses it; Harper's Voice PE and everything else stay on Gemini Assist / tts.piper_3. os-echo-chat still uses the old id for typed (text-only) follow-ups, which is fine.
   - `automation.echo_show_sync_volume_sliders`: voice index = lowest step at or above the needed level: m2v `[0,1,1,1,1,2,2,2,3,3,4,4,4,5,5,5]`, v2m `[0,4,7,9,12,15,15,15]` (original Nov 17 tables: m2v `[0,1,1,2,2,2,3,3,4,4,5,5,6,6,7,7]`, v2m `[0,2,4,6,9,11,13,15]`).
   - Result (computed for every media index 1–15): voice − news within ±0.05 dB; digital gain 0 to −20.3 dB.
   - Silent test (media-source resolve, files measured on the Zima): same sentence raw Piper −13.1 LUFS / peak 0.0; gain stage at the current level (media 7, voice 2) peak −2.3 dB; explicit −20.3 dB → peak −20.2. Tokens differ per gain (cache OK).
5. HA restarted 21:2x Nov 24 (nothing playing). Echo page's boot.js watchdog rebuilt the connection and reloaded the modules, so the new fx levels (incl. alarm/timer ring) are live.
- Side effect: loudest possible music is ~8 dB lower than before (everything matched to the news). Raise the Echo volume to compensate.
- Backup: HA `/config/backups-claude/2026-11-24/alexa_helper-pre-voicegain/` (alexa_helper 1.4.0). Undo voice stage: Echo assistant select → "Gemini Assist", restore the old tables, remove `Platform.TTS` + `tts.py`, restart.
- Not heard yet (no sound in the kitchen during tests; if a test ever needs the Echo, its volume stays at 0).

## Volume blip behaviour (Nov 24, Owen: "copy Alexa exactly")
- One fixed sound at one fixed gain; only the system (Android media stream) volume changes it.
- `os-echo-glance` `_vSnd` (resource `2230504843a142ff9a114b62729c9a56`, hash `7c2037d8…`): on a key press / slider release it waits until the Echo's music_volume state reaches the new level, then plays, so it's heard at the new level. One blip per level as it lands; max wait 1.5 s; target 0 = silent; a new blip stops the old one.

## Background (Nov 15)
- Echo media volume `number.vaca_amzn_echo_show_8_3a31_music_volume` (0–15, level 0–10 = round(m/1.5)); voice volume (0–7, notification stream) follows it via the sync automation.
- Silent measurement: `adb shell dumpsys media.audio_flinger` (G db = final track gain; ST 3 = music, ST 5 = notification/TTS).
- Voice commands "volume 5 / louder / quieter" set the Echo number; the music screen slider sets the Echo volume.
- SFX files from Owen's Fire OS backup at `/local/alexa-sounds/`. `play(k, gain)` accepts gain 0–2; above 1 a limiter is inserted.
- Copying files off HA for measuring: Zima `ncat -l 9911 > x.tar` (starts even though the call times out), then on the `ha` profile `tar cf - <files> | nc -w 5 192.168.6.170 9911`. TTS for tests: `media_source/resolve_media` on `media-source://tts/<engine>?message=…`, then curl the `/api/tts_proxy/…` URL from the Zima.
