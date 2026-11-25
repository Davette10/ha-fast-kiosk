"""Turn what Your Orders shows into the Amazon Orders list format.

Each order lives in the to-do list as one item: summary = order number,
due = arrival day, description = JSON
{items:[{n,img,a}], cnt, s, eta, eta_txt, total, carrier, h:{status: time}, upd}.
The email automation writes the same format; this adds the real product
names, photos and product IDs, and never moves a status backwards.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
import json
import re
from typing import Any

RANK = {"ordered": 1, "shipped": 2, "delayed": 2, "out": 3, "delivered": 4, "cancelled": 9, "return": 9}
DONE = {"delivered", "cancelled", "return"}

_WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
_MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"], start=1)}
_MONTHS.update({k[:3]: v for k, v in list(_MONTHS.items())})
_WINDOW = re.compile(r"(by \d{1,2}(:\d{2})?\s*[ap]\.?m\.?|\d{1,2}(:\d{2})?\s*[ap]?\.?m?\.?\s*[-–]\s*\d{1,2}(:\d{2})?\s*[ap]\.?m\.?)", re.I)


def shipment_state(text: str, tracked: bool) -> str:
    t = (text or "").lower()
    if not t:
        return "shipped" if tracked else "ordered"
    if "cancel" in t:
        return "cancelled"
    if "return" in t or "refund" in t:
        return "return"
    if "out for delivery" in t:
        return "out"
    if t.startswith("delivered") or "was delivered" in t or "package delivered" in t:
        return "delivered"
    if "late" in t or "delay" in t or "now expected" in t or "now arriving" in t:
        return "delayed"
    if "shipped" in t or "on the way" in t or "in transit" in t:
        return "shipped"
    if "arriving" in t or "expected" in t:
        return "shipped" if tracked else "ordered"
    return "shipped" if tracked else "ordered"


def order_state(order: dict[str, Any]) -> str:
    if order.get("cancelled"):
        return "cancelled"
    states = [shipment_state(s.get("status", ""), s.get("tracked", False)) for s in order.get("shipments") or []]
    if not states:
        return "ordered"
    if all(s == "delivered" for s in states):
        return "delivered"
    if all(s in DONE for s in states):
        return "return" if "return" in states else "cancelled" if "cancelled" in states else "delivered"
    for s in ("out", "delayed", "shipped"):
        if s in states:
            return s
    return "delivered" if "delivered" in states else "ordered"


def parse_day(text: str, today: date) -> date | None:
    t = (text or "").lower()
    if "today" in t:
        return today
    if "tomorrow" in t:
        return today + timedelta(days=1)
    if "yesterday" in t:
        return today - timedelta(days=1)
    for i, name in enumerate(_WEEKDAYS):
        if re.search(rf"\b{name}\b", t):
            ahead = (i - today.weekday()) % 7
            if t.startswith("delivered"):
                return today - timedelta(days=(today.weekday() - i) % 7)
            return today + timedelta(days=ahead)
    m = re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b", t)
    if m:
        month, day = _MONTHS[m.group(1)], int(m.group(2))
        try:
            guess = date(today.year, month, day)
        except ValueError:
            return None
        # Late-December orders arriving in January, and the reverse.
        if (guess - today).days > 200:
            guess = date(today.year - 1, month, day)
        elif (today - guess).days > 200:
            guess = date(today.year + 1, month, day)
        return guess
    return None


def window(text: str) -> str:
    m = _WINDOW.search(text or "")
    return m.group(1).strip() if m else ""


def merge(order: dict[str, Any], existing: dict[str, Any] | None, now: datetime) -> tuple[dict[str, Any], str, str | None]:
    """Return (description dict, todo status, due date or None) for one order."""
    old: dict[str, Any] = {}
    if existing:
        try:
            old = json.loads(existing.get("description") or "{}") or {}
        except (TypeError, ValueError):
            old = {}

    new_s = order_state(order)
    old_s = old.get("s") or ""
    if old_s and new_s not in ("cancelled", "return") and RANK.get(new_s, 0) < RANK.get(old_s, 0):
        new_s = old_s

    known = {}
    for o in old.get("items") or []:
        if isinstance(o, dict) and o.get("sn"):
            known[o.get("n")] = o["sn"]
            if o.get("a"):
                known[o["a"]] = o["sn"]
    items = [
        {
            "n": i["n"],
            "img": i.get("img") or "",
            **({"a": i["a"]} if i.get("a") else {}),
            **({"sn": known.get(i.get("a")) or known.get(i["n"])} if (known.get(i.get("a")) or known.get(i["n"])) else {}),
        }
        for i in order.get("items") or []
    ] or list(old.get("items") or [])

    status_text = next((s.get("status") for s in order.get("shipments") or [] if s.get("status")), "")
    eta = old.get("eta") or ""
    day = parse_day(status_text, now.date())
    if day and (not eta or new_s != old_s or "arriving" in status_text.lower() or "delivered" in status_text.lower()):
        eta = day.isoformat()
    eta_txt = window(status_text) or old.get("eta_txt") or ""

    hist = dict(old.get("h") or {})
    if new_s not in hist:
        when = now
        if new_s == "delivered" and day and day < now.date():
            # Amazon only gives the day ("Delivered November 6"); keep that day, not today.
            when = datetime.combine(day, time(12, 0), tzinfo=now.tzinfo)
        hist[new_s] = when.isoformat()

    desc = {
        "items": items[:12],
        "cnt": max(int(order.get("cnt") or 0), int(old.get("cnt") or 0), len(items)),
        "s": new_s,
        "eta": eta,
        "eta_txt": eta_txt,
        "total": order.get("total") or old.get("total") or "",
        "carrier": old.get("carrier") or "",
        "h": hist,
        "src": "amazon",
        "upd": old.get("upd") or now.isoformat(),
    }
    changed = {k: v for k, v in desc.items() if k != "upd"} != {k: old.get(k) for k in desc if k != "upd"}
    if changed:
        desc["upd"] = now.isoformat()
    status = "completed" if new_s in DONE else "needs_action"
    return desc, status, (eta or None)


def worth_adding(order: dict[str, Any], today: date) -> bool:
    """An order no email told us about: add it only while it's still on its way (or just arrived)."""
    state = order_state(order)
    if state in ("cancelled", "return"):
        return False
    if state == "delivered":
        status_text = next((s.get("status") for s in order.get("shipments") or [] if s.get("status")), "")
        day = parse_day(status_text, today)
        return day is not None and (today - day).days <= 1
    return True


def placed_recently(order: dict[str, Any], today: date, days: int) -> bool:
    try:
        placed = date.fromisoformat(order.get("placed") or "")
    except ValueError:
        return False
    return (today - placed).days <= days
