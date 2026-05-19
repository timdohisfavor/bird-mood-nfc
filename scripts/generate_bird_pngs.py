from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
import random

OUT = Path("assets/birds-v2")
OUT.mkdir(parents=True, exist_ok=True)

BIRDS = [
    ("sparrow", "#8b6b45", "#d9c29e", "#2d2a24", "#c48a45", "front", "streaks"),
    ("egret", "#f8f7ef", "#ffffff", "#1f2020", "#d9b650", "wader", "longneck"),
    ("zebra-dove", "#9b8878", "#c9b8a6", "#2b2d2f", "#6f6258", "front", "spots"),
    ("moorhen", "#27282b", "#3e4245", "#d33830", "#f3cf45", "water", "redface"),
    ("falco-subbuteo", "#55616c", "#d8d2c1", "#1e2328", "#f2b447", "raptor", "moustache"),
    ("long-tailed-tit", "#fff7ec", "#e8b7a6", "#1f2326", "#b86f79", "side", "longtail"),
    ("snowy-owl", "#f4f1e8", "#ffffff", "#2d2d2d", "#e5b83e", "owl", "spots"),
    ("red-billed-leiothrix", "#b46b3c", "#d6b987", "#27313b", "#f0b13f", "raptor", "spots"),
    ("golden-eagle", "#3a2d22", "#8f6a33", "#171717", "#d29c3e", "raptor", "goldnape"),
    ("night-heron", "#20242a", "#8b97a1", "#f2efe5", "#d7c34a", "heron", "crest"),
    ("swan", "#ffffff", "#f4f1e8", "#d43f35", "#1f2020", "wader", "redface"),
    ("crow", "#191919", "#333333", "#090909", "#222222", "side", "thickbeak"),
    ("white-headed-duck", "#7a4f39", "#ffffff", "#69a7c8", "#2d2d2d", "duck", "bluebill"),
    ("large-billed-crow", "#151515", "#2d2d2d", "#080808", "#1b1b1b", "side", "hugebill"),
    ("red-eared-bulbul", "#2a2b2c", "#f4eee0", "#d94a45", "#8b7c6a", "front", "redear"),
    ("scarlet-ibis", "#f8ddd6", "#ffffff", "#d94a45", "#1f2020", "wader", "curvedbill"),
    ("red-headed-tit", "#b95d38", "#f6efe4", "#1f2326", "#d8b09d", "front", "longtail"),
    ("silver-throated-tit", "#f3f0e8", "#c9c9c2", "#1f2326", "#b58f78", "front", "longtail"),
    ("goshawk", "#5f6b73", "#e7dfcf", "#1f252a", "#d6aa45", "raptor", "bars"),
    ("common-kingfisher", "#147f9f", "#f08a36", "#202023", "#0f5f7e", "side", "longbill"),
    ("cockatoo", "#ffffff", "#f3efdf", "#202023", "#f0c84b", "front", "crest"),
    ("bee-eater", "#7a5b3c", "#d8c0a4", "#2b2b2b", "#c28b45", "raptor", "crest"),
    ("dai-sheng", "#d89345", "#f3c17b", "#161616", "#ffffff", "side", "hoopoe"),
    ("white-wagtail", "#1f2020", "#ffffff", "#2d2d2d", "#d3a64b", "side", "longtail"),
    ("mallard", "#c9783f", "#f1d6a8", "#2d2d2d", "#6b4d37", "duck", "ruddy"),
    ("red-tailed-shrike", "#1f2020", "#2f3336", "#d05b37", "#ffffff", "front", "redtail"),
    ("sparrowhawk", "#69757d", "#d59a6b", "#20252a", "#d4a03d", "raptor", "bars"),
    ("spotted-owlet", "#6b5a44", "#d8c7a6", "#202023", "#e5b83e", "owl", "spots"),
    ("horned-lark", "#151515", "#ffffff", "#e7b93f", "#d27d2f", "hornbill", "casque"),
    ("brown-headed-bunting", "#8f5b34", "#dbc19d", "#2d2a24", "#b9834b", "front", "brownhead"),
]


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def soften(color, amount=0.35):
    r, g, b = hex_to_rgb(color)
    return tuple(round(c + (255 - c) * amount) for c in (r, g, b))


