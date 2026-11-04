"""Tests for the WebSocket API, against contracts/websocket-api.md."""

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.better_smartir.const import DOMAIN
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .conftest import CODE, EMITTER, add_climate, climate_subentry

STATE_REQUEST = {
    "emitter_entity_id": EMITTER,
    "code": CODE,
    "action": "state",
    "mode": "cool",
    "fan": "low",
    "swing": None,
    "temperature": 24,
}


@pytest.fixture
async def client(hass: HomeAssistant, hub: MockConfigEntry, hass_ws_client):
    """Return a client of an administrator."""
    return await hass_ws_client(hass)


async def call(client, command: str, **data) -> dict:
    """Send a command and return the response."""
    await client.send_json_auto_id({"type": f"{DOMAIN}/{command}", **data})
    return await client.receive_json()


async def test_emitters(client, emitter: str) -> None:
    """The emitters are listed."""
    response = await call(client, "emitters")

    assert response["result"] == {
        "emitters": [{"entity_id": EMITTER, "name": "Living", "state": "on"}]
    }


async def test_brands(client) -> None:
    """The brands are sorted and have their code count."""
    response = await call(client, "brands")

    brands = response["result"]["brands"]
    names = [brand["name"].casefold() for brand in brands]
    assert names == sorted(names)
    assert len(brands) == 125
    assert sum(brand["code_count"] for brand in brands) == 333


async def test_codes(client) -> None:
    """The codes of a brand are in ascending order."""
    response = await call(client, "codes", brand="toyotomi")

    codes = [item["code"] for item in response["result"]["codes"]]
    assert CODE in codes
    assert codes == sorted(codes)


async def test_codes_of_unknown_brand(client) -> None:
    """An unknown brand is an error."""
    response = await call(client, "codes", brand="Unknown")

    assert response["error"]["code"] == "brand_not_found"


async def test_code_never_includes_ir_commands(client) -> None:
    """The panel gets the structure, not the commands."""
    response = await call(client, "code", code=CODE)

    result = response["result"]
    assert result["manufacturer"] == "Toyotomi"
    assert result["modes"] == ["heat", "cool", "fan_only"]
    assert result["swing_modes"] == []
    assert result["available"]["cool"]["low"][0] == "16"
    assert "commands" not in result


async def test_unknown_code(client) -> None:
    """An unknown code is an error."""
    response = await call(client, "code", code=999999)

    assert response["error"]["code"] == "code_not_found"


async def test_send_emits_and_saves_nothing(
    hass: HomeAssistant,
    client,
    hub: MockConfigEntry,
    emitter: str,
    send_calls: list[ServiceCall],
) -> None:
    """A test only sends: no entity and no configuration are created."""
    response = await call(client, "test/send", **STATE_REQUEST)

    assert response["result"] == {"sent": True}
    assert len(send_calls) == 1
    assert send_calls[0].data["command"][0].startswith("b64:")
    assert not hub.subentries
    assert not hass.states.async_entity_ids("climate")


async def test_send_off_needs_no_combination(
    client, emitter: str, send_calls: list[ServiceCall]
) -> None:
    """Turning off only needs the emitter and the code."""
    response = await call(
        client, "test/send", emitter_entity_id=EMITTER, code=CODE, action="off"
    )

    assert response["result"] == {"sent": True}


@pytest.mark.parametrize(
    ("changes", "error"),
    [
        ({"code": 999999}, "code_not_found"),
        ({"temperature": 99}, "combination_not_available"),
        ({"mode": None}, "combination_not_available"),
        ({"emitter_entity_id": "remote.unknown"}, "emitter_not_found"),
    ],
)
async def test_send_errors(
    client,
    emitter: str,
    send_calls: list[ServiceCall],
    changes: dict,
    error: str,
) -> None:
    """Invalid requests send nothing."""
    response = await call(client, "test/send", **{**STATE_REQUEST, **changes})

    assert response["error"]["code"] == error
    assert not send_calls


async def test_send_with_emitter_off_is_not_sent(
    hass: HomeAssistant, client, emitter: str, send_calls: list[ServiceCall]
) -> None:
    """The panel must not show it as sent."""
    hass.states.async_set(EMITTER, "off")

    response = await call(client, "test/send", **STATE_REQUEST)

    assert response["error"]["code"] == "emitter_off"
    assert not send_calls


