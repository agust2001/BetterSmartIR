"""BetterSmartIR: IR air conditioners that are tested from a graphical panel."""

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration
from homeassistant.util.hass_dict import HassKey

from . import websocket_api
from .const import (
    DOMAIN,
    PANEL_COMPONENT_NAME,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STATIC_URL,
)

PLATFORMS = [Platform.CLIMATE]
FRONTEND_DIR = Path(__file__).parent / "frontend"
DATA_STATIC_REGISTERED: HassKey[bool] = HassKey(f"{DOMAIN}_static_registered")
DATA_PANEL_REGISTERED: HassKey[bool] = HassKey(f"{DOMAIN}_panel_registered")

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the API used by the panel."""
    websocket_api.async_register(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the panel and one climate per subentry."""
    await _async_register_panel(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the climates. The panel stays, or each reload would close it."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove the panel along with the integration."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
    hass.data.pop(DATA_PANEL_REGISTERED, None)


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Apply the changes to the subentries without restarting."""
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Register the panel once."""
    if hass.data.get(DATA_PANEL_REGISTERED):
        return

    # The version goes in the path so that the imports of the panel inherit it:
    # a browser must not mix a new panel with modules cached from another version.
    integration = await async_get_integration(hass, DOMAIN)
    static_url = f"{STATIC_URL}/{integration.version}"

    if not hass.data.get(DATA_STATIC_REGISTERED):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(static_url, str(FRONTEND_DIR), cache_headers=False)]
        )
        hass.data[DATA_STATIC_REGISTERED] = True

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT_NAME,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{static_url}/{PANEL_COMPONENT_NAME}.js",
        require_admin=True,
    )
    hass.data[DATA_PANEL_REGISTERED] = True
