"""Talks to the Amazon helper on Zima, which does the actual Amazon sign-in and page read."""

from __future__ import annotations

import asyncio
from typing import Any

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

# A sign-in with the hidden browser can take a minute or two.
_TIMEOUT = aiohttp.ClientTimeout(total=300)


class HelperError(Exception):
    def __init__(self, kind: str, detail: str = "") -> None:
        super().__init__(detail or kind)
        self.kind = kind
        self.detail = detail


async def call(hass: HomeAssistant, url: str, path: str, token: str | None = None,
               body: dict[str, Any] | None = None) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        async with async_get_clientsession(hass).post(
            url.rstrip("/") + path, json=body or {}, headers=headers, timeout=_TIMEOUT
        ) as resp:
            if resp.status == 401:
                raise HelperError("not_paired", "The helper on Zima is paired with a different setup.")
            data = await resp.json(content_type=None)
    except HelperError:
        raise
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as err:
        raise HelperError("no_helper", f"Couldn't reach the Amazon helper at {url} ({type(err).__name__}).") from err
    if not isinstance(data, dict):
        raise HelperError("no_helper", "The Amazon helper sent an unexpected answer.")
    if not data.get("ok"):
        raise HelperError(str(data.get("error") or "unknown"), str(data.get("detail") or ""))
    return data