@pytest.mark.parametrize(
    ("command", "data"),
    [
        ("emitters", {}),
        ("brands", {}),
        ("codes", {"brand": "LG"}),
        ("code", {"code": CODE}),
        ("test/send", STATE_REQUEST),
        ("climates/list", {}),
        ("climates/create", {"name": "A", "emitter_entity_id": EMITTER, "code": CODE}),
        ("climates/update", {"climate_id": "a", "name": "A"}),
        ("climates/delete", {"climate_id": "a"}),
    ],
)
async def test_commands_require_admin(
    hass: HomeAssistant,
    hub: MockConfigEntry,
    hass_ws_client,
    hass_admin_user,
    command: str,
    data: dict,
) -> None:
    """Users without administrator rights are rejected."""
    hass_admin_user.groups = []
    client = await hass_ws_client(hass)

    response = await call(client, command, **data)

    assert response["error"]["code"] == "unauthorized"


async def test_create_and_list(
    hass: HomeAssistant,
    client,
    hub: MockConfigEntry,
    emitter: str,
    entity_registry: er.EntityRegistry,
) -> None:
    """Creating a climate adds its entity without restarting."""
    response = await call(
        client,
        "climates/create",
        name=" Living ",
        emitter_entity_id=EMITTER,
        code=CODE,
        temperature_sensor="sensor.living",
    )
    climate_id = response["result"]["climate_id"]
    await hass.async_block_till_done()

    response = await call(client, "climates/list")

    assert response["result"]["climates"] == [
        {
            "climate_id": climate_id,
            "name": "Living",
            "emitter_entity_id": EMITTER,
            "code": CODE,
            "manufacturer": "Toyotomi",
            "temperature_sensor": "sensor.living",
            "humidity_sensor": None,
            "entity_id": "climate.living",
        }
    ]
    assert hass.states.get("climate.living") is not None


async def test_two_climates_can_share_emitter_and_name(
    hass: HomeAssistant, client, hub: MockConfigEntry, emitter: str
) -> None:
    """The name may repeat, and an emitter serves several climates."""
    for _ in range(2):
        response = await call(
            client,
            "climates/create",
            name="Living",
            emitter_entity_id=EMITTER,
            code=CODE,
        )
        assert "result" in response
        await hass.async_block_till_done()

    assert len(hub.subentries) == 2
    assert len(hass.states.async_entity_ids("climate")) == 2


@pytest.mark.parametrize(
    ("changes", "error"),
    [
        ({"name": "   "}, "invalid_name"),
        ({"emitter_entity_id": "remote.unknown"}, "emitter_not_found"),
        ({"code": 999999}, "code_not_found"),
        ({"temperature_sensor": "light.living"}, "invalid_sensor"),
        ({"humidity_sensor": "invalid"}, "invalid_sensor"),
    ],
)
async def test_create_errors(
    client, hub: MockConfigEntry, emitter: str, changes: dict, error: str
) -> None:
    """Invalid climates are not created."""
    data = {"name": "Living", "emitter_entity_id": EMITTER, "code": CODE}

    response = await call(client, "climates/create", **{**data, **changes})

    assert response["error"]["code"] == error
    assert not hub.subentries


async def test_list_shows_existing_climates(
    hass: HomeAssistant, client, hub: MockConfigEntry, emitter: str
) -> None:
    """Climates created before are listed."""
    subentry = await add_climate(hass, hub, climate_subentry("Bedroom"))

    response = await call(client, "climates/list")

    assert response["result"]["climates"][0]["climate_id"] == subentry.subentry_id