def darken(color, amount=0.25):
    r, g, b = hex_to_rgb(color)
    return tuple(round(c * (1 - amount)) for c in (r, g, b))


def ellipse(draw, box, fill, outline=None, width=1):
    draw.ellipse(box, fill=fill, outline=outline, width=width)


def feather_lines(draw, cx, cy, rx, ry, color, count=58, start=-160, end=25):
    for i in range(count):
        angle = math.radians(start + (end - start) * i / max(1, count - 1))
        x1 = cx + math.cos(angle) * rx * 0.15
        y1 = cy + math.sin(angle) * ry * 0.15
        x2 = cx + math.cos(angle) * rx * random.uniform(0.62, 0.93)
        y2 = cy + math.sin(angle) * ry * random.uniform(0.62, 0.93)
        draw.line((x1, y1, x2, y2), fill=color, width=random.choice([1, 1, 2]))


def eye(draw, x, y, scale=1, accent=None):
    r = 12 * scale
    if accent:
        ellipse(draw, (x - r * 1.45, y - r * 1.45, x + r * 1.45, y + r * 1.45), fill=accent)
    ellipse(draw, (x - r, y - r, x + r, y + r), fill=(16, 15, 15))
    ellipse(draw, (x - r * 0.35, y - r * 0.45, x + r * 0.1, y + r * 0.05), fill=(255, 255, 255))


def beak(draw, x, y, color, size=1, long=False, thick=False, curved=False):
    if long:
        pts = [(x, y - 8 * size), (x + 96 * size, y - 2 * size), (x, y + 10 * size)]
    elif thick:
        pts = [(x, y - 18 * size), (x + 58 * size, y), (x, y + 18 * size)]
    else:
        pts = [(x, y - 12 * size), (x + 36 * size, y), (x, y + 12 * size)]
    draw.polygon(pts, fill=darken(color, 0.05))
    if curved:
        draw.arc((x + 10 * size, y - 8 * size, x + 62 * size, y + 34 * size), 205, 345, fill=darken(color, 0.35), width=3)


def feet(draw, x, y, dark):
    for dx in (-22, 22):
        draw.line((x + dx, y, x + dx - 8, y + 18), fill=dark, width=6)
        draw.line((x + dx, y + 17, x + dx - 22, y + 20), fill=dark, width=4)
        draw.line((x + dx, y + 17, x + dx + 10, y + 22), fill=dark, width=4)


def draw_tail(draw, x, y, color, dark, style, side=True):
    if style in ("longtail", "redtail"):
        length = 142
    elif side:
        length = 92
    else:
        length = 56
    fill = hex_to_rgb(color) if style != "redtail" else hex_to_rgb("#d05b37")
    pts = [(x, y), (x - length, y - 54), (x - length + 12, y + 20), (x + 10, y + 32)]
    draw.polygon(pts, fill=fill)
    for i in range(4):
        draw.line((x - 12, y + 8, x - length + 22 + i * 13, y - 40 + i * 16), fill=soften("#ffffff", 0), width=2)
    draw.line((x - 8, y + 10, x - length + 18, y - 40), fill=dark, width=3)


