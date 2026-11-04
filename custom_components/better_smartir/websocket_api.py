"""WebSocket API used by the panel. See contracts/websocket-api.md."""

from types import MappingProxyType
from typing import Any

import probatio

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry, ConfigSubentry
from homeassistant.core import HomeAssistant, callback, split_entity_id
from homeassistant.helpers import entity_registry as er

from . import emitter
from .catalog import async_get_catalog, async_get_code
from .commands import (
    ACTION_OFF,
    ACTION_ON,
    ACTION_STATE,
    CombinationNotAvailable,
    Selection,
    available_combinations,
    command_sequence,
)
from .const import (
    CONF_CODE,
    CONF_EMITTER,
    CONF_HUMIDITY_SENSOR,
    CONF_TEMPERATURE_SENSOR,
    DOMAIN,
    SUBENTRY_TYPE_CLIMATE,
)

ERROR_BRAND_NOT_FOUND = "brand_not_found"
ERROR_CODE_NOT_FOUND = "code_not_found"
ERROR_COMBINATION = "combination_not_available"
ERROR_INVALID_NAME = "invalid_name"
ERROR_INVALID_SENSOR = "invalid_sensor"
ERROR_NOT_CONFIGURED = "not_configured"

SENSOR_DOMAIN = "sensor"
TYPE_PREFIX = f"{DOMAIN}/"


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the commands."""
    for command in (
        ws_emitters,
        ws_brands,
        ws_codes,
        ws_code,
        ws_test_send,
        ws_climates_list,
        ws_climates_create,
    ):
        websocket_api.async_register_command(hass, command)


def _send_error(
    connection: websocket_api.ActiveConnection, msg: dict[str, Any], code: str
) -> None:
    """Send an error. The panel turns the code into a translated message."""
    connection.send_error(msg["id"], code, code)


@websocket_api.require_admin
@websocket_api.websocket_command({probatio.Required("type"): f"{TYPE_PREFIX}emitters"})
@callback
def ws_emitters(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List the emitters."""
    connection.send_result(
        msg["id"], {"emitters": emitter.async_list_emitters(hass)}
    )


