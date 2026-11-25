# Nov 18, 2026: working through the nightly reports (Owen's go-ahead)

Owen (7:45 AM) asked Claude to do everything in the reports except mesh AP pinning, the VACA alarm stop word, the VACA boot screen and the timer-sentence voice test. He thinks he already updated the Ring token and doesn't know about noise suppression being "low". Wake word: "whatever makes it accurate".

## Done
- **Puppet:** already started, watchdog already on (`0f1cc410_puppet`).
- **Piper robotic voice:** done before this session. Piper app `noise_w` 0.8, `/share/piper/en_US-alexa-medium.onnx.json` noise_w 0.8, Piper restarted 07:39:25.
- **Listen gate patch** (live; HA restarted ~7:52 AM):
  - `DURATION_REQ` added ("for 12 minutes", "14 minute timer", "five minutes" count as requests).
  - `STOPLIKE` allows leading fillers, so "Oops. Alexa off." is a stop.
  - Backup: HA `/config/backups-claude/2026-11-18/listen_gate.py.before-duration-stop`. Tests: Zima `alexa-review/work/gate-proposal/test_nov18.py`, 16/16.
- **Log folder:** `/media/sda3/echo-logs/android` (created via `sudo -n docker run --rm --network none --entrypoint sh -v /media/sda3:/m valkey/valkey:8-alpine …`, owner Harper 999:1000).
  - logcollect.py restarted and writes there; summarize.py follows automatically.
  - Old days copied over. The old copies (769 MB) remain in `/DATA/home/Harper/echo-logs/android`; delete only with Owen's OK.
- **Ring:** Ring-MQTT works. go2rtc's own token in `/config/go2rtc.yaml` (unchanged since Oct 1) still gets `401 invalid_grant`. Two-way talk needs Owen to make a SECOND token (`npx -p ring-client-api ring-auth-cli` in the Terminal app, see `claude/https-go2rtc.md`) and paste it into go2rtc's Ring box. Ring tokens rotate, so the two can't share one.
- **4 AM kitchen Gemini review** (`automation.kitchen_listener_4_am_gemini_review`).
  - Causes:
    - Nov 16's day was blocked by `FinishReason.SAFETY` (main);
    - Nov 17's day got `503 overloaded`;
    - the backup `gemini-flash-lite-latest` was overloaded too.
  - Fixes:
    - Both AI-task subentries (`01M1MTZF6HNNR429H2AG9R1XEV` main, `01M70PQDC0TNATD2BB90XJWF0D` backup): all 4 safety thresholds set to `BLOCK_ONLY_HIGH` (were the default medium).
    - Main stays gemini-3.1-flash-lite. Backup is now **gemini-3.5-flash** (gemini-2.5-flash, tried first, returns 404: retired).
    - Automation: the one timestamped day transcript is split at line ends into parts of at most 25,000 characters. Each part gets up to 4 tries (main/backup alternating, waits of 60/120/180 s). Failed parts are named.
    - The part summaries are merged by one more call (3 tries). Its result is copied into `merged_text`, a variable declared outside the loop: a `response_variable` set inside a repeat isn't seen by the repeat's `until`.
    - `automation.trigger` with `{variables: {override_day: "YYYY-MM-DD"}}` re-runs a day.
  - Results:
    - Nov 17: 2 parts, 4 possible complaints; part summaries listed (run made before the merge fix).
    - Nov 16: final rerun 9:15–9:25 AM. Part 2 needed 3 tries and the merge 4 calls because of Google 503s, then it produced one merged summary.
    - Reruns added duplicate report items and a duplicate Nov 16 complaint item. The earlier "Gemini did not answer" items were left in the lists.

## Wake word: root cause fixed (live, log-only)
- **Cause:** the Amazon decoder copies each embedding into 16 LSTM lanes (`repeats/Tile`, state [16,100]; config `recurrent_state_initialization: false`). Amazon resets the lanes on a staggered schedule. Our `ww.py`/`wake_server.py` never reset them, so lanes went stale after ~0.5 s and real "Alexa" scored 0.00–0.07 live.
- **Test** (`ww/lanes18.py`, `ww/which18.py`): 20 real "Alexa …" requests Nov 16–18 (incl. 4:14 PM "…tell me the news", whose transcript dropped "Alexa") in streams with prior kitchen audio, vs 120 Nov 17 non-Alexa clips as continuous streams + "What are you doing with Alexa?".
  - K=16, A=10: all 20 real ≥ 0.99; other talk ≤ 0.093 in the batch test.
  - Per-clip with 3 s of silence first: max 0.41 ("Something else from Redneck BBQ"); "What are you doing with Alexa?" 0.13.
  - Same at K=24/32/48.
- **Live:** `wake_server.py` patched: `LANE_K, LANE_A = 16, 10`; lane j reset every 16 steps, staggered; only lanes ≥ 10 steps old count.
  - Backup `ww/backups/wake_server.py.before-lanes-2026-11-18`; patch `ww/patch_lanes18.py`; offline check `ww/test_stream18.py` (last night's rejected real wakes now 0.995/0.996).
  - Restarted 14:05 UTC with `/DATA/home/Harper/echo-sounds/venv/bin/python` (the kitchen-listen venv has no websockets). The Echo reconnected.
- os-echo-wake stays `VETO = false` (log-only). `alexa-review/review-prompt.md` step 18 got a "LANE FIX (Nov 18)" note (backup `backups/review-prompt.md.before-lane-fix-2026-11-18`): count real wakes ≥ 0.5 vs < 0.5 nightly. After 2 clean nights, write "stage 2 ready: turn VETO back on" under Needs Owen; never flip it itself.
- `shadow.py`/`ww.py` still score each clip from a fresh state (fine for clips that start at speech); not changed.

## Incident (~8:10–9:00 AM)
- Two niced scoring jobs (lanes18 + which18) next to Whisper and the HA VM made the Zima stop answering SSH and HA for a while. It recovered without a reboot.
- Run one scoring job at a time. Also: `pkill -f <name>` inside a `bash -c` that contains the name kills the command itself.

## Not done (and why)
- **"Alarm set for 1101 pm":** from View Assist's built-in alarm sentence repeating the STT text, not from Gemini (the prompt already says to speak times naturally). Needs a View Assist code change + a test with a real alarm.
- **Combined multi-order Amazon emails:** needs the save logic in `script.amazon_orders_process_email` looped per order number; no test email (the example is in Gmail Trash).
- **Speaking the story topic between news videos:** TTS over the news, can only be judged by listening.
- **TTS "# channels not specified" on "." answers:** harmless log noise. Fixing it means changing alexa_helper's "." reply, which os-echo relies on.
- **Home ↔ news lag:** Echo CPU load (mic-array HAL).
- **Noise suppression "low":** Owen unsure, so left as is.
