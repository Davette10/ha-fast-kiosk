# 27 - Black screen root cause, Restart button, self-healing screen, faster listening (Nov 22 PM)

Owen (2:12 PM): screen went black, rebooted, it went black again; find the root cause and fix it. Report bugs/errors and fix them in real time (example: family map card broke, it should fix itself). Replace the quick-menu Settings button with a Restart that restarts the whole Alexa. Simple actions take forever; Alexa listened way too long for "turn off/on a light".

## 1. Black screen: root cause
- 1:15:43 PM someone tapped **Screen Off** in the quick menu (swipe down). It calls `switch.turn_off` on `switch.vaca_amzn_echo_show_8_3a31_screen` (os-echo `_quick("screen")`). Same button was tapped Nov 17 and Nov 18 (todo.alexa_screen_use).
- Nothing turned it back on except the wake word, and only for the 60 s screen timeout. A reboot didn't help: HA keeps the switch off and VACA re-applies it when the Echo reconnects (logcat 14:06:21 `handleScreenOnChange` -> asleep). At 14:12 "Alexa" switched it on again.
- Fix: `automation.echo_show_screen_never_stays_off` turns the screen (and screen-always-on) back on after 30 min off, whenever the Echo reconnects (reboot / Restart / app restart) and on HA start. Screen Off still works, but can never strand the Echo.

## 2. Restart button
- os-alexa-skin (`dcded868…`, hash `17d99922…`): the drawer's Settings button is now **Restart** (mdi:restart). Tap once -> orange "Tap again" for 4 s; second tap -> island shows "Restarting. I'll be back in about a minute." -> `script.echo_show_restart`. Settings is still in All Screens. Help text updated.
- `script.echo_show_restart` (field `dry`) -> `rest_command.alexa_review` action `echo_reboot` -> Zima trigger.py `/echo_reboot` (HA-only + key) -> `adb -s 192.168.4.44:5555 reboot`. Max once per 3 min; logged to Zima `alexa-review/logs/echo-reboots.log` and the logbook.
- Verified with `dry=true` end to end (HA -> Zima -> adb "device"). Not actually rebooted in the test.
- trigger.py service restarts itself (Restart=always): `pkill` of its PID is enough after editing; don't pkill with a pattern that matches your own shell.

## 3. Self-healing + real-time reporting
- New inline resource **os-echo-heal** `99183855e86a484f8d40f11fcead02a8` (hash `94ed4acd…`, local copy `/home/claude/os-echo-heal.js`). Echo only.
  - Code errors: window `error` / `unhandledrejection` whose stack points at our inline/`/local/` code; noise (ResizeObserver, aborted fetch, autoplay…) ignored.
  - Every 20 s on the home screen: family map (no tiles, half+ tiles failed, no `.om-pin`, empty names), weather (`--°`/blank, missing day row), front door snapshot blank, clock frozen > 75 s, HA websocket disconnected, os-echo missing.
  - Repair ladder per problem: 2nd check redraw that widget (map: clear `dataset.k` tile cache + `_mapW(true)`), 4th redraw home (`_refresh`), 6th reload page (VACA Refresh; shares the watcher's `osew_ref` 3-per-20-min limit).
  - Reports: same problem once per 6 h, max 12/h, via `script.alexa_screen_problem`.
- `script.alexa_screen_problem` -> `todo.alexa_screen_use` ("Screen problem · … · fixed itself / needs a fix"); if not fixed -> `todo.alexa_improvements` "Screen: …" + `input_boolean.alexa_fix_pending` on; fires event `alexa_screen_problem`.
- `automation.alexa_report_home_assistant_errors`: `system_log_event` ERROR from alexa_helper / alexa_recorder / view_assist / vaca / assist_pipeline / assist_satellite / wyoming / alexa|echo|kitchen|play_on_voice scripts & automations -> "HA: …" item (max 1 per 10 min).
- `automation.alexa_fix_problems_right_away`: pending on for 2 min (or every 20 min retry) -> `script.alexa_review action=fix` (Claude fix run on the Zima), at most once an hour (`input_datetime.alexa_auto_fix_last_started`).
- Zima `run.sh` fix prompt now explains Screen:/HA: items; `CLAUDE.md` has a section on all of this.
- **Live test 2:22 PM:** broke all 4 map tiles on the Echo via CDP -> map blank on the screenshot -> 40 s later redrawn correctly (pins + names), "fixed itself" logged. Test item marked completed.

## 4. Listening too long
- "Turn off the Christmas tree socket" (2:04 PM): **13.9 s talking**, 0.22 s thinking (local). Cause: `select.vaca_amzn_echo_show_8_3a31_finished_speaking_detection` = **relaxed** (set Nov 16 after aggressive cut people off), so kitchen noise kept the mic open until the 12 s guard.
- Now **default**; listening guard 12 s -> **9 s** (`automation.alexa_listening_guard_…`, the turn is still answered after the cut-off).
- "Turn it back on" (3.9 s talk) went to Gemini (3.1 s) because of "it". Candidate fast path for review step 19 (needs the last-controlled device; not built).
- Watch: if people get cut off after "Alexa" + pause again, look at doc 06 before changing back.

## Backups
- HA `/config/backups-claude/2026-11-22/pm-screen-restart-heal/` (lovelace_resources, automations.yaml, scripts.yaml, os-echo.js, os-alexa-skin.js, os-echo-watch.js).
- Zima `alexa-review/backups/2026-11-22-pm/` (trigger.py, run.sh, CLAUDE.md).
- Undo: delete resource os-echo-heal; restore the skin's Settings block from the backup; disable the 3 new automations; finished speaking back to relaxed.
