# HTTPS access and go2rtc (Oct 1, 2026, night)

Goal: free two-way talk to the Ring doorbell from the dashboard. The browser microphone needs an https page, and go2rtc is the free Ring source that supports talk-back.

## HTTPS (working)
- **Address:** `https://YOUR-HOST.duckdns.org:8443` (home network only). `http://192.168.6.172:8123` still works.
- **Duck DNS app** (`core_duckdns`): domain `YOUR-HOST.duckdns.org`, `ipv4: 192.168.6.172` (points at the LAN address, not the public one), Let's Encrypt `accept_terms: true` (the user accepted). Certificate files `fullchain.pem` / `privkey.pem` in `/ssl`.
- **NGINX Home Assistant SSL proxy** (`core_nginx_proxy`): domain as above, host port **8443** (443 was already in use), boot auto, watchdog on. Its container address is 172.30.33.10.
- **Trusted proxy setting:** in HA 2026 the `http:` YAML block is ignored once migrated (`.storage/http` has `yaml_migration_done: true`). The setting lives in **Settings → System → Network → HTTP server**. `trusted_proxies` is now `127.0.0.1/32, 172.30.33.0/24`.
  - Saving there restarts HA and starts a ~5 minute countdown; the "Confirm new HTTP server configuration" dialog must be confirmed or HA reverts. WebSocket read: `http/config` (`stable`, `pending`, `revert_at`).
  - `configuration.yaml` also has a (now redundant, harmless) top-level `http:` block. Backup of the file before the fix: `/config/configuration.yaml.bak-oct1`.
- **Full backup before this work:** `Before_https_proxy_2026-10-01` (id `404895c8`).
- **Incident:** the `http:` block was first pasted indented under `ffmpeg:`. That broke ffmpeg and, through it, esphome, homekit_controller (thermostats), tplink, wyoming, default_config and the cameras ("Camera not found") until it was dedented and HA restarted.

## go2rtc
- App repo added: `https://github.com/AlexxIT/hassio-addons`. Running: **go2rtc (master)** `a889bffc_go2rtc-master` (1.9.14+dev.c245815), boot auto. The stable `a889bffc_go2rtc` is installed but stopped (boot manual).
- Web UI `http://192.168.6.172:1984` (no password). Config `/config/go2rtc.yaml`: `rtsp.listen: ":8556"` (8554 is taken by ring-mqtt) and streams `front_door`, `downstairs` as `ring:?camera_id=…&device_id=…&refresh_token=…`.
- **Ring login:** password login in go2rtc fails with 406 since Ring's Feb 2026 auth change (both stable and master). What worked: in the Terminal & SSH app, `apk add --no-cache nodejs npm` then `npx -p ring-client-api ring-auth-cli` (Node 24), and paste the token into go2rtc's Ring → refresh_token box. The user pasted the stream addresses into the config himself.
- The Ring refresh token was pasted into the chat once and is readable on the go2rtc page by anyone on the LAN.

## Not done yet
- Microphone button / go2rtc live provider in the `os-cam` card, and a talk-back test. On an https page the card must reach go2rtc over https too (not `http://…:1984`), so it needs a proxied path.
- Phones and the tablet still use the http address; they need to switch to the https one for the microphone.

## How the config file was edited
- ha-mcp has no file tool. The edit was done by typing commands into the Terminal & SSH web UI (`/app/core_ssh`) through the browser pane. `/config` there is a symlink to `/homeassistant`.
