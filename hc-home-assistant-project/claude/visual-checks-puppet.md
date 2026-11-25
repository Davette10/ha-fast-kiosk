# Visual checks with Puppet (updated Oct 2, 2026)

Use this instead of the browser pane for looking at the dashboards. No approval prompts, and far fewer tokens than pane screenshots.

- **App:** Puppet 2.6.0 (`0f1cc410_puppet`) from `https://github.com/balloob/home-assistant-addons`. Owen installed/started it and set its access token himself. The token belongs to the **`tablet`** account, which is in kiosk mode on `claude-test-dashboard`.
- **Tool:** `ha_get_dashboard_screenshot(url_path, view_path, ...)`. Use `image_format: jpeg` and `wait_ms: 5000` so camera streams and thumbnails load. Do not use `zoom` (0.5 doubles the CSS viewport instead of shrinking the image).
- **Tablet:** `width 1280, height 800` on `claude-test-dashboard` gives a full, correct 800 px layout.
- **Phone:** `width 390`, height as needed, on `mobile-dashboard`.

## How the top crop was fixed
Puppet crops the top 56 px (where the HA header normally is) and its `100vh` is unreliable (pages often fell back to the 640 px min-height). Fix, active only in headless browsers:
- New inline resource **os-capture** (`c4411385498d435cb2149a6327e0c1e1`, source `Desktop/ha/os-modules/os-capture.js`): when `navigator.webdriver`/Headless and the HA header is hidden, it sets `padding-top: 56px` on hui-root's `#view` and `--os-page-h: 800px` on the document (wide viewports only).
- The 11 panel pages of `claude-test-dashboard` now use `height: var(--os-page-h, 100vh)` (was `100vh`). On real devices the variable is unset, so nothing changes there.

## Still needs the browser pane
Tap/live behaviour tests, scroll measurements (JS), microphone checks, and typing into the Terminal & SSH app. The pane asks for approval on every action for the HA address. On `http://192.168.6.172:8123` the pane is signed in as `tablet`; on the https duckdns address it is signed in as Harper (not kiosk on the tablet dashboard).

## No-scroll audit of the tablet dashboard (Oct 2)
Measured in the pane as `tablet` at 1280x800 across all 28 views: no page scrolls. Two inner areas scrolled and were fixed:
- **Media "Play on" list** (13 speakers): now a Music / Alexa / TVs segmented control showing one group at a time (`os-media-app` patch in os-v3-fixes, `_segUi`). Largest group is 7 rows; fits.
- **Calendar "Up Next"**: `compact_events_to_show: 4` and `.content-container { overflow: hidden }`. Home page "Up Next": 3 events, same overflow rule.
- Still scroll by nature: the media library/search results grid and the shopping list when long.
- Noticed, not fixed: the month calendar's weekday header row renders as a blank white bar in dark mode.

## Remote https (found Oct 2)
- Tailscale app `a0d7b954_tailscale` is installed and running: device `homeassistant`, tailnet `YOUR-TAILNET.ts.net`, `share_homeassistant: funnel` on port 443.
- `https://homeassistant.YOUR-TAILNET.ts.net` answers from the public internet (Funnel), with a valid certificate. Switching the option to `serve` would make it Tailscale-only.
- Advertised subnet route `192.168.4.0/22` and exit node are **not approved** in the Tailscale admin console.
- Mobile More page: one Kiosk Mode card with a switch per person (Harper, Jill, Hayden, Lauren, Jason), visible to everyone.