def draw_side(draw, spec, W, S):
    bird_id, main, belly, dark, accent, shape, feature = spec
    main_rgb, belly_rgb, dark_rgb, accent_rgb = map(hex_to_rgb, (main, belly, dark, accent))
    wing_rgb = darken(main, 0.22)
    draw_tail(draw, 180*S, 280*S, main, dark_rgb, feature, True)
    ellipse(draw, (126*S, 152*S, 370*S, 382*S), fill=main_rgb)
    ellipse(draw, (206*S, 224*S, 370*S, 390*S), fill=belly_rgb)
    ellipse(draw, (234*S, 124*S, 378*S, 252*S), fill=main_rgb)
    ellipse(draw, (144*S, 208*S, 298*S, 330*S), fill=wing_rgb)
    for i in range(6):
        draw.arc((150*S, (214+i*12)*S, 298*S, (300+i*12)*S), 192, 344, fill=soften("#ffffff", 0.02), width=2*S)
    if feature in ("spots", "streaks", "bars"):
        for i in range(13):
            x = random.randint(165, 285) * S
            y = random.randint(178, 286) * S
            if feature == "spots":
                ellipse(draw, (x-4*S, y-4*S, x+4*S, y+4*S), fill=soften("#ffffff", 0.02))
            else:
                draw.line((x-12*S, y, x+18*S, y+6*S), fill=soften("#ffffff", 0.04), width=2*S)
    if feature in ("hoopoe", "crest"):
        for i in range(5):
            draw.line((292*S, 126*S, (270+i*16)*S, (70+i*2)*S), fill=accent_rgb, width=8*S)
    if feature == "casque":
        ellipse(draw, (310*S, 105*S, 430*S, 165*S), fill=accent_rgb)
    long = feature in ("longbill", "hoopoe", "casque")
    thick = feature in ("hugebill", "thickbeak", "casque")
    beak(draw, 358*S, 178*S, accent if accent != "#ffffff" else dark, S, long=long, thick=thick, curved=feature in ("hoopoe",))
    eye(draw, 318*S, 166*S, S)
    feather_lines(draw, 250*S, 260*S, 116*S, 102*S, soften("#ffffff", 0.08), count=72)
    feet(draw, 258*S, 374*S, dark_rgb)


def draw_front(draw, spec, W, S):
    bird_id, main, belly, dark, accent, shape, feature = spec
    main_rgb, belly_rgb, dark_rgb, accent_rgb = map(hex_to_rgb, (main, belly, dark, accent))
    ellipse(draw, (128*S, 130*S, 384*S, 402*S), fill=main_rgb)
    ellipse(draw, (168*S, 236*S, 344*S, 398*S), fill=belly_rgb)
    draw.pieslice((118*S, 172*S, 262*S, 344*S), 96, 264, fill=darken(main, 0.24))
    draw.pieslice((250*S, 172*S, 394*S, 344*S), -84, 84, fill=darken(main, 0.24))
    if feature in ("redear", "brownhead"):
        ellipse(draw, (148*S, 112*S, 364*S, 242*S), fill=accent_rgb if feature == "brownhead" else dark_rgb)
    if feature == "crest":
        for i in range(7):
            draw.line((256*S, 132*S, (226+i*10)*S, 58*S), fill=accent_rgb, width=9*S)
    if feature == "longtail":
        draw_tail(draw, 174*S, 290*S, main, dark_rgb, feature, True)
    if feature == "redtail":
        draw.polygon([(188*S, 300*S), (118*S, 328*S), (154*S, 356*S)], fill=accent_rgb)
    if feature in ("spots", "streaks", "bars"):
        for i in range(20):
            x = random.randint(170, 340) * S
            y = random.randint(165, 320) * S
            if feature == "spots":
                ellipse(draw, (x-4*S, y-4*S, x+4*S, y+4*S), fill=soften("#ffffff", 0.02))
            else:
                draw.line((x-14*S, y, x+14*S, y+4*S), fill=soften("#ffffff", 0.03), width=2*S)
    if feature == "redear":
        ellipse(draw, (326*S, 190*S, 350*S, 218*S), fill=accent_rgb)
    eye(draw, 214*S, 192*S, S)
    eye(draw, 298*S, 192*S, S)
    beak(draw, 252*S, 214*S, dark, S*0.72)
    feather_lines(draw, 256*S, 282*S, 118*S, 112*S, soften("#ffffff", 0.12), count=86, start=-158, end=-20)
    feet(draw, 256*S, 392*S, dark_rgb)


