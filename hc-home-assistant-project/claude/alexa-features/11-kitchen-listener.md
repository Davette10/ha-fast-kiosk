# Kitchen listener: 24/7 transcription, wake auto-tune, 4 AM Gemini complaint review (Nov 16, 2026)

Owen asked for this. Everyone in the house knows the kitchen is transcribed and agreed to it.

## What it does
1. **Records the kitchen all the time.** The Echo Show's dashboard page captures the mic. A cheap loudness detector cuts one clip per stretch of talking: a clip ends after 1.2 s of quiet, runs at most 30 s, and needs at least 0.4 s of speech. Each clip goes to the Zima.
2. **Transcribes locally on the Zima** with faster-whisper `small.en` (int8, 3 threads). Nothing leaves the house at this step; the Groq STT that the voice pipeline uses is not touched.
   - One `.txt` per clip, plus a `day.jsonl` per day.
   - A "day" runs 4 AM to 4 AM.
3. **Wake word auto-tune** (Owen's rule):
   - Alexa wakes and the 2.5 s before were silent, with no screen tap → threshold **+0.1** (harder to wake).
   - Someone says "Alexa, <words>" and Alexa never starts listening → threshold **−0.1** (easier to wake).
4. **4 AM Gemini review:**
   - Gemini reads the whole day, writes a summary to `todo.alexa_review_reports` ("Kitchen day <date> · N clips, M min · K possible complaints").
   - It also puts every possible complaint about Alexa/the Echo on `todo.kitchen_complaints_to_review`.
5. **Owen marks each complaint Real or False positive:**
   - 8:30 AM push to Harper's phone (`notify.mobile_app_harpers_lphone`; complaint pushes go only there), with **Real complaint / False positive** buttons.
   - Checking an item off in the list also counts as real.
   - Real ones are copied to `todo.alexa_feedback`, so the 3 AM Claude fixer sees them the next night.
   - The last 30 labels are fed back to Gemini as examples, so it learns what Owen counts as a complaint.
6. **Nightly health check by the Zima's Claude review bot** (added Nov 16 PM): see the next section.

## Everything scheduled runs without Owen's Mac
| Time | Where | What |
|---|---|---|
| all day | Echo + Zima | Recording, transcription, ±0.1 wake nudges |
| 3:00 AM | HA → Zima `trigger.py /nightly` → `run.sh` (claude -p) | The existing Claude review. **Step 17 of `alexa-review/review-prompt.md`** now checks the kitchen listener: server health (`/stats`), the page (`q_osel.js`), adb reverse, dumpsys mic sharing, clip quality, whether each wake nudge was right, real complaints, and Gemini false positives. The gate starts Claude when the listener is unreachable, logged transcription errors, or saved no clips that day, plus once on the first night (`state/kitchen-first-check.done` marks that it ran). |
| 4:00 AM | HA (VM on the Zima) | Gemini day summary + possible complaints |
| 8:30 AM | HA | Real / False positive pushes |

The one-time cloud check-in this chat had scheduled for Nov 16 evening was turned off (it needed the Mac). Its job is now done by the 3 AM review.

Same patch, also in `review-prompt.md`: the old wake rules ("never lower it", "never below 8.5", "max 9.6") were replaced with the Nov 16 PM limits (6.5–8.4, both directions), so the bot can't make Alexa deaf again.

Backups taken before the patch, both in `alexa-review/backups/`:
- `review-prompt.md.before-kitchen-listen-2026-11-16`
- `trigger.py.before-kitchen-gate-2026-11-16`

## Pieces
| Where | What |
|---|---|
| Echo page | Dashboard resource `1d3a4813a42542ccaa91afb7c39aca84` = `os-echo-listen.js` (copy in project `ha/os-modules/os-echo-listen.js`). Runs only on `/alexa-dashboard` on Android (same guard as os-echo-watch). AudioWorklet downsamples 48 → 16 kHz and computes RMS per 20 ms. Posts WAV to `http://127.0.0.1:8780/chunk` with a 60 s timeout; a clip is dropped after 3 failed tries. Status object `window.__osel` (clips/sent/fail/err/tunes/floor/peak/running); CDP probe `q_osel.js`. |
| Echo → Zima | `adb reverse tcp:8780 tcp:8780` (re-applied every 60 s by server.py). Chromium allows an https page to fetch `http://127.0.0.1`, so there is no mixed-content block. |
| Zima | `/DATA/home/Harper/kitchen-listen/`: `server.py` (copy in project `claude/kitchen-listen/server.py`), `venv/` (faster-whisper; pip works inside a venv even though the system has no pip), `models/` (small.en, 464 MB), `audio/<day>/*.wav` (**kept 2 days**), `text/<day>/*.txt` + `day.jsonl` (**kept 30 days**), `server.log`. |
| Zima supervisor | `alexa-review/trigger.py` thread `listen_loop` keeps server.py running (no cron, no sudo). trigger.py also proxies `POST /kitchen_day?d=YYYY-MM-DD` and `/kitchen_stats` for HA, and its `nightly()` adds `kitchen_reasons` to the 3 AM gate. Backups: `alexa-review/backups/trigger.py.before-kitchen-listen-2026-11-16` (before listen_loop) and `trigger.py.before-kitchen-gate-2026-11-16`. |
| HA | `rest_command.alexa_review` with `action: "kitchen_day?d=<day>"` / `"kitchen_stats"` (existing rest_command, key header; no YAML change). |
| HA | `input_boolean.kitchen_listener`: the off switch (no `initial`, so it survives restarts). Nothing is recorded while `switch.vaca_..._mute` is on. |
| HA | `script.kitchen_wake_tune` (direction less/more): changes `input_number.alexa_wake_word_threshold_normal`, keeps it between **6.5 and 8.4**, makes at most one change per 10 min, writes a logbook line, and adds "woke in silence" items to `todo.alexa_accidental_wakes`. |
| HA | `automation.kitchen_listener_4_am_gemini_review`: uses `ai_task.google_ai_task`, falling back to `_backup`, with structured output `summary` + `complaints_json`. The transcript is capped at 350k characters. |
| HA | `automation.kitchen_listener_8_30_am_ask_about_possible_complaints`: up to 6 pushes, then one "N more" push. |
| HA | `automation.kitchen_listener_complaint_buttons_real_false_positive`: handles `KCR_REAL_<uid>` / `KCR_FALSE_<uid>`. |
| HA | `todo.kitchen_complaints_to_review` (local_todo entry `01M7K3KMSJABGBBMPNC25HAN1P`). Items start "❓", then become "Real · …" or "False positive · …". |

## Checks done (Nov 16)
- **Mic sharing:** `dumpsys audio` shows VACA (VOICE_RECOGNITION, 16 kHz) and the page (CAMCORDER) on the same input patch, both `silenced:false`. The wake word is unaffected.
- **Echo load:**
  - The audio HAL already uses ~56% of one core with the listener off (that's VACA).
  - The listener adds about 1–2% in the WebView renderer.
- **PyAV:** `av` in the venv dropped `metadata_errors`, which breaks faster-whisper's `decode_audio`. server.py therefore decodes the WAV itself with numpy.
- **Gemini dry run:** on fake text it caught "ugh it never hears me" and skipped "this chicken is too dry".
- **Uploads:** a manual POST from the page worked. A first real clip (21:17) was lost to the PyAV bug, before the fix.
- **Not tested with sound** (no-sound rule). The first real clips appear when someone talks in the kitchen; the first 3 AM run checks them.

## Tuning knobs
- **Page** (`os-echo-listen.js`):
  - Speech means RMS above max(noise floor × 3, 0.0015).
  - A clip starts at 4 loud frames out of 10.
  - Constants: HANG 60 frames (1.2 s), MAXF 1500 (30 s), MINSPEECH 20.
  - Silent-wake test: fewer than 3 loud frames and a peak below max(floor × 2.5, 0.0015) in the 2.5 s before `listening`.
  - Missed-wake test: transcript starts with "(hey/ok) Alexa" followed by words, and the satellite never reached `listening` during the clip or within 1 s.
- **Server** (`server.py`): `KL_MODEL` env var (small.en; base.en if the Zima is too busy), `AUDIO_DAYS` 2, `TEXT_DAYS` 30. Short clips that are only "thank you / you / bye / okay" are dropped as Whisper noise.
- **Interplay with older tuners:**
  - The 3 AM gate still adds +0.2 at 4+ accidental wakes a day, max 8.4.
  - The false-start bump is normal +0.8 (max 9.0) for 2 min.
  - The music guard is +0.4 (max 9.0).
  - The nightly Claude review may move it up to 0.3 a night within 6.5–8.4.
  - All of them read the same normal helper.

## Undo
1. Turn off `input_boolean.kitchen_listener`. That alone stops all recording.
2. Fully remove: delete dashboard resource `1d3a4813…`, then the three `kitchen_listener_*` automations, `script.kitchen_wake_tune`, the list and the helper.
3. Restore the trigger.py and review-prompt.md backups, then kill trigger.py's pid (systemd restarts it).
4. **Before deleting** `/DATA/home/Harper/kitchen-listen/`: it holds the transcripts and audio. Copy `text/` somewhere first if you want to keep them.
