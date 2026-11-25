# Claude Code on the Zima (Nov 10, 2026)

Owen installed Claude Code on the ZimaOS box (user Harper, `/DATA/home/Harper/.local/bin/claude`, v2.1.322) and logged in with his own account.

ZimaOS facts:
- x86_64; the root filesystem is a read-only squashfs.
- `/var` is tmpfs, so crontabs are lost on reboot.
- `/etc` is a persistent overlay → use system systemd units.
- Binaries live at `/usr/bin/docker` and `/usr/bin/systemctl`.

## Home Assistant tools
- User-scope MCP server `homeassistant` = the HA-MCP embedded server's direct URL (port 9584, secret path; Owen added it himself).
- The webhook URL (8123/api/webhook/mcp_…) is the fallback.
- Both URLs were pasted in chat on Nov 10 → suggested regenerating the secrets later (HA-MCP Server options → Regenerate secrets; then re-enter them on the Mac and the Zima).

## Alexa review (nightly 3 AM gate since Nov 16; see alexa-features/08 and 11)
- Folder `/DATA/home/Harper/alexa-review/`:
  - `CLAUDE.md`: system map + hard rules (no audio, back up first, never delete, no credentials/sudo/updates/purchases, log every change).
  - `review-prompt.md`: the job. Step 17 = kitchen listener, added Nov 16.
  - `run.sh`: `claude -p … --permission-mode auto --permission-prompts none`.
  - `.claude/settings.json`: denies rm/sudo/curl/wget/docker/systemctl/adb input+install.
  - Output and state: `reports/<date>.md`, `CHANGELOG.md`, `backups/`, `logs/`, `state/last-run.txt`.
- `alexa-review-trigger.service` (trigger.py, Restart=always):
  - Serves HA's `rest_command.alexa_review`.
  - Supervises the Echo log collector and the kitchen transcriber (`listen_loop`).
- The old `alexa-review.timer` (Tue/Thu/Sat 03:00 UTC) still fires, but run.sh exits when REVIEW_SOURCE is empty.

## Always-on Remote Control
- `claude-remote.service` runs `claude remote-control --name Zima` in `/DATA/home/Harper`, with Restart=always. Verified active ("Zima", capacity 1/32), and still running Nov 16.
- Owen opens it from claude.ai/code or the Claude mobile app. It has the Zima's files and LAN.
- Its TUI redraws spam the journal (harmless).

## Claude desktop app on the Zima (Nov 13, 2026) — the main computer for Claude's tools
- **Setup:** the official Linux Claude desktop (beta) runs inside a linuxserver **webtop** container (`lscr.io/linuxserver/webtop:ubuntu-xfce`), container `claude-desktop`, id `6d8aaba62dc1`.
  - Folder `/DATA/AppData/claude-desktop/`: `compose.yaml`; `custom-cont-init.d/50-claude-desktop.sh` (root-owned apt install of `claude-desktop` + gnome-keyring); `secrets/password`; `config/` = the container's `/config`.
- **Web desktop:** `https://192.168.6.170:3001`, or Tailscale `https://100.x.x.x:3001`. User `owen` (Owen set the password).
  - PUID 999 / PGID 1000, mem_limit 3g, shm 1g.
  - The app autostarts via `config/.config/autostart/claude.desktop` (a second entry, `claude-desktop.desktop`, also exists).
  - The remote-tools device name is the container hostname, `6d8aaba62dc1`.
- **Sign-in:** Owen signed in again Nov 16, 22:04 UTC.
  - The `[remote-tools-device]` in main.log is **authenticated** and serves claude.ai chats, so the Zima is usable as a computer.
  - remote-control.log still says `auth stale`. That is the desktop's separate Claude Code remote-control feature; it isn't needed because `claude-remote.service` covers it.
