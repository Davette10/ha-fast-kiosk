# Open tasks — as of Nov 16

**Update (Nov 16): Owen says everything below items 1–5 was already completed in another chat.** The details of how they were built were not written here — check the live system (HA automations, Zima `/DATA/home/Harper/alexa-review` and any `alexa-logs` folder, prompt on the Gemini subentries, Piper voices) before changing anything, and update docs 05 and 08 with what you find.

Done in another chat (per Owen):
1. Prompt v3.16 (background-audio rule) pushed to both Gemini subentries and Zima live-prompt.
2. Android log collector + summarizer + nightly gate; run.sh / trigger.py / review-prompt.md updates.
3. HA 3 AM nightly automation calling `rest_command.alexa_review` with the skip gate.
4. Alexa voice (Piper `en_US-alexa-medium`) fixed.
5. Voice tests of genre play, "just turn it off", music screen.

Still open (older):
6. Accidental-activation check in the per-turn reviewer (`script.alexa_log_turn`) — confirm whether the other chat did this.
7. Ring refresh token for two-way talk (Owen), Echo Wi-Fi stalls (sendspin slow send / underruns), memory/phrase lists empty, YouTube captions.

New (Nov 16 PM, kitchen listener — doc 11):
8. End-to-end check of real clips: now done automatically by the Zima's 3 AM Claude review (review-prompt step 17; the gate forces a run on the first night). Read its Nov 17 report.
9. First 4 AM review runs Nov 17: check `todo.alexa_review_reports` for the "Kitchen day Nov 16" item and the 8:30 AM pushes.
10. If the Zima gets busy (VM + Whisper), set `KL_MODEL=base.en`.
11. Optional: Zima Whisper backlog is serial (one clip at a time); fine for normal kitchen talk, revisit if `busy_s` approaches real time.
