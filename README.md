# ha-fast-kiosk

Run a Home Assistant dashboard on a slow wall tablet or smart display **without loading the Home Assistant frontend**.

ha-fast-kiosk is a tiny page (about 23 KB) that you drop into `/config/www/`. It opens one websocket to Home Assistant and builds the same `hass` object the frontend normally gives your cards. Then it loads only the dashboard resources you choose and shows your custom card full screen. Your dashboard config and cards stay in Home Assistant, so you keep editing them the usual way, and the kiosk picks up changes on its next load.

It was built for a jailbroken Echo Show 8 (1st gen, MT8163, 2 GB RAM) running LineageOS and the [View Assist Companion App](https://github.com/msp1974/ViewAssistCompanionApp). On that device:

| | HA frontend | ha-fast-kiosk |
|---|---|---|
| Screen ready after load | ~10.7 s | ~1.5–2.2 s |
| Idle main-thread CPU | 9.4 % | 4.7–5.8 % |
| JS heap | 35 MB | 9–18 MB |
| DOM nodes / event listeners | 6,065 / 800 | 816–1,464 / 113–131 |
| WebView renderer memory | ~425 MB | ~325–370 MB |
| Opening a full-screen panel (first frame) | 65–262 ms | 39–199 ms |

The layout was pixel-checked against the real dashboard: all 280 elements on the home screen had the same position, size, font and color.

## What it supports

- **Custom cards** (`type: custom:...`) that use the normal `hass` object: `states`, `entities`, `devices`, `areas`, `floors`, `user`, `config`, `callService`, `callWS`, `callApi`, `fetchWithAuth`, `hassUrl`, `connection`, `locale`. It also supports `document.querySelector("home-assistant").hass`.
- `<ha-icon>` / `<ha-svg-icon>` with the same markup and styles as Home Assistant. Icons come from your HA's own `/static/mdi/` files and are cached on the device.
- A minimal `<ha-card>` (header + slot).
- `loadCardHelpers()` for `picture-entity` only, as a camera stream image.
- Auth through Home Assistant's **external-auth bridge**, which the Companion app, VACA and other kiosk apps use. In a normal browser it uses the tokens the HA frontend saved ("Keep me logged in").
- Live updates, automatic reconnects and token refresh. If the first load fails, it retries in place, which works even in apps that block page navigation.
- Offline start: the last dashboard config and resource list are cached, so the screen comes back while HA restarts.
- View Assist: it reconnects the display with the same browser ID View Assist already registered.

## What it does not support

- **Built-in cards** (`tile`, `entities`, `thermostat`, Mushroom, Bubble Card and so on). They need the HA frontend's internal elements. Use a dashboard built from your own custom card(s); the full-screen "panel" view with one custom card is the ideal case.
- More-info dialogs, the sidebar, the edit mode and `navigate` actions to other HA pages.
- Cards that patch HA's internals, such as card-mod and kiosk-mode. Leave them out of `resources`.

## Install

1. Download `dist/` from this repo and copy its files to `/config/www/fast-kiosk/`.
2. Copy `config.example.json` to `config.json` and edit it (see below).
3. Open `https://<your-ha>/local/fast-kiosk/index.html` in a browser where you are signed in to HA. Check it looks right.
4. Point your kiosk at it:
   - **View Assist Companion App (VACA):** in View Assist → your display → *Configure* → *Dashboard options*, set **home** to `/local/fast-kiosk/index.html`. Then reload the VACA integration, or restart the app, so it gets the new URL. Optionally add `extras/view-assist-guard.js` as a dashboard resource (see the comment inside it).
   - **Fully Kiosk / Companion app / any browser:** set the start URL to `https://<your-ha>/local/fast-kiosk/index.html?external_auth=1`. Use `?external_auth=1` only inside apps that provide external auth.

To update after changing files, increase the number in `version.txt`. The loader checks it on every start and fetches the new `boot.js` / `theme.css`.

### config.json

```json
{
  "dashboard": "my-kiosk",
  "view": "home",
  "card": 0,
  "resources": { "include": ["my-kiosk-card", "webrtc-camera"], "exclude": [] },
  "dark_mode": true,
  "view_assist": true
}
```

| Key | Meaning |
|---|---|
| `dashboard` | **Required.** The dashboard's URL path (`/my-kiosk` → `"my-kiosk"`). |
| `view` | View `path` or index. Default: the first view. |
| `card` | Index of the card in that view, or `"all"` to stack every card in a scrolling column. Default `0`. |
| `resources` | `"all"` (the default) loads every JavaScript dashboard resource. Better: `include` / `exclude` lists of case-insensitive regular expressions. They are matched against each resource's URL, and for inline (`data:`) resources also against the first ~400 characters of its code, which usually holds its header comment. Load only what your card needs; that's where most of the speed comes from. |
| `keep_path` | URL path the page shows (default `/<dashboard>/<view>`), for cards that check `location.pathname`. |
| `language` | Default: the browser's language. |
| `dark_mode` | Passed to cards as `hass.themes.darkMode`. Default `true`. |
| `view_assist` | Reconnect this display to View Assist if it was registered before. Default `true`. |

### Theme

`theme.css` holds the CSS variables the HA frontend normally supplies, using HA's default dark theme. For a pixel-identical result with your own theme, open your dashboard in the normal HA frontend, paste `tools/capture-style.js` into the DevTools console (set `CARD` to your card's tag first), and save the result as `theme.css`.

## Measuring on an Android device

`tools/cdpx.py` talks to an Android WebView over the DevTools protocol (forward it with adb first, see the comment at the top). For example:

```sh
python3 tools/cdpx.py 9222 perf 30      # CPU %, heap, DOM nodes over 30 s
python3 tools/cdpx.py 9222 shot out.png # screenshot
python3 tools/cdpx.py 9222 eval probe.js
```

In the page, `window.__fastKiosk` shows load timings (`marks`), errors and readiness.

## Undo

Point your kiosk back at the normal dashboard URL (for View Assist, set **home** back and reload VACA), then delete `/config/www/fast-kiosk/`. Nothing in Home Assistant itself is changed by installing this.

## Build from source

```sh
npm install
npm run build   # writes dist/
```

## Notes

- Some kiosk apps (VACA among them) block a page from navigating itself, so `location.reload()` does nothing there. Reload from the app instead, for example with VACA's *Refresh* button entity.
- If your card sizes things from `ha-icon` before it has rendered, it still works: icons render one microtask after they connect, like the real Lit elements.

## License

MIT, see [LICENSE](LICENSE). `dist/boot.js` bundles [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) (Apache-2.0); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Not affiliated with Home Assistant, Nabu Casa or Amazon.
