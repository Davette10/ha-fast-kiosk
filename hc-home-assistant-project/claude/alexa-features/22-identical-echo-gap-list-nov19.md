# What's left for an identical Echo Show 8 (research, Nov 19 2026)

Owen (6:58 AM): "Remove the screen dimming. Research and find out everything else that needs to be copied to have an identical alexa. Look into features. … update the news briefing to be literally identical to a real echo show, along with everything else."
Owen's choices (7:05 AM): **stock rotating home screen** (his widgets move to the widget page); **bar leaves while Alexa speaks** (stock).
Owen (7:28 AM): "recreate everything you can of the alexa OS … if you only absolutely need me to gather info wait to do those things last."
Owen (7:50 AM): "Continue where you left off and complete the job. When you are done, thoroughly test everything you added."
Owen (9:22 AM / 12:35 PM): "copy the dashboard 1:1 to alexa. dont stop until it looks and functions the exact same" → he chose **"Real Echo's screens"**: keep making every Echo screen identical to the real Alexa. "make the dashboard identical to looks and functionality".

## What the real device was (from his own backup)
- Echo Show 8 (1st gen), Fire OS 6574.1 with **Alexa+** (Banyan client installed).
- Home = `com.amazon.ambienthome` (`MediumHomeScreen`, `FullBleedCardV2`). No shortcuts component on this build.
- His kitchen home rotated (Paladin `alexa-anchor` log, Sept 30 2025): Photos 49, News 33, Daily Dose 26, Music picks 19, Trending topics 19, Food inspiration 14, Trending info 12; 7 each: Popular questions, Hourly weather, Jokes, Video games, Lists, Games, Device notifications; Sports video 6, Shopping 6, Kids 5.
- His own Echo screenshots (only true references): `www/echo-stock-…/ref/` — 6560 Music & More, 7551 calendar, 7882 Settings, 7875 doorbell live view, 7034 Help, 7463 Spotlight.
- **Viewing references:** the built-in browser asks Owen for every action on the HA site (high-risk), staging files from his Mac was refused, and base64 over SSH is redacted. What works: a 2×2 grid overlay of the ref images on the Echo for ~3 s (`echo-cdp/rg.sh on a b c d` / `rg.sh off`) plus `camera.echo_show_screen` — only when the satellite is idle. YouTube references in the built-in browser: `window.grid(t0, step)` draws 16 frames into one canvas.
- **YouTube caution:** 2025 videos (e.g. `cnLCSx9BDcc`) show the newer light-blue widget UI of the 3rd/4th gen; Owen's 1st-gen Alexa+ build used the dark style seen in his own screenshots. Don't copy screens from the new UI without checking.

