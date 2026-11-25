# Harper's Voice PE → "Harper's Echo Dot" (Nov 20, ~1 AM)

Owen asked for the bedroom Voice PE to behave like an Echo Dot (LEDs, voice, name, AI, full feature set). Everything below was done without making the speaker play any sound (Harper's room, middle of the night). Nothing was voice-tested.

## Already in place before tonight
- Pipeline "Gemini Assist": wake word "alexa" (openWakeWord in HA), Groq Whisper STT, agent `conversation.alexa_with_backup`, Piper `en_US-alexa-medium`. The Voice PE already used it for both assistant slots.

## Changed
- **Light ring:** LED ring set to Alexa cyan (rgb 0,202,255, brightness 230), then switched off. The Voice PE firmware uses this colour for its listening/thinking/speaking animations. Mute stays red (firmware).
- **Name:** device renamed "Harper's Echo Dot". `media_player.voice_pe_music` renamed "Harper's Echo Dot (music)" and put in the bedroom area. No entity IDs changed.
- **Wake sound:** off (an Echo plays no start-of-request sound by default). Turn `switch.home_assistant_voice_0a6be6_wake_sound` back on if he wants it.
- **View Assist:** new audio_only entry "Alexa (Harper's Bedroom)" (entry `01M7VQDCZ098TDJAECR7SE4A35`, sensor `sensor.alexa_harper_s_bedroom`). Mic: the Voice PE satellite; media and music player: the ESPHome media player. This gives the Dot its own timers, alarms and reminders.
- **`automation.echo_show_alarms_reminders_timers`:**
  - The ring branch skips the screen jump for audio_only devices.
  - Saying "snooze" now finds the timer that is ringing. Before, it crashed on every device because it read `trigger.event`.
- **`automation.voice_stop_talking`:** "stop" also silences and clears an expired View Assist timer on the Dot and resets its light ring.
- **New `script.echo_dot_ring` and `script.echo_dot_ring_off`, plus `automation.bedroom_echo_dot_alarm_light_ring`:**
  - While a Dot timer, alarm or reminder rings, the ring pulses cyan.
  - The pulse stops by itself after stop, snooze or cancel, or after 5 minutes.
  - A double press of the button stops the ringing.
- **`automation.echo_show_screen_and_device_voice_commands`:**
  - The Dot gets spoken answers for weather, calendar and "where is everyone", instead of "That shows on the Echo Show".
  - Volume 0–10 is read from the Dot's own speaker, not the Echo Show's. The Dot changes volume silently, like an Echo.
  - "Play the news" on the Dot plays Fox News on `media_player.voice_pe_music`.
  - Do Not Disturb applies to the Dot's own View Assist sensor.
- **`script.alexa_set_timer`:** new `room` field (Kitchen / Harper Bedroom). Without a room it defaults to the Kitchen.
- **New `script.alexa_set_alarm` ("Set an alarm or reminder", exposed to Assist):** the AI's fallback for Dot alarms and reminders. Text-tested: "Alarm set for 6:30 PM.", then cancelled.
- **Announcements:**
  - New `automation.alexa_announcements_alexa_style`, triggered by "announce / broadcast / tell everyone …".
  - It runs `script.alexa_announce`, which hands each satellite to `script.alexa_announce_one` (fire and forget, because announce can hang). It skips the speaker the announcement came from and any speaker with Do Not Disturb on.
  - It also sends "announce …" to the real Echos (Everywhere).
- **Gemini prompt v3.20, on both subentries (main and backup) and in the Zima `live-prompt.txt`:**
  - New WHICH SPEAKER YOU ARE section: Harper Bedroom = Echo Dot with no screen.
  - Timers pass the room.
  - Bedroom alarms and reminders use the new tool.
  - Bedroom music, news and "what song is this" use `voice_pe_music`.
  - The screen tools are kitchen-only.
  - Zima backup: `prompt/backups/live-prompt-before-v3.20-2026-11-20.txt`; edit script `prompt/edit-v3.20.py`.
- **Music Assistant:** it was in `error` (OOM-killed with exit 137 on Nov 19 15:10, right after its torch-based Smart Fades analysis loaded). Restarted at 00:45 and running. That outage broke music on both the Echo Show and the Dot.

## Backups (ha-mcp edits scope)
- automation.echo_show_screen_and_device_voice_commands / echo_show_alarms_reminders_timers / voice_stop_talking: `*.20261120_0540*.yaml`
- script.alexa_set_timer: `script.script.alexa_set_timer.20261120_054015.yaml`
- Gemini subentries: `helper_config_subentry.01M1MTZF6HYNNC21PGCSSGWE43_01M1MTZF6HEBV2SPV45ZGXBTQQ-5735d4b3.20261120_054334.yaml` and `..._01M74FGJEB96S39B5QB5T47SKV-bd5dce95.20261120_054334.yaml`

## Not possible / still open
- **Light ring shape:** Alexa's own animation (blue ring with a cyan arc pointing at the speaker) and the yellow notification ring need custom ESPHome firmware on the Voice PE. The ESPHome Device Builder app is not installed. Flashing would replace the stock firmware (recoverable by USB reflash). Waiting on Owen.
- **Amazon cloud features:** Drop In and calling, Alexa skills, and Amazon shopping by voice are not reproduced on the Dot. Real-Echo features are still reachable through Ask Alexa.
- **Untested by voice:** the ring sound and pulse, snooze, stop, announcements, the bedroom music path and the LED colour. Test in the daytime.
- **Music Assistant risk:** it may be OOM-killed again on the 4 GB VM. If so, disable Smart Fades (audio analysis) in MA and stop it scanning `/media/cameras`.
