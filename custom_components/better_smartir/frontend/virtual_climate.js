// The climate that the Home Assistant card controls during a test. It only exists in
// the browser, so a test leaves nothing behind. It follows the rules of climate.py:
// tests/fixtures/climate_parity.json holds the scenarios that both must meet.

export const TEST_ENTITY = "climate.better_smartir_test";

const OFF = "off";
const FAHRENHEIT = "°F";

const FEATURE_TARGET_TEMPERATURE = 1;
const FEATURE_FAN_MODE = 8;
const FEATURE_SWING_MODE = 32;
const FEATURE_TURN_OFF = 128;
const FEATURE_TURN_ON = 256;

const CATEGORY_OF_SERVICE = {
  set_temperature: "temperature",
  set_fan_mode: "fan",
  set_swing_mode: "swing",
};

export function climateOptions({ modes, fan_modes: fanModes, swing_modes: swingModes, available }) {
  const branches = Object.values(available).flatMap((fans) => Object.entries(fans));
  const fans = new Set(branches.map(([fan]) => fan));
  const swings = new Set(
    branches.flatMap(([, branch]) => (Array.isArray(branch) ? [] : Object.keys(branch))),
  );
  return {
    modes: modes.filter((mode) => mode in available),
    fans: fanModes.filter((fan) => fans.has(fan)),
    swings: swingModes.filter((swing) => swings.has(swing)),
  };
}

export function createClimate(details) {
  const { modes, fans, swings } = climateOptions(details);
  if (!modes.length) {
    return null;
  }
  return {
    hvacMode: OFF,
    temperature: details.min_temperature,
    fan: fans[0] ?? null,
    swing: swings[0] ?? null,
    lastOnMode: modes[0],
  };
}

function shown(celsius, unit) {
  return unit === FAHRENHEIT ? Math.round((celsius * 9) / 5 + 32) : celsius;
}

function toCelsius(value, { unit, precision = 1 }) {
  if (unit !== FAHRENHEIT) {
    return value;
  }
  return Math.round((value - 32) * (5 / 9) / precision) * precision;
}

export function virtualState(
  details,
  climate,
  { unit, currentTemperature = null, currentHumidity = null } = {},
) {
  const { modes, fans, swings } = climateOptions(details);
  const now = new Date().toISOString();
  const swingAttributes = swings.length
    ? { swing_modes: swings, swing_mode: climate.swing }
    : {};
  const swingFeature = swings.length ? FEATURE_SWING_MODE : 0;
  return {
    entity_id: TEST_ENTITY,
    state: climate.hvacMode,
    last_changed: now,
    last_updated: now,
    context: { id: "better_smartir_test", parent_id: null, user_id: null },
    attributes: {
      friendly_name: `${details.manufacturer} ${details.code}`,
      assumed_state: true,
      hvac_modes: [OFF, ...modes],
      fan_modes: fans,
      fan_mode: climate.fan,
      min_temp: shown(details.min_temperature, unit),
      max_temp: shown(details.max_temperature, unit),
      target_temp_step: details.precision,
      temperature: shown(climate.temperature, unit),
      current_temperature: currentTemperature,
      current_humidity: currentHumidity,
      supported_features:
        FEATURE_TARGET_TEMPERATURE |
        FEATURE_FAN_MODE |
        FEATURE_TURN_OFF |
        FEATURE_TURN_ON |
        swingFeature,
      ...swingAttributes,
    },
  };
}

function changed(climate, service, data, units) {
  switch (service) {
    case "set_hvac_mode":
      return { ...climate, hvacMode: data.hvac_mode };
    case "set_temperature":
      return {
        ...climate,
        temperature: toCelsius(data.temperature, units),
        hvacMode: data.hvac_mode ?? climate.hvacMode,
      };
    case "set_fan_mode":
      return { ...climate, fan: data.fan_mode };
    case "set_swing_mode":
      return { ...climate, swing: data.swing_mode };
    case "turn_on":
      return { ...climate, hvacMode: climate.lastOnMode };
    case "turn_off":
      return { ...climate, hvacMode: OFF };
    default:
      return null;
  }
}

function transition(before, after, service) {
  if (before === OFF) {
    return after === OFF ? { action: null, category: null } : { action: "on", category: "on" };
  }
  if (after === OFF) {
    return { action: "off", category: "off" };
  }
  return {
    action: "state",
    category: before === after ? CATEGORY_OF_SERVICE[service] : "mode",
  };
}

// Returns what an action of the card does. The new climate only counts once it is sent.
export function applyAction(climate, service, data, units = {}) {
  const next = changed(climate, service, data, units);
  if (!next) {
    return null;
  }
  if (next.hvacMode !== OFF) {
    next.lastOnMode = next.hvacMode;
  }
  return { climate: next, ...transition(climate.hvacMode, next.hvacMode, service) };
}