@websocket_api.require_admin
@websocket_api.websocket_command({probatio.Required("type"): f"{TYPE_PREFIX}brands"})
@websocket_api.async_response
async def ws_brands(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List the brands."""
    catalog = await async_get_catalog(hass)
    brands = [
        {"name": name, "code_count": count} for name, count in catalog.brands()
    ]
    connection.send_result(msg["id"], {"brands": brands})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): f"{TYPE_PREFIX}codes",
        probatio.Required("brand"): str,
    }
)
@websocket_api.async_response
async def ws_codes(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List the codes of a brand."""
    catalog = await async_get_catalog(hass)
    if (entries := catalog.codes_for_brand(msg["brand"])) is None:
        _send_error(connection, msg, ERROR_BRAND_NOT_FOUND)
        return
    codes = [{"code": entry.code, "models": entry.models} for entry in entries]
    connection.send_result(msg["id"], {"codes": codes})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): f"{TYPE_PREFIX}code",
        probatio.Required("code"): int,
    }
)
@websocket_api.async_response
async def ws_code(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return what the panel needs to draw a code. Never the IR commands."""
    if (code := await async_get_code(hass, msg["code"])) is None:
        _send_error(connection, msg, ERROR_CODE_NOT_FOUND)
        return
    connection.send_result(
        msg["id"],
        {
            "code": code.code,
            "manufacturer": code.manufacturer,
            "models": code.models,
            "min_temperature": code.min_temperature,
            "max_temperature": code.max_temperature,
            "precision": code.precision,
            "modes": code.modes,
            "fan_modes": code.fan_modes,
            "swing_modes": code.swing_modes,
            "available": available_combinations(code),
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): f"{TYPE_PREFIX}test/send",
        probatio.Required(CONF_EMITTER): str,
        probatio.Required("code"): int,
        probatio.Required("action"): probatio.In(
            [ACTION_ON, ACTION_OFF, ACTION_STATE]
        ),
        probatio.Optional("mode"): probatio.Any(str, None),
        probatio.Optional("fan"): probatio.Any(str, None),
        probatio.Optional("swing"): probatio.Any(str, None),
        probatio.Optional("temperature"): probatio.Any(
            probatio.Coerce(float), None
        ),
    }
)
@websocket_api.async_response
async def ws_test_send(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send a command without saving anything."""
    if (code := await async_get_code(hass, msg["code"])) is None:
        _send_error(connection, msg, ERROR_CODE_NOT_FOUND)
        return
    selection = Selection(
        msg.get("mode"), msg.get("fan"), msg.get("swing"), msg.get("temperature")
    )
    try:
        commands = command_sequence(code, msg["action"], selection)
        await emitter.async_send(hass, msg[CONF_EMITTER], commands)
    except CombinationNotAvailable:
        _send_error(connection, msg, ERROR_COMBINATION)
    except emitter.EmitterError as err:
        _send_error(connection, msg, err.code)
    else:
        connection.send_result(msg["id"], {"sent": True})


@callback
def _async_get_hub(hass: HomeAssistant) -> ConfigEntry | None:
    """Return the entry that holds the climates."""
    entries = hass.config_entries.async_entries(DOMAIN)
    return entries[0] if entries else None


def _is_sensor(value: str | None) -> bool:
    """Return whether an optional value is empty or a sensor entity."""
    return value is None or (
        "." in value and split_entity_id(value)[0] == SENSOR_DOMAIN
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {probatio.Required("type"): f"{TYPE_PREFIX}climates/list"}
)
@websocket_api.async_response
async def ws_climates_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List the climates."""
    climates = []
    if (hub := _async_get_hub(hass)) is not None:
        catalog = await async_get_catalog(hass)
        registry = er.async_get(hass)
        for subentry in hub.subentries.values():
            if subentry.subentry_type != SUBENTRY_TYPE_CLIMATE:
                continue
            entry = catalog.entry(subentry.data[CONF_CODE])
            climates.append(
                {
                    "climate_id": subentry.subentry_id,
                    "name": subentry.title,
                    CONF_EMITTER: subentry.data[CONF_EMITTER],
                    CONF_CODE: subentry.data[CONF_CODE],
                    "manufacturer": entry.manufacturer if entry else None,
                    CONF_TEMPERATURE_SENSOR: subentry.data.get(
                        CONF_TEMPERATURE_SENSOR
                    ),
                    CONF_HUMIDITY_SENSOR: subentry.data.get(CONF_HUMIDITY_SENSOR),
                    "entity_id": registry.async_get_entity_id(
                        "climate", DOMAIN, subentry.subentry_id
                    ),
                }
            )
    connection.send_result(msg["id"], {"climates": climates})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): f"{TYPE_PREFIX}climates/create",
        probatio.Required("name"): str,
        probatio.Required(CONF_EMITTER): str,
        probatio.Required(CONF_CODE): int,
        probatio.Optional(CONF_TEMPERATURE_SENSOR): probatio.Any(str, None),
        probatio.Optional(CONF_HUMIDITY_SENSOR): probatio.Any(str, None),
    }
)
@websocket_api.async_response
async def ws_climates_create(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a climate. Its entity appears after the reload."""
    if (hub := _async_get_hub(hass)) is None:
        _send_error(connection, msg, ERROR_NOT_CONFIGURED)
        return
    name = msg["name"].strip()
    if not name:
        _send_error(connection, msg, ERROR_INVALID_NAME)
        return
    if not emitter.async_is_emitter(hass, msg[CONF_EMITTER]):
        _send_error(connection, msg, emitter.ERROR_NOT_FOUND)
        return
    catalog = await async_get_catalog(hass)
    if catalog.entry(msg[CONF_CODE]) is None:
        _send_error(connection, msg, ERROR_CODE_NOT_FOUND)
        return
    sensors = {
        key: msg[key]
        for key in (CONF_TEMPERATURE_SENSOR, CONF_HUMIDITY_SENSOR)
        if msg.get(key) is not None
    }
    if not all(_is_sensor(value) for value in sensors.values()):
        _send_error(connection, msg, ERROR_INVALID_SENSOR)
        return

    subentry = ConfigSubentry(
        data=MappingProxyType(
            {CONF_EMITTER: msg[CONF_EMITTER], CONF_CODE: msg[CONF_CODE], **sensors}
        ),
        subentry_type=SUBENTRY_TYPE_CLIMATE,
        title=name,
        unique_id=None,
    )
    hass.config_entries.async_add_subentry(hub, subentry)
    connection.send_result(msg["id"], {"climate_id": subentry.subentry_id})
