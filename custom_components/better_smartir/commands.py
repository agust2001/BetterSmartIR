"""Turn a selection of values into the IR commands of a code.

A SmartIR command is not "raise the temperature": it holds the whole state, in
commands[mode][fan][temperature], or commands[mode][fan][swing][temperature].
"""

from dataclasses import dataclass
from typing import Any

from .catalog import CodeData

ACTION_ON = "on"
ACTION_OFF = "off"
ACTION_STATE = "state"


class CombinationNotAvailable(Exception):
    """The code has no command for the requested values."""


@dataclass(frozen=True)
class Selection:
    """The values that identify a command."""

    mode: str | None
    fan: str | None
    swing: str | None
    temperature: float | None


def temperature_key(temperature: float) -> str:
    """Return the key of a temperature, without trailing zeros."""
    return f"{temperature:g}"


def _is_command(value: Any) -> bool:
    """Return whether a value is a usable IR command."""
    return isinstance(value, str) and bool(value)


def _temperatures(code: CodeData, commands: Any) -> list[str]:
    """Return the temperatures with a command, in ascending order."""
    if not isinstance(commands, dict):
        return []
    temperatures = []
    for key, command in commands.items():
        try:
            value = float(key)
        except ValueError:
            continue
        in_range = code.min_temperature <= value <= code.max_temperature
        if in_range and _is_command(command):
            temperatures.append((value, key))
    return [key for _, key in sorted(temperatures)]


def available_combinations(code: CodeData) -> dict[str, Any]:
    """Return the combinations that have a command.

    The result is mode -> fan -> temperatures, with a swing level between fan and
    temperatures if the code has swing. Branches without commands are left out.
    """
    available: dict[str, Any] = {}
    for mode in code.modes:
        fans: dict[str, Any] = {}
        mode_commands = code.commands.get(mode)
        if not isinstance(mode_commands, dict):
            continue
        for fan in code.fan_modes:
            fan_commands = mode_commands.get(fan)
            if not code.swing_modes:
                if temperatures := _temperatures(code, fan_commands):
                    fans[fan] = temperatures
                continue
            if not isinstance(fan_commands, dict):
                continue
            swings = {
                swing: temperatures
                for swing in code.swing_modes
                if (temperatures := _temperatures(code, fan_commands.get(swing)))
            }
            if swings:
                fans[fan] = swings
        if fans:
            available[mode] = fans
    return available


def resolve_state_command(code: CodeData, selection: Selection) -> str:
    """Return the command of a selection."""
    if selection.temperature is None:
        raise CombinationNotAvailable
    path = [selection.mode, selection.fan]
    if code.swing_modes:
        path.append(selection.swing)
    path.append(temperature_key(selection.temperature))

    command: Any = code.commands
    for key in path:
        if not isinstance(command, dict) or key not in command:
            raise CombinationNotAvailable
        command = command[key]
    if selection.mode not in code.modes or not _is_command(command):
        raise CombinationNotAvailable
    return command


def command_sequence(code: CodeData, action: str, selection: Selection) -> list[str]:
    """Return the commands to send for an action, in order."""
    if action == ACTION_OFF:
        command = code.commands.get("off")
        if not _is_command(command):
            raise CombinationNotAvailable
        return [command]

    state_command = resolve_state_command(code, selection)
    on_command = code.commands.get("on")
    if action == ACTION_ON and _is_command(on_command):
        return [on_command, state_command]
    return [state_command]
