# Light/dark switching (Oct 4, 2026)

- The glass module (`d6653aa4…`) picks the mode in `modeNow()`: `window.__osModeOverride` first, then `input_select.dashboard_appearance` (Auto / Light / Dark), and Auto follows `sun.sun`.
- That helper is shared by both dashboards and is set from the phone's More → Appearance card. When someone picked "Dark" there (Oct 2), the wall tablet stopped switching.
- **Fix:** inline resource **os-tablet-auto** (`0c307bd9da244acea8096a8a50ea7285`). On `/claude-test-dashboard` it sets `window.__osModeOverride` from `sun.sun` every 2 s (light when `above_horizon`, dark otherwise) and clears it on other dashboards. So the tablet always follows sunrise/sunset; the phone dashboard still obeys the Appearance card.
- The glass module re-checks every 3 s and cross-fades over ~2 s, so the switch happens within a few seconds of sunrise/sunset.
- Verified with Puppet at 1:48 PM: tablet Home renders light while the helper was still "Dark".
