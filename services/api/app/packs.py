"""Content packs (CNT-02, OFF-02). `pnpm content packs:build` makes one JSON pack per subject
plus a manifest; `python -m app.packs publish <folder>` puts them in the media store (R2 in
production) under packs/. Devices read the manifest on launch and download new packs, so new
lessons ship without an app release. Packs hold only published content, never family data."""

import json
import re
import sys
from pathlib import Path

CHANNELS = ("production", "preview")
PACK_NAME = re.compile(r"^[a-z0-9-]+\.[0-9a-f]{16}\.json$")


def manifest_key(channel: str) -> str:
    return f"packs/manifest-{channel}.json"


def publish(folder: Path, storage) -> list[str]:
    """Upload packs first and the manifest last, so a device never sees a manifest that points
    at a pack that isn't there yet."""
    manifests = sorted(folder.glob("manifest-*.json"))
    if not manifests:
        raise SystemExit(f"No manifest-*.json in {folder}. Run `pnpm content packs:build` first.")
    done = []
    for m in manifests:
        man = json.loads(m.read_text())
        if man.get("channel") not in CHANNELS:
            raise SystemExit(f"{m.name}: unknown channel {man.get('channel')!r}")
        for p in man["packs"]:
            name = p["file"]
            if not PACK_NAME.match(name):
                raise SystemExit(f"{m.name}: bad pack name {name!r}")
            storage.put_key(f"packs/{name}", (folder / name).read_bytes())
            done.append(name)
        storage.put_key(manifest_key(man["channel"]), m.read_bytes())
        done.append(m.name)
    return done


if __name__ == "__main__":  # pragma: no cover - a thin CLI over publish()
    if len(sys.argv) != 3 or sys.argv[1] != "publish":
        raise SystemExit("usage: python -m app.packs publish <folder from `pnpm content packs:build`>")
    from .storage import get_storage

    for name in publish(Path(sys.argv[2]), get_storage()):
        print(f"  uploaded {name}")
    print("✓ published")
