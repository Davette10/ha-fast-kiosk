"""One status sensor: is Amazon Order Sync working, and when it last looked."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DOMAIN, SIGNAL_STATUS

STATES = ["waiting", "ok", "error", "needs_sign_in"]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    async_add_entities([SyncStatus(hass.data[DOMAIN][entry.entry_id], entry)])


class SyncStatus(SensorEntity):
    _attr_has_entity_name = True
    _attr_name = "Status"
    _attr_icon = "mdi:package-variant-closed-check"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = STATES
    _attr_should_poll = False
    _attr_translation_key = "status"

    def __init__(self, sync, entry: ConfigEntry) -> None:
        self._sync = sync
        self._attr_unique_id = f"{entry.entry_id}_status"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Amazon Order Sync",
            "manufacturer": "amazon-orders (open source)",
            "entry_type": "service",
        }

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_STATUS, self._changed))

    @callback
    def _changed(self) -> None:
        self.async_write_ha_state()

    @property
    def native_value(self) -> str:
        return self._sync.status

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        s = self._sync
        return {
            "last_check": s.last_sync.isoformat() if s.last_sync else None,
            "next_check": s.next_check.isoformat() if s.next_check else None,
            "orders_seen": s.orders_seen,
            "orders_updated": s.updated,
            "last_error": s.last_error,
        }
