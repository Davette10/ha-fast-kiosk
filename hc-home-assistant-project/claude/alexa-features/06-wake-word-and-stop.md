# Wake word, accidental activations, "off"/stop (Nov 16)

## Nov 16 PM: automatic ±0.1 tuning from the kitchen listener (doc 11)
- `script.kitchen_wake_tune`, called by the Echo page:
  - Woke when the kitchen was silent → +0.1.
  - "Alexa, …" heard but no wake → −0.1.
- It changes the normal helper, stays between 6.5 and 8.4, makes at most one change every 10 min, and writes a logbook line under "Kitchen Alexa wake tuning".

## Nov 16 PM: rolled back, too deaf (Owen: "barely activates, doesn't listen after")
- **Cause:**
  - The threshold had crept to 9.2: the 3 AM gate added +0.2 (cap 9.6), the false-start rule set a flat 9.6, and the music guard went up to 9.8.
  - `finished_speaking_detection` = **aggressive** cut listening ~2 s after "Alexa" if you paused. Seen at 3:51 PM: the 1st try listened 2 s and quit; the 2nd try worked.
  - Noise suppression also went up to medium the night before.
- **Now:**
  - `input_number.alexa_wake_word_threshold_normal` **7.5** (the value that worked Nov 9–12).
  - Finished speaking **relaxed**.
  - Noise suppression **low**.
  - Mic gain **+3** (was 0).
- **Caps:**
  - 3 AM gate auto-raise max **8.4**.
  - False-start bump = normal **+0.8** (max 9.0) for 2 min.
  - Music guard normal +0.4 (max 9.0).
- **Old values** if it gets too twitchy again: normal 9.2, aggressive, medium, gain 0. Prefer the text gate (listen_gate.py) for false wakes over raising the threshold above ~8.4.

## What happened
- **Nov 14, 10:34:51 PM:** a TV/podcast line ("Let's say you're going to host a dinner party") woke Alexa and got an answer.
  - 9 s later, "Let's say you're gonna host a dinner, Mark…" woke it again (ignored).
  - continue_conversation is OFF, so this was a second false wake, not follow-up listening.
- **Nov 15:**
  - 9:08 PM: "Off. Anyway." (ignored).
  - 9:28:25 PM: "Just turn it off." reached Gemini, and `HassTurnOff area=Kitchen` turned off the Echo switches, including **the screen** ("Kitchen is off").
  - Many "Thank you." / "." false wakes too.

## Fixes done
- Wake word threshold `number.vaca_amzn_echo_show_8_3a31_wake_word_threshold` (0–10, higher = harder to wake). Engine microwakeword.
- **One** everyday value: `input_number.alexa_wake_word_threshold_normal` (current value at the top; `initial` removed Nov 16 so it survives restarts).
  - A second helper, `input_number.alexa_wake_threshold_base`, was made by mistake and is now unused (safe to delete later).
- `automation.alexa_harder_to_wake_right_after_a_false_start`: after `script.alexa_not_for_me` or the stop automation, sets normal +0.8 (max 9.0) for 2 min, then goes back to the normal helper.
- `automation.voice_stop_talking` (local, never reaches the AI) also matches "[just|please] turn it off", "off [anyway]", "go away", "be quiet", "cancel", etc. "Turn off the kitchen lights" still goes to HassTurnOff.
- Unexposed from Assist: Echo screen, mute, alarm, screen saver, DND switches, Amazon Kids.

## Listening rebuild modelled on a real Echo (Nov 16)
| Real Echo layer | Here |
|---|---|
| Echo cancellation + self-trigger prevention | VACA WebRTC APM + noise suppression (now low); `automation.alexa_listening_guard_music_self_wake_listen_time_limit` raises threshold +0.4 (max 9.0) while the Echo plays music |
| 2nd-stage / cloud wake verification | Not possible: audio sent to HA starts after "Alexa" (0/108 turns contain it). Replaced by text-level gate below |
| Device-directed speech detection (Follow-up Mode, acoustic+ASR+semantic) | `alexa_helper` 1.2.0 `listen_gate.py`: scores each transcript (fragments, storytelling, talk to family names, "let's say…", no request shape, media playing vs. request shape, stop words) → pass / caution / ignore. Settings `/config/alexa_helper_gate.json`, log `/config/alexa_helper_gate_log.jsonl` |
| Endpointing | VACA finished speaking = relaxed; guard presses Interrupt after 12 s of listening, logs "listened 12 s, cut off" |
| Learning from real traffic | 3 AM gate raises the normal threshold +0.2 at 4+ accidental wakes/day (max 8.4); review prompt step 16 labels gate decisions into `state/gate-labels.jsonl` and nudges weights; kitchen listener ±0.1 nudges (doc 11) |
| Acoustic fingerprinting of TV/ads | Not rebuilt (needs per-broadcast fingerprints) |

**Install status:**
- `alexa_helper` 1.2.0 is staged on the Zima, served at http://192.168.6.170:8767 (for 24 h).
- Owen runs `curl -fsS http://192.168.6.170:8767/install.sh | sh` in the HA Terminal app, then `ha core restart`.
- The backup goes to `/config/alexa_helper-1.1.0-backup-<date>.tar.gz`.
