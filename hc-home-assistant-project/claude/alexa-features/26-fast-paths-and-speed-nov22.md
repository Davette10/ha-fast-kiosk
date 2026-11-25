# 26 - Fast paths (automations instead of the AI) + per-turn speed log (Nov 22)

Request: turn common Alexa requests into automations so she answers faster, build them from every past use, add fast-path building to the review and fix runs, simplify slow actions, and log talk time / thinking time / what she was thinking / reply length for every turn.

## Baseline from the history (234 recorded runs, Nov 9-22)
| Path | Turns with a real reply | Median think | Avg think |
|---|---|---|---|
| AI (Gemini via alexa_with_backup) | 52 | 3.9 s | 6.3 s |
| Local (sentence trigger / intent) | 38 | 0.05 s | 0.6 s |
- Speech-to-text after the person stops: ~0.4 s either way. TTS prep ~0 s. The AI is the whole delay.
- ~10% of AI turns took 27-32 s = the main model hung until alexa_helper's 30 s timeout, then the backup answered.

## Fast paths added (live)
- **News** (`automation.echo_show_screen_and_device_voice_commands`, trigger `news`): "can you tell me the news", "tell me the daily/latest/today's news", "what's the latest news", "what's happening in the world", fillers `[alexa] [can you|could you|would you|will you|please]`, "news briefing please". Was 2.3-32 s via the AI.
- **Screens** (same automation): "open / pull up / bring up / go to" the map, family map, calendar, weather, cameras, front door, thermostat, music player, timers, shopping list; filler versions of the "show" sentences.
- **Room light brightness, misheard** (trigger `bright_set`, existing Nov 21 lights branch): "set the bonus (room) on my lights to N", "so the brightness of my light is to N", "set the furnace on my lights N", "set my lights to N", "dim my lights to N". Was 11.9 s via the AI / or silently ignored.
- **Weather now** (`automation.echo_show_weather_right_now_alexa_style`): filler versions, "tell me the weather", "what's the weather going to be like today", "what's the temperature right now".
- **Jokes** NEW `automation.alexa_tell_a_joke_fast_path_no_ai`: 40 built-in family jokes + "I've got more jokes. Just ask." Text-tested. Was 3-4 s.
- **Music** NEW in alexa_helper 1.3.0 `custom_components/alexa_helper/fastpath.py` (not an automation, see gotcha): "play X", "play X by Y", "put on X", "I want to hear X" on the kitchen Echo Show or Harper's Echo Dot go straight to `script.play_on_voice_assistant` and say its `say` sentence. Falls through to the AI for: anything with news/briefing (unless "radio"), videos/YouTube/TV/games/timers, another room or everywhere, vague ("music", "something", "it again", "next"), >8 words, the listen gate's "caution" verdict, other devices. Logic tested offline (Zima `alexa-review/work/test_fastpath.py`), not by sound. Was 13 s.
- Already local before today (checked): time, date, timers, alarms, shopping-list add, complaints (incl. misheard), Life360, stop/off, thank-you phantoms.

## Gotchas found (important for future fast paths)
- **A matching sentence trigger always ends the turn.** If its automation's conditions fail, HA answers "Done" and nothing happens; it does NOT fall through to the AI. Verified ("play some music" -> "Done"). So fast-path automations must have no rejecting conditions; "maybe" cases go in alexa_helper fastpath.py.
- When two triggers match one sentence, both automations run.
- No-execution matcher: `ha_call_service(ws_command="conversation/agent/homeassistant/debug", data={"sentences":[...],"language":"en"})` shows which trigger/intent would match without running anything (no sound). Use it for all testing.
- Python `'what''s'` = "whats" (string concatenation): write apostrophes inside double quotes when building sentence lists.

## Speed log (alexa_recorder 1.3.0, `timing.py`)
- Every turn's `turnNN.json`, `conversations/index.jsonl` and `transcript.md` get a `timing` block: `talk_s`, `wait_before_talk_s`, `stt_s`, `think_s`, `tts_prep_s`, `reply_ready_s` (end of speech -> reply ready), `speak_s` (+ `speak_source` audio/estimate/silent), `answered_by` (local / fast path / Gemini main / BACKUP used + errors / listen gate), `thinking_steps` (each tool call with args and result).
- `alexa_recorder_turn_saved` event carries `timing`, `timing_text`, `thinking_text`.
- `todo.alexa_activity` items get `Speed:` and `Thinking:` lines (`script.alexa_log_turn` new fields `speed`, `thinking`); accidental-wake items get them too.
- NEW: Harper's Echo Dot turns are also logged in `todo.alexa_activity` ("not reviewed · Echo Dot · ..." / "ignored · Echo Dot · ..."), no AI review.
- Gemini's own thoughts are not available: thinking level is already "minimal" and HA does not pass thoughts on, so "what Alexa was thinking" = who answered + every tool call/result.
- Not verified live yet (no real turn since the restart at ~12:05 PM). Whether `ffprobe` exists in HA core is unknown; without it, speaking time of FLAC replies is estimated from word count (marked "est.").

## Other speed change
- alexa_helper timeout 30 s -> 20 s (options). Tool scripts take <=5 s, normal AI turns 2-6 s, so 20 s only cuts hangs short.
- Not changed: prompt length (17.8k chars), thinking level (already minimal), model.

## Review / fix process
- Zima `alexa-review/review-prompt.md` new step 19 FAST PATHS AND SPEED: SPEED section in each report (local vs AI counts, medians, 5 slowest + cause), run every AI-answered sentence through the matcher, add/extend fast paths with the rules above, simplify slow tool scripts, report hangs.
- `run.sh` Fix-issues block now also does step 19 (b, c, e) for fixed items and the last 3 days.

## Backups / undo
- HA: `/config/backups-claude/2026-11-22/` (automations.yaml, scripts.yaml, alexa_recorder__init__.py, alexa_helper_conversation.py, alexa_helper_manifest.json). Remove `fastpath.py` + restore conversation.py to drop the music fast path; restore the recorder `__init__.py` and delete `timing.py` to drop the speed log (restart needed for both).
- Zima: `alexa-review/backups/2026-11-22/` (review-prompt.md, run.sh, CLAUDE.md).
- HA was restarted twice (~11:52 AM and ~12:05 PM) to load the custom-component code.
