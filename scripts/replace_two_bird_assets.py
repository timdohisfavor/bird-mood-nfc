from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter
import base64
import math
import random

ROOT = Path(".")
OUT = ROOT / "assets" / "birds-final"
SVG_OUT = ROOT / "assets" / "birds-final-svg"
WEB_OUT = ROOT / "web" / "assets" / "birds-final"
FIGMA_OUT = ROOT / "assets" / "figma-sync"
FIGMA_JPG_OUT = ROOT / "assets" / "figma-sync-jpg"
FIGMA_LITE_JPG_OUT = ROOT / "assets" / "figma-sync-lite-jpg"

for folder in (OUT, SVG_OUT, WEB_OUT, FIGMA_OUT, FIGMA_JPG_OUT, FIGMA_LITE_JPG_OUT):
    folder.mkdir(parents=True, exist_ok=True)

S = 3
SIZE = 720


def rgba(hex_value, alpha=255):
    hex_value = hex_value.lstrip("#")
    return tuple(int(hex_value[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def mix(c1, c2, t):
    a = rgba(c1) if isinstance(c1, str) else c1
    b = rgba(c2) if isinstance(c2, str) else c2
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(4))


def ellipse(draw, box, fill, outline=None, width=1):
    draw.ellipse(tuple(round(v) for v in box), fill=fill, outline=outline, width=width)


def poly(draw, pts, fill):
    draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill)


def line(draw, pts, fill, width=1):
    draw.line([(round(x), round(y)) for x, y in pts], fill=fill, width=round(width))


def eye(draw, x, y, scale=1.0, ring=None):
    if ring:
        ellipse(draw, (x - 15 * scale, y - 15 * scale, x + 15 * scale, y + 15 * scale), ring)
    ellipse(draw, (x - 9 * scale, y - 9 * scale, x + 9 * scale, y + 9 * scale), rgba("#151515"))
    ellipse(draw, (x - 3 * scale, y - 5 * scale, x + 2 * scale, y), rgba("#ffffff"))


def feather_strokes(draw, cx, cy, rx, ry, color, count=60, start=-150, end=20, jitter=0.08):
    for i in range(count):
        angle = math.radians(start + (end - start) * i / max(1, count - 1))
        r1 = random.uniform(0.34, 0.52)
        r2 = random.uniform(0.56, 0.86)
        x1 = cx + math.cos(angle) * rx * r1 + random.uniform(-rx, rx) * jitter * 0.05
        y1 = cy + math.sin(angle) * ry * r1 + random.uniform(-ry, ry) * jitter * 0.05
        x2 = cx + math.cos(angle) * rx * r2 + random.uniform(-rx, rx) * jitter
        y2 = cy + math.sin(angle) * ry * r2 + random.uniform(-ry, ry) * jitter
        line(draw, [(x1, y1), (x2, y2)], color, random.choice([1, 1, 1, 2]))


def wing_strokes(draw, box, color, count=34):
    x1, y1, x2, y2 = box
    for i in range(count):
        t = i / max(1, count - 1)
        y = y1 + (y2 - y1) * (0.16 + 0.74 * t)
        sx = x1 + random.uniform(6, 26)
        ex = x2 - random.uniform(10, 34)
        line(draw, [(sx, y), (ex, y + random.uniform(4, 18))], color, random.choice([1, 1, 2]))


def soft_shadow(canvas, box, alpha=34):
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(shadow)
    d.ellipse(tuple(round(v) for v in box), fill=(0, 0, 0, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(shadow)


def soft_mask(size, kind, coords, blur=6):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    if kind == "ellipse":
        d.ellipse(tuple(round(v) for v in coords), fill=255)
    elif kind == "polygon":
        d.polygon([(round(x), round(y)) for x, y in coords], fill=255)
    else:
        raise ValueError(f"unknown mask kind: {kind}")
    return mask.filter(ImageFilter.GaussianBlur(blur))


def tint_region(img, mask, color, opacity=0.55):
    tint = Image.new("RGBA", img.size, rgba(color, 255) if isinstance(color, str) else color)
    alpha = ImageChops.multiply(mask, img.getchannel("A")).point(lambda p: round(p * opacity))
    img.paste(tint, (0, 0), alpha)


def alpha_composite_clipped(img, layer, opacity=1.0):
    alpha = ImageChops.multiply(layer.getchannel("A"), img.getchannel("A")).point(lambda p: round(p * opacity))
    clipped = layer.copy()
    clipped.putalpha(alpha)
    img.alpha_composite(clipped)


def feather_lines_on(draw, area, color, count=36, width=1, seed=""):
    random.seed(seed)
    x1, y1, x2, y2 = area
    for i in range(count):
        t = i / max(1, count - 1)
        sx = x1 + (x2 - x1) * random.uniform(0.06, 0.36)
        sy = y1 + (y2 - y1) * (0.08 + 0.82 * t) + random.uniform(-8, 8)
        ex = sx + random.uniform(42, 112)
        ey = sy + random.uniform(-2, 18)
        line(draw, [(sx, sy), (ex, ey)], color, width)


def save_asset(asset_id, img):
    img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    png_path = OUT / f"{asset_id}.png"
    img.save(png_path, optimize=True)
    img.save(WEB_OUT / f"{asset_id}.png", optimize=True)
    img.save(FIGMA_OUT / f"{asset_id}.png", optimize=True)

    white = Image.new("RGB", img.size, "white")
    white.paste(img, mask=img.getchannel("A"))
    white.save(FIGMA_JPG_OUT / f"{asset_id}.jpg", quality=92, optimize=True)
    white.resize((360, 360), Image.Resampling.LANCZOS).save(FIGMA_LITE_JPG_OUT / f"{asset_id}.jpg", quality=90, optimize=True)

    encoded = base64.b64encode(png_path.read_bytes()).decode("ascii")
    (SVG_OUT / f"{asset_id}.svg").write_text(
        "\n".join([
            '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720" role="img">',
            f"  <title>{asset_id}</title>",
            f'  <image href="data:image/png;base64,{encoded}" x="0" y="0" width="720" height="720" preserveAspectRatio="xMidYMid meet"/>',
            "</svg>",
            "",
        ]),
        encoding="utf-8",
    )


def red_billed_gull():
    random.seed("red-billed-gull-photo-reference")
    ref_path = Path("/Users/horizon/Downloads/红嘴鸥2.png")
    src = Image.open(ref_path).convert("RGBA")
    w, h = src.size

    # Manual high-confidence mask from the provided red-billed gull reference.
    # This preserves real gull proportions: long folded wing, black tail, red bill, red legs.
    mask = Image.new("L", src.size, 0)
    d = ImageDraw.Draw(mask)
    d.polygon([(190, 548), (450, 446), (742, 282), (930, 330), (965, 520), (820, 678), (520, 742), (245, 710)], fill=255)  # folded wing/back
    d.polygon([(435, 470), (760, 380), (1010, 462), (1030, 640), (892, 770), (535, 790), (338, 704)], fill=255)  # white breast/belly
    d.ellipse((805, 185, 1032, 420), fill=255)      # head
    d.ellipse((760, 315, 1000, 555), fill=255)      # neck connection
    d.polygon([(0, 690), (278, 602), (406, 695), (110, 782), (0, 774)], fill=255)  # black tail
    d.polygon([(1008, 318), (1176, 343), (1018, 366)], fill=255)  # bill
    # Legs and feet.
    for pts in [((700, 735), (690, 1016)), ((770, 728), (858, 1024))]:
        d.line(pts, fill=255, width=34)
    d.line((690, 1014, 628, 1036), fill=255, width=28)
    d.line((690, 1014, 760, 1034), fill=255, width=28)
    d.line((858, 1024, 795, 1054), fill=255, width=28)
    d.line((858, 1024, 945, 1046), fill=255, width=28)
    mask = mask.filter(ImageFilter.GaussianBlur(3))

    cut = Image.new("RGBA", src.size, (255, 255, 255, 0))
    cut.paste(src, (0, 0), mask)
    bbox = cut.getchannel("A").getbbox()
    cut = cut.crop(bbox)

    # Painterly asset pass: reduce photographic noise, compress detail, keep feather shadows.
    rgb = Image.new("RGB", cut.size, "white")
    rgb.paste(cut, mask=cut.getchannel("A"))
    rgb = rgb.filter(ImageFilter.SMOOTH_MORE)
    rgb = rgb.filter(ImageFilter.SMOOTH_MORE)
    rgb = rgb.filter(ImageFilter.MedianFilter(3))
    rgb = rgb.filter(ImageFilter.DETAIL)

    from PIL import ImageEnhance, ImageOps
    rgb = ImageEnhance.Color(rgb).enhance(0.82)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.08)
    rgb = ImageOps.posterize(rgb, 6).filter(ImageFilter.SMOOTH)

    stylized = Image.new("RGBA", cut.size, (255, 255, 255, 0))
    stylized.paste(rgb, (0, 0), cut.getchannel("A"))

    # Place into the same 720 asset canvas. Red-billed gull is naturally longer,
    # so it is allowed a wider footprint while keeping card visual weight stable.
    canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    scale = 520 / stylized.width
    new_size = (round(stylized.width * scale), round(stylized.height * scale))
    stylized = stylized.resize(new_size, Image.Resampling.LANCZOS)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((210, 492, 570, 535), fill=(0, 0, 0, 22))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(shadow)

    x = (SIZE - new_size[0]) // 2
    y = 165
    canvas.alpha_composite(stylized, (x, y))

    # Reinforce species markers after stylization, in the established soft asset language.
    overlay = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
    od = ImageDraw.Draw(overlay)
    sx = scale
    ox, oy = x - bbox[0] * sx, y - bbox[1] * sx
    def tx(px, py):
        return (ox + px * sx, oy + py * sx)

    # Slim deep-red bill with dark tip.
    od.polygon([tx(1008, 320), tx(1174, 342), tx(1018, 363)], fill=rgba("#a8322b", 224))
    od.polygon([tx(1120, 337), tx(1178, 344), tx(1134, 358)], fill=rgba("#2b2020", 205))
    od.line([tx(1022, 348), tx(1130, 346)], fill=rgba("#6a211e", 170), width=2)

    # Dark brown iris and facial spot.
    ex, ey = tx(955, 280)
    od.ellipse((ex - 8, ey - 8, ex + 8, ey + 8), fill=rgba("#3a241d", 225))
    od.ellipse((ex - 4, ey - 4, ex + 4, ey + 4), fill=rgba("#101010", 245))
    od.ellipse((ex - 2, ey - 3, ex + 1, ey), fill=rgba("#ffffff", 240))
    sxp, syp = tx(895, 285)
    od.ellipse((sxp - 12, syp - 10, sxp + 12, syp + 12), fill=rgba("#252529", 118))

    # Red legs/toes with small black claws.
    for leg in [((700, 735), (690, 1012)), ((770, 735), (858, 1022))]:
        od.line([tx(*leg[0]), tx(*leg[1])], fill=rgba("#b33b2f", 215), width=4)
    for foot in [((690, 1012), (628, 1036)), ((690, 1012), (760, 1034)), ((858, 1022), (795, 1054)), ((858, 1022), (945, 1046))]:
        od.line([tx(*foot[0]), tx(*foot[1])], fill=rgba("#b33b2f", 215), width=3)
        cx, cy = tx(*foot[1])
        od.line([(cx, cy), (cx + 5, cy + 1)], fill=rgba("#111111", 190), width=1)

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.35))
    canvas.alpha_composite(overlay)

    # Add light, hand-drawn feather strokes clipped to the cutout.
    alpha = canvas.getchannel("A")
    strokes = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
    st = ImageDraw.Draw(strokes)
    for _ in range(95):
        px = random.uniform(x + 115, x + 390)
        py = random.uniform(y + 120, y + 265)
        st.line([(px, py), (px + random.uniform(18, 58), py + random.uniform(-5, 10))], fill=random.choice([rgba("#ffffff", 62), rgba("#d7dde0", 48), rgba("#aab4b8", 36)]), width=random.choice([1, 1, 2]))
    strokes.putalpha(ImageChops.multiply(strokes.getchannel("A"), alpha))
    canvas.alpha_composite(strokes)

    return canvas

