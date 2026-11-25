# homelab MCP server

Owen's own Claude tools for his homelab (Nov 16 2026). It runs inside the Claude desktop app on the Zima (container `claude-desktop`):
- Folder: `/config/.local/homelab/`, which is `/DATA/AppData/claude-desktop/config/.local/homelab/` on the host.
- Registered as `homelab` in `/config/.config/Claude/claude_desktop_config.json`.
- Node: `/config/.local/node/bin/node`. SDK, zod and ssh2 come from `../mcp/node_modules`.

## Adding a tool
1. Back up first: `cp server.mjs backups/server.mjs.<date>`.
2. Add a `server.tool(name, description, zodShape, handler)` block, in the same style as the existing tools.
3. Rules for new tools:
   - Prefer a fixed command per tool over "run anything". General shell access stays with `zima-ssh`, which has its own approvals.
   - No credentials in tool arguments or output.
   - Never play sound on the Echo.
4. Test it on the host without the app. The `initialize` / `tools/list` / `tools/call` JSON lines go into the server's stdin:
   `printf '%s\n' '<initialize>' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '<tools/call>' | /DATA/AppData/claude-desktop/config/.local/node/bin/node server.mjs`
5. Restart the Claude desktop app so it loads the new tools. Quit it from the web desktop, or `sudo docker restart claude-desktop` (needs Owen).

## Tools (v1.0.0)
| Tool | What |
|---|---|
| `homelab_health` | Zima uptime/memory/disk + always-on services |
| `kitchen_listener_stats` | Kitchen transcriber counters |
| `kitchen_transcript` | Last N lines of a day's kitchen transcript |
| `echo_status` | Echo adb status, mic recorders, reverse ports, devtools socket |
| `echo_page_probe` | Saved CDP probes in the Echo page (listener/state/check) |
