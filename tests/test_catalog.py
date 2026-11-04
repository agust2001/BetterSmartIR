"""Tests for the catalog module."""

from custom_components.better_smartir.catalog import (
    Catalog,
    CatalogEntry,
    async_get_catalog,
    async_get_code,
)
from homeassistant.core import HomeAssistant


def test_brands_are_not_duplicated_by_case_or_spaces() -> None:
    """Spelling variants count as one brand."""
    catalog = Catalog(
        [
            CatalogEntry(2, "LG", []),
            CatalogEntry(1, "lg ", []),
            CatalogEntry(3, "Daikin", []),
        ]
    )

    assert catalog.brands() == [("Daikin", 1), ("lg ", 2)]


def test_codes_of_a_brand_are_in_ascending_order() -> None:
    """The candidates are offered by number."""
    catalog = Catalog([CatalogEntry(9, "LG", []), CatalogEntry(3, "LG", [])])

    entries = catalog.codes_for_brand("lg")

    assert [entry.code for entry in entries] == [3, 9]
    assert catalog.codes_for_brand("Unknown") is None


async def test_reads_a_code(hass: HomeAssistant) -> None:
    """A code is read with its values."""
    code = await async_get_code(hass, 1000)

    assert code.manufacturer == "Toyotomi"
    assert code.modes == ["heat", "cool", "fan_only"]
    assert code.swing_modes == []
    assert code.commands["cool"]["low"]["16"]


async def test_unknown_code(hass: HomeAssistant) -> None:
    """An unknown code returns None."""
    assert await async_get_code(hass, 999999) is None


async def test_ignores_modes_home_assistant_does_not_know(hass: HomeAssistant) -> None:
    """Modes such as humidity or cold are left out, the same as SmartIR."""
    code = await async_get_code(hass, 1089)

    assert code.modes == ["heat", "fan_only", "auto"]


async def test_repaired_code_is_available(hass: HomeAssistant) -> None:
    """The code with invalid JSON in SmartIR is available."""
    code = await async_get_code(hass, 2680)

    assert code.manufacturer == "Apton"


async def test_catalog_is_read_once(hass: HomeAssistant) -> None:
    """The index is cached."""
    assert await async_get_catalog(hass) is await async_get_catalog(hass)
