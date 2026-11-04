"""The entity meets the scenarios that the simulated climate of the panel also meets."""

import json
from pathlib import Path

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.better_smartir.catalog import async_get_code
from custom_components.better_smartir.commands import Selection, command_sequence
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError

from .conftest import add_climate, climate_subentry

CODES = json.loads(
    (Path(__file__).parent / "fixtures" / "climate_parity.json").read_text(
        encoding="utf-8"
    )
)["codes"]
ENTITY = "climate.living"


@pytest.mark.parametrize("scenario", CODES, ids=lambda scenario: str(scenario["code"]))
async def test_entity_meets_the_scenario(
    hass: HomeAssistant,
    hub: MockConfigEntry,
    emitter: str,
    send_calls: list[ServiceCall],
    scenario: dict,
) -> None:
    """Each step sends the expected commands, or fails and keeps the state."""
    await add_climate(hass, hub, climate_subentry(code=scenario["code"]))
    code = await async_get_code(hass, scenario["code"])

    state = hass.states.get(ENTITY)
    expected = scenario["initial"]
    assert state.state == expected["state"]
    for key, value in expected.items():
        if key != "state":
            assert state.attributes.get(key) == value

    for step in scenario["steps"]:
        before = hass.states.get(ENTITY)
        send_calls.clear()
        data = {"entity_id": ENTITY, **step["data"]}

        if step["error"]:
            with pytest.raises(HomeAssistantError):
                await hass.services.async_call(
                    "climate", step["service"], data, blocking=True
                )
            assert hass.states.get(ENTITY).state == before.state
            assert not send_calls
            continue

        await hass.services.async_call("climate", step["service"], data, blocking=True)

        after = hass.states.get(ENTITY)
        if step["action"] is None:
            assert not send_calls
            continue
        selection = Selection(
            after.state,
            after.attributes["fan_mode"],
            after.attributes.get("swing_mode"),
            after.attributes["temperature"],
        )
        commands = command_sequence(code, step["action"], selection)
        sent = [call.data["command"][0] for call in send_calls]
        assert sent == [f"b64:{command}" for command in commands]
