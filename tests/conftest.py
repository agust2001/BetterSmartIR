"""Fixtures for BetterSmartIR."""

from types import MappingProxyType

import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_mock_service,
)

from custom_components.better_smartir.const import (
    CONF_CODE,
    CONF_EMITTER,
    DOMAIN,
    SUBENTRY_TYPE_CLIMATE,
)
from homeassistant.config_entries import ConfigSubentry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

EMITTER = "remote.living"
# Toyotomi: no swing, modes heat, cool and fan_only.
CODE = 1000


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Let Home Assistant load the custom integration."""
    return


@pytest.fixture
def emitter(hass: HomeAssistant, entity_registry: er.EntityRegistry) -> str:
    """Register a Broadlink remote that is turned on."""
    entity_registry.async_get_or_create(
        "remote", "broadlink", "living", suggested_object_id="living"
    )
    hass.states.async_set(EMITTER, "on", {"friendly_name": "Living"})
    return EMITTER


@pytest.fixture
def other_emitter(hass: HomeAssistant, entity_registry: er.EntityRegistry) -> str:
    """Register a second Broadlink remote."""
    entity_registry.async_get_or_create(
        "remote", "broadlink", "bedroom", suggested_object_id="bedroom"
    )
    hass.states.async_set("remote.bedroom", "on")
    return "remote.bedroom"


@pytest.fixture
def send_calls(hass: HomeAssistant) -> list:
    """Capture the calls to remote.send_command."""
    return async_mock_service(hass, "remote", "send_command")


@pytest.fixture
async def hub(hass: HomeAssistant) -> MockConfigEntry:
    """Set up the integration without climates."""
    entry = MockConfigEntry(domain=DOMAIN, title="BetterSmartIR")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def climate_subentry(
    name: str = "Living", code: int = CODE, emitter: str = EMITTER, **sensors: str
) -> ConfigSubentry:
    """Build a climate subentry."""
    return ConfigSubentry(
        data=MappingProxyType({CONF_EMITTER: emitter, CONF_CODE: code, **sensors}),
        subentry_type=SUBENTRY_TYPE_CLIMATE,
        title=name,
        unique_id=None,
    )


async def add_climate(
    hass: HomeAssistant, entry: MockConfigEntry, subentry: ConfigSubentry | None = None
) -> ConfigSubentry:
    """Add a climate to the hub and wait for the reload."""
    subentry = subentry or climate_subentry()
    hass.config_entries.async_add_subentry(entry, subentry)
    await hass.async_block_till_done()
    return subentry
