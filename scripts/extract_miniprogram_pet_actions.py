from pathlib import Path
import colorsys
from collections import deque

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ACTION_SHEET_DIR = ROOT / "docs/assets/pet-design/action-sheets"
PET_ASSET_DIR = ROOT / "miniprogram/assets/pets"

ACTIONS = [
    "happy",
    "talking",
    "sleepy",
    "waiting",
    "reward",
    "waking",
    "carrying",
    "shy",
    "rainy",
    "miss",
]


def remove_magenta_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r > 210 and g < 70 and b > 190:
                pixels[x, y] = (255, 0, 255, 0)
    return rgba


def soft_magenta_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            spill = max(0, min(red, blue) - green)
            key = max(0.0, min(1.0, (spill - 22) / 170))
            matte = 1 - key

            if red > 230 and green < 45 and blue > 230:
                pixels[x, y] = (255, 0, 255, 0)
                continue

            if matte < 0.995:
                new_red = round((red - (1 - matte) * 255) / max(matte, 0.05))
                new_green = round(green / max(matte, 0.05))
                new_blue = round((blue - (1 - matte) * 255) / max(matte, 0.05))
                pixels[x, y] = (
                    max(0, min(255, new_red)),
                    max(0, min(255, new_green)),
                    max(0, min(255, new_blue)),
                    max(0, min(255, round(255 * matte))),
                )
    return rgba


