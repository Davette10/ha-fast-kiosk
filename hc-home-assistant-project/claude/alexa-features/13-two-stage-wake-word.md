# Two-stage wake word (Nov 17, 2026)

Owen: "tune the wake word accuracy until it has nearly no error", then (10:20 AM) "I don't want any false positives or have it not wake when it should've … I just want it to be perfect before anyone uses it". Built like a real Echo: a fast first detector plus a second check by Amazon's own "Alexa" model (from his Fire OS backup; see doc 12 for how the model was recovered and converted).

## How it works
1. **Stage 1:** VACA's microWakeWord on the Echo. The base threshold is `input_number.alexa_wake_word_threshold_normal`, **6.5** (Nov 17 10:21 AM; it was 7.9 this morning). `automation.alexa_listening_guard_music_self_wake_listen_time_limit` applies it to the Echo:
   - **quiet kitchen:** base (6.5);
   - **music on the Echo** (`media_player.echo_show_music` playing): base **+1.5** (8.0);
   - **noisy kitchen** (`input_boolean.alexa_kitchen_noisy` on, set by os-echo-wake): base **+1.0** (7.5);
   - max 9.0, back to base 5 s after the music stops or when the kitchen is quiet again.
   - The Nov 16 version (+0.4 during music only) is backed up at Zima `echo-fireos/ww/backups/automation-listening-guard-before-2026-11-17.json`.
2. **Stage 2:** Zima `/DATA/home/Harper/echo-fireos/ww/wake_server.py`:
   - WebSocket on 127.0.0.1:8781; the Echo reaches it through `adb reverse tcp:8781`, which the server re-applies every 60 s.
   - It streams the Echo's own model (`enc_B.onnx`/`dec_B.onnx`) on the kitchen mic and returns a score every 80 ms.
   - pid `ww/wakelog/wake_server.pid`, log `ww/wakelog/server.log`.
   - **Not supervised:** started with `setsid nohup nice -n 5 …`. The 3 AM review (step 18) restarts it if it is down.
3. **Echo page:** dashboard resource `4b28cf1e6d334b1c9d8951909c969faa` = `os-echo-wake.js` (copy `ha/os-modules/os-echo-wake.js`, sha `146eb3e8…`).
   - It gets 16 kHz PCM from the kitchen listener (`os-echo-listen` calls `window.__oselTap(pcm)` for every 100 ms block).
   - It wraps `OSEchoFX.play("wake")`: in a **quiet kitchen** the chime is held until stage 2 agrees (best score in the last 2.5 s ≥ **0.5**, waiting at most **0.5 s**). Otherwise it presses `button.kitchen_vaca_amzn_echo_show_8_3a31_interrupt`: no chime, no bar, nothing reaches the AI.
   - `os-echo-stock` holds the Lottie bar and the screen dim (`.stk-hold`) on the same verdict (`window.__osWakeVerdict`, valid 400 ms).
   - **Noise measurement:**
     - Each 100 ms block's RMS (blocks below 4 are digital silence and are skipped).
     - Background = 6th-quietest of the last 25 blocks, compared with a slow-tracking quiet floor (drops at once, rises about 10 dB in ~19 min).
     - Noisy when more than 10 dB above the floor for 5 s; quiet again when below 6 dB for 20 s.
     - The HA switch is re-synced every 5 s if it disagrees (for 20 s), e.g. after a reload.
     - `window.__oswake` shows `noiseDb`, `bg`, `floor`, `noisy`. Quiet kitchen on Nov 17: bg 17–35, floor 16–21, 0.5–4 dB.
   - **No veto (the wake goes ahead) when:**
     - the Zima stream is not live (no score in 1.5 s; also when the kitchen listener is off or the Echo is muted);
     - music is playing on the Echo;
     - the kitchen is noisy;
     - it is within 4 s of a screen tap;
     - it is a follow-up (satellite processing/responding now or within 3 s, which includes `assist_satellite.start_conversation`);
     - we pressed the Wake button ourselves.
     Each of these is logged as "skip" with the reason.
   - **Missed-wake detection:** stage 2 ≥ 0.92 (0.84 while the Echo plays music) and stage 1 not listening within 0.7 s is logged as "missed". `RECOVER = false`; setting it true would press `button.vaca_amzn_echo_show_8_3a31_wake`, but words said right after "Alexa" would be lost.
   - CDP probes: `echo-cdp/q_wake.js` (status), `q_wake_fake.js` (simulates a stage-1 wake; in a quiet empty kitchen it must be rejected).
