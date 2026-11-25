# Wake-word veto turned back on (Nov 19, 2026, ~12:53 AM)

Owen: "Alexa keeps waking by itself while 2 people are talking. Fix that."

## Cause
- `os-echo-wake` had `VETO = false` since the Nov 18 review (stage 2 scored real "Alexa" at ~0 because of the lane bug; fixed later that day but the veto was left off, log-only).
- So stage 1 (VACA microWakeWord, threshold 6.8) false-woke on room talk and nothing blocked it. Log since 4 PM Nov 18 (GMT stamps in wake.jsonl): 421 quiet-kitchen false wakes scored < 0.05 (`would_reject`) plus 25 more skipped as "noisy kitchen" (also < 0.05).
- Second problem: two people talking makes the page measure the room as "noisy" (+10 dB over the quiet floor for 5 s), and the "noisy kitchen" case skipped the veto entirely, so even with VETO on, conversation would have got through. The noisy flag was on at the time of the report (12:47 AM).
- Real wakes in the same log (Owen's test, 04:24-04:26 GMT): accept 0.88, skip-noisy 0.915, four "missed" at 0.97-0.99. Clean gap between false wakes (< 0.05) and real ones (>= 0.88).

## Change (live resource `4b28cf1e6d334b1c9d8951909c969faa`, 9,582 bytes)
1. `VETO = true` (stage 2 holds the chime/bar and presses Interrupt when it does not hear "Alexa").
2. `ACCEPT` 0.5 -> 0.3 (margin; the doc 13 rule is never below 0.3).
3. Removed the "noisy kitchen" skip, so talking no longer disables the check. Still skipped (wake goes ahead): detector offline, screen tap, follow-up, music playing on the Echo.
- The noisy flag still raises stage 1 by +1.0 via the listening-guard automation (unchanged).
- Echo page reloaded with `button.vaca_amzn_echo_show_8_3a31_refresh`.

## Verified
- Stage 2 connected and scoring after reload; fake stage-1 wake (`echo-cdp/q_wake_fake.js`) was rejected in 541 ms, silently, logged as action `reject`.
- Not verified live: a real "Alexa" with people talking. Watch `ww/wakelog/wake.jsonl` for `reject` lines whose audio says "Alexa".

## Backups / undo
- `/config/backups-claude/2026-11-19/os-echo-wake.js.before-veto-on` (module) and `lovelace_resources.before-veto-on` (all resources) on the HA host.
- Undo: patch the resource back (`VETO = true` -> `false`, `ACCEPT = 0.3` -> `0.5`, re-add `(noisy || noiseDb > NOISY_ON_DB) ? "noisy kitchen" :` to the skip chain), then reload the Echo page.
- `alexa-review/review-prompt.md` line 38 updated (backup `alexa-review/backups/review-prompt.md.before-veto-on-2026-11-19`): the 3 AM review now lists wrong rejects under Needs Owen and does not change VETO itself.
- The copy `ha/os-modules/os-echo-wake.js` in this project is older than the live resource; the live resource is the source of truth.
