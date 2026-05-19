from pathlib import Path
from collections import deque
import base64

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(".")
OUT = ROOT / "assets" / "birds-final"
SVG_OUT = ROOT / "assets" / "birds-final-svg"
OUT.mkdir(parents=True, exist_ok=True)
SVG_OUT.mkdir(parents=True, exist_ok=True)

# Match the visual footprint of the sparrow asset so cards feel like a unified
# illustration set instead of each bird filling the canvas independently.
TARGET_BODY_MAX = 420

THREE_TEST = Path("/Users/horizon/.codex/generated_images/019e0114-8673-71b1-a64a-3a3b90c3caf8/ig_0de3190a26a9324b0169fc5567fe20819191969b45e74ede33.png")
CONTACT_27 = ROOT / "assets" / "bird-contact-sheet-v3-plain.png"
CORRECTIONS_6 = ROOT / "assets" / "bird-corrections-v4-plain.png"

THREE = ["snowy-owl", "golden-eagle", "night-heron"]

CONTACT = [
    "sparrow",
    "egret",
    "zebra-dove",
    "moorhen",
    "falco-subbuteo",
    "long-tailed-tit",
    "red-billed-leiothrix",
    "swan",
    "blackbird",
    "white-headed-duck",
    "large-billed-crow",
    "red-eared-bulbul",
    "scarlet-ibis",
    "red-headed-tit",
    "silver-throated-tit",
    "goshawk",
    "common-kingfisher",
    "cockatoo",
    "bee-eater",
    "dai-sheng",
    "white-wagtail",
    "mallard",
    "red-tailed-shrike",
    "sparrowhawk",
    "spotted-owlet",
    "horned-lark",
    "brown-headed-bunting",
]

CORRECTIONS = [
    "egret",
    "red-tailed-shrike",
    "red-billed-leiothrix",
    "swan",
    "scarlet-ibis",
    "brown-headed-bunting",
]


def foreground_mask(img, threshold=18):
    """Find pixels that differ from the white source background."""
    img = img.convert("RGB")
    w, h = img.size
    px = img.load()
    mask = Image.new("1", (w, h), 0)
    m = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if ((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2) ** 0.5 > threshold:
                m[x, y] = 1
    return mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))


def connected_components(mask, min_area=500):
    w, h = mask.size
    m = mask.load()
    seen = bytearray(w * h)
    components = []

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if seen[idx] or not m[x, y]:
                continue

            seen[idx] = 1
            q = [(x, y)]
            min_x = max_x = x
            min_y = max_y = y
            area = 0

            while q:
                cx, cy = q.pop()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        next_idx = ny * w + nx
                        if not seen[next_idx] and m[nx, ny]:
                            seen[next_idx] = 1
                            q.append((nx, ny))

            if area >= min_area:
                components.append({
                    "area": area,
                    "box": (min_x, min_y, max_x + 1, max_y + 1),
                    "center": ((min_x + max_x) / 2, (min_y + max_y) / 2),
                })

    return components


def crop_component(img, box, padding=42):
    w, h = img.size
    left, top, right, bottom = box
    crop_box = (
        max(0, left - padding),
        max(0, top - padding),
        min(w, right + padding),
        min(h, bottom + padding),
    )
    target_box = (
        left - crop_box[0],
        top - crop_box[1],
        right - crop_box[0],
        bottom - crop_box[1],
    )
    return img.crop(crop_box).convert("RGBA"), target_box


def remove_neighbor_fragments(crop, target_box):
    mask = foreground_mask(crop, threshold=18)
    components = connected_components(mask, min_area=40)
    if not components:
        return crop

    tx1, ty1, tx2, ty2 = target_box

    def overlap_area(box):
        x1, y1, x2, y2 = box
        return max(0, min(x2, tx2) - max(x1, tx1)) * max(0, min(y2, ty2) - max(y1, ty1))

    target_component = max(components, key=lambda component: overlap_area(component["box"]))
    keep_box = target_component["box"]
    keep = Image.new("L", crop.size, 0)
    keep_draw = ImageDraw.Draw(keep)
    keep_draw.rectangle(keep_box, fill=1)
    keep = keep.filter(ImageFilter.GaussianBlur(10))

    out = crop.copy()
    px = out.load()
    k = keep.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            if k[x, y] == 0:
                px[x, y] = (255, 255, 255, 0)
    return out


def make_transparent(crop, bg_threshold=34):
    """Remove only the white background reachable from the crop edge."""
    rgb = crop.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    bg = Image.new("1", (w, h), 0)
    b = bg.load()

    def is_background(x, y):
        r, g, bl = px[x, y]
        distance = ((255 - r) ** 2 + (255 - g) ** 2 + (255 - bl) ** 2) ** 0.5
        return distance < bg_threshold and min(r, g, bl) > 208 and max(r, g, bl) - min(r, g, bl) < 34

    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_background(x, y) and not b[x, y]:
                b[x, y] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_background(x, y) and not b[x, y]:
                b[x, y] = 1
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h and not b[nx, ny] and is_background(nx, ny):
                b[nx, ny] = 1
                q.append((nx, ny))

    alpha = Image.new("L", (w, h), 255)
    a = alpha.load()
    for y in range(h):
        for x in range(w):
            if b[x, y]:
                a[x, y] = 0

    out = crop.copy()
    out.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.35)))
    return out


