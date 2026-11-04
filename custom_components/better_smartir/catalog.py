"""Read-only access to the bundled SmartIR code catalog."""

from collections import defaultdict
from dataclasses import dataclass
import gzip
import json
from pathlib import Path
from typing import Any

from homeassistant.components.climate.const import HVAC_MODES, HVACMode
from homeassistant.core import HomeAssistant
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN

CATALOG_DIR = Path(__file__).parent / "catalog_data"
DATA_CATALOG: HassKey["Catalog"] = HassKey(f"{DOMAIN}_catalog")


@dataclass(frozen=True)
class CatalogEntry:
    """A code as listed in the index."""

    code: int
    manufacturer: str
    models: list[str]


@dataclass(frozen=True)
class CodeData:
    """A full code, with its IR commands."""

    code: int
    manufacturer: str
    models: list[str]
    min_temperature: float
    max_temperature: float
    precision: float
    modes: list[str]
    fan_modes: list[str]
    swing_modes: list[str]
    commands: dict[str, Any]


def _brand_key(name: str) -> str:
    """Return the key that identifies a brand across spelling variants."""
    return " ".join(name.split()).casefold()


class Catalog:
    """The brands and codes of the catalog."""

    def __init__(self, entries: list[CatalogEntry]) -> None:
        """Group the entries by brand, in ascending code order."""
        self._entries = {entry.code: entry for entry in entries}
        self._by_brand: dict[str, list[CatalogEntry]] = defaultdict(list)
        for entry in sorted(entries, key=lambda item: item.code):
            self._by_brand[_brand_key(entry.manufacturer)].append(entry)

    def brands(self) -> list[tuple[str, int]]:
        """Return the name and code count of each brand, alphabetically."""
        brands = [
            (entries[0].manufacturer, len(entries))
            for entries in self._by_brand.values()
        ]
        return sorted(brands, key=lambda brand: _brand_key(brand[0]))

    def codes_for_brand(self, brand: str) -> list[CatalogEntry] | None:
        """Return the codes of a brand, or None if it is not in the catalog."""
        return self._by_brand.get(_brand_key(brand))

    def entry(self, code: int) -> CatalogEntry | None:
        """Return the index entry of a code."""
        return self._entries.get(code)


def _read_index() -> list[CatalogEntry]:
    """Read the index. Blocking."""
    data = json.loads((CATALOG_DIR / "index.json").read_text(encoding="utf-8"))
    return [
        CatalogEntry(item["code"], item["manufacturer"], item["models"])
        for item in data
    ]


def _read_code(entry: CatalogEntry) -> CodeData:
    """Read a code file. Blocking."""
    path = CATALOG_DIR / "codes" / f"{entry.code}.json.gz"
    data = json.loads(gzip.decompress(path.read_bytes()))
    return CodeData(
        code=entry.code,
        manufacturer=entry.manufacturer,
        models=entry.models,
        min_temperature=data["minTemperature"],
        max_temperature=data["maxTemperature"],
        precision=data["precision"],
        modes=[
            mode
            for mode in data["operationModes"]
            if mode in HVAC_MODES and mode != HVACMode.OFF
        ],
        fan_modes=data["fanModes"],
        swing_modes=data.get("swingModes") or [],
        commands=data["commands"],
    )


async def async_get_catalog(hass: HomeAssistant) -> Catalog:
    """Return the catalog, reading the index the first time."""
    if (catalog := hass.data.get(DATA_CATALOG)) is None:
        entries = await hass.async_add_executor_job(_read_index)
        catalog = hass.data[DATA_CATALOG] = Catalog(entries)
    return catalog


async def async_get_code(hass: HomeAssistant, code: int) -> CodeData | None:
    """Return a full code, or None if it is not in the catalog."""
    catalog = await async_get_catalog(hass)
    if (entry := catalog.entry(code)) is None:
        return None
    return await hass.async_add_executor_job(_read_code, entry)
