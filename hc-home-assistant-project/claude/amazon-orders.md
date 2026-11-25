# Amazon orders page (started Oct 16, 2026)

**Update (Nov 12):**
- **v2.1.0 (short names):** each item gets a 2–4 word name (≤28 chars) from Gemini (`ai_task.google_ai_task`, then the backup, then a plain trim). Names are cached in the Store `amazon_order_sync.short_names` by ASIN/name and saved on the item as `sn`. v2.1.0 also includes the v2.0.1 fixes (no old finished orders, delivered day from Amazon).
  - It is zipped on the Mac in Desktop/ha. **Owen still needs to install it:** replace the folder, then restart. No new sign-in is needed.
  - Until then, old orders 111-9563600, 111-9114112 and 111-7966219 may reappear and can be removed again.
- **Manual short names:** `sn` was added by hand to orders 114-6750639-5155454 (Ceiling Duster Kit, Citrus Mint Tea) and 114-1550707-0662622 (Organic Chicken Broth, etc.).
- **os-amazon:**
  - Shows the short name, with the full name underneath.
  - The order sheet now closes all the way: the closed state is `translate(-50%,100vh)`, plus `visibility:hidden` after the 420 ms slide.
  - Backup: `backups/os-amazon-2026-11-12.js`.
- **os-fixes:** At a Glance uses `cnt` and `items[0].sn || items[0].n`.
- **Tablet nav:** Orders tab n8 (`/claude-test-dashboard/orders`), between Media and Calendar.

**Status (Nov 11, 9:45 PM):**
- **Email pipeline:** working end to end. Hotmail forwards Amazon emails to a Gmail; HA reads them, saves each order to `todo.amazon_orders`, then moves the email to Gmail Trash.
- **Your Orders sync:** **working**. On the first real run (9:39 PM) it read 10 orders through the Zima helper and filled in exact product names, Amazon photos and ASINs. For example "365 by Whole Foods Market, Organic Low Sodium Chicken Broth" (9 items) and "20FT High Ceiling Duster Kit" (2 items).
- **Grocery orders:** Whole Foods/Fresh orders came back with no item list on the history page, so they keep the category names from the emails.
- **Clean-up:** the first run also added 3 old finished orders (delivered Nov 4 and Nov 6, plus one cancelled). Claude removed them.

## Amazon helper (Zima, Docker)
- **Files:** `outputs/ha/amazon-helper/` (Dockerfile, docker-compose.yml, helper.py). Copied to Zima at `/DATA/AppData/amazon-helper/`. Address `http://192.168.6.170:8765`.
- **Image:**
  - python:3.12-slim.
  - **apt libatomic1** (needed, otherwise the Playwright node driver fails with "libatomic.so.1 not found").
  - `amazon-orders[browser]==6.0.0`, `playwright==1.65.1`, then `playwright install --with-deps chromium`.
- **Starting it:** Owen ran `cd /DATA/AppData/amazon-helper && sudo docker compose up -d --build` himself. User Harper isn't in the docker group, and sudo through zima-ssh can't prompt for approval in this client.
- **Health check without sudo:** `curl -s http://127.0.0.1:8765/health` via zima-ssh.
- **Library config:** `auth_forms_classes` = PlaywrightAcicForm, then PlaywrightJSAuthForm. Amazon requires a JS sign-in challenge, and this passes it.
- **API:**
  - `/health`
  - `/signin`: the first call pairs and returns a token.
  - `/orders`: 10-min server-side gap (cached result inside it), 1 h pause after a failure, and stops on needs_sign_in.
  - `/forget`
- **Credentials:** only in `/data/account.json` (0600) on Zima. HA stores only the URL, token, username and todo entity.
- **Re-pairing:** delete `data/token`.

## Amazon Order Sync (HA custom integration, v2.1.0 built, v2.0.0 installed)
- **Files:** source in `outputs/ha/amazon_order_sync/`. Zip on Mac `Desktop/ha/amazon_order_sync.zip`. Install into `/config/custom_components/` (files directly inside the folder), then restart.
- **No pip requirements.** `client.py` posts to the helper (300 s timeout).
- **Pacing:**
  - Checks about 2 min after any Amazon `imap_content` email.
  - Also every ~4 h (+jitter), only while orders are open and outside 10 PM–7 AM, with a 20-min minimum gap.
  - After errors it backs off 1 h, then 6 h.
  - `needs_sign_in` or `not_paired` pauses everything, raises a notification and starts reauth.
- **Merge:**
  - Real items `{n, img, a, sn}` replace category names; `sn` is carried over from old items by ASIN or name.
  - The status never goes backwards.
  - The ETA and window are parsed from the status text.
  - It adds orders no email created only if placed in the last 7 days **and** still on the way (or delivered today/yesterday).
- **Sensor:** `sensor.amazon_order_sync_status`. **Service:** `amazon_order_sync.refresh`. **Removal:** calls the helper's `/forget`.
- **v1 history:** v1 ran the library inside HA. Amazon answered with the JS challenge, which looked like a bad password, and HA's Alpine container can't run Playwright.

## Why the sync exists
- Since early July 2026 Amazon's order emails show only categories, with no names, photos or IDs, and no setting to change it.
- Owen chose automatic reading of his own Your Orders page, accepting the terms and account risk, with the lowest-risk pacing. He types all credentials himself.

## Email route and automations
- **IMAP entry** `01M76KYKZVMP4MYHM22KJNFH00`: INBOX, search ALL, push. Gmail has a not-spam filter.
- **`automation.amazon_orders_read_order_emails`** (queued): calls `script.amazon_orders_process_email` with the uid, waits 3 s, then runs `update_entity` on the IMAP sensor. This catches batch leftovers, because IMAP only fires for the newest email.
- **The script:**
  1. Fetch and classify the email.
  2. Get the item count from the subject. No `\b` in Jinja literals.
  3. Pull HTML product images when present.
  4. Run Gemini, then the backup AI task, then a regex for the order number.
  5. Merge: real products win; the status never goes backwards.
  6. Save the order, then move the email to Trash.
- **`automation.amazon_orders_tidy_old_deliveries`:** runs at 03:40 and removes completed orders 7 days after `upd`.

## Cards
- **os-amazon** (resource `93fb7b2337a842839c7fc7e502d784af`): `cnt` drives "and N more" and the badge. Item rows with an ASIN open amazon.com/dp/ASIN. Long titles are cut off with an ellipsis on the cards (checked in Puppet).
- **os-fixes** (resource `421c3ee649fc427494b0faf54d7002dd`): the At a Glance row shows "· N items".
- **Backups:** `outputs/ha/backups/os-amazon-2026-11-11.js`, `os-amazon-2026-11-12.js` and `os-fixes-2026-11-11.js`.

## User rules
- Processed order emails go to Trash, never a permanent delete.
- Owen types every credential himself. Claude never handles the Amazon login.