def draw_wader(draw, spec, W, S):
    bird_id, main, belly, dark, accent, shape, feature = spec
    main_rgb, belly_rgb, dark_rgb, accent_rgb = map(hex_to_rgb, (main, belly, dark, accent))
    ellipse(draw, (158*S, 246*S, 344*S, 390*S), fill=main_rgb)
    draw.line((276*S, 246*S, 314*S, 140*S), fill=main_rgb, width=34*S)
    ellipse(draw, (286*S, 104*S, 374*S, 174*S), fill=main_rgb)
    ellipse(draw, (198*S, 294*S, 332*S, 392*S), fill=belly_rgb)
    if feature == "redface":
        ellipse(draw, (332*S, 126*S, 364*S, 158*S), fill=accent_rgb)
    beak(draw, 358*S, 138*S, dark if feature != "redface" else accent, S, long=feature in ("curvedbill",))
    eye(draw, 338*S, 130*S, S*0.8)
    draw.line((230*S, 382*S, 210*S, 470*S), fill=dark_rgb, width=7*S)
    draw.line((286*S, 382*S, 302*S, 470*S), fill=dark_rgb, width=7*S)
    draw.line((210*S, 470*S, 178*S, 476*S), fill=dark_rgb, width=5*S)
    draw.line((302*S, 470*S, 334*S, 476*S), fill=dark_rgb, width=5*S)
    feather_lines(draw, 250*S, 320*S, 86*S, 62*S, soften("#ffffff", 0.1), count=52)


def draw_owl(draw, spec, W, S):
    bird_id, main, belly, dark, accent, shape, feature = spec
    main_rgb, belly_rgb, dark_rgb, accent_rgb = map(hex_to_rgb, (main, belly, dark, accent))
    ellipse(draw, (132*S, 128*S, 380*S, 390*S), fill=main_rgb)
    ellipse(draw, (154*S, 140*S, 358*S, 302*S), fill=belly_rgb)
    ellipse(draw, (182*S, 168*S, 248*S, 234*S), fill=soften(belly, 0.2))
    ellipse(draw, (264*S, 168*S, 330*S, 234*S), fill=soften(belly, 0.2))
    eye(draw, 216*S, 200*S, S, accent_rgb)
    eye(draw, 296*S, 200*S, S, accent_rgb)
    beak(draw, 252*S, 226*S, accent, S*0.7, curved=True)
    for i in range(26):
        x = random.randint(154, 356) * S
        y = random.randint(142, 346) * S
        ellipse(draw, (x-3*S, y-3*S, x+3*S, y+3*S), fill=dark_rgb if i % 2 else soften("#ffffff", 0.03))
    feet(draw, 256*S, 386*S, dark_rgb)


def draw_duck(draw, spec, W, S):
    bird_id, main, belly, dark, accent, shape, feature = spec
    main_rgb, belly_rgb, dark_rgb, accent_rgb = map(hex_to_rgb, (main, belly, dark, accent))
    ellipse(draw, (110*S, 224*S, 376*S, 384*S), fill=main_rgb)
    ellipse(draw, (260*S, 148*S, 376*S, 242*S), fill=belly_rgb if feature == "bluebill" else main_rgb)
    ellipse(draw, (182*S, 260*S, 336*S, 386*S), fill=belly_rgb)
    beak(draw, 362*S, 184*S, accent, S, thick=True)
    eye(draw, 324*S, 176*S, S*0.8)
    ellipse(draw, (160*S, 244*S, 294*S, 338*S), fill=darken(main, 0.22))
    feather_lines(draw, 245*S, 312*S, 112*S, 60*S, soften("#ffffff", 0.08), count=46)


def render(spec):
    random.seed(spec[0])
    S = 4
    W = 512
    img = Image.new("RGBA", (W*S, W*S), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (W*S, W*S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((136*S, 366*S, 378*S, 430*S), fill=(0, 0, 0, 36))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18*S))
    img.alpha_composite(shadow)
    draw = ImageDraw.Draw(img)
    shape = spec[5]
    if shape in ("wader", "heron"):
        draw_wader(draw, spec, W, S)
    elif shape == "owl":
        draw_owl(draw, spec, W, S)
    elif shape == "duck":
        draw_duck(draw, spec, W, S)
    elif shape in ("side", "raptor", "hornbill"):
        draw_side(draw, spec, W, S)
    else:
        draw_front(draw, spec, W, S)
    img = img.filter(ImageFilter.SMOOTH_MORE)
    img = img.resize((W, W), Image.Resampling.LANCZOS)
    img.save(OUT / f"{spec[0]}.png", optimize=True)


for spec in BIRDS:
    render(spec)

print(f"generated {len(BIRDS)} bird pngs in {OUT}")
