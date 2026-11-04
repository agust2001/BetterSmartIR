"""Constants for BetterSmartIR."""

DOMAIN = "better_smartir"

SUBENTRY_TYPE_CLIMATE = "climate"

CONF_EMITTER = "emitter_entity_id"
CONF_CODE = "code"
CONF_TEMPERATURE_SENSOR = "temperature_sensor"
CONF_HUMIDITY_SENSOR = "humidity_sensor"

# Delay between the "on" command and the state command, the same as SmartIR.
COMMAND_DELAY = 0.5

PANEL_URL_PATH = "better-smartir"
PANEL_COMPONENT_NAME = "better-smartir-panel"
PANEL_TITLE = "BetterSmartIR"
PANEL_ICON = "mdi:air-conditioner"
STATIC_URL = "/better_smartir_static"
