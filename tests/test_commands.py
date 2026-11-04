"""Tests for the command resolution."""

import pytest

from custom_components.better_smartir.catalog import CodeData
from custom_components.better_smartir.commands import (
    ACTION_OFF,
    ACTION_ON,
    ACTION_STATE,
    CombinationNotAvailable,
    Selection,
    available_combinations,
    command_sequence,
    resolve_state_command,
    temperature_key,
)


def make_code(commands: dict, swing_modes: list[str] | None = None) -> CodeData:
    """Build a code."""
    return CodeData(
        code=1,
        manufacturer="Test",
        models=[],
        min_temperature=16,
        max_temperature=30,
        precision=0.5,
        modes=["cool", "heat"],
        fan_modes=["low", "high"],
        swing_modes=swing_modes or [],
        commands=commands,
    )


COMMANDS = {
    "off": "OFF",
    "cool": {"low": {"16": "C16", "24.5": "C245", "17": "", "40": "OUT"}},
}


@pytest.mark.parametrize(
    ("temperature", "key"), [(24, "24"), (24.0, "24"), (24.5, "24.5")]
)
def test_temperature_key(temperature: float, key: str) -> None:
    """The key has no trailing zeros."""
    assert temperature_key(temperature) == key


def test_resolves_without_swing() -> None:
    """The command is found by mode, fan and temperature."""
    code = make_code(COMMANDS)

    assert resolve_state_command(code, Selection("cool", "low", None, 24.5)) == "C245"


def test_resolves_with_swing() -> None:
    """The swing is a level between the fan and the temperature."""
    code = make_code({"cool": {"low": {"up": {"16": "UP16"}}}}, ["up"])

    assert resolve_state_command(code, Selection("cool", "low", "up", 16)) == "UP16"


@pytest.mark.parametrize(
    "selection",
    [
        Selection("cool", "low", None, 18),
        Selection("cool", "high", None, 16),
        Selection("heat", "low", None, 16),
        Selection("cool", "low", None, 17),
        Selection("cool", "low", None, None),
        Selection(None, None, None, None),
    ],
)
def test_missing_or_empty_commands_are_not_available(selection: Selection) -> None:
    """Holes and empty commands raise."""
    with pytest.raises(CombinationNotAvailable):
        resolve_state_command(make_code(COMMANDS), selection)


def test_modes_filtered_out_cannot_be_sent() -> None:
    """A command of a mode that is not offered cannot be sent."""
    code = make_code({"ai": {"low": {"16": "AI"}}})

    with pytest.raises(CombinationNotAvailable):
        resolve_state_command(code, Selection("ai", "low", None, 16))


def test_available_leaves_out_holes_and_empty_commands() -> None:
    """Only combinations with a command, within the range, are offered."""
    assert available_combinations(make_code(COMMANDS)) == {
        "cool": {"low": ["16", "24.5"]}
    }


def test_available_with_swing() -> None:
    """The swing adds a level."""
    code = make_code(
        {"cool": {"low": {"up": {"16": "A"}, "down": {"17": ""}}}}, ["up", "down"]
    )

    assert available_combinations(code) == {"cool": {"low": {"up": ["16"]}}}


def test_available_orders_temperatures_numerically() -> None:
    """Temperatures are not sorted as text."""
    code = make_code({"cool": {"low": {"30": "A", "16.5": "B", "9": "C"}}})

    assert available_combinations(code) == {"cool": {"low": ["16.5", "30"]}}


def test_sequence_with_on_command() -> None:
    """Turning on sends "on" first, if the code has it."""
    code = make_code({"on": "ON", **COMMANDS})
    selection = Selection("cool", "low", None, 16)

    assert command_sequence(code, ACTION_ON, selection) == ["ON", "C16"]
    assert command_sequence(code, ACTION_STATE, selection) == ["C16"]


def test_sequence_without_on_command() -> None:
    """Without "on", the state is enough."""
    selection = Selection("cool", "low", None, 16)

    assert command_sequence(make_code(COMMANDS), ACTION_ON, selection) == ["C16"]


def test_sequence_off() -> None:
    """Turning off needs no selection."""
    selection = Selection(None, None, None, None)

    assert command_sequence(make_code(COMMANDS), ACTION_OFF, selection) == ["OFF"]


def test_sequence_off_without_command() -> None:
    """An empty "off" is not available."""
    with pytest.raises(CombinationNotAvailable):
        command_sequence(
            make_code({"off": ""}), ACTION_OFF, Selection(None, None, None, None)
        )
