# echo MCP server

Full control of the kitchen Echo Show 8 (LineageOS 18.1, `192.168.4.44:5555`) for Claude. Built Nov 24 2026; Owen gave full, unrestricted access.

- File: `/DATA/AppData/claude-desktop/config/.local/echo/server.mjs` (container path `/config/.local/echo/server.mjs`). Node 22 and the MCP SDK/zod/ssh2 come from `../node` and `../mcp/node_modules`, same as the homelab server.
- Runs on the Zima host, where adb is. Inside the claude-desktop container adb isn't visible, so the same file bridges itself to the host over SSH (key `/config/.ssh/id_ed25519`) and runs there.
- adbd runs as root (Rooted debugging is on in Developer options). The server re-runs `adb root` after a reboot by itself.
- Every call is logged to `/DATA/home/Harper/echo-mcp/calls.log`.

## Where it's registered
- Claude desktop on the Zima (container): `/config/.config/Claude/claude_desktop_config.json` → `"echo": {"command": "/config/.local/node/bin/node", "args": ["/config/.local/echo/server.mjs"]}`. Backup of the config before: `claude_desktop_config.json.bak-2026-11-24-echo`.
- Claude desktop on Owen's Mac (HCPC, macOS, user haclark): `~/Library/Application Support/Claude/claude_desktop_config.json` →
  `"echo": {"command": "/Library/Frameworks/Python.framework/Versions/3.14/bin/python3", "args": ["/Users/haclark/.local/bin/echo-relay.py"]}`
  - **echo-relay.py** (source in this project, `claude/echo-mcp/echo-relay.py`) runs `ssh Harper@100.x.x.x node server.mjs` and reconnects by itself. Nov 24: a single plain ssh session died when the Mac slept ("Read from remote host 100.x.x.x: Operation timed out") and Claude marked the server stopped. The relay keeps the MCP session local, replays initialize/initialized on a new ssh link at the next call, and returns an error only for calls that were running when the link dropped (not re-sent).
  - Its log lines (`[echo-relay] ...`) appear in Claude's `mcp-server-echo.log`.
  - Owen gives Claude the current config text; Claude returns the whole updated file (his preference).

## Tools (v1.1.0)
| Tool | What |
|---|---|
| `echo_shell` | Multi-line shell script on the Echo, as root by default |
| `echo_adb` | Any adb host command (install, reboot, recovery, root/unroot, remount, forward, bugreport…) |
| `echo_read_file` / `echo_write_file` | Read or write any file on the Echo, text or base64, any size; mode/owner |
| `echo_transfer` | adb push/pull between the Zima and the Echo (APKs, backups) |
| `echo_screenshot` | Real screen as an image |
| `echo_logcat` | Android logs with a regex filter |
| `echo_page_eval` | JavaScript inside the screen page (VACA WebView), auto-finds the devtools socket |
| `echo_cdp` | Any DevTools commands in one session (reload, navigate, metrics, page screenshots) |
| `echo_input` | Tap, long press, swipe, keys, text |
| `echo_volume` | Get/set media volume (set 0 before tests that could make sound) |
| `echo_status` | Root, build, uptime, memory, top, focus, screen, volume, IP, VACA, page status |

## Testing without the app
`(cat calls.jsonl; sleep 20) | /DATA/AppData/claude-desktop/config/.local/node/bin/node /DATA/AppData/claude-desktop/config/.local/echo/server.mjs`
(with JSON-RPC lines: initialize, notifications/initialized, tools/call). Add `ECHO_ADB=/nonexistent ECHO_MCP_KEY=/DATA/AppData/claude-desktop/config/.ssh/id_ed25519` to test the container bridge.
The relay can be tested anywhere with `ECHO_RELAY_CMD='["python3","fake_server.py"]'`.

## Undo
Remove the `echo` entries from both Claude desktop configs and restart the apps. `adb unroot` turns root off until the next `adb root`.
