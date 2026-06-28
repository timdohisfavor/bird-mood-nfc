#!/usr/bin/env python3
"""Validate high-resolution regenerated JOYIBIRD pet action assets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "docs/assets/pet-design/hires-prompts/manifest.json"
QA_DIR = ROOT / "docs/assets/pet-design/hires-generated/qa"


def alpha_stats(image: Image.Image) -> dict:
    alpha = image.getchannel("A")
    hist = alpha.histogram()
    nonzero = sum(hist[1:])
    soft = sum(hist[1:255])
    return {
        "nonzero": nonzero,
        "soft": soft,
        "full": hist[255],
        "softRatio": soft / max(nonzero, 1),
        "bbox": alpha.getbbox(),
    }


def edge_zoom(image: Image.Image, path: Path) -> None:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return
    x0, y0, x1, y1 = bbox
    crop = image.crop((max(0, x0), max(0, y0 - 12), min(image.width, x0 + 260), min(image.height, y0 + 100)))
    bg = Image.new("RGBA", crop.size, (255, 255, 255, 255))
    bg.alpha_composite(crop)
    bg = bg.resize((bg.width * 5, bg.height * 5), Image.Resampling.NEAREST)
    path.parent.mkdir(parents=True, exist_ok=True)
    bg.save(path)


def build_contact_sheet(items: list[dict], out_path: Path) -> None:
    cell = 160
    label_h = 28
    cols = 11
    rows = 6
    sheet = Image.new("RGB", (cols * cell, rows * (cell + label_h)), (247, 239, 220))
    draw = ImageDraw.Draw(sheet)
    for idx, item in enumerate(items):
        row = idx // cols
        col = idx % cols
        path = ROOT / item["output"]
        x = col * cell
        y = row * (cell + label_h)
        draw.text((x + 6, y + 4), f"{item['action']}", fill=(24, 70, 52))
        if not path.exists():
            draw.text((x + 16, y + 72), "missing", fill=(180, 40, 40))
            continue
        image = Image.open(path).convert("RGBA")
        thumb = image.copy()
        thumb.thumbnail((cell - 18, cell - 18), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + (cell - thumb.width) // 2, y + label_h + (cell - thumb.height) // 2), thumb)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate hires pet action assets")
    parser.add_argument("--manifest", default=str(MANIFEST_PATH))
    parser.add_argument("--allow-missing", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    errors = []
    checked = []
    for item in manifest["assets"]:
        path = ROOT / item["output"]
        asset_id = f"{item['petId']}/{item['action']}"
        if not path.exists():
            if not args.allow_missing:
                errors.append(f"{asset_id}: missing {path.relative_to(ROOT)}")
            continue
        image = Image.open(path).convert("RGBA")
        stats = alpha_stats(image)
        if image.size != (720, 720):
            errors.append(f"{asset_id}: expected 720x720, got {image.size}")
        if image.getpixel((0, 0))[3] != 0:
            errors.append(f"{asset_id}: corner is not transparent")
        if not stats["bbox"]:
            errors.append(f"{asset_id}: empty alpha")
        if stats["softRatio"] < 0.006:
            errors.append(f"{asset_id}: edge alpha is too hard ({stats['softRatio']:.4f})")
        edge_zoom(image, QA_DIR / "edge-zooms" / item["petId"] / f"{item['action']}.png")
        checked.append(item)

    build_contact_sheet(manifest["assets"], QA_DIR / "hires-contact-sheet.png")
    print(f"checked {len(checked)} assets")
    print(f"qa contact sheet: {QA_DIR / 'hires-contact-sheet.png'}")
    print(f"edge zooms: {QA_DIR / 'edge-zooms'}")
    if errors:
        print("validation errors:")
        for error in errors[:60]:
            print(f"- {error}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
