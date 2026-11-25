# Music (Nov 15–16)

## Music screen `os-echo-music.js` (resource `af5a44efa14c4a2b8115ce7463b74566`, hash `51066e58…`, 50,835 bytes; backup `outputs/ha/backups/os-echo-music-2026-11-15.js`)
- **Art fix:** MA image proxy only serves sizes 80/160/256/512/1024 (others → 400 → blank tiles). `ART()` snaps up and routes `http://…/imageproxy/<hash>` through `/api/alexa_helper/art/<hash>`. Now-playing art prefers the queue's https Spotify image (if names match), background blur uses a 160 px copy. `window.OSEchoArt` shared with the glance music card.
- **Layout (centred, Apple Music style):** left column: "‹ Home" pill (goes straight to the home screen: `host._close()` + `host._islHome()`), NOW PLAYING + speaker name, speaker-picker button; art; title/artist with like button; scrub bar; shuffle/prev/play/next/repeat; volume slider (Echo volume). Right: always-visible search bar (focus opens search, ✕ returns to last tab) above centred tabs Home / Library / Up Next; centred headings, card rows, lists.
- **Home tab Genres chips:** Pop, Hip-Hop, Country, Rock, R&B, Jazz, Classical, Chill, 80s, 90s, 2000s → `_genre()`: MA search on Spotify `genre:"x"` (decades → `year:1980-1989`, "80s rock" → `genre:"rock" year:…`), 50 tracks, shuffle on, play list.
- Verified on the Echo via screenshots.

## Voice music `script.play_on_voice_assistant` (hash `10bac043…`)
- Genres are generic (no hard-coded list; Owen didn't want Christmas special-cased): when no artist and kind not track/album/artist/radio, it searches Spotify `genre:"<words>"` tracks (limit 50). With ≥10 results: shuffle on, repeat all, play the list, say "Playing jazz music." Otherwise falls through to normal ranked search.
- Every result returns `say` ("Playing Dreams by Fleetwood Mac."); the prompt tells the AI to speak exactly that.
- Fox News → known radio stream. Default player `media_player.echo_show_music`.
- Spotify search via MA supports field filters (`genre:`, `year:`); Spotify editorial playlists are NOT returned by search.
- Not yet tested by voice (no sound allowed; voice TTS broken).
- "Use Spotify for controls": playback controls go through Music Assistant on Spotify content; the Echo can't be a Spotify Connect target.
