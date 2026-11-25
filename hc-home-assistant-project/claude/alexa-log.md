# Alexa log, feedback, screen use and reviews (updated Nov 25, 2026)

## Nov 24-25: replay tests and log changes (full detail in `claude/alexa-features/29-replay-tests-nov24.md`)
- **Replay tests:**
  - The Nov 24 run of 256 recorded turns replaces the Nov 18 tests.
  - Results are in `/media/alexa_log/replays/nov24-*` and `nov25-*`, as `results.jsonl` with a screenshot per turn.
  - **Final full pass on Nov 25 night:** 229 of 256 scored 10. After rerunning the failures, what is left:
    - 2 VAD cut-offs (Owen's decision);
    - 1 real screen bug: a short timer after an open card leaves an empty expanded island;
    - outside-service slowness (Gemini/OpenRouter outage at 2:19 AM, slow Groq speech-to-text);
    - reviewer judgement calls.
- **Logging during tests:**
  - Replay turns are not written to `todo.alexa_activity`, because the activity logger is off while `input_boolean.alexa_replay_test` is on.
  - Complaints that test turns log in `todo.alexa_feedback` are removed again by the tester's cleanup. Its `cleanup` field lists what was removed.
- **Complaint confirmations** (`automation.alexa_log_a_complaint_spoken_incl_misheard_logger_complaint` + `script.alexa_log_feedback`):
  - The problem is taken from the words as heard, keeping their full stops.
  - Only the first sentence is named, or the next one if the first only names a place.
  - At most 16 words are read back, with no trailing comma (Nov 25).
  - The reply says "Got it, I've logged that …", or "… and saved a screenshot" when a screenshot was asked for.
  - The screenshot is taken in the background.
- **os-echo-watch** (resource dece1d18…): the hidden per-turn log photo is now skipped during a camera question. Its source is `/config/echo-work/src/dece1d18bc24408e800043b603d03488.js`. Doc 31's staged simplification merges it into os-echo-pages.
- **Known log noise:** Piper logs "# channels not specified" each time Alexa stays silent (52 times on the night of Nov 24-25). It is not audible.

## Nov 16 late PM: Fix issues + Report an issue buttons (os-alexa-log now ~44.6 KB, hash ed4613ca…)
- **Header** (page mode): `Report an issue` (glass) · `Fix issues <n>` (glass, n = open items in Feedback + To fix; disabled when 0) · `Start review` (white). Status line shows "Claude is fixing…" vs "reviewing…" from the status `source`.
- **Fix issues** → `script.alexa_review` action=`fix` → Zima trigger.py `/fix` (same lock/one-at-a-time as /start, REVIEW_SOURCE=fix) → `run.sh` appends a FIX-ISSUES block: work through every open `todo.alexa_feedback` (top priority) then `todo.alexa_improvements` item and their Comment lines, fix + text-test, mark FIXED/EXPLAINED and complete, or add `STILL OPEN <date>: why`; skips memory/phrases/Amazon/wake/gate/listener steps; does NOT touch `state/last-run.txt`; posts `Fix run <date> · N items · M fixed` to Reviews and writes `reports/<date>-fix.md`.
- trigger.py `/status` now also returns `source` (button / fix / nightly). Backups of the pre-change trigger.py and run.sh: `alexa-review/backups/2026-11-16-fix-button/`. Patch script: `alexa-review/work/patch-fix-button.py`.
- **Report an issue** opens a frosted sheet with a text box; Save (or Ctrl/Cmd+Enter) adds to `todo.alexa_feedback`: summary `Written: <first ~70 chars>`, description `Time: …` / `Complaint: …` / `Source: Written on the Alexa Log by <HA user>`. Then switches to the Feedback tab. It does not fire `alexa_feedback_logged`, so no phone push for typed ones.
- Checked in Puppet at 2560×1600 dark.

## Nov 16 PM: transcript with audio + comments on every item (os-alexa-log, resource 0d75f0a979654be6b84383b76a437b4a)
- **Conversation card** (Conversations and Accidental tabs): finds the recorder folder `/media/alexa_log/conversations/<date>/<HH-MM-SS>_<device>/` exactly from the item's `Snapshot:` path (folder + turn), otherwise by time (latest folder starting ≤ item time; typed items only match `_typed` folders). Collects every activity/accidental item in that folder's window, numbers turns (snapshot turn wins, else sequential) and shows Person/Alexa bubbles. Play buttons resolve `turnNN_user.wav` / `turnNN_alexa.(wav|mp3|flac)` / `conversation.wav` via `media_source/resolve_media` and play in the viewing browser only (one shared Audio element).
- **Alexa reply audio was never saved:** no `turnNN_alexa.*` exists in any folder. The recorder fetches `/api/tts_proxy/<token>` after the run and gets nothing (stream token gone / TTS failing). The card falls back to re-speaking the logged "Said" text through `media-source://tts/tts.piper_3?...voice=en_US-alexa-medium` (override with card config `tts: {engine, voice, language}`) and says so in a hint line.
- **Comments:** every tab with a list item has a Comments card. Stored in the item's own description as `Comment: <Mon D h:mm AM> · <HA user name> · <text>` lines via `todo.update_item` (so the review bot sees them). Remove needs a second tap. Rows show "N comments". Ctrl/Cmd+Enter adds. Comment lines are hidden from the facts/para parsing. Memory items: comment lines go into `todo.alexa_memory` descriptions (check whether the prompt loader reads descriptions).
- NOT done (blocked by permission classifier): append a "keep and act on Comment lines" rule to Zima `alexa-review/review-prompt.md`. (The Fix-issues run block does tell Claude to act on Comment lines.)
- **Found Nov 16 3:31 PM onward:** Piper `en_US-alexa-medium.onnx` in /share/piper is corrupt again (INVALID_PROTOBUF) — every spoken reply fails, tts_proxy returns 500. No copy on the Zima. Owen must re-upload the full model (~63 MB) + .onnx.json, restart core_piper.

## Nov 16: Android logs, 3 AM nightly gate, stop/off, accidental wakes
- **Screen kept going off (root cause):** Nov 15 Christmas music from 7:51 PM; "Please stand" (8:33, = please stop) got a joke, "Off. Anyway." (9:08) was ignored as not-for-Alexa, "Just turn it off" (9:28) ran HassTurnOff on the Kitchen area, which turned off `switch.vaca_amzn_echo_show_8_3a31_screen` (off 9:28 PM → 12:48 AM). The Echo also cold-booted at 9:36 PM ("cold,charger" = power loss). Fixes: all VACA switches/buttons/numbers/camera hidden from Assist; `automation.voice_stop_talking` catches off / turn it off / just turn it off / stop; phantom "thank you/thanks/okay/all right" added to `automation.alexa_ignore_speech_to_text_phantoms`; phrase note "Please stand while music plays = stop"; noise suppression low → medium; wake threshold 9.0. Adaptive brightness got hysteresis.
- **Echo Android log collector (Zima):** `/DATA/home/Harper/echo-logs/bin/logcollect.py`, kept alive by `alexa-review/trigger.py`. Streams logcat → `echo-logs/android/<date>.log`; snapshot every 10 min; keeps 30 days.
- **Summary:** `echo-logs/bin/summarize.py` → `echo-logs/summary/<date>_<time>.md/.json`; NEW = not in `state/known_errors.json`.
- **3 AM gate:** `automation.alexa_nightly_review_gate_3_am` → `script.alexa_review` action=nightly → trigger.py `/nightly` → `run.sh` (REVIEW_SOURCE=nightly) only if something is worth it; skipped nights go to `todo.alexa_review_reports`. 4+ accidental wakes in a day → wake threshold +0.2 (max 9.6).
- `review-prompt.md` steps 13–15: Android logs → fix list; accidental/run-on check; data-driven wake threshold.
- Test note: don't test `/nightly` with logs that have new errors unless a review is wanted.
- File editor app can only read /homeassistant, not /media. Recorder JSON/MD files are not served by /media/local (only audio/image/video), so the dashboard reads text from the to-do items.

## Where everything is logged (Local To-do lists)
| List | What goes in it | Written by |
|---|---|---|
| `todo.alexa_activity` | Every turn: Time, Source, Asked/Heard, Said, Screen, Actions, AI review, Photo, Snapshot (+ Comment lines) | `script.alexa_log_turn` |
| `todo.alexa_screen_use` | Touch sessions and `Screen error · refreshed` items | `script.alexa_log_screen` |
| `todo.alexa_accidental_wakes` | Silent turns + Photo | `automation.alexa_activity_logger` |
| `todo.alexa_feedback` | Spoken complaints + Photo, and typed ones (`Written: …`) | `script.alexa_log_feedback`, Report an issue button |
| `todo.alexa_improvements` | Low scores/errors + nightly report + "Android: …" items | log_turn, nightly, review run |
| `todo.alexa_review_reports` | One summary per review/fix run, or "Skipped <date>" | Zima review / 3 AM gate |

## os-echo-watch (resource `dece1d18bc24408e800043b603d03488`)
- Echo only. Touch sessions → `script.alexa_log_screen`; hidden front-camera photo → `/api/image/upload` (skipped during camera questions since Nov 24); voice photo on `sensor.echo_show` `voice_face`; error watchdog presses `button.vaca_amzn_echo_show_8_3a31_refresh` (max 3 per 20 min).

## Alexa Log dashboard (`alexa-logs`, admin only, sidebar "Alexa Log")
- One panel view `log` with `custom:os-alexa-log` `page: true`. Tabs: Conversations (Real uses / Tests), Screen use, Accidental, Feedback, To fix, Reviews, Memory. Checked in Puppet (Puppet app may need starting: `0f1cc410_puppet`).

## Start review button
- Card → `script.alexa_review` → `rest_command.alexa_review` → Zima `trigger.py` (port 8766, X-Key) → `run.sh` (REVIEW_SOURCE=button). One review at a time, 40-min retry on usage limit.

## Complaint push
- `automation.alexa_tell_harper_about_a_complaint` → `notify.mobile_app_harpers_lphone` only (spoken complaints only; triggered by event `alexa_feedback_logged`).
