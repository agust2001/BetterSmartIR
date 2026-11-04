"""Tests for the setup, the panel and the reload."""

from unittest.mock import patch

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.better_smartir.const import (
    DOMAIN,
    PANEL_COMPONENT_NAME,
    PANEL_URL_PATH,
    STATIC_URL,
)
from homeassistant.components.frontend import DATA_PANELS
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration
from homeassistant.setup import async_setup_component

from .conftest import add_climate


async def test_panel_is_admin_only_and_needs_no_restart(
    hass: HomeAssistant, hub: MockConfigEntry
) -> None:
    """Adding the integration registers the panel."""
    panel = hass.data[DATA_PANELS][PANEL_URL_PATH]

    assert hub.state is ConfigEntryState.LOADED
    assert panel.require_admin is True
    assert panel.sidebar_title == "BetterSmartIR"


async def test_panel_modules_share_the_version_of_the_panel(
    hass: HomeAssistant, hub: MockConfigEntry, hass_client
) -> None:
    """A relative import must not reach a module cached from another version."""
    integration = await async_get_integration(hass, DOMAIN)
    module_url = hass.data[DATA_PANELS][PANEL_URL_PATH].config["_panel_custom"]["module_url"]
    folder = f"{STATIC_URL}/{integration.version}"

    assert module_url == f"{folder}/{PANEL_COMPONENT_NAME}.js"

    client = await hass_client()
    for name in ("better-smartir-panel.js", "session.js", "virtual_climate.js"):
        assert (await client.get(f"{folder}/{name}")).status == 200


async def test_panel_survives_a_reload(
    hass: HomeAssistant, hub: MockConfigEntry
) -> None:
    """Reloading must not close the panel of the person using it."""
    await hass.config_entries.async_reload(hub.entry_id)
    await hass.async_block_till_done()

    assert PANEL_URL_PATH in hass.data[DATA_PANELS]


async def test_panel_is_removed_with_the_integration(
    hass: HomeAssistant, hub: MockConfigEntry
) -> None:
    """Removing the entry removes the panel."""
    await hass.config_entries.async_remove(hub.entry_id)
    await hass.async_block_till_done()

    assert PANEL_URL_PATH not in hass.data[DATA_PANELS]


async def test_panel_comes_back_when_added_again(
    hass: HomeAssistant, hub: MockConfigEntry
) -> None:
    """Adding the integration again in the same run works."""
    await hass.config_entries.async_remove(hub.entry_id)
    await hass.async_block_till_done()

    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)

    assert PANEL_URL_PATH in hass.data[DATA_PANELS]


async def test_changing_a_subentry_reloads_the_entry(
    hass: HomeAssistant, hub: MockConfigEntry
) -> None:
    """Subentry changes are applied without restarting."""
    with patch.object(
        hass.config_entries, "async_reload", wraps=hass.config_entries.async_reload
    ) as reload:
        await add_climate(hass, hub)

    reload.assert_called_once_with(hub.entry_id)
    assert hub.state is ConfigEntryState.LOADED


async def test_yaml_is_not_read(hass: HomeAssistant) -> None:
    """A YAML section creates nothing."""
    assert await async_setup_component(hass, DOMAIN, {DOMAIN: {"climates": []}})
    await hass.async_block_till_done()

    assert not hass.config_entries.async_entries(DOMAIN)
    assert PANEL_URL_PATH not in hass.data.get(DATA_PANELS, {})