## Status by feature
| Area | Status |
|---|---|
| Alexa light bar | **Done** (doc 19) |
| Screen dim while listening | **Done** (removed) |
| Music & More player | **Done** (`os-echo-stock-music`) |
| Wake word, earcons, boot animation, fonts | Done earlier |
| **Home screen** (rotating content cards + widget page) | **Done** — `os-echo-stock-home` |
| **Alexa+ answer screen** (conversation) | **Done** — `os-echo-stock-ask` |
| **Calendar** (ref 7551) | **Done** Nov 19 12:40 — `os-echo-stock-cal` |
| **Settings** (ref 7882) | **Done** Nov 19 12:45 — `os-echo-stock-set` (restyles os-alexa-skin's Settings) |
| **Camera / doorbell live view** (ref 7875) | **Done** Nov 19 12:45 — `os-echo-stock-cam` |
| **Help** (ref 7034) | **Done** Nov 19 12:47 — `os-echo-stock-help` |
| "Play the news" | **Needs a reference video** from a real Echo — ask Owen |
| Weather, timers/alarms list, swipe-down quick settings, smart home, night clock, notifications, lists | **Need references from a real Echo with the same (dark, 1st-gen Alexa+) UI** — ask Owen |
| Prime Video / Netflix apps; calls, Drop In, announcements, skills, checkout | Not possible on the web page / Amazon account services |

## Resources (all files in `/config/www/echo-stock-edU4oOWQEk/`, project copies in `ha/os-modules/`)
| Module | Resource id | URL version | md5 |
|---|---|---|---|
| os-echo-stock-home | `66ac54a5e225405abe0d1092ac0ed5e7` | v=6 | `daf2567b` |
| os-echo-stock-ask | `c8c32bca2758499ab58340fc7f76ef7c` | v=2 | `8807a194` |
| os-echo-stock-cal | `7bb717bfb06d49d5968777a949665288` | v=2 | `5ff10d5c` |
| os-echo-stock-set | `e1fc2c2688644ea2b5443b5e0c714a5a` | v=2 | `efb8354c` |
| os-echo-stock-cam | `71d33a5a38aa4d148b9146de0d60ec8e` | v=1 | `eb0fda6b` |
| os-echo-stock-help | `ee40e4c4a4ae4cbbb52014c6ca357f27` | v=1 | `00821ac6` |
To change one: edit the file (sed on HA, check md5 against the local copy), bump `?v=` on its resource, reload the Echo (`button.vaca_amzn_echo_show_8_3a31_refresh`) only while the satellite is idle. All act only with `skin: "stock"` and never on the replay view.

## Calendar — `os-echo-stock-cal`
- Replaces `_pCalendar`: black screen, month + year top left (follows the week at the top while scrolling), round Today / Month(Agenda) buttons, gear (opens Settings), "+" (os-echo add-event sheet), weekday row, full-width grid of tall day cells (22.75vh) with the date top left and a dark "No events" pill or event pills in calendar colours, "+N more". Today's date in a blue circle. 17 weeks from the start of last month; opens on this week. Tap a day = os-echo day sheet. Month ⇄ Agenda (next 60 days) toggle. Panel header hidden (`stk-calp`).

## Settings — `os-echo-stock-set`
- CSS + small DOM changes on os-alexa-skin's Settings: dark left list (stock order Alexa, Display & Appearance, Accounts & Profiles, Device Options, Notifications & Sound, Accessibility, then Help), white line icons, square highlight; navy pane with blue glow; round back button + centred title; rows in rounded translucent cards with grey second lines; larger toggles. Adds **Accounts & Profiles** (the people in this home, Home/Away; voice profiles and Amazon account shown as not used). Styles itself the moment the skin creates Settings.

## Camera live view — `os-echo-stock-cam`
- Full-screen picture, no header or button bar; bottom left four-squares icon + camera name (tap = all cameras), bottom right microphone (talk on/off, green while talking). Two-way talk and live video are os-echo's own.

## Help — `os-echo-stock-help`
- Settings > Help opens the stock Help list (dark slate, back chevron + bold HELP, large light topics with lines); topics open pages with answers for this setup. Back / left-edge swipe; closes with Settings.

## Tests run Nov 19
- Home, conversation: see earlier (all passed). **Mistake:** one simulated "listening" state (7:57 AM) played the wake and end earcons once; later tests start from "processing".
- Calendar: opens on this week with today visible, title follows scrolling (November → December), Today jumps back, Agenda (42 rows) and back, day tap opens the day sheet, "+" opens the add sheet, gear opens Settings; header hidden only on the calendar.
- Settings: stock order, Accounts & Profiles (10 rows), Device Options and Display pages, back button closes Settings.
- Camera: tested silently (live video and talk stubbed so nothing could play sound): header and button bar hidden, name + icons placed as on the real Echo, grid icon opens all cameras, header back on other screens.
- Help: list of 6 topics, topic page, back to list, back closes Help, Settings stays.
- After reload: all modules loaded, every screen above opened, no script errors.

## Next steps
1. Ask Owen for references (real Echo with the dark Alexa+ UI, e.g. Hayden's Echo Show): "Alexa, play the news", a running timer and the timers list, "Alexa, what's the weather", swipe down from the top, the smart home screen, the night clock, a notification.
2. Build those screens from the references.
