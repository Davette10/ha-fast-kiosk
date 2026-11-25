# Tablet Calendar tab, Apple Calendar layout in the dashboard theme (Oct 11, 2026; edit added Oct 15)

Replaced the HA `calendar` card, the "New Event" pill (browser_mod popup + `script.quick_add_event`) and the "Up Next" calendar-card-pro on `claude-test-dashboard` / `calendar` with custom elements. The phone dashboard calendar page is unchanged.

- **Resource:** inline **os-calendar** (`e8942a037e6c441ba7ed6d45e9457c0d`, 49,574 bytes since Oct 15, source `Desktop/ha/os-modules/os-calendar.js`). Inline data-URI module: resend the full file on every change. Deployed size equals the local file size (no escaped characters). The version before editing was added is in the session scratchpad as `os-calendar.pre-edit.js`.
- **Layout (view 2 body grid):** `"cal day" "cal lists"`, columns `minmax(0,1fr) 380px`, rows `1.2fr / 0.8fr`. `cal` = `custom:os-calendar`, `day` = `custom:os-calendar-day` (now the **week panel**), `lists` = the existing Shopping/To-Do card.
- **Corners:** both custom cards use an explicit `border-radius: 22px` (matches the Lists `os_card`). They used to read `--ha-card-border-radius`, which resolves to 0 inside the `os_bare` wrappers, so they rendered square.
- **Colours follow the dashboard theme, not Apple Calendar's** (user request). Calendars: Family = `calendar.clarkcalendar1613_gmail_com` `--os-accent`, Birthdays = `calendar.birthdays` `--os-text`, Holidays = `calendar.holidays_in_united_states` `--os-text-3`. Overridable with a `calendars:` config list. Only Delete stays red and the All-day switch stays green (same as the dashboard toggles).
- **Data:** REST `calendars/<entity>?start&end` per visible 6-week grid, cached per month in `window.__osCalStore`, refreshed every 5 min and after add/edit/delete. Shared selection `S.sel`; `S.jump = true` tells the month view to follow a selection made in the week panel into another month.

## Month view (`os-calendar`)
- Header: bold month + light year (32 px), Today pill, < > buttons, + (new event). Swipe left/right on the grid changes month.
- Day numbers sit in a fixed **34x34 perfect circle** (`border-radius:50%`, no padding); today = `--os-on` filled circle, selected = `--os-surface-3` circle. Pressed cell highlight is rounded (14 px). Event pills 8 px radius.
- Each week is a `.wk` row of 7 day buttons plus an absolute `.lay` grid (top 40 px, 22 px lanes, 3 px gap, pointer-events none).
- **Multi-day / all-day events are one continuous bar spanning their days**, with flat edges where they continue into the previous/next week.
- **Text wraps instead of "…" when there is room** (canvas-measured, up to 3 lanes; tall layout used only if it hides no more events). "N more" when a day overflows.

## Week panel (`os-calendar-day` tag, replaces the old Today panel)
- Header: "THIS WEEK" (or "WEEK") + range ("Oct 11 – 17", "Oct 25 – Nov 1"), < > week buttons, + button.
- Day strip: 7 rounded pills (S M T W T F S + date, 16 px radius). Selected day = `--os-on` pill; today = accent number; small dot under days with events. Tapping a pill selects that day (month view follows) and scrolls the list to it.
- Agenda list for the week grouped by day ("TODAY · OCT 11", "TOMORROW", weekday names). Days with no events are skipped except the selected day ("No events"). Multi-day events appear once, on their first day in the week. Event rows are rounded 14 px tiles with the calendar-colour bar; tap to expand calendar, location, notes and an action row: **Edit** (filled `--os-on` pill with a pencil icon) and **Delete Event** (two taps; WS `calendar/event/delete`, feature bit 2).
- Selecting a day in the month view moves the week panel to that week and scrolls to the day.

## Editing events (Oct 15, user request)
- Edit shows when the event has a `uid` and its calendar supports update (feature 4) or both create (1) and delete (2). Holidays has no features, so no Edit there.
- **Edit opens the same sheet** titled "Edit Event", pre-filled: title, start/end (all-day events show the inclusive last day; the calendar's end is exclusive), All-day switch, calendar (current one selected; moving to another calendar is allowed), notes. Location has no field (removed from the sheet earlier at the user's request) but is **kept**: the original location is sent with the saved event.
- Saving with nothing changed just closes the sheet.
- **Calendar supports update (feature 4, e.g. Local Calendar):** WS `calendar/event/update` with `uid`, `recurrence_id` and `event {summary, dtstart, dtend, description, location}` (timed = ISO with offset, all-day = dates).
- **Google calendars (features 3, the family calendar):** there is no update, so it saves the changed copy with `calendar.create_event` **first**, then deletes the original (`calendar/event/delete` with `uid` and `recurrence_id`). If the create fails nothing changes. If the delete fails it says "Saved the changes, but the old version couldn't be removed. Delete it from the list." The new copy gets a new Google id; Google-only details (reminders, guests, colour) don't carry over.
- **Repeating events:** the sheet says "This is a repeating event. Changes apply to this one only." Only that occurrence is replaced (delete with its `recurrence_id`).
- Birthdays (Google's birthday calendar) reports features 3 too, but Google refuses changes there; the sheet shows the error and nothing is lost.

## New Event sheet (`os-cal-sheet`) — touch-first, minimal typing (v2)
- 620 px sheet, 28 px radius, blurred backdrop, theme vars only. Header: 52 px round **X** (cancel) and round **✓** (save; greyed until there is a title and a valid range). Thin left bar in the selected calendar's colour.
- Title field only (not auto-focused). **No title presets** (tried and removed at the user's request). **Location removed** (user request).
- **Date/time like Apple Calendar:** Starts / Ends rows with date and time chips; tapping expands an inline month calendar or a 3-column scroll-snap time wheel (hour, 5-min minutes, AM/PM) under that row. Changing the start keeps the duration; an invalid end is struck through in red and disables ✓.
- All-day switch hides the time chips. Calendar choice = pill chips (only when more than one calendar can take events). Notes optional.
- Saves with `calendar.create_event` (`start_date_time`/`end_date_time` local, or `start_date` + exclusive `end_date` for all-day), then selects the new event's day.
- `window.__osCalNewEvent(date, event?)` opens the sheet (with an event object from the store it opens in edit mode).

## Verification
- Visual checks use **Puppet only** (user instruction: do not use the browser pane for HA): `ha_get_dashboard_screenshot(url_path="claude-test-dashboard", view_path="calendar", 1280x800, jpeg, wait_ms 7000)`. On Oct 15 Puppet timed out twice after the deploy, so the live page wasn't re-checked that day.
- The sheet only opens on tap, so to see it in Puppet: add a temporary module resource that runs only headless (`navigator.webdriver`), calls `window.__osCalNewEvent(new Date())`, take the screenshot, then **delete the temp resource**.
- Local Playwright harness (session scratchpad `ct/`, fake `hass`): Edit button shows on expanded rows; sheet pre-fills; unchanged save makes no calls; Google path = create (with location) then delete; all-day dates round-trip; repeating note shows; update path used for feature 7; delete-failure message; New Event sheet unchanged.
- Not tested live: actually creating, editing or deleting an event (would write to the family Google calendar), light mode, and real touch scrolling on the tablet.
