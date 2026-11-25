# Alexa (Echo Show) music playback (Nov 10, 2026)

## Voice
- Pipeline "Gemini Assist" TTS = Piper `en_US-alexa-medium` (community "Alexa-like" voice from Owen's zip; files in `/share/piper`, json fixed: dataset `alexa`, quality `medium`). Previous voice: `en_US-hfc_female-medium` (switch back with ha_manage_pipeline update tts_voice).
- Piper custom voices need BOTH `<name>.onnx` and `<name>.onnx.json` in `/share/piper` (or upload via Piper's Web UI → /data). Check with Piper app proxy `GET /api/piper/voices`; restart Piper after adding.

## script.play_on_voice_assistant ("Play Music or Audio", exposed to Assist)
- Fields: query, artist, media_type (track/album/artist/playlist/radio), radio_mode, player. **Default player = media_player.echo_show_music** (MA Sendspin player on the Echo, area Kitchen).
- Flow: clean query → artist==query means artist → Fox News direct radiobrowser URI → `music_assistant.search` (with artist filter) → fallbacks (words+artist, then song alone / first word) → Jinja ranking (exact name +100, kind asked +200, artist match +80 / -40, genre words or radio_mode → playlists & radio +150) → stop player, wait not playing → play top 4 in turn until `playing` (6 s each).
- Returns response `{status: playing|not_found|failed, title, artist, speaker|message}`.
- Gemini prompt v3.7 (`outputs/ha/gemini-prompt-v3.7.txt`, previous v3.6 kept): PLAYING THINGS rewritten — use this tool, Echo default, split song/artist, only say "playing" when status is playing. Before this the agent claimed "Playing…" when nothing was found.

## Tests (Nov 10, Echo music volume 0 + MA player muted during tests, restored after: music volume 3, unmuted)
- Library/radio round: "Dreams by Fleetwood Mac" ✓, "some Fleetwood Mac" ✓ (needed artist==query fix), "the album After Hours" ✓, "put on some jazz" ✓ radio station (was Queen's album "Jazz" before the genre fix), "Espresso by Sabrina Carpenter" ✓, "Blinding Lights" ✓, "Clair de Lune by Debussy" → "I couldn't find…" ✓ (before Spotify), "pause the music" ✓, "Fox News" ✓, "stop the music" ✓.
- Spotify round (after Owen added Spotify to MA, provider `spotify--ALGygtid`): "Clair de Lune by Debussy" ✓ streams from Spotify (but picked an exact-title release by "Johann Debussy" over Claude Debussy's "Clair de Lune, L. 32" — exact-name scoring; known quirk for classical), "Bohemian Rhapsody by Queen" ✓ (library), "some Taylor Swift" ✓, "Ordinary by Alex Warren" ✓ `spotify--ALGygtid://track/...`.
- Library copies are preferred automatically when a `library://` item matches; otherwise Spotify streams.
- Not tested (would make sound on real Amazon Echos): other-room requests via Ask Alexa.
- Note: via the API, "pause the music" has no area and also targets the Amazon Echo groups; from the Echo itself it's scoped to Kitchen.
- HA + Zima were briefly unreachable (MCP timeout) right after the first Spotify search; recovered on Owen's reconnect.

## Spotify
- HA Spotify integration `media_player.spotify_larper` (Spotify Connect control only).
- Music Assistant Spotify provider added by Owen Nov 10 (`spotify--ALGygtid`).
- MA app was found in `error` state (crashed ~10:47 UTC Nov 10, watchdog off); started again.
- Owen asked twice to auto-download every played Spotify song to the Zima/Downtify in lossless: declined (saving DRM-protected Spotify streams; not lossless anyway). Offered: buy lossless files (Qobuz/Bandcamp) into the Zima music folder → MA library → played locally. Owen connected `/Volumes/ZimaOS-HD/Downloads/downtify` as a folder; not used for this.
- MA player `echo_show_music` volume_level is 0 (was 0 before testing) — music on the Echo may be silent until it's raised.

## Next
- Rebuild tablet/phone Media tab (`os-music`, resource `d8a45d6c47514b399ac82aba375dd2db`) and Echo Music panel on MA search (Spotify + library) instead of Deezer/Downtify.
