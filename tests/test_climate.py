"""Tests for the climate entity."""

from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    mock_restore_cache,
)

from homeassistant.components.climate import ClimateEntityFeature, HVACMode
from homeassistant.core import HomeAssistant, ServiceCall, State
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er

from .conftest import EMITTER, add_climate, climate_subentry

ENTITY = "climate.living"
# Has an "on" command and modes that Home Assistant does not know.
CODE_WITH_ON = 1089
CODE_WITH_SWING = 1030


async def set_mode(hass: HomeAssistant, mode: str) -> None:
    """Call climate.set_hvac_mode."""
    await hass.services.async_call(
        "climate",
        "set_hvac_mode",
        {"entity_id": ENTITY, "hvac_mode": mode},
        blocking=True,
    )


@pytest.fixture
async def living(hass: HomeAssistant, hub: MockConfigEntry, emitter: str):
    """Add a climate with the default code."""
    return await add_climate(hass, hub)


async def test_entity_appears_and_uses_the_subentry_as_identity(
    hass: HomeAssistant, living, entity_registry: er.EntityRegistry
) -> None:
    """The entity exists after the reload, identified by the subentry."""
    entry = entity_registry.async_get(ENTITY)

    assert entry.unique_id == living.subentry_id
    assert entry.config_subentry_id == living.subentry_id


async def test_offers_the_values_of_the_code(hass: HomeAssistant, living) -> None:
    """Modes, temperatures and fan come from the code."""
    state = hass.states.get(ENTITY)

    assert state.state == HVACMode.OFF
    assert state.attributes["hvac_modes"] == ["off", "heat", "cool", "fan_only"]
    assert state.attributes["fan_modes"] == ["low", "mid", "high", "auto"]
    assert state.attributes["min_temp"] == 16
    assert state.attributes["max_temp"] == 30
    assert not state.attributes["supported_features"] & ClimateEntityFeature.SWING_MODE


async def test_ignores_unknown_modes(
    hass: HomeAssistant, hub: MockConfigEntry, emitter: str
) -> None:
    """Modes Home Assistant does not know are not offered."""
    await add_climate(hass, hub, climate_subentry(code=CODE_WITH_ON))

    assert hass.states.get(ENTITY).attributes["hvac_modes"] == [
        "off",
        "heat",
        "fan_only",
        "auto",
    ]


async def test_offers_swing_if_the_code_has_it(
    hass: HomeAssistant,
    hub: MockConfigEntry,
    emitter: str,
    send_calls: list[ServiceCall],
) -> None:
    """Swing is part of the command."""
    await add_climate(hass, hub, climate_subentry(code=CODE_WITH_SWING))

    state = hass.states.get(ENTITY)
    assert state.attributes["supported_features"] & ClimateEntityFeature.SWING_MODE
    assert "Top" in state.attributes["swing_modes"]

    await set_mode(hass, "cool")
    await hass.services.async_call(
        "climate",
        "set_swing_mode",
        {"entity_id": ENTITY, "swing_mode": "Top"},
        blocking=True,
    )

    assert hass.states.get(ENTITY).attributes["swing_mode"] == "Top"
    assert len(send_calls) == 2


async def test_turn_on_sends_on_with_its_delay(
    hass: HomeAssistant,
    hub: MockConfigEntry,
    emitter: str,
    send_calls: list[ServiceCall],
) -> None:
    """Turning on sends "on" and then the state; later changes only the state."""
    await add_climate(hass, hub, climate_subentry(code=CODE_WITH_ON))

    with patch("custom_components.better_smartir.emitter.asyncio.sleep") as sleep:
        await set_mode(hass, "heat")
        assert len(send_calls) == 2
        sleep.assert_awaited_once_with(0.5)

        await set_mode(hass, "auto")

    assert len(send_calls) == 3
    assert hass.states.get(ENTITY).state == "auto"


async def test_turn_off(
    hass: HomeAssistant, living, send_calls: list[ServiceCall]
) -> None:
    """Turning off sends the off command."""
    await set_mode(hass, "cool")
    await set_mode(hass, "off")

    assert len(send_calls) == 2
    assert hass.states.get(ENTITY).state == "off"


async def test_turn_on_uses_the_last_mode(
    hass: HomeAssistant, living, send_calls: list[ServiceCall]
) -> None:
    """climate.turn_on goes back to the last mode."""
    await set_mode(hass, "cool")
    await set_mode(hass, "off")

    await hass.services.async_call(
        "climate", "turn_on", {"entity_id": ENTITY}, blocking=True
    )

    assert hass.states.get(ENTITY).state == "cool"


