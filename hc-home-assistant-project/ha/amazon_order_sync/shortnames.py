"""Short everyday names for long Amazon product titles ("Organic Chicken Broth").

Asks the Gemini AI task once per sync for any new titles, keeps every answer
in a small cache so the same product is never asked about twice, and falls
back to a simple trim if the AI is busy.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
AI_TASKS = ("ai_task.google_ai_task", "ai_task.google_ai_task_backup")
SHORT_ENOUGH = 28


def trim(name: str) -> str:
    """Fallback: the part before the first comma, bar or dash, at most ~5 words."""
    text = re.split(r",|\||\s[-–—]\s|\(|:", name or "", maxsplit=1)[0].strip()
    words = text.split()
    while len(" ".join(words)) > 34 and len(words) > 2:
        words.pop()
    return " ".join(words) or (name or "")[:34]


class ShortNames:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store = Store(hass, 1, f"{DOMAIN}.short_names")
        self._cache: dict[str, str] | None = None

    async def _load(self) -> dict[str, str]:
        if self._cache is None:
            self._cache = dict(await self._store.async_load() or {})
        return self._cache

    async def lookup(self, names: list[str]) -> dict[str, str]:
        cache = await self._load()
        out: dict[str, str] = {}
        need = []
        for n in dict.fromkeys(names):
            if len(n) <= SHORT_ENOUGH:
                out[n] = n
            elif n in cache:
                out[n] = cache[n]
            else:
                need.append(n)
        if need:
            got = await self._ask_ai(need)
            for n in need:
                short = got.get(n) or trim(n)
                out[n] = short
                if n in got:
                    cache[n] = short
            if len(cache) > 600:  # keep the newest answers only
                for k in list(cache)[: len(cache) - 600]:
                    cache.pop(k, None)
            await self._store.async_save(cache)
        return out

    async def _ask_ai(self, names: list[str]) -> dict[str, str]:
        numbered = "\n".join(f"{i + 1}. {n}" for i, n in enumerate(names))
        instructions = (
            "Give each Amazon product below a short everyday name, the way a person would say it at home: "
            "2 to 4 words, at most 28 characters, Title Case. Keep the brand only when people call the product by it "
            "(for example \"Swanson Chicken Broth\", \"Honey in the Raw\"). Drop sizes, counts, colours and marketing words. "
            "Examples: \"20FT High Ceiling Duster Kit, High Reach Duster with Extension Pole...\" -> \"Ceiling Duster Kit\"; "
            "\"Campbell's Condensed Gluten Free Cream of Mushroom Soup, 10.5 oz Can\" -> \"Cream of Mushroom Soup\".\n"
            f"Answer with exactly {len(names)} names in the same order, separated by \" || \".\n\n{numbered}"
        )
        for entity in AI_TASKS:
            if not self.hass.states.get(entity):
                continue
            try:
                resp: Any = await self.hass.services.async_call(
                    "ai_task",
                    "generate_data",
                    {
                        "entity_id": entity,
                        "task_name": "amazon_short_names",
                        "instructions": instructions,
                        "structure": {"names": {"selector": {"text": {}}}},
                    },
                    blocking=True,
                    return_response=True,
                )
            except Exception as err:  # noqa: BLE001 - AI busy: try the next one, then fall back
                _LOGGER.debug("Short names from %s failed: %s", entity, err)
                continue
            text = str(((resp or {}).get("data") or {}).get("names") or "")
            parts = [p.strip().strip('"').strip() for p in text.split("||")]
            if len(parts) == len(names) and all(parts):
                return {n: p[:40] for n, p in zip(names, parts)}
            _LOGGER.debug("Short names from %s had the wrong shape: %s", entity, text[:200])
        return {}
