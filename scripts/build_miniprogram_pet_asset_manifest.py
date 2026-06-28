import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PET_ASSET_DIR = ROOT / "miniprogram/assets/pets"
DOC_ASSET_DIR = ROOT / "docs/assets/pet-design"

PET_ORDER = [
    "long-tailed-tit",
    "common-kingfisher",
    "brown-shrike",
    "red-tailed-shrike",
    "red-headed-tit",
    "chestnut-flanked-white-eye",
]

ACTIONS = [
    "idle",
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

PET_META = {
    "long-tailed-tit": {
        "species": "北长尾山雀",
        "displayName": "云团",
        "archetype": "云朵小团子",
        "personality": ["害羞", "温柔", "黏人"],
        "colors": ["#F8F4EA", "#D8DDE2", "#B67A70"],
        "defaultMood": "soft",
    },
    "common-kingfisher": {
        "species": "普通翠鸟",
        "displayName": "小蓝",
        "archetype": "小小冒险家",
        "personality": ["好奇", "行动力强", "爱探索"],
        "colors": ["#1B9CAE", "#F28C28", "#87D5E8"],
        "defaultMood": "curious",
    },
    "brown-shrike": {
        "species": "伯劳",
        "displayName": "小守卫",
        "archetype": "外冷内软的小守卫",
        "personality": ["嘴硬", "可靠", "保护欲强"],
        "colors": ["#F4E4C7", "#B86F35", "#1D1A18"],
        "defaultMood": "steady",
    },
    "red-tailed-shrike": {
        "species": "红尾水鸲",
        "displayName": "小火苗",
        "archetype": "蓝色小火苗",
        "personality": ["活泼", "热心", "容易兴奋"],
        "colors": ["#2359A6", "#F06B22", "#18345F"],
        "defaultMood": "bright",
    },
    "red-headed-tit": {
        "species": "红头长尾山雀",
        "displayName": "小麻薯",
        "archetype": "元气小麻薯",
        "personality": ["热情", "黏人", "话多"],
        "colors": ["#C65A3D", "#EEDCC5", "#2A211E"],
        "defaultMood": "warm",
    },
    "chestnut-flanked-white-eye": {
        "species": "红胁秀眼",
        "displayName": "小青柠",
        "archetype": "青柠软糖",
        "personality": ["清爽", "机灵", "轻快"],
        "colors": ["#CFE43D", "#F5F0D9", "#F0A14A"],
        "defaultMood": "fresh",
    },
}


def build_manifest() -> list[dict]:
    manifest = []
    for pet_id in PET_ORDER:
        pet_dir = PET_ASSET_DIR / pet_id
        missing = [action for action in ACTIONS if not (pet_dir / f"{action}.png").exists()]
        if missing:
            raise FileNotFoundError(f"{pet_id} missing actions: {', '.join(missing)}")
        entry = {
            "id": pet_id,
            **PET_META[pet_id],
            "home": f"/assets/pets/{pet_id}/home.png",
            "assetSet": {
                action: f"/assets/pets/{pet_id}/{action}.png"
                for action in ACTIONS
            },
        }
        manifest.append(entry)
    return manifest


def make_contact_sheet() -> None:
    thumb = 132
    label_h = 34
    left_w = 190
    top_h = 44
    width = left_w + thumb * len(ACTIONS)
    height = top_h + (thumb + label_h) * len(PET_ORDER)
    sheet = Image.new("RGBA", (width, height), "#f8f0dc")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for col, action in enumerate(ACTIONS):
        x = left_w + col * thumb
        draw.text((x + 8, 14), action, fill="#17412d", font=font)

    for row, pet_id in enumerate(PET_ORDER):
        y = top_h + row * (thumb + label_h)
        draw.text((12, y + 48), PET_META[pet_id]["species"], fill="#17412d", font=font)
        draw.text((12, y + 68), pet_id, fill="#66756d", font=font)
        for col, action in enumerate(ACTIONS):
            asset = Image.open(PET_ASSET_DIR / pet_id / f"{action}.png").convert("RGBA")
            asset.thumbnail((thumb - 12, thumb - 12), Image.Resampling.LANCZOS)
            x = left_w + col * thumb + (thumb - asset.width) // 2
            yy = y + (thumb - asset.height) // 2
            sheet.alpha_composite(asset, (x, yy))

    out = DOC_ASSET_DIR / "joyibird-pet-actions-contact-v0.2.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(out)


def main() -> None:
    manifest = build_manifest()
    manifest_path = PET_ASSET_DIR / "pet-assets.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    make_contact_sheet()
    print(f"wrote {manifest_path.relative_to(ROOT)}")
    print("wrote docs/assets/pet-design/joyibird-pet-actions-contact-v0.2.png")


if __name__ == "__main__":
    main()
