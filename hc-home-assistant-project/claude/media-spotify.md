# Media page: Spotify-style music (updated Oct 14, 2026)

Replaces the old `os-media-app` body on the Media tab of both dashboards with `custom:os-music`.

## Where it lives
- Resource `d8a45d6c47514b399ac82aba375dd2db` (inline module). Source: `Desktop/ha/os-modules/os-music.js`. Resend the full file on every change. The uploaded size is always 8 bytes smaller than the local file (because of the escaped accent range in `norm`).
- Tablet `claude-test-dashboard`: `views[5]` (media) `.cards[0].custom_fields.body.card`.
- Phone `mobile-dashboard`: `views[4]` (media), same path.
- Card config: the old os-media-app keys (`config_entry_id` 01M1N1ZBPT9P4JRBBR5JG13M2J, `default_player`, `names`, `icons`, `groups` for Alexa and TVs), plus:
  - `downtify` (default `http://192.168.6.170:8582`)
  - `ma_files` (default `filesystem_smb--duQdqgsc`)
  - `downtify_relay` (default `rest_command.downtify`, see below)

## Rollback
- Backup: `Desktop/ha/backups/media-page-before-os-music-2026-10-13.json`.
- Set the body card type back to `custom:os-media-app` with that config. The old resource `a71b7d352f0b497882e65211c2afae02` is still installed.
- Earlier versions are in the session scratchpad: `os-music.pre-search.js`, `os-music.pre-ws.js`, `os-music.pre-relay.js`.

## Why Deezer and not Spotify for search
- Since Feb 2026, the Spotify Web API needs a Premium account for the app owner.
- Catalog search, artist, album and genre pages use the public Deezer catalog. It needs no account and is called over JSONP because it sends no CORS headers.
- Limits: about 50 requests per 5 s. The module throttles to 40 per 5 s with 4 in parallel and retries on error code 4.

## Search ranking (Oct 13)
Deezer's artist search sorts exact names first, so "kanye" gave an artist named "Kanye" with 115 fans.

**Candidates:** Deezer artist search; artists of Deezer track-search hits (ranked by popularity); the top-100 chart artist index (`chart/0/artists`, cached 1 day in `os-music-aidx`); artists opened before (`os-music-picks`).

**Score** = name match + 12 × log10(fans), plus small boosts for MA-library artists and past picks.

| Match | Score |
|---|---|
| Exact (also ignoring "the" and spaces) | 100 |
| Nickname (ye, yeezy, mj, tswift, rhcp, mcr, gnr, biggie, pac, bieber, jlo) | 96 |
| Name starts with the query | 80–92 |
| Every query word starts a word | 64 |
| Typo: same first letter, 1 edit up to 7 letters, 2 from 8 | 56 |
| Contains the query | 42 |

Top result: an artist wins when its name matches what's typed; a popular song wins when its title matches better. With an artist in focus, Songs leads with their top 5 and Albums with their albums (+45). Results update after 250 ms; old results stay dimmed while loading.

## Layout
- **Tablet:** 292 px sidebar (Home, Search, Your Library chips), main pane with back, search and a Downloads pill, 92 px player bar.
- **Phone** (under 700 px): top tabs, sticky mini player, bottom-sheet device picker, full controls on Now Playing.
- Pages: Home, Search, Artist, Album, playlist, genre, Now Playing, Downloads.
- Track rows: filled blue arrow = downloaded; dimmed title + outline arrow = missing; spinner/ring = queued/downloading.
- MA's shared playlist logo is detected (image used by 3+ playlists) and replaced with thin-line icons (`os-music-logos`).
- MA imageproxy only accepts `size=0` or `256`.