def alpha_components(image: Image.Image) -> list[dict]:
    alpha = image.getchannel("A")
    width, height = image.size
    seen = bytearray(width * height)
    components = []

    def index(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            start = index(x, y)
            if seen[start] or alpha.getpixel((x, y)) == 0:
                continue
            stack = [(x, y)]
            seen[start] = 1
            points = []
            min_x = max_x = x
            min_y = max_y = y
            while stack:
                px, py = stack.pop()
                points.append((px, py))
                min_x = min(min_x, px)
                max_x = max(max_x, px)
                min_y = min(min_y, py)
                max_y = max(max_y, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height:
                        continue
                    ni = index(nx, ny)
                    if seen[ni] or alpha.getpixel((nx, ny)) == 0:
                        continue
                    seen[ni] = 1
                    stack.append((nx, ny))
            components.append({
                "points": points,
                "area": len(points),
                "bbox": (min_x, min_y, max_x, max_y),
                "center": ((min_x + max_x) / 2, (min_y + max_y) / 2),
            })
    return components


def remove_edge_artifacts(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    keep = bytearray(width * height)

    def index(x: int, y: int) -> int:
        return y * width + x

    components = alpha_components(rgba)

    if not components:
        return rgba

    main = max(components, key=lambda component: component["area"])
    largest = main["area"]
    main_min_x, main_min_y, main_max_x, main_max_y = main["bbox"]
    margin = 44
    expanded_main = (
        max(0, main_min_x - margin),
        max(0, main_min_y - margin),
        min(width - 1, main_max_x + margin),
        min(height - 1, main_max_y + margin),
    )

    def overlaps_main(bbox: tuple[int, int, int, int]) -> bool:
        min_x, min_y, max_x, max_y = bbox
        exp_min_x, exp_min_y, exp_max_x, exp_max_y = expanded_main
        return not (max_x < exp_min_x or min_x > exp_max_x or max_y < exp_min_y or min_y > exp_max_y)

    for component in components:
        min_x, min_y, max_x, max_y = component["bbox"]
        area = component["area"]
        is_main = component is main
        touches_edge = min_x <= 3 or min_y <= 3 or max_x >= width - 4 or max_y >= height - 4
        very_thin = (max_x - min_x) <= 5 or (max_y - min_y) <= 5
        too_small = area < max(70, largest * 0.004)
        if not is_main and not overlaps_main(component["bbox"]):
            continue
        if not is_main and touches_edge and (too_small or very_thin):
            continue
        if not is_main and too_small and (min_x < width * 0.12 or max_x > width * 0.88):
            continue
        for px, py in component["points"]:
            keep[index(px, py)] = 1

    pixels = rgba.load()
    for y in range(height):
        for x in range(width):
            if not keep[index(x, y)]:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return rgba


def is_magenta_spill(red: int, green: int, blue: int) -> bool:
    hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
    degrees = hue * 360
    return (
        (260 <= degrees <= 360 or degrees <= 5)
        and saturation > 0.34
        and value > 0.25
        and red > 80
        and blue > 72
        and blue >= green - 8
        and max(red, blue) - green > 28
    )


def is_key_spill_color(red: int, green: int, blue: int, alpha: int, include_purple_edge: bool = False) -> bool:
    if alpha == 0:
        return False

    pink_spill = (
        red >= 170
        and blue >= 55
        and green <= 185
        and red - green >= 58
        and blue - green >= -85
        and red - blue <= 210
    ) or (
        red >= 130
        and blue >= 135
        and green <= 175
        and red - green >= 20
        and blue - green >= 16
    )
    purple_edge = include_purple_edge and (
        blue >= 85
        and red >= 38
        and green <= 180
        and blue - green >= 16
        and red - green >= -16
        and blue - red <= 180
    )
    return pink_spill or purple_edge


def connected_key_spill_mask(image: Image.Image) -> bytearray:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    seen = bytearray(width * height)
    mask = bytearray(width * height)
    queue = deque()

    def index(x: int, y: int) -> int:
        return y * width + x

    def push_if_background_or_spill(x: int, y: int) -> None:
        position = index(x, y)
        if seen[position]:
            return
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0 or is_key_spill_color(red, green, blue, alpha):
            seen[position] = 1
            queue.append((x, y))

    for x in range(width):
        push_if_background_or_spill(x, 0)
        push_if_background_or_spill(x, height - 1)
    for y in range(height):
        push_if_background_or_spill(0, y)
        push_if_background_or_spill(width - 1, y)

    while queue:
        x, y = queue.popleft()
        red, green, blue, alpha = pixels[x, y]
        if alpha and is_key_spill_color(red, green, blue, alpha):
            mask[index(x, y)] = 1

        for ny in range(max(0, y - 1), min(height - 1, y + 1) + 1):
            for nx in range(max(0, x - 1), min(width - 1, x + 1) + 1):
                if nx == x and ny == y:
                    continue
                push_if_background_or_spill(nx, ny)

    return mask


def edge_key_spill_mask(image: Image.Image, radius: int) -> bytearray:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    transparent = alpha.point(lambda value: 255 if value == 0 else 0)
    edge = transparent.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    mask = bytearray(width * height)

    def index(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            if edge.getpixel((x, y)) == 0:
                continue
            red, green, blue, alpha_value = pixels[x, y]
            purple_edge = (
                alpha_value
                and blue >= 85
                and red >= 38
                and green <= 180
                and blue - green >= 16
                and red - green >= -16
                and blue - red <= 180
            )
            if purple_edge:
                mask[index(x, y)] = 1

    return mask


def repair_key_spill(image: Image.Image, edge_radius: int = 10, include_connected: bool = True) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    mask = connected_key_spill_mask(rgba) if include_connected else bytearray(width * height)
    edge_mask = edge_key_spill_mask(rgba, edge_radius)
    for i, value in enumerate(edge_mask):
        if value:
            mask[i] = 1

    if not any(mask):
        return rgba

    for position, should_repair in enumerate(mask):
        if not should_repair:
            continue
        x = position % width
        y = position // width
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0:
            continue

        if blue > red + 18 or (blue > 105 and blue - green > 18 and red - green < 35):
            new_red = min(red, max(20, green + 4))
            new_green = max(green, min(170, int((green + blue) * 0.45)))
            new_blue = max(blue, new_green + 20)
        else:
            new_red = red
            new_green = green
            new_blue = min(blue, max(70, int(green * 0.9)))

        pixels[x, y] = (new_red, new_green, new_blue, alpha)

    return rgba


def clean_magenta_edge_spill(image: Image.Image, radius: int = 3) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    transparent = alpha.point(lambda value: 255 if value == 0 else 0)
    edge = transparent.filter(ImageFilter.MaxFilter(radius * 2 + 1))

    for y in range(height):
        for x in range(width):
            if edge.getpixel((x, y)) == 0:
                continue
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 or not is_magenta_spill(red, green, blue):
                continue

            dominance = max(red, blue) - green
            if alpha <= 48 or dominance >= 118 or (red > 225 and blue > 200 and green < 150):
                pixels[x, y] = (red, green, blue, 0)
                continue

            cap = min(255, green + 26)
            fade = min(0.72, max(0.0, (dominance - 28) / 160))
            pixels[x, y] = (
                min(red, cap),
                green,
                min(blue, cap),
                max(0, int(round(alpha * (1 - fade)))),
            )
    return rgba


def extract_pose_crops(sheet: Image.Image) -> list[Image.Image]:
    keyed = remove_magenta_key(sheet.convert("RGB"))
    softened = soft_magenta_key(sheet.convert("RGB"))
    components = alpha_components(keyed)
    if not components:
        return []

    largest = max(component["area"] for component in components)
    main_components = [
        component for component in components
        if component["area"] >= max(1800, largest * 0.08)
    ]
    if len(main_components) < len(ACTIONS):
        return []

    main_components = sorted(main_components, key=lambda component: component["area"], reverse=True)[:len(ACTIONS)]
    main_components.sort(key=lambda component: component["center"][1])
    top = main_components[:5]
    bottom = main_components[5:]
    ordered = sorted(top, key=lambda component: component["center"][0]) + sorted(bottom, key=lambda component: component["center"][0])

    crops = []
    for component in ordered:
        min_x, min_y, max_x, max_y = component["bbox"]
        margin = 12
        crop_min_x = max(0, min_x - margin)
        crop_min_y = max(0, min_y - margin)
        crop_max_x = min(keyed.width, max_x + margin + 1)
        crop_max_y = min(keyed.height, max_y + margin + 1)
        crop = softened.crop((crop_min_x, crop_min_y, crop_max_x, crop_max_y))
        component_mask = Image.new("L", crop.size, 0)
        mask_pixels = component_mask.load()
        for px, py in component["points"]:
            if crop_min_x <= px < crop_max_x and crop_min_y <= py < crop_max_y:
                mask_pixels[px - crop_min_x, py - crop_min_y] = 255
        component_mask = component_mask.filter(ImageFilter.MaxFilter(5))
        crop.putalpha(ImageChops.darker(crop.getchannel("A"), component_mask))
        crops.append(crop)
    return crops


def trim_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    return image.crop(bbox) if bbox else image


def canvas_fit(image: Image.Image, size: int = 720, padding: int = 42) -> Image.Image:
    image = trim_alpha(remove_edge_artifacts(image))
    max_side = size - padding * 2
    scale = min(max_side / image.width, max_side / image.height)
    new_size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    x = (size - image.width) // 2
    y = (size - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    return canvas


def export_actions(pet_id: str) -> None:
    sheet_path = ACTION_SHEET_DIR / f"{pet_id}-actions-v0.2.png"
    if not sheet_path.exists():
        raise FileNotFoundError(sheet_path)

    out_dir = PET_ASSET_DIR / pet_id
    out_dir.mkdir(parents=True, exist_ok=True)

    home_path = out_dir / "home.png"
    if home_path.exists():
        idle = canvas_fit(Image.open(home_path).convert("RGBA"))
        idle.save(out_dir / "idle.png")

    sheet = Image.open(sheet_path).convert("RGB")
    crops = extract_pose_crops(sheet)
    if len(crops) != len(ACTIONS):
        raise RuntimeError(f"{pet_id}: expected {len(ACTIONS)} pose crops, got {len(crops)}")

    for action, crop in zip(ACTIONS, crops):
        asset = canvas_fit(crop)
        asset.save(out_dir / f"{action}.png")


def main() -> None:
    pet_ids = [path.name for path in PET_ASSET_DIR.iterdir() if path.is_dir()]
    pet_ids.sort()
    for pet_id in pet_ids:
        sheet_path = ACTION_SHEET_DIR / f"{pet_id}-actions-v0.2.png"
        if sheet_path.exists():
            export_actions(pet_id)
            print(f"exported {pet_id}")
        else:
            print(f"skipped {pet_id}: missing {sheet_path}")


if __name__ == "__main__":
    main()