def light_vented_bulbul():
    # Start from the already accepted red-eared bulbul asset so the brushwork,
    # proportions, edge softness, and shadow stay aligned with the rest of the set.
    base_path = OUT / "red-eared-bulbul.png"
    img = Image.open(base_path).convert("RGBA")

    # Body and tail shift from warm brown/red-eared bulbul to white-headed bulbul:
    # olive-brown back and wing, pale throat, black face, white crown, no red ear patch.
    tint_region(img, soft_mask(img.size, "ellipse", (158, 250, 430, 440), 12), "#72794f", 0.42)
    tint_region(img, soft_mask(img.size, "polygon", [(152, 340), (300, 330), (314, 380), (150, 395)], 8), "#737441", 0.52)
    tint_region(img, soft_mask(img.size, "ellipse", (318, 286, 565, 470), 12), "#f0eadc", 0.45)
    tint_region(img, soft_mask(img.size, "ellipse", (285, 420, 372, 492), 8), "#efe5ce", 0.72)

    d = ImageDraw.Draw(img)
    # White crown and cheek patch, with soft feather edges.
    crown = Image.new("RGBA", img.size, (255, 255, 255, 0))
    cd = ImageDraw.Draw(crown)
    cd.ellipse((388, 165, 517, 268), fill=rgba("#f8f6ed", 238))
    cd.polygon([(405, 225), (480, 208), (536, 250), (494, 304), (416, 296)], fill=rgba("#f7f1e4", 218))
    crown = crown.filter(ImageFilter.GaussianBlur(3))
    alpha_composite_clipped(img, crown)

    # Black mask remains strong but less crested than the red-eared source.
    mask_layer = Image.new("RGBA", img.size, (255, 255, 255, 0))
    md = ImageDraw.Draw(mask_layer)
    md.polygon([(416, 232), (522, 224), (548, 255), (512, 286), (422, 284), (394, 262)], fill=rgba("#171918", 224))
    md.ellipse((404, 222, 492, 294), fill=rgba("#171918", 216))
    mask_layer = mask_layer.filter(ImageFilter.GaussianBlur(2))
    alpha_composite_clipped(img, mask_layer)

    # Replace the red ear patch with white cheek/throat feathering.
    cheek = Image.new("RGBA", img.size, (255, 255, 255, 0))
    ch = ImageDraw.Draw(cheek)
    ch.ellipse((396, 250, 474, 304), fill=rgba("#f9f6ec", 246))
    ch.ellipse((456, 276, 556, 365), fill=rgba("#f7f1e4", 224))
    cheek = cheek.filter(ImageFilter.GaussianBlur(2))
    alpha_composite_clipped(img, cheek)

    cap = Image.new("RGBA", img.size, (255, 255, 255, 0))
    cp = ImageDraw.Draw(cap)
    cp.ellipse((392, 164, 524, 238), fill=rgba("#faf8ef", 246))
    cp.polygon([(396, 214), (462, 194), (522, 214), (498, 252), (414, 252)], fill=rgba("#faf8ef", 210))
    cap = cap.filter(ImageFilter.GaussianBlur(2))
    alpha_composite_clipped(img, cap)

    # Re-draw beak and eye on top after the face corrections.
    d = ImageDraw.Draw(img)
    poly(d, [(532, 260), (606, 250), (546, 280)], rgba("#25282a"))
    line(d, [(544, 268), (594, 260)], rgba("#111313"), 2)
    eye(d, 493, 246, 0.82)

    # Olive-yellow feather details, clipped to the accepted asset silhouette.
    strokes = Image.new("RGBA", img.size, (255, 255, 255, 0))
    sd = ImageDraw.Draw(strokes)
    feather_lines_on(sd, (185, 270, 372, 398), rgba("#b9ba64", 86), 44, 2, "bulbul-wing-lines")
    feather_lines_on(sd, (152, 342, 308, 388), rgba("#b8b661", 82), 18, 2, "bulbul-tail-lines")
    feather_lines_on(sd, (404, 184, 512, 286), rgba("#ffffff", 78), 32, 1, "bulbul-crown-lines")
    feather_lines_on(sd, (438, 294, 548, 392), rgba("#d8c8ac", 70), 28, 1, "bulbul-throat-lines")
    alpha_composite_clipped(img, strokes)

    return img


save_asset("moorhen", red_billed_gull())
save_asset("white-headed-duck", light_vented_bulbul())
print("replaced moorhen -> red-billed gull and white-headed-duck -> light-vented bulbul assets")
