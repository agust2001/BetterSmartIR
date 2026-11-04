"""Climate entity of an IR air conditioner."""

import asyncio
import logging
from typing import Any

from homeassistant.components.climate import (
    ATTR_FAN_MODE,
    ATTR_HVAC_MODE,
    ATTR_SWING_MODE,
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
)
from homeassistant.config_entries import ConfigEntry, ConfigSubentry
from homeassistant.const import (
    ATTR_TEMPERATURE,
    ATTR_UNIT_OF_MEASUREMENT,
    STATE_UNAVAILABLE,
    UnitOfTemperature,
)
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.util.unit_conversion import TemperatureConverter

from . import emitter
from .catalog import CodeData, async_get_code
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

_LOGGER = logging.getLogger(__name__)

ATTR_LAST_ON_MODE = "last_on_mode"
ERROR_COMBINATION = "combination_not_available"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Create one entity per climate subentry."""
    for subentry in entry.subentries.values():
        if subentry.subentry_type != SUBENTRY_TYPE_CLIMATE:
            continue
        code = await async_get_code(hass, subentry.data[CONF_CODE])
        if code is None:
            _LOGGER.error(
                "Code %s of %s is not in the catalog",
                subentry.data[CONF_CODE],
                subentry.title,
            )
            continue
        async_add_entities(
            [BetterSmartIRClimate(subentry, code)],
            config_subentry_id=subentry.subentry_id,
        )


class BetterSmartIRClimate(ClimateEntity, RestoreEntity):
    """An air conditioner controlled by infrared.

    Infrared has no feedback, so the state is the last one that was sent.
    """

    _attr_assumed_state = True
    _attr_has_entity_name = True
    _attr_name = None
    _attr_should_poll = False
    _attr_temperature_unit = UnitOfTemperature.CELSIUS

    def __init__(self, subentry: ConfigSubentry, code: CodeData) -> None:
        """Set up the entity from its code."""
        self._code = code
        self._emitter = subentry.data[CONF_EMITTER]
        self._temperature_sensor = subentry.data.get(CONF_TEMPERATURE_SENSOR)
        self._humidity_sensor = subentry.data.get(CONF_HUMIDITY_SENSOR)
        self._lock = asyncio.Lock()
        self._available_combinations = available_combinations(code)

        fans = {
            fan
            for fan_commands in self._available_combinations.values()
            for fan in fan_commands
        }
        swings = {
            swing
            for fan_commands in self._available_combinations.values()
            for swing_commands in fan_commands.values()
            if isinstance(swing_commands, dict)
            for swing in swing_commands
        }
        modes = [mode for mode in code.modes if mode in self._available_combinations]

        self._attr_unique_id = subentry.subentry_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, subentry.subentry_id)},
            name=subentry.title,
            manufacturer=code.manufacturer,
            model=", ".join(code.models) or None,
        )
        self._attr_hvac_modes = [HVACMode.OFF, *modes]
        self._attr_fan_modes = [fan for fan in code.fan_modes if fan in fans]
        self._attr_swing_modes = [
            swing for swing in code.swing_modes if swing in swings
        ]
        self._attr_min_temp = code.min_temperature
        self._attr_max_temp = code.max_temperature
        self._attr_target_temperature_step = code.precision

        self._attr_supported_features = (
            ClimateEntityFeature.TARGET_TEMPERATURE
            | ClimateEntityFeature.FAN_MODE
            | ClimateEntityFeature.TURN_ON
            | ClimateEntityFeature.TURN_OFF
        )
        if self._attr_swing_modes:
            self._attr_supported_features |= ClimateEntityFeature.SWING_MODE

        self._set_defaults()

    def _set_defaults(self) -> None:
        """Use the default state."""
        self._attr_hvac_mode = HVACMode.OFF
        self._attr_target_temperature = self._code.min_temperature
        self._attr_fan_mode = next(iter(self._attr_fan_modes), None)
        self._attr_swing_mode = next(iter(self._attr_swing_modes), None)
        self._last_on_mode = next(iter(self._attr_hvac_modes[1:]), None)

    async def async_added_to_hass(self) -> None:
        """Restore the last state and follow the emitter and the sensors."""
        await super().async_added_to_hass()
        if (last_state := await self.async_get_last_state()) is not None:
            self._restore(last_state.state, last_state.attributes)
        followed = [self._emitter]
        followed += filter(None, (self._temperature_sensor, self._humidity_sensor))
        self.async_on_remove(
            async_track_state_change_event(
                self.hass, followed, self._async_followed_changed
            )
        )

    def _restore(self, hvac_mode: str, attributes: Any) -> None:
        """Restore each value that is still valid for the code."""
        if hvac_mode in self._attr_hvac_modes:
            self._attr_hvac_mode = HVACMode(hvac_mode)
        temperature = attributes.get(ATTR_TEMPERATURE)
        if (
            temperature is not None
            and self._code.min_temperature <= temperature <= self._code.max_temperature
        ):
            self._attr_target_temperature = temperature
        if attributes.get(ATTR_FAN_MODE) in self._attr_fan_modes:
            self._attr_fan_mode = attributes[ATTR_FAN_MODE]
        if attributes.get(ATTR_SWING_MODE) in self._attr_swing_modes:
            self._attr_swing_mode = attributes[ATTR_SWING_MODE]
        if attributes.get(ATTR_LAST_ON_MODE) in self._attr_hvac_modes[1:]:
            self._last_on_mode = attributes[ATTR_LAST_ON_MODE]

    @callback
    def _async_followed_changed(self, event: Event[EventStateChangedData]) -> None:
        """Update the availability and the values of the sensors."""
        self.async_write_ha_state()

    def _sensor_value(self, entity_id: str | None) -> tuple[float, str | None] | None:
        """Return the value and the unit of a sensor, if it has a value."""
        if entity_id is None or (state := self.hass.states.get(entity_id)) is None:
            return None
        try:
            return float(state.state), state.attributes.get(ATTR_UNIT_OF_MEASUREMENT)
        except ValueError:
            return None

    @property
    def current_temperature(self) -> float | None:
        """Return the temperature of the sensor, in the unit of the entity."""
        if (reading := self._sensor_value(self._temperature_sensor)) is None:
            return None
        value, unit = reading
        if unit not in TemperatureConverter.VALID_UNITS:
            return value
        return TemperatureConverter.convert(value, unit, self._attr_temperature_unit)

    @property
    def current_humidity(self) -> float | None:
        """Return the humidity of the sensor."""
        reading = self._sensor_value(self._humidity_sensor)
        return reading[0] if reading else None

    @property
    def available(self) -> bool:
        """Return whether the emitter exists and is available."""
        if self.hass is None:
            return False
        state = self.hass.states.get(self._emitter)
        return state is not None and state.state != STATE_UNAVAILABLE

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the mode to use when turning on."""
        return {ATTR_LAST_ON_MODE: self._last_on_mode}

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        """Set the mode."""
        await self._async_apply(hvac_mode=hvac_mode)

    async def async_set_temperature(self, **kwargs: Any) -> None:
        """Set the temperature, and the mode if it is included."""
        await self._async_apply(
            hvac_mode=kwargs.get(ATTR_HVAC_MODE),
            temperature=kwargs.get(ATTR_TEMPERATURE),
        )

    async def async_set_fan_mode(self, fan_mode: str) -> None:
        """Set the fan."""
        await self._async_apply(fan=fan_mode)

    async def async_set_swing_mode(self, swing_mode: str) -> None:
        """Set the swing."""
        await self._async_apply(swing=swing_mode)

    async def async_turn_on(self) -> None:
        """Turn on with the last mode."""
        await self._async_apply(hvac_mode=self._last_on_mode)

    async def async_turn_off(self) -> None:
        """Turn off."""
        await self._async_apply(hvac_mode=HVACMode.OFF)

    async def _async_apply(
        self,
        *,
        hvac_mode: HVACMode | str | None = None,
        temperature: float | None = None,
        fan: str | None = None,
        swing: str | None = None,
    ) -> None:
        """Send the new state, and keep it only if it was sent.

        While the air conditioner is off, values are stored without sending
        anything, or changing the temperature would turn it on.
        """
        async with self._lock:
            current_mode = self._attr_hvac_mode
            new_mode = hvac_mode if hvac_mode is not None else current_mode
            new_temperature = (
                temperature if temperature is not None else self.target_temperature
            )
            new_fan = fan if fan is not None else self._attr_fan_mode
            new_swing = swing if swing is not None else self._attr_swing_mode

            if new_mode != HVACMode.OFF or current_mode != HVACMode.OFF:
                await self._async_send(
                    current_mode, new_mode, new_fan, new_swing, new_temperature
                )

            self._attr_hvac_mode = HVACMode(new_mode)
            self._attr_target_temperature = new_temperature
            self._attr_fan_mode = new_fan
            self._attr_swing_mode = new_swing
            if new_mode != HVACMode.OFF:
                self._last_on_mode = new_mode
            self.async_write_ha_state()

    async def _async_send(
        self,
        current_mode: str,
        new_mode: str,
        fan: str | None,
        swing: str | None,
        temperature: float | None,
    ) -> None:
        """Send the commands of a state."""
        if new_mode == HVACMode.OFF:
            action = ACTION_OFF
        elif current_mode == HVACMode.OFF:
            action = ACTION_ON
        else:
            action = ACTION_STATE
        selection = Selection(new_mode, fan, swing, temperature)
        try:
            commands = command_sequence(self._code, action, selection)
            await emitter.async_send(self.hass, self._emitter, commands)
        except CombinationNotAvailable as err:
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key=ERROR_COMBINATION
            ) from err
        except emitter.EmitterError as err:
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key=err.code
            ) from err
