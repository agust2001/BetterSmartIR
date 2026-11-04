"""Config flow: adds the single entry that activates the panel."""

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN, PANEL_TITLE


class BetterSmartIRConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add BetterSmartIR. Climates are managed from the panel."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Confirm the setup."""
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title=PANEL_TITLE, data={})
