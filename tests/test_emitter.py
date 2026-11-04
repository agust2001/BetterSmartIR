"""Tests for the emitters."""

from unittest.mock import patch

import pytest

from custom_components.better_smartir import emitter as emitter_module
from custom_components.better_smartir.emitter import (
    ERROR_NOT_FOUND,
    ERROR_OFF,
    ERROR_SEND_FAILED,
    ERROR_UNAVAILABLE,
    EmitterError,
    async_list_emitters,
    async_send,
)
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er

from .conftest import EMITTER


def test_lists_only_broadlink_remotes(
    hass: HomeAssistant, entity_registry: er.EntityRegistry, emitter: str
) -> None:
    """Other remotes and other domains are left out."""
    entity_registry.async_get_or_create("remote", "other", "tv")
    entity_registry.async_get_or_create("switch", "broadlink", "plug")

    assert async_list_emitters(hass) == [
        {"entity_id": EMITTER, "name": "Living", "state": "on"}
    ]


async def test_sends_the_command_untouched_with_the_prefix(
    hass: HomeAssistant, emitter: str, send_calls: list[ServiceCall]
) -> None:
    """The Base64 packet reaches Broadlink as is."""
    await async_send(hass, EMITTER, ["JgCSAA=="])

    assert len(send_calls) == 1
    assert send_calls[0].data == {"entity_id": EMITTER, "command": ["b64:JgCSAA=="]}


async def test_waits_between_commands(
    hass: HomeAssistant, emitter: str, send_calls: list[ServiceCall]
) -> None:
    """Commands go in order, with the delay between them."""
    with patch.object(emitter_module.asyncio, "sleep") as sleep:
        await async_send(hass, EMITTER, ["A", "B"])

    assert [call.data["command"] for call in send_calls] == [["b64:A"], ["b64:B"]]
    sleep.assert_awaited_once_with(0.5)


async def test_unknown_emitter(hass: HomeAssistant, send_calls: list[ServiceCall]) -> None:
    """An entity that is not an emitter is rejected."""
    with pytest.raises(EmitterError) as error:
        await async_send(hass, "remote.unknown", ["A"])

    assert error.value.code == ERROR_NOT_FOUND
    assert not send_calls


@pytest.mark.parametrize(
    ("state", "code"),
    [("unavailable", ERROR_UNAVAILABLE), ("unknown", ERROR_UNAVAILABLE), ("off", ERROR_OFF)],
)
async def test_does_not_call_the_service_if_the_emitter_is_not_on(
    hass: HomeAssistant,
    emitter: str,
    send_calls: list[ServiceCall],
    state: str,
    code: str,
) -> None:
    """Broadlink would cancel it silently, so it never counts as sent."""
    hass.states.async_set(EMITTER, state)

    with pytest.raises(EmitterError) as error:
        await async_send(hass, EMITTER, ["A"])

    assert error.value.code == code
    assert not send_calls


async def test_send_failure(hass: HomeAssistant, emitter: str) -> None:
    """A failure of the service is reported."""

    async def fail(call: ServiceCall) -> None:
        raise HomeAssistantError("no network")

    hass.services.async_register("remote", "send_command", fail)

    with pytest.raises(EmitterError) as error:
        await async_send(hass, EMITTER, ["A"])

    assert error.value.code == ERROR_SEND_FAILED