async def test_changes_while_off_are_stored_without_sending(
    hass: HomeAssistant, living, send_calls: list[ServiceCall]
) -> None:
    """Changing the temperature must not turn the air conditioner on."""
    await hass.services.async_call(
        "climate",
        "set_temperature",
        {"entity_id": ENTITY, "temperature": 24},
        blocking=True,
    )

    assert not send_calls
    state = hass.states.get(ENTITY)
    assert state.state == "off"
    assert state.attributes["temperature"] == 24


async def test_temperature_and_fan_are_sent(
    hass: HomeAssistant, living, send_calls: list[ServiceCall]
) -> None:
    """Each change sends the whole state."""
    await set_mode(hass, "cool")
    await hass.services.async_call(
        "climate",
        "set_temperature",
        {"entity_id": ENTITY, "temperature": 24},
        blocking=True,
    )
    await hass.services.async_call(
        "climate",
        "set_fan_mode",
        {"entity_id": ENTITY, "fan_mode": "high"},
        blocking=True,
    )

    assert len(send_calls) == 3
    assert send_calls[1].data["command"] != send_calls[2].data["command"]
    state = hass.states.get(ENTITY)
    assert state.attributes["temperature"] == 24
    assert state.attributes["fan_mode"] == "high"


async def test_emitter_off_is_an_error_and_keeps_the_state(
    hass: HomeAssistant, living, send_calls: list[ServiceCall]
) -> None:
    """Nothing was emitted, so the entity must not change."""
    hass.states.async_set(EMITTER, "off")

    with pytest.raises(HomeAssistantError) as error:
        await set_mode(hass, "cool")

    assert error.value.translation_key == "emitter_off"
    assert hass.states.get(ENTITY).state == "off"
    assert not send_calls


async def test_missing_combination_is_an_error_and_keeps_the_state(
    hass: HomeAssistant, living, send_calls: list[ServiceCall]
) -> None:
    """A half degree does not exist in this code."""
    await set_mode(hass, "cool")

    with pytest.raises(HomeAssistantError) as error:
        await hass.services.async_call(
            "climate",
            "set_temperature",
            {"entity_id": ENTITY, "temperature": 24.5},
            blocking=True,
        )

    assert error.value.translation_key == "combination_not_available"
    assert hass.states.get(ENTITY).attributes["temperature"] == 16


async def test_restores_the_last_state(
    hass: HomeAssistant, hub: MockConfigEntry, emitter: str
) -> None:
    """The last state is kept, without sending anything."""
    mock_restore_cache(
        hass,
        [
            State(
                ENTITY,
                "cool",
                {"temperature": 24, "fan_mode": "high", "last_on_mode": "cool"},
            )
        ],
    )

    await add_climate(hass, hub)

    state = hass.states.get(ENTITY)
    assert state.state == "cool"
    assert state.attributes["temperature"] == 24
    assert state.attributes["fan_mode"] == "high"


async def test_invalid_restored_values_use_the_defaults(
    hass: HomeAssistant, hub: MockConfigEntry, emitter: str
) -> None:
    """Values of another code are discarded."""
    mock_restore_cache(
        hass, [State(ENTITY, "dry", {"temperature": 99, "fan_mode": "turbo"})]
    )

    await add_climate(hass, hub)

    state = hass.states.get(ENTITY)
    assert state.state == "off"
    assert state.attributes["temperature"] == 16
    assert state.attributes["fan_mode"] == "low"


async def test_unavailable_if_the_emitter_is_unavailable(
    hass: HomeAssistant, living
) -> None:
    """The availability follows the emitter."""
    hass.states.async_set(EMITTER, "unavailable")
    await hass.async_block_till_done()
    assert hass.states.get(ENTITY).state == "unavailable"

    hass.states.async_set(EMITTER, "on")
    await hass.async_block_till_done()
    assert hass.states.get(ENTITY).state == "off"


async def test_unavailable_if_the_emitter_no_longer_exists(
    hass: HomeAssistant, living
) -> None:
    """An emitter that was removed leaves the entity unavailable."""
    hass.states.async_remove(EMITTER)
    await hass.async_block_till_done()

    assert hass.states.get(ENTITY).state == "unavailable"


async def test_available_while_the_emitter_is_off(hass: HomeAssistant, living) -> None:
    """An emitter that is off only makes sending fail."""
    hass.states.async_set(EMITTER, "off")
    await hass.async_block_till_done()

    assert hass.states.get(ENTITY).state == "off"
