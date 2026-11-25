# Two-way talk (Oct 1, 2026)

Built and wired; microphone itself still needs a real test on a phone at the https address.

## How it works
- **WebRTC Camera** integration (AlexxIT/WebRTC v3.6.1, was already in HACS) added as config entry `01M3X9DVW8TTTH86HJ4JZGHEF6`, pointed at the existing go2rtc `http://192.168.6.172:1984/`. It registers the `webrtc-camera` card by itself.
- Signaling goes through Home Assistant (logged-in session, works on the https page). go2rtc is **not** exposed through the NGINX proxy (that route was refused as a security weakening; do not retry it).
- `os-cam` has a new config key `talk: <go2rtc stream name>` (`front_door`, `downstairs`), set on all four camera cards (tablet `c1`/`c2`, phone `c0`/`c1`).
- Code is in **os-v3-fixes** (resource `3e31a2ddc74944529e5e5edac14cc831`, 5.6 KB): `_talkUi`, `_talk(on)`, patched `_mark`, `disconnectedCallback`, `_muteUi`.
  - **Layout (rev 3):** nothing sits on the video at Live. A control bar `.cb` between the video and the timeline holds the camera name, a status line (Live / Recording / Microphone on), the speaker button and the Talk pill (44 px targets). The old `.top` overlay is hidden. The scrub bar still overlays the video while a recording plays.
  - **Talk:** shown only at Live, on a secure (https) page, once `webrtc-camera` is defined. On: the normal live view stays visible (muted), and a hidden audio-only `webrtc-camera` (`media: audio,microphone`, `background: true`, in `#talkv`) carries doorbell audio and the microphone. Pill turns white and reads "Done". Off, scrubbing to a clip, or leaving the page removes it and restores the live sound.
- Verified on the http page by calling `_talk(true)`: session connects in RTC mode with a live audio track while the live view stays in place. Microphone not testable there.
- **Cameras page:** the `os-cam-panel` cards (alerts, siren, Wi-Fi, battery) were removed from both dashboards. Tablet body grid is now `"c1 c2"` with one `minmax(0, 1fr)` row; phone `c0`/`c1` cards hold only `v` (radius 17px all round).

## Limits
- http pages (`http://192.168.6.172:8123`) never show the mic pill. Use `https://YOUR-HOST.duckdns.org:8443`.
- WebRTC media runs directly between the browser and go2rtc (port 8555) on the home network; the https address is home-only anyway.
