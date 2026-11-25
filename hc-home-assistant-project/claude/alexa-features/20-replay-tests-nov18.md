# Replay tests (Nov 18, 2026) — replaced

**Replaced by `claude/alexa-features/29-replay-tests-nov24.md`.** The Nov 24 test reran 256 recorded turns, up from 143. It uses a stricter reviewer (v5) and scores speed, and no test turn may switch a light.

Kept from Nov 18 for history:
- 143 turns. The final pass (sessions final1 to final4) all scored 10 under reviewer v4, which did not score speed.
- The fixes made then are still live:
  - os-echo-answers no longer jumps the screen to /view-assist/info;
  - answer cards;
  - complaint wording;
  - the instant weather answer;
  - the holiday music search;
  - no duplicates on the shopping list;
  - Life360 opens the family map;
  - timer and alarm wording;
  - the complaint phrasings in the listen gate;
  - Gemini prompt v3.19.
- The Google AI Task Backup model is `gemini-3.5-flash-lite`.
- `camera.replay_view` is a local_file camera for viewing replay screenshots, and is still in use.
- Old results stay in `/media/alexa_log/replays/` under the sessions final1 to final4 and round1 to round5 from Nov 18.
