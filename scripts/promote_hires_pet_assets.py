#!/usr/bin/env python3
"""Promote validated hires pet assets into the miniprogram pet asset directory."""

from __future__ import annotations

import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "docs/assets/pet-design/hires-prompts/manifest.json"
TARGET_DIR = ROOT / "miniprogram/assets/pets"


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    missing = [item["output"] for item in manifest["assets"] if not (ROOT / item["output"]).exists()]
    if missing:
        print("Cannot promote: missing hires assets:")
        for path in missing[:40]:
            print(f"- {path}")
        raise SystemExit(1)

    for item in manifest["assets"]:
        source = ROOT / item["output"]
        target = TARGET_DIR / item["petId"] / f"{item['action']}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        print(f"promoted {source.relative_to(ROOT)} -> {target.relative_to(ROOT)}")

    print(f"promoted {len(manifest['assets'])} hires pet assets")


if __name__ == "__main__":
    main()