@pytest.mark.parametrize(
    ("changes", "expected"),
    [
        (
            {"emitter_entity_id": "remote.bedroom"},
            {"emitter_entity_id": "remote.bedroom"},
        ),
        ({"code": 1089}, {"code": 1089}),
        ({"temperature_sensor": "sensor.a"}, {"temperature_sensor": "sensor.a"}),
        ({"humidity_sensor": "sensor.b"}, {"humidity_sensor": "sensor.b"}),
        ({"name": " Bedroom "}, {"name": "Bedroom"}),
    ],
)
async def test_update_changes_a_field_and_keeps_the_rest(
    hass: HomeAssistant,
    client,
    hub: MockConfigEntry,
    emitter: str,
    other_emitter: str,
    entity_registry: er.EntityRegistry,
    changes: dict,
    expected: dict,
) -> None:
    """Automations keep working because the entity keeps its identity."""
    subentry = await add_climate(hass, hub)
    registry_id = entity_registry.async_get("climate.living").id
    response = await call(client, "climates/list")
    before = response["result"]["climates"][0]

    response = await call(
        client, "climates/update", climate_id=subentry.subentry_id, **changes
    )
    await hass.async_block_till_done()

    assert response["result"] == {"climate_id": subentry.subentry_id}
    response = await call(client, "climates/list")
    after = response["result"]["climates"][0]
    assert {**after, "manufacturer": None} == {
        **before,
        **expected,
        "manufacturer": None,
    }
    assert entity_registry.async_get("climate.living").id == registry_id
    assert hass.states.get("climate.living") is not None


async def test_update_with_null_removes_the_sensor(
    hass: HomeAssistant, client, hub: MockConfigEntry, emitter: str
) -> None:
    """Only the sensor that comes as null is removed."""
    subentry = await add_climate(
        hass,
        hub,
        climate_subentry(temperature_sensor="sensor.a", humidity_sensor="sensor.b"),
    )

    await call(
        client,
        "climates/update",
        climate_id=subentry.subentry_id,
        temperature_sensor=None,
    )

    data = hub.subentries[subentry.subentry_id].data
    assert "temperature_sensor" not in data
    assert data["humidity_sensor"] == "sensor.b"


async def test_update_only_validates_what_it_receives(
    hass: HomeAssistant, client, hub: MockConfigEntry, emitter: str
) -> None:
    """An emitter that is gone must not block renaming the climate."""
    subentry = await add_climate(hass, hub, climate_subentry(emitter="remote.gone"))

    response = await call(
        client, "climates/update", climate_id=subentry.subentry_id, name="Bedroom"
    )

    assert "result" in response


@pytest.mark.parametrize(
    ("changes", "error"),
    [
        ({"name": "   "}, "invalid_name"),
        ({"emitter_entity_id": "remote.unknown"}, "emitter_not_found"),
        ({"code": 999999}, "code_not_found"),
        ({"temperature_sensor": "light.living"}, "invalid_sensor"),
        ({"humidity_sensor": "invalid"}, "invalid_sensor"),
    ],
)
async def test_update_errors(
    hass: HomeAssistant,
    client,
    hub: MockConfigEntry,
    emitter: str,
    changes: dict,
    error: str,
) -> None:
    """Invalid changes leave the climate as it was."""
    subentry = await add_climate(hass, hub)
    data = dict(subentry.data)

    response = await call(
        client, "climates/update", climate_id=subentry.subentry_id, **changes
    )

    assert response["error"]["code"] == error
    assert hub.subentries[subentry.subentry_id].data == data
    assert hub.subentries[subentry.subentry_id].title == "Living"


async def test_update_of_unknown_climate(client) -> None:
    """A climate that no longer exists is an error."""
    response = await call(client, "climates/update", climate_id="a", name="A")

    assert response["error"]["code"] == "climate_not_found"


async def test_delete_removes_only_that_climate(
    hass: HomeAssistant,
    client,
    hub: MockConfigEntry,
    emitter: str,
    entity_registry: er.EntityRegistry,
    device_registry: dr.DeviceRegistry,
) -> None:
    """Its entity and device disappear, and the others keep working."""
    living = await add_climate(hass, hub)
    bedroom = await add_climate(hass, hub, climate_subentry("Bedroom"))

    response = await call(client, "climates/delete", climate_id=living.subentry_id)
    await hass.async_block_till_done()

    assert response["result"] == {}
    assert list(hub.subentries) == [bedroom.subentry_id]
    assert hass.states.get("climate.living") is None
    assert entity_registry.async_get("climate.living") is None
    devices = dr.async_entries_for_config_entry(device_registry, hub.entry_id)
    assert [device.name for device in devices] == ["Bedroom"]
    assert hass.states.get("climate.bedroom").state == "off"


async def test_delete_of_unknown_climate(client) -> None:
    """A climate that no longer exists is an error."""
    response = await call(client, "climates/delete", climate_id="a")

    assert response["error"]["code"] == "climate_not_found"
