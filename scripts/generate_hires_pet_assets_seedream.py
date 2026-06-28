#!/usr/bin/env python3
"""Generate high-resolution JOYIBIRD pet assets with Seedream from the prompt manifest."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "docs/assets/pet-design/hires-prompts/manifest.json"
SEEDREAM_SCRIPT = ROOT / "scripts/seedream_generate.py"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate hires pet assets with Seedream")
    parser.add_argument("--manifest", default=str(MANIFEST_PATH))
    parser.add_argument("--asset", help="Optional asset id like pet-id/action")
    parser.add_argument("--limit", type=int, default=0, help="Optional max number of missing assets to generate")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--size", default="1024x1024")
    args = parser.parse_args()

    if not os.getenv("SEEDREAM_API_KEY"):
        print("SEEDREAM_API_KEY is missing. Set it before running this generator.", file=sys.stderr)
        raise SystemExit(1)

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    generated = 0
    for item in manifest["assets"]:
        asset_id = f"{item['petId']}/{item['action']}"
        if args.asset and args.asset != asset_id:
            continue
        prompt_path = ROOT / item["prompt"]
        raw_path = ROOT / item["raw"]
        if raw_path.exists() and not args.overwrite:
            continue
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            sys.executable,
            str(SEEDREAM_SCRIPT),
            "--prompt",
            prompt_path.read_text(encoding="utf-8"),
            "--output",
            str(raw_path),
            "--size",
            args.size,
            "--negative-prompt",
            "text, logo, watermark, low resolution, jagged edge, pixelated, poster, infographic, food, scenery, shadow, frame",
        ]
        print(f"generating {asset_id} -> {raw_path.relative_to(ROOT)}")
        subprocess.run(cmd, cwd=ROOT, check=True)
        generated += 1
        if args.limit and generated >= args.limit:
            break

    print(f"generated {generated} raw assets")


if __name__ == "__main__":
    main()