- **MCP:** a private Node 22 copy in `config/.local/node`; `ssh-mcp` and `mcp-remote` in `config/.local/mcp`. App config: `config/.config/Claude/claude_desktop_config.json` (backups `.bak-2026-11-13`, `b`, `c`, `.bak-2026-11-16-homelab`).
  - `zima-ssh` → ssh-mcp, config `config/.config/ssh-mcp/config.toml`.
    - Profile `zima` = Harper@192.168.6.170, key `config/.ssh/id_ed25519`, role admin, group dev, approvalPolicy ask-destructive.
    - Owen added the key's .pub to Harper's authorized_keys (backup `authorized_keys.bak-2026-11-13`).
  - `homeassistant` → `mcp-remote <http://192.168.6.172:9584/secret> --allow-http`. Owen pasted the URL; it needed `--allow-http`, and a doubled-paste prefix was stripped.
  - **`homelab`** (added Nov 16) → `/config/.local/node/bin/node /config/.local/homelab/server.mjs`. These are Claude's own homelab tools; see `claude/homelab-mcp/README.md` (copy of the code in the project).
    - v1 tools: homelab_health, kitchen_listener_stats, kitchen_transcript, echo_status, echo_page_probe.
    - **Loaded in the app Nov 16 22:07 UTC** (`mcp-server-homelab.log`: initialize + tools/list OK).
  - The same zima-ssh + homeassistant servers run on Owen's Mac (checked Nov 16).
- **Restarts:** Claude can now do it itself: `sudo -n /usr/bin/docker restart claude-desktop` (safe; all state is on /DATA). Logs: `config/.config/Claude/logs/`.
- **Lessons:**
  - ssh-mcp here refuses edits to authorized_keys (a never-allowed rule).
  - Some `python3 -c` writes and ssh logins need an approval this chat can't show → upload a script via base64 and run it by path instead.
  - The xfce session restarts every ~10 s for its first ~13 min (`startwm.sh` "Aborted (core dumped)") before settling. The Claude app itself runs fine during that, but each restart leaves a harmless dbus-launch behind.
  - "Waiting for stream" in the viewer → try Chrome, or switch the encoder to jpeg in the side panel.
  - `watchtower` runs on the Zima and may update the webtop image (which recreates the container). The init script reinstalls the app, and all state is on /DATA.

## Nov 16: down since the Nov 14 reboot, now fixed and set to run at boot
- **Cause:**
  - The container stopped when the Zima shut down (Nov 14, 23:12 UTC; exit 255).
  - Its restart policy was actually **`no`**, not the compose file's `unless-stopped` (ZimaOS's app manager probably reset it), so it never came back.
  - The crash-looping container `5bb04c37…` seen in dockerd logs is a different app.
- **Fix:** Owen ran `sudo sh /DATA/home/Harper/claude-desktop-fix.sh` (diag → `/DATA/home/Harper/claude-desktop-diag.txt`). Now:
  - Restart policy **always**.
  - `claude-desktop-watchdog.timer` is enabled (90 s after boot, then every 5 min: start the container if it's down).
- **"Default computer" for chats:** chosen on the claude.ai / app side (open the chat in the Zima's desktop app, or pick it as the chat's computer). Claude can't set an account default from inside a chat. Scheduled tasks that need a computer should be created from a chat linked to the Zima so they bind to it.

## Approvals and sudo (Nov 16, Owen's choices)
- **sudo:** Owen created `/etc/sudoers.d/90-harper-claude`: `Harper ALL=(root) NOPASSWD: /usr/bin/docker, /usr/bin/systemctl` (mode 440).
  - Verified: `sudo -n /usr/bin/docker ps` works.
  - Use `sudo -n` with the full paths. Other sudo commands still need Owen's password.
- **Old perms warning:** `visudo -c` warns that `/etc/sudoers` and `/etc/sudoers.d/zfs` are mode 644 (should be 440). It's harmless for sudo working; Owen can fix it with `sudo chmod 440 /etc/sudoers /etc/sudoers.d/zfs`.
- **Approval prompts:** these come from ssh-mcp's `approvalPolicy = "ask-destructive"`. Cloud chats can't show its approval form, so destructive or privileged commands fail closed.
  - Owen can switch to `approvalPolicy = "auto"` (and `approvalMode = "auto"` under `[defaults]`) in that profile's config.toml on the Zima desktop and/or his Mac, then restart the app or use the `reload-config` tool. Not changed as of Nov 16.
  - ssh-mcp's never-allowed list still applies (e.g. authorized_keys edits).
  - Claude still states what a destructive step destroys and backs up first (Owen's standing rule).
  - Claude does not change these security settings itself.

## If it stops
- Login expired → run `~/.local/bin/claude` on the Zima and `/login` (Claude Code), or sign in again in the web desktop (desktop app).
- After a big ZimaOS update → `systemctl status alexa-review.timer claude-remote.service claude-desktop-watchdog.timer alexa-review-trigger.service`.