def normalize_asset(crop, size=720):
    crop = make_transparent(crop)
    alpha_box = crop.getbbox()
    if alpha_box:
        crop = crop.crop(alpha_box)

    scale = TARGET_BODY_MAX / max(crop.width, crop.height)
    resized = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2 + 8
    canvas.alpha_composite(resized, (x, y))
    return canvas


def save_asset(name, img):
    png_path = OUT / f"{name}.png"
    svg_path = SVG_OUT / f"{name}.svg"
    img.save(png_path, optimize=True)

    # Keep the original painterly bitmap detail, but wrap it in a transparent
    # SVG canvas with a stable viewBox for Figma and downstream handoff.
    encoded = base64.b64encode(png_path.read_bytes()).decode("ascii")
    svg_path.write_text(
        "\n".join([
            '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720" role="img">',
            f'  <title>{name}</title>',
            f'  <image href="data:image/png;base64,{encoded}" x="0" y="0" width="720" height="720" preserveAspectRatio="xMidYMid meet"/>',
            "</svg>",
            "",
        ]),
        encoding="utf-8",
    )


def split_grid(path, names, cols, rows):
    img = Image.open(path).convert("RGB")
    components = connected_components(foreground_mask(img))
    if len(components) != len(names):
        raise RuntimeError(f"{path} expected {len(names)} birds, found {len(components)} components")

    # The generated source sheets are visually arranged in grid order, but many
    # birds cross the nominal cell boundaries. Sort detected bird bodies by their
    # real center instead of cutting fixed rectangles.
    def grid_order(component):
        row = min(rows - 1, max(0, int(component["center"][1] / (img.height / rows))))
        return row, component["center"][0]

    components.sort(key=grid_order)
    for idx, name in enumerate(names):
        crop, target_box = crop_component(img, components[idx]["box"])
        crop = remove_neighbor_fragments(crop, target_box)
        save_asset(name, normalize_asset(crop))


def make_preview():
    names = [
        "sparrow", "egret", "zebra-dove", "moorhen", "falco-subbuteo",
        "long-tailed-tit", "snowy-owl", "red-billed-leiothrix", "golden-eagle",
        "night-heron", "swan", "blackbird", "white-headed-duck",
        "large-billed-crow", "red-eared-bulbul", "scarlet-ibis",
        "red-headed-tit", "silver-throated-tit", "goshawk",
        "common-kingfisher", "cockatoo", "bee-eater", "dai-sheng",
        "white-wagtail", "mallard", "red-tailed-shrike", "sparrowhawk",
        "spotted-owlet", "horned-lark", "brown-headed-bunting",
    ]
    labels = [
        "麻雀", "大白鹭", "珠颈斑鸠", "红嘴鸥", "游隼",
        "北长尾山雀", "雪鸮", "红隼", "金雕",
        "夜鹭", "白鹤", "乌鸫", "白头鹎",
        "大嘴乌鸦", "红耳鹎", "朱鹮",
        "红头长尾山雀", "银喉长尾山雀", "苍鹰",
        "普通翠鸟", "白鹦鹉", "凤头蜂鹰", "戴胜",
        "白鹡鸰", "赤麻鸭", "红尾水鸲", "雀鹰",
        "斑头鸺鹠", "双角犀鸟", "棕头鸦雀",
    ]
    thumb, cap = 150, 30
    cols = 5
    rows = 6
    sheet = Image.new("RGB", (cols * thumb, rows * (thumb + cap)), (247, 247, 247))
    draw = ImageDraw.Draw(sheet)
    for idx, name in enumerate(names):
        img = Image.open(OUT / f"{name}.png").convert("RGBA")
        img.thumbnail((thumb - 18, thumb - 18), Image.Resampling.LANCZOS)
        x = (idx % cols) * thumb + (thumb - img.width) // 2
        y = (idx // cols) * (thumb + cap) + (thumb - img.height) // 2
        sheet.paste(img.convert("RGB"), (x, y), img)
        draw.text(((idx % cols) * thumb + 8, (idx // cols) * (thumb + cap) + thumb + 4), labels[idx], fill=(32, 32, 35))
    sheet.save(ROOT / "assets" / "birds-final-preview.jpg", quality=90)


split_grid(CONTACT_27, CONTACT, 3, 9)
split_grid(THREE_TEST, THREE, 1, 3)
split_grid(CORRECTIONS_6, CORRECTIONS, 2, 3)
make_preview()
print(f"wrote final bird assets to {OUT}")
