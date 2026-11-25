# Reverted the 1:1 stock-Alexa copy (Nov 19 2026, 10:25 PM)

Owen (10:22 PM): "Revert the changes. I like the original more than copying alexa 1:1. I do like more news stories though. Cycle between more news on the dynamic widget. The new updated dashboard broke complaints for what the alexa screen shows."
Owen (10:32 PM): "Make sure the news things has enough context."

## What was removed (resources deleted; files kept)
- `os-echo-stock-home` (rotating content home), `os-echo-stock-ask` (Alexa+ conversation screen), `os-echo-stock-cal` (stock calendar), `os-echo-stock-set` (stock Settings look + Accounts & Profiles), `os-echo-stock-cam` (stock camera view), `os-echo-stock-help` (stock Help), `os-echo-stock-music` (Music & More player, resource `51c8d09b…`, inline).
- Backup of the whole resource list before deleting: `/config/backups-claude/2026-11-19/lovelace_resources.before-revert-2222` (includes the inline Music & More code). The other modules' files are still in `/config/www/echo-stock-edU4oOWQEk/` and in the project under `ha/os-modules/`, but nothing loads them. Doc 22 has the old resource ids and versions if any of them is wanted back.
- **Kept:** the light bar fixes and the removed screen dim (os-echo-stock, `b944839c…`), os-alexa-skin, os-echo-answers and everything from before Nov 19.
- Checked after reload: none of the removed modules load, the home is the widget layout again (greeting, clock, weather, Up next, family map, front door).

## Why complaints broke
`script.alexa_log_feedback` snapshots `camera.echo_show_screen` when the complaint is logged. The Alexa+ conversation screen (os-echo-stock-ask) covered the whole screen while Alexa handled the complaint, so the 5:04–5:06 PM complaints ("chats tab", "family map tab", "calendar tab") saved a picture of the conversation instead of the tab being complained about. With the module removed, answers are back in the island and the screen behind stays visible.

## More news on the dynamic widget (island)
- `os-echo-glance` (`2230504843a142ff9a114b62729c9a56`, now hash `393457f0…`), its `_glance` wrapper:
  - before: only a "Breaking news" headline, every 3rd turn, if the briefing was under 2 hours old.
  - now: every other turn of the island is a news story, cycling through **all** of the briefing's headlines (`news_brief` on `sensor.echo_show`), shown when the briefing is under 6 hours old. Breaking ones keep the red "Breaking news" label; the rest say "Fox News" in light blue.
- **Context (10:35 PM):** under each headline, the first line of that Fox News video's own YouTube description (who is speaking and what it is about, e.g. "Fox News contributor Jonathan Turley breaks down a federal judge's decision to unseal redacted records in the ongoing investigation involving Rep. Ilhan Omar…"), plus how old the story is ("Fox News · 21h ago").
  - Source: YouTube Data API `videos?part=snippet` with the os-echo card's `yt_key`; one request for all missing stories (max every 2 min); hashtags, links and a trailing "on '<show>'" are removed; max 220 characters, 5 lines. Cached on the Echo in localStorage `osecho-nwctx`, only for stories in the current briefing (`osecho-brief2` maps headline → video id).
  - The island stays inside the left column (width 0.372) and holds a story with context for 14 s (8 s without).
- Checked on the Echo: weather → headline 1 → weather → headline 2 → …; context loaded for all 8 stories; screenshot shows headline, context and age without covering the widgets.
