"""Setup and re-sign-in forms.

The Amazon email, password and authenticator key typed here are passed once to
the Amazon helper on Zima, which keeps them. Home Assistant only keeps the
helper's address and a pairing token.
"""

from __future__ import annotations

from collections.abc import Mapping
import logging
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_PASSWORD, CONF_USERNAME
from homeassistant.helpers.selector import (
    EntitySelector,
    EntitySelectorConfig,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)
from homeassistant.util import dt as dt_util

from .client import HelperError, call
from .const import (
    CONF_HELPER_URL,
    CONF_OTP_CODE,
    CONF_OTP_SECRET,
    CONF_TODO_ENTITY,
    CONF_TOKEN,
    DEFAULT_HELPER_URL,
    DEFAULT_TODO,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

_PW = TextSelector(TextSelectorConfig(type=TextSelectorType.PASSWORD))
_TEXT = TextSelector(TextSelectorConfig(type=TextSelectorType.TEXT))

_KINDS = {
    "otp": "need_code",
    "captcha": "captcha",
    "device": "device",
    "challenge": "challenge",
    "other": "challenge",
    "auth": "auth",
    "cannot_connect": "cannot_connect",
    "no_helper": "no_helper",
    "not_paired": "not_paired",
}


async def _sign_in(hass, url: str, token: str | None, body: dict[str, Any]) -> tuple[str | None, str, str | None]:
    """Ask the helper to sign in. Returns (form error key or None, Amazon's message, new token)."""
    try:
        data = await call(hass, url, "/signin", token, body)
    except HelperError as err:
        _LOGGER.warning("Amazon sign-in through the helper failed (%s): %s", err.kind, err.detail)
        detail = f"Amazon said: {err.detail}" if err.detail and err.kind not in ("no_helper", "not_paired") else err.detail
        return _KINDS.get(err.kind, "unknown"), detail, None
    return None, "", data.get("token")


class AmazonOrderSyncFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1
    _detail = ""

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            url = user_input[CONF_HELPER_URL].strip().rstrip("/")
            username = user_input[CONF_USERNAME].strip()
            error, self._detail, token = await _sign_in(
                self.hass,
                url,
                None,
                {
                    "username": username,
                    "password": user_input[CONF_PASSWORD],
                    "otp_secret": (user_input.get(CONF_OTP_SECRET) or "").replace(" ", ""),
                    "otp_code": (user_input.get(CONF_OTP_CODE) or "").strip(),
                },
            )
            if error is None and token:
                await self.async_set_unique_id(username.lower())
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=f"Amazon ({username})",
                    data={
                        CONF_HELPER_URL: url,
                        CONF_TOKEN: token,
                        CONF_USERNAME: username,
                        CONF_TODO_ENTITY: user_input.get(CONF_TODO_ENTITY) or DEFAULT_TODO,
                        "signed_in_at": dt_util.now().isoformat(),
                    },
                )
            errors["base"] = error or "not_paired"

        defaults = user_input or {}
        schema = vol.Schema(
            {
                vol.Required(CONF_HELPER_URL, default=defaults.get(CONF_HELPER_URL, DEFAULT_HELPER_URL)): str,
                vol.Required(CONF_USERNAME, default=defaults.get(CONF_USERNAME, "")): str,
                vol.Required(CONF_PASSWORD): _PW,
                vol.Optional(CONF_OTP_SECRET): _PW,
                vol.Optional(CONF_OTP_CODE): _TEXT,
                vol.Optional(CONF_TODO_ENTITY, default=defaults.get(CONF_TODO_ENTITY, DEFAULT_TODO)): EntitySelector(
                    EntitySelectorConfig(domain="todo")
                ),
            }
        )
        return self.async_show_form(
            step_id="user", data_schema=schema, errors=errors, description_placeholders={"detail": self._detail}
        )

    async def async_step_reauth(self, entry_data: Mapping[str, Any]) -> ConfigFlowResult:
        return await self.async_step_reauth_confirm()

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return await self.async_step_reauth_confirm(user_input)

    def _entry(self):
        if self.source == "reconfigure":
            return self._get_reconfigure_entry()
        return self._get_reauth_entry()

    async def async_step_reauth_confirm(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        entry = self._entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            error, self._detail, _token = await _sign_in(
                self.hass,
                entry.data[CONF_HELPER_URL],
                entry.data[CONF_TOKEN],
                {
                    "username": entry.data[CONF_USERNAME],
                    "password": user_input.get(CONF_PASSWORD) or "",
                    "otp_secret": (user_input.get(CONF_OTP_SECRET) or "").replace(" ", ""),
                    "otp_code": (user_input.get(CONF_OTP_CODE) or "").strip(),
                },
            )
            if error is None:
                return self.async_update_reload_and_abort(
                    entry, data_updates={"signed_in_at": dt_util.now().isoformat()}
                )
            errors["base"] = error
        schema = vol.Schema(
            {
                vol.Optional(CONF_PASSWORD): _PW,
                vol.Optional(CONF_OTP_SECRET): _PW,
                vol.Optional(CONF_OTP_CODE): _TEXT,
            }
        )
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=schema,
            errors=errors,
            description_placeholders={"account": entry.data[CONF_USERNAME], "detail": self._detail},
        )
