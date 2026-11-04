"""Generate catalog_data from the SmartIR climate codes.

Run from the repository root: python scripts/build_catalog.py
The output is reproducible for a given SMARTIR_COMMIT.
"""

import gzip
import io
import json
from pathlib import Path
import re
import tarfile
import urllib.request

SMARTIR_REPOSITORY = "https://github.com/smartHomeHub/SmartIR"
SMARTIR_COMMIT = "e4df2957ad915536f41ffb39daa96886d7cfe040"
CONTROLLER = "broadlink"

OUTPUT = Path("custom_components/better_smartir/catalog_data")
CODE_FILE = re.compile(r"/codes/climate/(\d+)\.json$")
TRAILING_COMMA = re.compile(r",(\s*[}\]])")


def download() -> bytes:
    """Download the SmartIR archive at the pinned commit."""
    url = f"{SMARTIR_REPOSITORY}/archive/{SMARTIR_COMMIT}.tar.gz"
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def parse(text: str) -> tuple[dict, bool]:
    """Parse a code file, repairing trailing commas. Commands are not touched."""
    try:
        return json.loads(text), False
    except json.JSONDecodeError:
        return json.loads(TRAILING_COMMA.sub(r"\1", text)), True


def write_json(path: Path, data: object) -> None:
    """Write stable, readable JSON."""
    text = json.dumps(data, indent=1, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    """Write the index, the compressed codes, the license and the source."""
    codes: dict[int, dict] = {}
    repaired: list[int] = []
    license_text = ""

    with tarfile.open(fileobj=io.BytesIO(download()), mode="r:gz") as archive:
        for member in archive:
            if not member.isfile():
                continue
            if member.name.count("/") == 1 and member.name.endswith("/LICENSE"):
                license_text = archive.extractfile(member).read().decode("utf-8")
                continue
            match = CODE_FILE.search(member.name)
            if match is None:
                continue
            text = archive.extractfile(member).read().decode("utf-8-sig")
            data, was_repaired = parse(text)
            if str(data.get("supportedController", "")).lower() != CONTROLLER:
                continue
            code = int(match.group(1))
            codes[code] = data
            if was_repaired:
                repaired.append(code)

    codes_dir = OUTPUT / "codes"
    codes_dir.mkdir(parents=True, exist_ok=True)
    for old_file in codes_dir.glob("*.json.gz"):
        old_file.unlink()

    index = []
    for code in sorted(codes):
        data = codes[code]
        index.append(
            {
                "code": code,
                "manufacturer": data["manufacturer"].strip(),
                "models": data.get("supportedModels", []),
            }
        )
        payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
        compressed = gzip.compress(payload.encode("utf-8"), 9, mtime=0)
        (codes_dir / f"{code}.json.gz").write_bytes(compressed)

    write_json(OUTPUT / "index.json", index)
    write_json(
        OUTPUT / "SOURCE.json",
        {
            "repository": SMARTIR_REPOSITORY,
            "commit": SMARTIR_COMMIT,
            "license": "MIT",
            "controller": "Broadlink",
            "code_count": len(index),
            "repaired": sorted(repaired),
        },
    )
    (OUTPUT / "LICENSE.SmartIR").write_text(
        license_text, encoding="utf-8", newline="\n"
    )
    print(f"{len(index)} codes, repaired: {sorted(repaired)}")


if __name__ == "__main__":
    main()
