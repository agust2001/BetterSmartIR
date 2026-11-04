"""IR emitters. This is the only module that knows about Broadlink."""

import asyncio
from typing import Any

from homeassistant.components.remote import DOMAIN as REMOTE_DOMAIN, SERVICE_SEND_COMMAND
from homeassistant.const import ATTR_ENTITY_ID, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er

from .const import COMMAND_DELAY

EMITTER_PLATFORM = "broadlink"
COMMAND_PREFIX = "b64:"

ERROR_NOT_FOUND = "emitter_not_found"
ERROR_UNAVAILABLE = "emitter_unavailable"
ERROR_OFF = "emitter_off"
ERROR_SEND_FAILED = "send_failed"


class EmitterError(Exception):
    """A command could not be sent. The code is part of the panel contract."""

    def __init__(self, code: str) -> None:
        """Store the error code."""
        super().__init__(code)
        self.code = code


@callback
def async_is_emitter(hass: HomeAssistant, entity_id: str) -> bool:
    """Return whether an entity is a supported emitter."""
    entry = er.async_get(hass).async_get(entity_id)
    return (
        entry is not None
        and entry.domain == REMOTE_DOMAIN
        and entry.platform == EMITTER_PLATFORM
        and entry.disabled_by is None
    )


@callback
def async_list_emitters(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Return the supported emitters."""
    emitters = []
    for entry in er.async_get(hass).entities.values():
        if not async_is_emitter(hass, entry.entity_id):
            continue
        state = hass.states.get(entry.entity_id)
        emitters.append(
            {
                "entity_id": entry.entity_id,
                "name": state.name if state else entry.entity_id,
                "state": state.state if state else STATE_UNAVAILABLE,
            }
        )
    return sorted(emitters, key=lambda emitter: emitter["name"].casefold())


@callback
def _async_check_ready(hass: HomeAssistant, entity_id: str) -> None:
    """Raise if the emitter cannot send.

    Broadlink only logs a warning when the remote is off, without raising, so the
    command would count as sent even though nothing was emitted.
    """
    if not async_is_emitter(hass, entity_id):
        raise EmitterError(ERROR_NOT_FOUND)
    state = hass.states.get(entity_id)
    if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        raise EmitterError(ERROR_UNAVAILABLE)
    if state.state != STATE_ON:
        raise EmitterError(ERROR_OFF)


async def async_send(
    hass: HomeAssistant, entity_id: str, commands: list[str]
) -> None:
    """Send commands in order, untouched, with a delay between them."""
    _async_check_ready(hass, entity_id)
    for position, command in enumerate(commands):
        if position:
            await asyncio.sleep(COMMAND_DELAY)
        try:
            await hass.services.async_call(
                REMOTE_DOMAIN,
                SERVICE_SEND_COMMAND,
                {ATTR_ENTITY_ID: entity_id, "command": [f"{COMMAND_PREFIX}{command}"]},
                blocking=True,
            )
        except HomeAssistantError as err:
            raise EmitterError(ERROR_SEND_FAILED) from err
