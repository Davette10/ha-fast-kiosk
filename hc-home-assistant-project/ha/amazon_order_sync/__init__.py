"""Amazon Order Sync.

Fills the Amazon Orders list (todo.amazon_orders) with the exact product
names, photos and product IDs from your own Your Orders page.

Low-risk pacing, on purpose:
- One page read per check (Your Orders, last 30 days). No detail pages.
- The signed-in session is reused, so a full sign-in is rare.
- A check runs about 2 minutes after an Amazon email arrives, and every
  ~4 hours (with random jitter) only while orders are on the way, never
  between 10 PM and 7 AM, and never more than once per 20 minutes.
- If Amazon asks for anything a person must answer (a picture puzzle, a
  code, a new sign-in) it stops completely, shows a notification and waits
  for you to sign in again from Settings. It never retries in a loop.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
import json
import logging
import random
import shutil
from typing import Any

import voluptuous as vol

from homeassistant.components import persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CONF_HELPER_URL,
    CONF_TOKEN,
    CONF_TODO_ENTITY,
    DEFAULT_TODO,
    DOMAIN,
    MIN_GAP,
    NEW_ORDER_DAYS,
    QUIET_END_HOUR,
    QUIET_START_HOUR,
    SCHEDULE_EVERY,
    SERVICE_REFRESH,
    SIGNAL_STATUS,
)
from .merge import merge, placed_recently, worth_adding
from .shortnames import ShortNames

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SENSOR]
NOTIFY_ID = f"{DOMAIN}_sign_in"


def store_dir(hass: HomeAssistant) -> str:
    return hass.config.path(".storage", DOMAIN)


class OrderSync:
    """Decides when to look at Your Orders, and writes what it finds."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.todo = entry.data.get(CONF_TODO_ENTITY) or DEFAULT_TODO
        self._store: Store = Store(hass, 1, f"{DOMAIN}.state")
        self._lock = asyncio.Lock()
        self._pending = None
        self.status = "waiting"
        self.last_sync: datetime | None = None
        self.last_error: str | None = None
        self.errors_in_row = 0
        self.next_check: datetime | None = None
        self.orders_seen = 0
        self.updated: list[str] = []
        self.short_names = ShortNames(hass)

    # ---------- state ----------
    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        if data.get("last_sync"):
            self.last_sync = dt_util.parse_datetime(data["last_sync"])
        self.status = data.get("status") or "waiting"
        self.last_error = data.get("last_error")
        self.errors_in_row = int(data.get("errors_in_row") or 0)
        self._plan_next()

    async def _save(self) -> None:
        await self._store.async_save(
            {
                "last_sync": self.last_sync.isoformat() if self.last_sync else None,
                "status": self.status,
                "last_error": self.last_error,
                "errors_in_row": self.errors_in_row,
            }
        )
        async_dispatcher_send(self.hass, SIGNAL_STATUS)

    def _plan_next(self) -> None:
        base = self.last_sync or (dt_util.now() - SCHEDULE_EVERY + timedelta(minutes=15))
        gap = SCHEDULE_EVERY
        if self.status == "error":
            gap = timedelta(hours=1) if self.errors_in_row < 3 else timedelta(hours=6)
        self.next_check = base + gap + timedelta(minutes=random.randint(0, 30))

    # ---------- when to check ----------
    def _quiet(self, now: datetime) -> bool:
        return now.hour >= QUIET_START_HOUR or now.hour < QUIET_END_HOUR

    async def _orders_on_the_way(self) -> bool:
        state = self.hass.states.get(self.todo)
        try:
            return state is not None and int(state.state) > 0
        except (TypeError, ValueError):
            return False

    async def async_tick(self, _now: datetime | None = None) -> None:
        now = dt_util.now()
        if self.status == "needs_sign_in" or self._quiet(now):
            return
        if self.next_check and now < self.next_check:
            return
        if not await self._orders_on_the_way():
            self.next_check = now + timedelta(minutes=30)
            return
        await self.async_sync("schedule")

    @callback
    def request_soon(self, reason: str, delay: float = 120) -> None:
        """Ask for a check in a little while (merged with any check already pending)."""
        if self.status == "needs_sign_in" or self._pending is not None:
            return
        now = dt_util.now()
        if self.last_sync and now - self.last_sync < MIN_GAP:
            delay = max(delay, (self.last_sync + MIN_GAP - now).total_seconds())

        async def _run(_t: datetime) -> None:
            self._pending = None
            await self.async_sync(reason)

        self._pending = async_call_later(self.hass, delay, _run)

    @callback
    def cancel(self) -> None:
        if self._pending is not None:
            self._pending()
            self._pending = None

    # ---------- the check ----------
    async def async_sync(self, reason: str) -> None:
        from .client import HelperError, call

        if self._lock.locked() or self.status == "needs_sign_in":
            return
        async with self._lock:
            now = dt_util.now()
            if self.last_sync and now - self.last_sync < timedelta(minutes=2):
                return
            self.last_sync = now
            _LOGGER.debug("Checking Your Orders (%s)", reason)
            try:
                data = await call(
                    self.hass, self.entry.data[CONF_HELPER_URL], "/orders", self.entry.data[CONF_TOKEN]
                )
            except HelperError as err:
                if err.kind in ("needs_sign_in", "not_paired"):
                    await self._needs_sign_in(err)
                else:
                    await self._failed(err.detail or err.kind)
                return

            orders = data.get("orders") or []
            self.orders_seen = len(orders)
            self.updated = await self._write(orders, now)
            self.status = "ok"
            self.last_error = None
            self.errors_in_row = 0
            self._plan_next()
            await self._save()

    async def _failed(self, msg: str) -> None:
        self.status = "error"
        self.last_error = msg[:300]
        self.errors_in_row += 1
        self._plan_next()
        await self._save()

    async def _needs_sign_in(self, err: Exception) -> None:
        detail = (getattr(err, "detail", "") or "").lower()
        if getattr(err, "kind", "") == "not_paired":
            why = "The Amazon helper on Zima no longer recognises Home Assistant"
        elif "otp" in detail or "code" in detail:
            why = "Amazon asked for a code from your authenticator app"
        elif "captcha" in detail or "puzzle" in detail:
            why = "Amazon showed a picture puzzle"
        else:
            why = "Amazon asked you to sign in again"
        self.status = "needs_sign_in"
        self.last_error = why
        self.cancel()
        await self._save()
        persistent_notification.async_create(
            self.hass,
            f"{why}, so Amazon Order Sync has paused. Nothing more will be sent to Amazon until you sign in "
            "again: Settings > Devices & services > Amazon Order Sync > Reconfigure.",
            title="Amazon Order Sync paused",
            notification_id=NOTIFY_ID,
        )
        self.entry.async_start_reauth(self.hass)

    async def _write(self, orders: list[dict[str, Any]], now: datetime) -> list[str]:
        resp = await self.hass.services.async_call(
            "todo", "get_items", {"entity_id": self.todo}, blocking=True, return_response=True
        )
        have = {i.get("summary"): i for i in ((resp or {}).get(self.todo) or {}).get("items", [])}
        changed: list[str] = []
        today = now.date()
        planned = []
        for order in orders:
            num = order.get("num") or ""
            if not num:
                continue
            existing = have.get(num)
            if existing is None and not (placed_recently(order, today, NEW_ORDER_DAYS) and worth_adding(order, today)):
                continue
            planned.append((num, existing, *merge(order, existing, now)))

        # Short names for any product title that doesn't have one yet (one AI request per sync at most).
        need = [i["n"] for _n, _e, d, _s, _du in planned for i in d["items"] if not i.get("sn")]
        if need:
            shorts = await self.short_names.lookup(need)
            for _n, _e, d, _s, _du in planned:
                for i in d["items"]:
                    if not i.get("sn") and shorts.get(i["n"]):
                        i["sn"] = shorts[i["n"]]

        for num, existing, desc, status, due in planned:
            text = json.dumps(desc, separators=(",", ":"))
            if existing is not None:
                try:
                    old_upd = (json.loads(existing.get("description") or "{}") or {}).get("upd")
                except (TypeError, ValueError):
                    old_upd = None
                if old_upd == desc["upd"] and status == existing.get("status"):
                    continue  # nothing new for this order
                data: dict[str, Any] = {"item": existing["uid"], "description": text, "status": status}
                if due:
                    data["due_date"] = due
                await self.hass.services.async_call("todo", "update_item", data, target={"entity_id": self.todo}, blocking=True)
            else:
                data = {"item": num, "description": text}
                if due:
                    data["due_date"] = due
                await self.hass.services.async_call("todo", "add_item", data, target={"entity_id": self.todo}, blocking=True)
                if status == "completed":
                    await self.hass.services.async_call(
                        "todo", "update_item", {"item": num, "status": "completed"},
                        target={"entity_id": self.todo}, blocking=True,
                    )
            changed.append(num)
        return changed

    async def async_signed_in(self) -> None:
        """Called after a successful (re)sign-in from the setup form."""
        persistent_notification.async_dismiss(self.hass, NOTIFY_ID)
        self.status = "waiting"
        self.last_error = None
        self.errors_in_row = 0
        await self._save()


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    sync = OrderSync(hass, entry)
    await sync.async_load()
    if sync.status == "needs_sign_in" and entry.data.get("signed_in_at") and (
        not sync.last_sync or entry.data["signed_in_at"] > sync.last_sync.isoformat()
    ):
        await sync.async_signed_in()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = sync

    entry.async_on_unload(async_track_time_interval(hass, sync.async_tick, timedelta(minutes=15)))

    @callback
    def _email(event: Event) -> None:
        subject = str(event.data.get("subject") or "").lower()
        text = str(event.data.get("text") or "").lower()
        if "amazon" in subject or "amazon.com" in text or "amazon" in str(event.data.get("sender") or "").lower():
            sync.request_soon("email")

    entry.async_on_unload(hass.bus.async_listen("imap_content", _email))
    entry.async_on_unload(sync.cancel)

    async def _refresh(call: ServiceCall) -> None:
        sync.request_soon("manual", delay=1)

    if not hass.services.has_service(DOMAIN, SERVICE_REFRESH):
        hass.services.async_register(DOMAIN, SERVICE_REFRESH, _refresh, schema=vol.Schema({}))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    if sync.status != "needs_sign_in" and (sync.last_sync is None or sync.status == "waiting"):
        sync.request_soon("first check after sign-in", delay=30)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    sync: OrderSync | None = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if sync:
        sync.cancel()
    if not hass.data.get(DOMAIN):
        hass.services.async_remove(DOMAIN, SERVICE_REFRESH)
    return ok


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Removing the integration tells the helper on Zima to delete the saved Amazon login and session."""
    from .client import HelperError, call

    try:
        await call(hass, entry.data[CONF_HELPER_URL], "/forget", entry.data.get(CONF_TOKEN))
    except HelperError as err:
        _LOGGER.warning("Couldn't ask the Amazon helper to forget the login: %s", err)
    await hass.async_add_executor_job(shutil.rmtree, store_dir(hass), True)
    await Store(hass, 1, f"{DOMAIN}.state").async_remove()
    persistent_notification.async_dismiss(hass, NOTIFY_ID)
