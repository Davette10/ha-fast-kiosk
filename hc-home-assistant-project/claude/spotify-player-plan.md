# Spotify-style player rebuild (requested Nov 11, 2026)

## Owen's request
- "A more in-depth media player... a version of Spotify that's user friendly on a small screen."
- Features: Now Playing, Your Library, Search, Up Next / Queue.
- Screens: all three now — Echo Show, tablet Media tab, phone Media tab.
- "Keep the same aesthetic going for each dashboard." Each screen's player matches that dashboard's look:
  - Echo: os-echo dark Apple style.
  - Tablet/phone: Clark Home OS glass/AMOLED style of `os-music`.

## Status
- **Echo Show: DONE (Nov 11).**
  - New resource `os-echo-music` (`af5a44efa14c4a2b8115ce7463b74566`, 44,691 B, sha256 `10684c3e…`), source `outputs/ha/os-echo-music.js`.
  - os-echo `_pMusic` mounts `<os-echo-music>` with `el.host = this`. The header is hidden via `nwp`. Idle timeout is 240 s for music.
  - Config adds `ma_entry` and `like_button`. os-echo is now 127,673 B, sha256 `fd5276bc…`.
  - Verified in the harness (`scratchpad/echo/t8.html` + `mus.js`) and loaded on the Echo (CDP: customElements defined).
- **Tablet + phone: TODO.**
  - Swap the `os-music` data layer from Deezer/Downtify to MA+Spotify, keeping its UI and look.
  - Add Up Next and a like button.

## Echo player layout
- **Left (37%), Now Playing:**
  - Back button and "Now playing" label.
  - Album art (scales down when paused), title and artist·album, heart.
  - Draggable scrub bar with elapsed and remaining time.
  - Shuffle, previous, a big white play button, next, repeat (off/all/one).
  - Volume drag bar and speaker picker (transfer_queue).
  - Blurred album-art backdrop.
- **Right:** segmented tabs.
  - **Home:** greeting, 6 quick-pick playlists (Liked Songs first), Recently played albums, Your artists (circles), Radio.
  - **Library:** chips for Playlists/Albums/Artists/Songs/Podcasts/Radio; 40 per page, more load on scroll.
  - **Search:** white pill input using the native keyboard, 550 ms debounce. Filter chips, Top result, Songs, Artists, Albums, Playlists, Podcasts, Radio. Recent searches in localStorage. Spotify copies are preferred over library duplicates.
  - **Up Next:** now, next, "N more", Song radio / Shuffle / Repeat, Recently played tracks.
- **Detail pages** (album/playlist/artist/podcast) come from `media_player/browse_media` on the MA player.
  - Header with Play, Shuffle and Radio.
  - Tapping a track in an album or playlist plays the album/playlist with `start_item`.
- **⋯ or long-press:** Play now, Play next, Add to queue, Song/Artist radio, Go to album/artist, Open.
- **Like:** presses the MA favorite button and only adds (MA has no unfavorite from HA). The liked state is read from get_queue current_item.media_item.favorite.

## Backend facts (Music Assistant via HA)
- MA entry `01M1N1ZBPT9P4JRBBR5JG13M2J`. Spotify provider `spotify--ALGygtid`. Player `media_player.echo_show_music`. Like button `button.vaca_amzn_echo_show_8_3a31_sendspin_player_favorite_current_song`.
- **get_library:** use `limit`/`offset`/`order_by` at the top level. Wrapping them in `pagination` returns 400.
- **search:** returns artists, albums, tracks, playlists, radio, audiobooks, podcasts.
- **get_queue:** returns current_item and next_item only, not the full list.
- **browse_media:**
  - Children for spotify uris and `library://playlist/N` (use media_content_type `music`).
  - Track titles are "Artist - Title".
  - "Liked Songs larper" (`library://playlist/11`) returns no children; maybe not synced.
- **Images:**
  - Spotify `i.scdn.co` (https) works.
  - MA `http://192.168.6.172:8095/imageproxy/<hash>` is mixed content. It goes through the Alexa Helper 1.1 view `/api/alexa_helper/art/<hash>?size=N` (unauthenticated, hex hash only, fixed MA host).
  - Other plain-http images get an icon instead.
- Only the Echo MA player is available right now. The other MA players are unavailable.

## Hard rule
- Never play audio on the Echo during tests: harness/Puppet only.
