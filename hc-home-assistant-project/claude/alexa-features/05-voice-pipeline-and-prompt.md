# Voice pipeline and prompt

## Pipeline "Gemini Assist" `01m1mv4wd92910191722ek9eyr`
- STT `stt.groqcloud_whisper`; agent `conversation.alexa_with_backup` (alexa_helper: Google Gemini main → backup Gemini subentry → OpenRouter free → friendly sentence); TTS `tts.piper_3` voice `en_US-alexa-medium`; prefer local intents ON; wake word "Alexa" (microWakeWord on the Echo, VACA 0.14.1).
- Google entry `01M1MTZF6HYNNC21PGCSSGWE43`: main subentry `01M1MTZF6HEBV2SPV45ZGXBTQQ`, backup `01M74FGJEB96S39B5QB5T47SKV` — keep prompts identical.

## Gemini outage fix
- Integration was in setup_error from Nov 14 18:13 (no network at boot) so Alexa silently used the slow free fallback. Reloaded; NEW `automation.alexa_restart_gemini_if_it_failed_to_start` (checks every 15 min / HA start / 2 min unavailable → reload entry).

## Prompt versions (files in `/mnt/user-data/outputs/ha/`)
- v3.13: household notes from `todo.alexa_memory` / `todo.alexa_phrases`.
- v3.14: say the tool's `say` sentence; keep-playing-similar only for "songs like".
- **v3.15 (LIVE on both subentries + Zima `alexa-review/prompt/live-prompt.txt`, sha `c204cd72…`)**: genre examples jazz/country/80s, "Spotify's most popular songs".
- **v3.16 (reported pushed in another chat on Nov 16 — verify), sha `3e978f94…`)**: adds to SPEECH THAT IS NOT FOR YOU — treat TV/movie/video/podcast/song/radio lines as background and ignore; only answer a person in the room talking to you.

## Alexa Piper voice — FIXED Nov 16, 2026 16:32 ET (verified)
- Cause: `/share/piper/en_US-alexa-medium.onnx` was a truncated 18,841,600-byte copy → Piper "INVALID_PROTOBUF … Protobuf parsing failed", every spoken reply failed silently. (The earlier "fixed in another chat" note was wrong — it was still broken.)
- Piper Web UI upload fails with HTTP 413 (file too large through ingress).
- Route that worked: full file (63,511,037 bytes, sha256 `04bd683f…09f7`, original on Owen's Mac `~/Desktop/ha/piper-alexa/`) → Zima `/DATA/home/Harper/` → temporary `python3 -m http.server 8765` on the Zima → HA **Downloader** integration (NEW, entry `01M7K4A1R38CC9XMXFJBWC4XQZ`, download_dir `/share/piper`) `downloader.download_file` with overwrite → restart `core_piper`. HTTP server stopped afterwards.
- Verified: Piper `/api/piper/voices` reports 63,511,037 bytes; tts_proxy wav returned 200, 22050 Hz mono WAV.
- Leftover copies on the Zima (safe to delete): `/DATA/home/Harper/en_US-alexa-medium.onnx`, `/DATA/home/Harper/piper-serve/`.

## SSH MCP on Owen's Mac — changed Nov 16
- Config `~/Library/Application Support/ssh-mcp/config.toml` (was CLI flags before). approvalMode/approvalPolicy `auto`, transferRoot `/Users/haclark/ssh-mcp-transfers` (0700). Backups: `claude_desktop_config.json.bak-2026-11-16`, `config.toml.bak-ha`.
- Profile `zima` (default): Harper@100.x.x.x, key auth, admin.
- Profile **`ha`** (NEW Nov 16 21:30): root@100.x.x.x:2222 (HA's Tailscale IP; LAN 192.168.6.172:2222 also open). Terminal & SSH app (`core_ssh`) now has Owen's Mac key `ssh-ed25519 …KEoR+ haclark@…local` in authorized_keys, port 22→2222, no password. Verified: root shell, `/config /share /media /backup` visible, `ha core info` works (HA 2026.11.2). Use `profile: "ha"` on zima-ssh tools — this is now the direct route for files into HA (sftp-upload-file to `/share/...`), no Downloader detour needed.
- Undo: copy `config.toml.bak-ha` back, and clear authorized_keys / port in the Terminal & SSH app.
- Note: `pkill -f '<pattern>'` over ssh-mcp kills its own shell (pattern matches the command line) — use a pidfile or `pgrep` + `kill`.
