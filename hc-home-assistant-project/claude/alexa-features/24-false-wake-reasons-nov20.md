# 24 - Alexa notes why a false wake happened (Nov 20)

Request: "If Alexa is woken falsely, have it identify why it was woken falsely and note it."

## What it does now
Whenever the kitchen Echo Show wakes and nobody was talking to it, a reason is worked out automatically and written as a `Why it woke:` line on the item in `todo.alexa_accidental_wakes`. The same reasons are rolled up nightly for the 3 AM review.

Reason codes: own_audio, run_on, soundalike, conversation, faint_speech, noise_bang, noise_rumble, noise_faint, noise_other, no_wake_logged. Faint-noise reasons say how much quieter than normal speech the sound was.

## Pieces
- Zima `/DATA/home/Harper/echo-fireos/ww/wake_why.py`: finds the wake decision in `wakelog/wake.jsonl` (UTC), measures the 3 s clip (level, bang / rumble / hiss / speech-like), checks nearby kitchen transcripts and sound-alike words, returns code + plain-English text. `--event/--heard/--turn` for one wake; `--day YYYY-MM-DD` appends to `wakelog/false-wakes.jsonl`.
- Zima `alexa-review/trigger.py`: new route `/wake_why` (used by HA) and the nightly job now writes `state/false-wake-summary.json` and adds `false_wakes` to the decision record.
- HA `script.alexa_wake_why_note` (fields folder, turn, question, wait_s): waits for the transcript, asks `/wake_why`, finds the todo item by its Recording line and appends the reason. Fixed a bug where `found` was parsed as JSON text although HA already hands it over as a dict.
- HA `automation.alexa_activity_logger`: silent-turn branch now calls the script after `todo.add_item` (wait 90 s).
- `alexa-review/review-prompt.md`: new "WHY IT WOKE" paragraph.

## Results on existing data
| Day (UTC) | False wakes | Main reasons |
|---|---|---|
| Nov 18 | 230 | rumble 109, faint 104, conversation 6, bang 5 |
| Nov 19 | 227 | faint 108, rumble 53, conversation 23, bang 23 |
| Nov 20 (so far) | 3 | bang 1, conversation 1, faint 1 |
The huge counts are from before stage 2 was turned back on (doc 21); since then very few get through.

## Backups / undo
- Zima: `ww/backups/wake_why.py.v1`; `alexa-review/backups/trigger.py.before-wake-why-2026-11-20`, `trigger.py.before-wake-why-nightly-2026-11-20`, `review-prompt.md.before-wake-why-2026-11-20`.
- HA host: `/config/backups-claude/2026-11-20/automations.yaml.before-wake-why`, `scripts.yaml.before-wake-why`.
- Quickest off switch: remove the last action ("Work out and note why it woke by mistake") from `automation.alexa_activity_logger`.

## Not done / ideas
- Optionally add stage-1 threshold, music-playing, satellite and noisy-mode fields to the page's decision log so reasons can mention them.
