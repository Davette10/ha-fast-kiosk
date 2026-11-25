# Alexa (kitchen Echo Show 8) — feature docs index (updated Nov 24, 2026)

Start here in any new chat. Older, still-valid detail: `claude/alexa-handoff.md`, `claude/alexa-music.md`, `claude/alexa-news.md`, `claude/echo-show-dashboard.md`, `claude/alexa-log.md`, `claude/alexa-helper.md`, `claude/zima-claude.md`.

## Feature docs (this set)
| File | Covers |
|---|---|
| `claude/alexa-features/01-rules-and-access.md` | Owen's rules (no-keys rule lifted Nov 18), how to reach HA / the Echo / the Zima, testing without sound |
| `claude/alexa-features/02-volume-and-sounds.md` | One-volume system, sound loudness trims, volume blip |
| `claude/alexa-features/03-music.md` | Music screen redesign, Spotify genre shuffle, voice music script, art fix |
| `claude/alexa-features/04-island-glance-doorbell.md` | Dynamic island detail cards + doorbell live view |
| `claude/alexa-features/05-voice-pipeline-and-prompt.md` | Gemini agent, prompt versions, Gemini auto-restart, Piper voice |
| `claude/alexa-features/06-wake-word-and-stop.md` | Wake sensitivity history (see docs 13, 15, 18 for the current setup), false-start cooldown, "off/stop" phrases, unexposed switches |
| `claude/alexa-features/07-screen-and-brightness.md` | Screen on/off cause + fix, adaptive brightness deadband (see doc 27 for the Nov 22 black screen) |
| `claude/alexa-features/08-logs-and-nightly-review.md` | Logs that exist, Android log collector, nightly 3 AM review with skip gate |
| `claude/alexa-features/09-open-tasks.md` | Older open-task list (see docs 15 and 18 for the Nov 18 state) |
| `claude/alexa-features/10-earlier-features.md` | News, cameras, family map, screenshots, complaints (Nov 12) |
| `claude/alexa-features/11-kitchen-listener.md` | 24/7 kitchen transcription (Zima faster-whisper), wake auto-tune ±0.1, 4 AM Gemini summary + complaints, Real/False positive review |
| `claude/alexa-features/12-stock-rebuild-from-backup.md` | Nov 17: stock look from Owen's Fire OS backup + how Amazon's own "Alexa" wake model was recovered and converted |
| `claude/alexa-features/13-two-stage-wake-word.md` | Nov 17: two-stage wake word (VACA microWakeWord + Amazon's model on the Zima, wake_server.py :8781). **Its Nov 17 stage-2 scores were wrong; see doc 15** |
| `claude/alexa-features/14-echo-cancellation-test.md` | Nov 17: the Echo's audio HAL already cancels its own playback; raw 4-mic array capture works |
| `claude/alexa-features/15-nov18-work.md` | Nov 18 AM: listen-gate patch, log folder on sda3, 4 AM kitchen review fix, wake-word lane-reset fix (live, log-only), Ring go2rtc token still needed |
| `claude/alexa-features/16-backup-inventory.md` | Full inventory of the Fire OS backup image (partitions, apps, models, user data) |
| `claude/alexa-features/17-full-alexa-os-map.md` | Stock Alexa OS rebuild: plan, boundary (own code, no ported Amazon code), os-alexa-skin, what can't come from the backup |
| `claude/alexa-features/18-merge-test-cpu-nov18.md` | Nov 18 PM: skin merged into the live `alexa-dashboard`, full silent feature test + fixes, Zima CPU fix, HA VM memory pressure |
| `claude/alexa-features/19` … `25` | Nov 18-20: light bar, replay tests (doc 20 now replaced by doc 29), stage-2 veto, gap list, revert of the stock copy, Voice PE/Echo Dot, false-wake reasons, Voice PE Alexa firmware |
| `claude/alexa-features/26-fast-paths-and-speed-nov22.md` | Nov 22: fast paths (automations / alexa_helper fastpath.py instead of the AI), per-turn speed + thinking log, review step 19, the "Done" gotcha and the no-execution matcher |
| `claude/alexa-features/27-black-screen-restart-selfheal-nov22.md` | Nov 22 PM: black-screen root cause (Screen Off button) + auto-restore, quick-menu Restart (adb reboot via Zima), os-echo-heal self-repair + real-time fix runs, finished speaking relaxed -> default, guard 9 s |
| `claude/alexa-features/28-fast-standalone-screen-nov23.md` | Nov 23: echo-fast standalone screen page |
| `claude/alexa-features/29-replay-tests-nov24.md` | **Nov 24: replay tests of 256 turns with speed caps and no lights; new fast paths, listen-gate features, faster camera (3-model race, Echo Vision Fast), incidents, open VAD question** |

Code copies: `ha/os-modules/os-echo-listen.js` (Echo page, pre-Nov 17 copy), `claude/kitchen-listen/server.py` (Zima transcriber), `ha/os-modules/os-echo-stock.js` (stock look), `ha/os-modules/os-echo-wake.js` (stage 2 on the page; VETO false since Nov 18), `ha/os-modules/os-alexa-skin.js` (stock skin + Settings app; Nov 22 Restart change is live only), `ha/os-modules/os-echo-heal.js` (self-heal, Nov 22). Live sources of the inline resources: `/config/echo-work/src/<resource id>.js` on HA.
