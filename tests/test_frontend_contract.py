"""The frontend still has what the test screen of the panel depends on.

Part of it is internal, see specs/003-control-clima-estandar/research.md (R4).
"""

from pathlib import Path

import hass_frontend
import pytest

BUNDLE = "\n".join(
    file.read_text(encoding="utf-8", errors="ignore")
    for file in (Path(hass_frontend.where()) / "frontend_latest").glob("*.js")
)


@pytest.mark.parametrize(
    "name",
    [
        "loadCardHelpers",
        "hui-thermostat-card",
        "climate-hvac-modes",
        "climate-fan-modes",
        "climate-swing-modes",
        '"hassApi"',
        '"states"',
        "context-request",
        "hass-more-info",
    ],
)
def test_frontend_has(name: str) -> None:
    """A missing name means the panel needs a review for this version."""
    assert name in BUNDLE
