# Earlier Alexa features (Nov 12) — summary
- **News:** "play/what's the news", headlines, briefing → `script.alexa_play_news` (curated Fox News story videos, says "Here's your daily news."); "watch Fox News / news live" → live TV panel. Lite YouTube player, next story via `loadVideoById` with 9 s re-embed fallback; repeat briefing ignored while playing. Resource `os-echo-news.js` `f181935dab8441dc922f37beae4aa482`.
- **Half-open screen bug:** host scrolled 437 px → `:host{overflow:clip}` + `_noScroll` guard.
- **Cameras 502:** Ring live_view entities have no stream; switched to ring-mqtt RTSP via go2rtc (`rtsp://127.0.0.1:8554/cc3bfb471de0_live` front, `cc3bfbb9d552_live` downstairs) with `webrtc-camera`. Two-way talk needs Owen's new Ring token in go2rtc (401).
- **Family map:** full-screen map (`os-echo-map.js` `62091a712e324699b1dd0306916a2739`), Everyone card, trails Off/Today/24h/3 days from `history/history_during_period`, side-by-side offsets for people together, "Traveled" chip.
- **Complaints:** `script.alexa_log_feedback` always snapshots `camera.echo_show_screen` into `/media/alexa_log/feedback/`.
- **Alexa helper 1.1.0:** memory/phrases lists feed the prompt's HOUSEHOLD NOTES; `/api/alexa_helper/art/<hash>` art proxy (passes size through to MA).
