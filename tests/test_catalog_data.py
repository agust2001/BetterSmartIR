"""Tests for the generated catalog files."""

import gzip
import json

from custom_components.better_smartir.catalog import CATALOG_DIR


def _index() -> list[dict]:
    return json.loads((CATALOG_DIR / "index.json").read_text(encoding="utf-8"))


def test_catalog_has_all_broadlink_codes() -> None:
    """The catalog has every Broadlink climate code of SmartIR."""
    index = _index()
    brands = {entry["manufacturer"].strip().casefold() for entry in index}

    assert len(index) == 333
    assert len(brands) == 125


def test_every_code_is_readable_and_keeps_its_smartir_number() -> None:
    """Every index entry has a readable code file for that same manufacturer."""
    codes = sorted(path.name for path in (CATALOG_DIR / "codes").iterdir())
    assert len(codes) == 333

    for entry in _index():
        path = CATALOG_DIR / "codes" / f"{entry['code']}.json.gz"
        data = json.loads(gzip.decompress(path.read_bytes()))
        assert data["supportedController"].lower() == "broadlink"
        assert data["manufacturer"].strip() == entry["manufacturer"]
        assert data["commandsEncoding"] == "Base64"


def test_source_and_license_are_included() -> None:
    """The MIT notice and the origin of the data are kept."""
    source = json.loads((CATALOG_DIR / "SOURCE.json").read_text(encoding="utf-8"))
    license_text = (CATALOG_DIR / "LICENSE.SmartIR").read_text(encoding="utf-8")

    assert source["commit"] == "e4df2957ad915536f41ffb39daa96886d7cfe040"
    assert source["repaired"] == [2680]
    assert license_text.startswith("MIT License")
