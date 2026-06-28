#!/usr/bin/env python3
"""Process high-resolution generated pet assets into 720x720 transparent PNGs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "docs/assets/pet-design/hires-prompts/manifest.json"


def chroma_key_to_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    border_samples = []
    for x in range(width):
        border_samples.append(rgba.getpixel((x, 0)))
        border_samples.append(rgba.getpixel((x, height - 1)))
    for y in range(height):
        border_samples.append(rgba.getpixel((0, y)))
        border_samples.append(rgba.getpixel((width - 1, y)))

    red = sorted(sample[0] for sample in border_samples)[len(border_samples) // 2]
    green = sorted(sample[1] for sample in border_samples)[len(border_samples) // 2]
    blue = sorted(sample[2] for sample in border_samples)[len(border_samples) // 2]
    key = (red, green, blue)

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            distance = ((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2) ** 0.5
            if distance <= 18:
                pixels[x, y] = (r, g, b, 0)
                continue

            if distance <= 95:
                matte = min(1.0, max(0.0, (distance - 18) / 77))
                new_alpha = round(a * matte)
                if key[1] > key[0] and key[1] > key[2]:
                    # Green screen despill.
                    g = min(g, round((r + b) * 0.55))
                elif key[0] > 180 and key[2] > 180:
                    # Magenta screen despill.
                    spill = max(0, min(r, b) - g)
                    r = max(0, r - round(spill * 0.72))
                    b = max(0, b - round(spill * 0.72))
                pixels[x, y] = (r, g, b, new_alpha)

    return rgba


def normalize_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return rgba
    binary = alpha.point(lambda value: 255 if value > 8 else 0)
    inner = binary.filter(ImageFilter.MinFilter(3))
    soft = binary.filter(ImageFilter.GaussianBlur(0.7)).point(lambda value: 0 if value < 3 else value)
    final_alpha = ImageChops.darker(alpha, ImageChops.lighter(inner, soft))
    rgba.putalpha(final_alpha)
    return rgba


def fit_canvas(image: Image.Image, size: int = 720, padding: int = 42) -> Image.Image:
    rgba = normalize_alpha(image)
    bbox = rgba.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("asset has empty alpha")
    cropped = rgba.crop(bbox)
    max_side = size - padding * 2
    scale = min(max_side / cropped.width, max_side / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def process_one(raw_path: Path, out_path: Path) -> None:
    image = Image.open(raw_path).convert("RGBA")
    if image.getpixel((0, 0))[3] > 0:
        image = chroma_key_to_alpha(image)
    asset = fit_canvas(image)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    asset.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Process generated hires pet assets")
    parser.add_argument("--manifest", default=str(MANIFEST_PATH))
    parser.add_argument("--asset", help="Optional asset id like pet-id/action")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    processed = 0
    missing = []
    for item in manifest["assets"]:
        asset_id = f"{item['petId']}/{item['action']}"
        if args.asset and args.asset != asset_id:
            continue
        raw = ROOT / item["raw"]
        out = ROOT / item["output"]
        if not raw.exists():
            missing.append(str(raw.relative_to(ROOT)))
            continue
        process_one(raw, out)
        processed += 1

    print(f"processed {processed} assets")
    if missing:
        print("missing raw assets:")
        for path in missing[:30]:
            print(f"- {path}")
        if args.asset:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