## Multi-room sync (Oct 14)
- The device picker shows a circle next to every Music Assistant speaker that supports grouping (feature bit 524288, not unavailable). Tap a circle to add or remove that speaker: `media_player.join` (entity = current speaker, `group_members`) / `media_player.unjoin`. The current speaker shows a fixed check. The bar shows "+N" when others are joined.
- Groupable now: `voice_pe_music` and `living_room_2` (Apple TV via AirPlay); the iMacs when they're on.
- The EchoMuse Echo (`echo_voice_assistant_2`) isn't groupable until the user turns on EchoMuse's "Sendspin player" and pairs it in MA (port 8928, EchoMuse 2.18+).
- Alexa Echos can't sync with MA players. They use Alexa's own groups (Everywhere, Downstairs). MA's experimental Alexa provider was rejected (needs a public HTTPS endpoint and Amazon credentials, and doesn't sync).

## Downtify 3.4 (upgraded by the user Oct 14)
- Env: `DOWNTIFY_DISABLE_AUTH=true` (set by the user; without it the Media page got 401).
- Compose changes suggested Oct 14 and applied by the user: image pinned to `ghcr.io/henriquesebastiao/downtify:3.4.0` (not `latest`), `TZ: America/New_York`, more than 1 CPU. Download rate went from ~7 to ~15 songs/min right after.
- Settings: format `opus`, bitrate `138`, `overwrite_existing_files` true, `max_parallel_downloads` 8, `organize_by_artist` true, `download_delay_seconds` 0. Settings survive restarts.
- Endpoints: `GET /list`, `GET /tracks` (codec, bitrate, added), `GET /api/library/summary`, `GET /api/version`, `GET /api/queue` (rows have `position`, `user_ids`; ~10 MB and ~6 s at 19.6k jobs), `POST /api/download/batch`, `GET /api/settings`, `POST /api/settings/update`, `DELETE /api/queue/item?song_id=` (doesn't cancel the task), `DELETE /delete?file=`, `/delete/batch`, WebSocket `/api/ws?client_id=` (`{song, progress, message, provider, status, filename?}`).
- **The download queue is in memory only** (`state.download_jobs`, a dict in `api.py`). Any Downtify restart or update empties it. The old 2.7 queue (~2,700) was lost that way, and the bulk queue was lost again on Oct 14 when the compose file was changed (rebuilt, see Bulk queue).

### Quality
- 2.7's yt-dlp got 403s on YouTube's audio streams and fell back to format 18 (360p video audio: ~96 kbps, cut off at 16 kHz).
- 3.4 bundles deno and yt-dlp 2026.8.19 and gets format 251 (Opus, 127–151 kbps, full 20 kHz).
- Bitrate `138`: Downtify stream-copies when the source is within 10% of the target (`_BITRATE_COPY_TOLERANCE`), so 138 keeps the original Opus untouched. 320 or 256 re-encodes Opus → Opus (bigger, not better). Verified re-downloads at 137–142 kbps with full band.
- There's no lossless source without a paid service.

### Cross-site block (important)
- 3.4's `AuthMiddleware` refuses any POST/PUT/DELETE or WebSocket from an "open" or "session" principal when the browser's `Origin` (or `Referer`) host doesn't match the `Host` header: 403 "Cross-site request refused". GETs still work. There is no allowed-origins setting.
- So from the dashboard: `GET /list` and `/api/queue` work, but queuing downloads, the priority lane and the live WebSocket feed are refused. Server-side calls without an `Origin` header (curl, Home Assistant) are accepted.
- Options considered: device token (Bearer, exempt) — rejected because it would sit in the frontend and I don't handle tokens; `DOWNTIFY_TRUSTED_PROXIES` + forged `X-Forwarded-Host` — rejected, circumvents a security control and doesn't fix the WebSocket.
- **Chosen: Home Assistant relay.** In `configuration.yaml` (added by the user Oct 14):
  ```yaml
  rest_command:
    downtify:
      url: "http://192.168.6.170:8582{{ path if path in ['/api/download/batch', '/api/settings/update'] else '/api/blocked' }}"
      method: POST
      content_type: "application/json"
      payload: "{{ body }}"
      timeout: 30
  ```
  os-music (`_post`) calls `rest_command.downtify` with `{path, body}` when the service exists, else falls back to a direct POST.
- Without the live feed, a requested song is found by polling `/list` (every 10 s for the tapped song, 15 s for the follow-up songs) instead of waiting for a WebSocket "done". The WebSocket is tried twice, then left alone for 5 min. `/list` takes 3–7 s under download load, which is why polling isn't faster.
- Status Oct 14: YAML loaded without an HA restart. `rest_command.downtify` tested with a no-op settings save: 200. os-music deployed (118,134 bytes); the tablet Media page renders.

## Download flow
- Downloaded songs are matched by title and artist against `GET /list` and played through MA as `filesystem_smb--duQdqgsc://track/<path>`, falling back to the Downtify HTTP URL.
- Tapping a song that isn't downloaded:
  1. **Priority lane.** Downtify can't pause or reorder. Re-saving `max_parallel_downloads` (same value) creates a new asyncio semaphore; jobs sent right after it take the next free slot ahead of the backlog. The tapped song is sent alone first with id `dzp<id>`, then its album (also `dzp`).
  2. Then the artist: top 50, then all albums/EPs/singles (no compilations), newest first, in batches of 40. Remembered for 12 h (`os-music-artists`).
- The tapped song auto-plays as soon as it's in the library. The rest of the list joins the play queue as each finishes (gives up on a song after 10–15 min).
- **Compilations:** a "Various Artists" album (Deezer id 5080 or record_type `compile`) queues only the tapped song. "Rest of the artist" goes to the context artist (the one being viewed/searched), not a compilation's credited artist.

## Bulk queue (Oct 14)
- Requested by the user: re-download all existing songs at full quality, then all songs from the top 100 artists.
- Catalog: `Desktop/ha/music/top100-catalog-2026-10-14.json` (`[{rank, id, name, top, rest}]`): 100 artists, 4,796 top songs, 14,595 others (Disney 1,323; NBA YoungBoy 702). Built by `scratchpad/cat/build.py`.
- First queued: 952 re-downloads (`song_id "re:"+oldpath`), then 4,553 top songs round-robin by artist, then 14,092 discography songs; 376 skipped as already owned.
- **Rebuilding after a restart** (done Oct 14): on the Mac VM, `~/q/requeue.py` compares `redownload.json` and `submit.json` (keys `A` = top songs, `B` = the rest) against `GET /tracks` (title + artist match; a re-download counts as done only if a fresh Opus ≥100 kbps exists) and writes `requeue.json`. `~/q/push.py` posts it in batches of 200 and resumes from `requeue.pos`. Rebuild on Oct 14: 24 re-downloads + 3,787 top + 14,030 rest = 17,841 jobs. Re-run both after any Downtify restart (delete `requeue.pos` and fetch `/tracks` to `tracks_now.json` first).
- Duplicates: where a re-download's path changed (root-level MP3 vs `Artist/…opus`, or `AAP Rocky/` vs `A$AP Rocky/`), the old low-quality file stays. Removing them needs the user's OK and a backup first. `~/q/redownload.json` (`bad`) lists the originals.
- Risk: YouTube may rate-limit at this volume (403s show up as errors).

## Playback rules
- MA speakers: `music_assistant.play_media` with URIs and `enqueue: replace`. Switching speakers while playing uses `transfer_queue`.
- Alexa speakers: "play X by Y" through Alexa. TVs: refused.
- Testing: only on `media_player.voice_pe_music` (the user's rule).

## Testing
- Harness in the session scratchpad `mt/` (Playwright, live Deezer, stubbed Downtify): `search.js`, `flow.js`, `ws.js` (live feed + priority + autoplay), `sync.js` (sync circles), `relay.js` (HA relay with the WebSocket refused).

## Network notes
- Claude reaches HA through the HA Tailscale add-on. The Mac VM reaches the LAN only because the add-on's subnet route `192.168.4.0/22` was approved by the user (Oct 14).

## Known limits
- Downtify is plain http, so it's blocked on https pages (mixed content). The tablet uses http.
- MA adds new downloads to its library at its next sync; fresh songs still play through the provider URI.
- YouTube matching is done by Downtify; wrong-version matches are possible.
