# Rules and access (Alexa project)

## Owen's rules (always follow)
- **No sound in the kitchen during tests.** Text-only tests. Never play TTS/music/test sounds. If a playback test is unavoidable, set Android STREAM_MUSIC to 0 via adb first and restore after. Never test news/music through the pipeline or `conversation.process` (local sentence triggers carry no test guard).
- Don't interrupt news that is playing. Don't interrupt music Owen is listening to.
- The auto-mode classifier blocked running `script.play_on_voice_assistant` as a "test" (even with an unavailable player). Don't work around classifier denials; ask Owen.
- Credentials: **Nov 18, 2026: Owen removed the old "never handle keys" rule.** Claude may copy and use the API keys/tokens already in his setup (e.g. YouTube `yt_key`, Tavily, Ring token) where a feature needs them. Still: don't paste them into chat replies or project docs, and don't create HA users.
- Before any destructive step (clear/delete/reset/replace/overwrite) say what it destroys and give the backup step first.
- Amazon: add-to-cart only, no paid services, no Amazon scraping/sign-in/asset downloads. No creating/deleting real calendar events. DRM ripping declined. Keep emails private. Complaint pushes go only to Harper (`notify.mobile_app_harpers_lphone`).
- Owen already knows refreshing the dashboard does NOT stop music (Music Assistant plays it). Don't bring it up.
- Design language: Tesla × Apple (see project instructions, `apple design.md`). The kitchen Echo's new dashboard (`/alexa-dashboard-os`) follows the stock Echo look instead (doc 17).

## Access
- **Home Assistant** via ha-mcp tools. Write tools need `BestPracticeKey` (rotates hourly; get it from `ha_get_skill_guide(file=...)` content top line) and `MandatoryBPS=false`.
  - Prompt edits: `ha_config_set_helper(helper_type="config_subentry", entry_id="01M1MTZF6HYNNC21PGCSSGWE43", subentry_type="conversation", subentry_id=<main 01M1MTZF6HEBV2SPV45ZGXBTQQ | backup 01M74FGJEB96S39B5QB5T47SKV>, config={"prompt": ...})` — always update BOTH.
  - Dashboard resources: `ha_config_set_dashboard_resource` with `edits` + `config_hash` (sha256 of content); inline limit 128,000 bytes. Check returned hash equals local sha256.
  - Useful ws_commands: `conversation/agent/homeassistant/debug` (test sentence matching, runs nothing), `assist_pipeline/pipeline_debug/list|get` (pipeline `01m1mv4wd92910191722ek9eyr`; only last ~10 runs kept), `media_source/browse_media|resolve_media`.
- **Zima** (zima-ssh MCP, user Harper): `run-command` single line only; chained commands / `python -c` sometimes get APPROVAL_UNAVAILABLE → split, or upload scripts as base64 (≤4400 chars per chunk, verify sha256). No sudo (give Owen sudo commands). Don't edit the review bot's `.claude/settings.json`.
  - adb: `/DATA/home/Harper/platform-tools/adb -s 192.168.4.44:5555` (run `adb connect 192.168.4.44:5555` first if "device not found").
  - WebView CDP: `adb forward tcp:9222 localabstract:webview_devtools_remote_5360` then `cd /DATA/home/Harper/echo-cdp && python3 cdp.py 9222 <file.js>`. Probe files there: `q_state.js`, `q_close.js`, `q_mus.js` (opens music), `q_back.js`, `q_chk.js`, `q_t2.js` (silent _vSnd check by patching `OSEchoFX.play`). Wrap async probes in try/catch returning a string.
  - Screenshot of the real Echo screen: `ha_get_camera_image("camera.echo_show_screen", width=960, height=600)` (served by Zima `alexa-review/trigger.py` `/shot.jpg`).
  - Reload the Echo page: `button.vaca_amzn_echo_show_8_3a31_refresh` (music keeps playing).
- **HA host shell:** zima-ssh profile `ha` (root, no python). Files move Zima ↔ HA via the Mac: `sftp-download-file` to `/Users/haclark/ssh-mcp-transfers/`, then `sftp-upload-file` with the other profile.
- HA host 192.168.6.172:8123 (Music Assistant :8095 on same host). Zima trigger.py port 8766 (allowed only from HA and localhost). Echo 192.168.4.44.
- Local working copies: `/mnt/user-data/outputs/ha/` (os-echo*.js, prompts, backups/). Docs scratch `/home/claude/docs/`.