4. **os-echo-listen change:** the "woke in a silent kitchen → +0.1" auto-nudge is skipped while stage 2 is live. The "missed wake → −0.1" nudge is unchanged; the floor of 6.5 holds.

## Why stage 2 does not veto over music (stress test, Nov 17, `ww/robust.py`)
4 real "Alexa, …" kitchen clips vs 60 other kitchen clips. Peak "Alexa" scores:

| Condition | Real commands (lowest) | Other talk (highest) |
|---|---|---|
| Clean | 0.991 | 0.007 |
| 12 dB quieter | 0.992 | 0.014 |
| 20 dB quieter (far/soft) | 0.984 | 0.004 |
| Music 10 dB below the voice | **0.003** (1 of 4 missed) | 0.015 |
| Music 5 dB below the voice | **0.002** (2 of 4 missed) | 0.011 |
| Music as loud as the voice | **0.000** (2 missed, 1 at 0.56) | 0.009 |

- Soft or far voices are fine; music is the weak spot, because the Echo's own echo cancellation isn't applied to this mic stream.
- Other talk never passes in any condition, so the model doesn't make false wakes; it only gets deaf in music.
- Hence: veto only in a quiet kitchen, and make stage 1 stricter in music or noise.
- `ww/ratio.py` showed that a short-window peak-to-background ratio can't tell "Alexa over music" from normal talk. That's why the noise check uses the room's long-term quiet floor.

## Logs
- `ww/wakelog/wake.jsonl` has one line per decision: accept | reject | skip (with `why`) | missed, plus score, ms, noiseDb and `wav`. The audio is the 3 s before each decision in `ww/wakelog/<date>/` (kept 3 days).
- The side-by-side log `ww/shadow/shadow.jsonl` keeps scoring every kitchen clip (summary: `ww/summary.py <date>`).

## Checks done Nov 17 (house empty, silent)
- Streaming scores match the offline ones.
- The score crosses 0.5 right at the end of "Alexa", so the verdict is normally ready by the time VACA reports listening.
- On the Echo:
  - connected, ~12 scores/s, chime hook in place;
  - a fake stage-1 wake was rejected in 0.52 s, silently, both before and after the noise logic;
  - noise reads 0.5–4 dB in the quiet kitchen.
- **Noise-floor bug fixed:** the first version counted the mic's startup silence as the room floor and read +25 dB "noisy".
- **Guard:** with the noisy switch on, stage 1 went to 7.5. The page saw a quiet kitchen and switched it off by itself, and stage 1 went back to 6.5.
- **Not yet seen:**
  - a real accepted wake;
  - real music on the Echo or TV noise (these need Owen's 2-minute test).

## Nightly tuning
- `alexa-review/review-prompt.md` step 18 (backup `backups/review-prompt.md.before-two-stage-wake-2026-11-17`) tells the 3 AM Claude review to:
  - restart the server if needed;
  - count accepts, rejects, skips and misses into `state/wake-stats.csv`;
  - find wrong rejects, false wakes that got through, and misses.
- Tuning rules: keep stage 1 at 6.5–7.5; rejects are not accidental wakes; lower stage 1 after a miss; ACCEPT never below 0.3.

## Undo
- Delete resource `4b28cf1e…`. The chime and bar go back to instant.
- Restore the guard automation from the backup JSON. Its new noisy trigger is harmless if the switch stays off.
- Revert the two `os-echo-listen` edits (old content in the HA backup `lovelace_resources`).
- Kill `wake_server.py`.
- Delete `input_boolean.alexa_kitchen_noisy`.
- Set the base threshold back if wanted (7.9 this morning; 7.5 was Owen's "worked well" value). **Without stage 2, 6.5 would give many false wakes.**
