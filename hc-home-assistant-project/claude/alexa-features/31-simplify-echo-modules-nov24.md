# Simplify the kitchen Echo screen: 22 modules → 5 (Nov 24 2026) — STAGED, waiting for the switch

Owen (9:13 PM): "simplify and optimize the actual alexa echo dashboard/app/build as much as you can to be as simple as possible while keeping all functionality."

Choices:
- **Merge into one clean app.** Owen picked this.
- **Storage:** Owen then chose "few clean HA resources", because the nightly review bot can only edit HA resources. It has no file access to the HA box.
- **Debloat Android:** yes.

## What was wrong
- **Too many modules:** the Echo screen was the os-echo core plus 21 inline modules, about 430 KB. Many of the modules patch os-echo's prototype from outside.
- **Core over the limit:** os-echo was 130 KB, over ha-mcp's 128 KB inline edit limit. So nobody could edit it, and every fix became another patch module.
- **Load order varies:** boot.js loads the modules in parallel (`Promise.all`), and the HA frontend does too. So the order patches stacked could differ from one load to the next. For example, os-echo-answers wrapping `_timersHtml` before or after os-echo-glance replaces it.

## New layout (built, parse-checked on the Echo, not yet live)
| Resource id | Name | Size | Contents (former modules, in old load order) |
|---|---|---|---|
| `9347e797…` | os-echo (core) | 103.8 KB | os-echo minus 3 dead methods and 27 moved panel methods; exports `window.__osEchoLib` (HUES, WHITES, WX, esc, fmtTime, left, pad) |
| `4ae5c92c…` | os-echo-screens (group 2) | 104.5 KB | moved panel methods (installed on os-echo's prototype, non-enumerable, after `whenDefined`), chat, news, fx, map |
| `af5a44ef…` | os-echo-pages (group 3) | 92.2 KB | wx, climate, music, watch |
| `22305048…` | os-echo-island (group 4) | 85.3 KB | glance, listen, tapstop, stock, wake |
| `99183855…` | os-echo-extras (group 5) | 46.6 KB | os-alexa-skin (live: the card config has `skin: "stock"`), answers, cal, heal, perf |

- **Unchanged:** Amazon orders `93fb7b23…` (also used by the tablet/phone) and the echo-fast guard `2b8125f7…`.
- **Deleted (14 resources):** `f181935d`, `0969a981`, `62091a71`, `ccef3e2b`, `86774a72`, `dece1d18`, `1d3a4813`, `bc2a35cf`, `b944839c`, `4b28cf1e`, `dcded868`, `5b9c9e5a`, `8ab32ac9`, `2bc7bf63`.

### How the groups work
- Every former module is kept **verbatim** as a "part": `/* ===== part: os-echo-xyz (was resource …) ===== */`. Each part has its own `try`/`catch`, and the error is rethrown asynchronously so os-echo-heal still sees it.
- Groups 2→5 run strictly in order through `window.__osEchoQ`. If a group never arrives, the queue moves on after 5 s.
- **Dead methods removed from the core:**
  - `_loadCal` and `_vSnd`, because os-echo-glance always replaces them;
  - `_pCalendar`, because os-echo-cal always replaces it.
- **Moved methods** (verbatim):
  - smart-home sheet: `_lights`, `_lc`, `_lstate`, `_pSmart`, `_pSmartSync`, `_sheet*`;
  - cameras panel: `_pCams`, `_pCam`;
  - `_pClimate`, `_pMusic`, `_pMusicSync`, `_pMap`;
  - calendar sheets: `_cmStep`, `_calColor`, `_monthEvents`, `_onDay`, `_daySheet`, `_addSheet`, `_addRows`, `_calSheetClick`;
  - `_pChat`, `_pLists`, `_pOrders`, `_demo`.
- **Checks done:**
  - The core class went from 118 to 88 members, exactly the old set minus dead and moved. No remaining method text changed.
  - The moved methods only use the 7 exported helpers. This was checked with a free-variable scan.
  - All 5 files compile in strict mode on the Echo (`new Function`).
- **Build:**
  - Zima `/DATA/home/Harper/echo-build/` holds `build.py`, `jslex.py` (brace/string/regex-aware scanner), `out/` and `manifest.json`.
  - Sources are the 21:17 snapshot in `/DATA/home/Harper/echo-backup/2026-11-24-simplify/src/`.

## The switch (blocked for Claude by the safety classifier; needs Owen)
1. Files are staged on HA in `/config/backups-claude/2026-11-24/simplify/` (`new/*.js`, `new/delete.txt`, `apply.sh`).
2. `apply.sh`:
   - aborts if `.storage/lovelace_resources` changed since the 21:17 backup;
   - saves `lovelace_resources.before-switch`;
   - rewrites the 5 ids;
   - deletes 14;
   - checks the count.
3. Run it in the HA Terminal / SSH add-on: `ha core stop && /config/backups-claude/2026-11-24/simplify/apply.sh; ha core start`. HA core is down for about 1–2 minutes.
4. Then press `button.vaca_amzn_echo_show_8_3a31_refresh` (not while news is playing).
5. **Undo:** `ha core stop && cp /config/backups-claude/2026-11-24/simplify/lovelace_resources.before-switch /config/.storage/lovelace_resources; ha core start`, then Refresh.

### After the switch (Claude)
- Check `window.__osEchoQ.next === 6`, no new `__echoFast.errors`, no heal reports.
- Compare the home layout with `/DATA/home/Harper/echo-build/boxes-before.json`. **Warning:** the old `q_boxes.js` calls `o._force(false)`, which forces day mode. Use a copy without that line at night.
- Check the panels only at a quiet time.
- Update the review bot's CLAUDE.md (`/DATA/home/Harper/alexa-review/CLAUDE.md` lists old resource ids) and doc 01.

## Android debloat (done Nov 24 21:26)
- Backup: `/sdcard/backup-2026-11-24/`, also on Zima at `echo-backup/2026-11-24-simplify/android/` (package lists, `dumpsys package`, global/secure/system settings).
- `pm disable-user` on 20 unused apps: smspush, mms.service, providers.blockednumber, simappdialog, providers.calendar, localtransport, backupconfirm, sharedstoragebackup, wallpaperbackup, bookmarkprovider, bluetoothmidiservice, hotspot2.osulogin, dynsystem, managedprovisioning, onetimeinitializer, statementservice, documentsui, storagemanager, mtp, systemui wallet plugin.
- The list is in `/sdcard/backup-2026-11-24/debloat-disabled-2026-11-24.txt`.
- **Undo one app:** `pm enable <pkg>`. Undo all: `for p in $(cat …txt); do pm enable $p; done`.
- **Kept on purpose:**
  - phone/telecom/telephony;
  - keyboard (calendar add-event sheet);
  - keychain;
  - externalstorage;
  - echoparts / lineageparts (buttons, hardware);
  - audiofx;
  - bluetooth (VACA Bluetooth proxy);
  - settings;
  - webview;
  - setupwizard.
- Launcher, systemui, gallery and others were already disabled earlier.
- No crashes afterwards; VACA stayed in front.

## Incident
- At 21:28, `q_boxes.js` forced day mode on the night screen for about 5 s.
- Night mode was put back on automatic: `_nightForced = null`, then `_nightTick`.
