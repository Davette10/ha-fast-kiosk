# Duke Energy usage in Home Assistant (Oct 12, 2026; zoomable chart Oct 21)

## How the data gets in (workaround for the broken core integration)
- Duke moved its API login to Auth0 in Nov 2025, which broke the core `duke_energy` integration; it was then moved out of core.
- Working replacement: **hunterjm/ha-dukeenergy** custom integration via HACS (installed v0.3.1, latest as of Oct 12 2026). Login needs the Chrome extension from hunterjm/aiodukeenergy releases to capture the OAuth callback (done by the user in desktop Chrome).
- Config entry `01M4RMA9E1D73H1JB9PNRPT4Z8`, title user@example.com, state loaded.
- It creates **no sensor entities**. It writes hourly long-term statistics: `duke_energy:electric_330757818_energy_consumption` (kWh, has_sum). Backfilled from Oct 2023. Refreshes every 12 h; Duke data lags about a day. Only electric meters; no cost statistic.
- **15-minute data: not available (checked Oct 21).** Duke's residential app/website and the API behind ha-dukeenergy (aiodukeenergy 1.1.1, `intervalFrequency` HOURLY or DAILY) only go down to hourly, about a day late. Live or 15-minute readings would need a whole-home monitor in the panel. The user chose not to pursue that for now.
- Known risks: Duke can change app credentials again (broke it once in Nov 2025); if usage stops updating, check the integration for a re-auth prompt and HACS for an update.

## Energy dashboard (HA built-in)
- Grid consumption = the Duke statistic. The bed-lights plug (`sensor.bed_lights_total_consumption`) moved to Individual devices.
- No cost in the built-in Energy dashboard: HA only computes cost from a price for entity-based sources, not external statistics. Costs are shown on the custom Energy pages instead.
- Backup of the prefs BEFORE the change (restore with ha_manage_energy_prefs mode=set):

```json
{"energy_sources":[{"type":"grid","stat_energy_from":"sensor.bed_lights_total_consumption","stat_energy_to":"sensor.bed_lights_today_s_consumption","stat_cost":"sensor.bed_lights_this_month_s_consumption","stat_compensation":null,"entity_energy_price":null,"number_energy_price":null,"entity_energy_price_export":null,"number_energy_price_export":6,"cost_adjustment_day":0,"power_config":{"stat_rate":"sensor.bed_lights_current_consumption"},"stat_rate":"sensor.bed_lights_current_consumption"}],"device_consumption":[],"device_consumption_water":[]}
```

## Rate used for costs
- Home is in Duke Energy Progress (NC) territory. Schedule RES, single phase, NC Public Staff typical-bill table "applicable as of Sep 1 2026":
  - Basic customer charge $14.00 + CEPS $1.81 = **$15.81/month**.
  - Base energy $0.12623/kWh + riders $0.03144 + a further ~$0.00337 that the published typical bills imply = **$0.16104/kWh** (reproduces the table exactly: 300 kWh $64.12, 500 $96.33, 1000 $176.85 summer).
  - Winter (Oct–May): kWh over 800 in a month at **$0.15104** (1000 kWh winter = $174.85).
  - Plus **7% NC sales tax**.
- Pending: DEP rate case E-2 Sub 1380 settlement would raise rates Jan 1 2027; DEP/DEC combine Jan 1 2027. Update `RATE` in os-energy.js when new rates take effect.
- All costs are estimates at current rates (historic months are re-priced at today's rate).

## os-energy module
- Resource `997b275acb0c4ca3b9287208073c658b` (inline module, 51,165 bytes since Oct 21). Source `Desktop/ha/os-modules/os-energy.js`. Resend the full file on every change.
- Reads the statistic in the browser with WS `recorder/statistics_during_period` (hour/day/month, type `change`), cached 15 min. No HA sensors needed.
- `custom:os-energy-mini` (options `path`, `height`): "Energy · Yesterday" kWh, cost, % vs 30-day average, 14-day bar sparkline, month-to-date. Tap opens the Energy page.
- `custom:os-energy-page`: 4 tiles (yesterday, month so far, projected bill, last month), the main zoomable chart (below), Typical Day (hourly profile, last 30 days), Year over Year (monthly, this year vs last), and the Your Rate card. Phone layout stacks below 700 px.

### Zoomable main chart (Oct 21)
Replaced the Oct 13 swipe-paging carousel; backup in `scratchpad/en/os-energy.pre-zoom.js`.
- **How it draws:** one continuous timeline on a `<canvas>`. `_draw` runs in a rAF loop, only while something moves. The view is the right edge `_t1` plus the visible `_span`.
- **Bar size follows the span:**
  - **hour** up to 2.25 days
  - **day** up to 75 days
  - **week** (Sun–Sat) up to 275 days
  - **month** up to 2.4 years
  - **year** beyond that
- **Changing bar size:** bars fade in over 180 ms, and the y-scale glides to its new top instead of jumping.
- **Gestures:**
  - Pinch zooms around the fingers; the time under the midpoint stays put. Range is 6 hours to all years.
  - One-finger drag pans 1:1, with momentum and rubber-band edges. It springs back at the newest data and at Oct 2023.
  - Vertical drags still scroll the phone page (`touch-action: pan-y`).
  - Tap a bar to select it; tap again to clear.
  - Trackpad pinch (ctrl+wheel) and sideways wheel also work.
- **Hour / Day / Week / Month / Year control:**
  - Animates to presets with a critically damped spring and log-space zoom: 1 day of hours, 31 days, 26 weeks, 12 months, all years.
  - The selected-segment thumb slides and always shows the current bar size, including during a pinch.
  - ‹ › pan by 85% of the screen.
- **Data:**
  - Loaded lazily in chunks and cached per page: hourly per day, daily per month, monthly per year. The daily chunks carry month-to-date cost, so the winter tail rate lands on the right days.
  - Weeks are summed from days, years from months.
  - Costs: hours, days and weeks are energy-only. Months and years are whole bills including fixed charges (the current month uses mtdCost).
  - The first (2023) and newest bars are drawn lighter as partial.
- **Labels:**
  - The title shows the visible range ("Sep 20 – Oct 20", "Yesterday, October 20", "2023 – 2026").
  - The info line shows the total for the bars on screen plus the average per bar, or the selected bar.
  - X labels are spaced by measured text width.
- **Testing:**
  - Harness in `scratchpad/en/`: t.html uses synthetic hourly data from Oct 2023. t.js covers all levels, a mid-animation frame, a synthetic pinch, pan with momentum, edge settle, tap and $.
  - Puppet checked the tablet at 1280x800 and the phone at 390 wide with real data.

## Dashboard changes
- Tablet (`claude-test-dashboard`):
  - Home dock middle slot: when nothing is playing it now shows `os-energy-mini` instead of the scenes/routines buttons (Good Morning, Goodnight, Home, Away were removed at the user's request; now-playing still takes over while media plays).
  - New view `energy` (index 3, subview, PAGE pattern with `os_page_header`), no scrolling at 1280x800.
  - `os_nav`: "Energy" tab (`mdi:lightning-bolt-outline`) between Calendar and Orders.
- Phone (`mobile-dashboard`):
  - Home "scenes" slot: `os-energy-mini` (96 px, path `/mobile-dashboard/energy`) instead of os-routines.
  - More page: "Energy" row (yellow tint) between Calendar and Orders.
  - Subview `energy` (ph_page, back link to More).
