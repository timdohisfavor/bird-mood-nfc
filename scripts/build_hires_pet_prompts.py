#!/usr/bin/env python3
"""Build high-resolution single-action pet asset prompts for JOYIBIRD."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROMPT_DIR = ROOT / "docs/assets/pet-design/hires-prompts"
RAW_DIR = ROOT / "docs/assets/pet-design/hires-generated/raw"
OUT_DIR = ROOT / "miniprogram/assets/pets-hires"

ACTIONS = {
    "idle": "standing calmly with a subtle breathing feeling, looking gently at the user",
    "happy": "joyfully lifting both tiny wings, closed smiling eyes, open happy beak, tiny feet slightly jumping",
    "talking": "head slightly tilted, tiny beak open as if talking or listening carefully",
    "sleepy": "sleepy and rounded, eyes half closed or closed, head tucked slightly into soft chest feathers",
    "waiting": "leaning slightly forward with an expectant look, tiny feet together, ready for user input",
    "reward": "delighted reward pose, holding a tiny fitting gift in the beak, eyes sparkling, body slightly lifted",
    "waking": "daily waking pose, body unfolding from sleep, feathers softly puffed, eyes just opening",
    "carrying": "proudly carrying a tiny fitting treasure in the beak, head held high, charming and showy",
    "shy": "shy pose, body turned slightly sideways, one wing partly covering the face, gentle blush",
    "rainy": "weather reaction, one small clear water droplet attached on the head or feathers, still cute and readable",
    "miss": "quietly sitting and waiting, gentle missing-you mood, not sad or dramatic",
}

PETS = {
    "long-tailed-tit": {
        "species": "long-tailed tit",
        "display": "云团",
        "archetype": "cloud-like shy soft ball",
        "identity": (
            "white and pale grey round body, soft pinkish-brown wing accents, tiny black dot eyes, "
            "very fluffy cotton-ball body, long thin tail pointing upward"
        ),
        "props": "tiny scarf, soft blush, shiny leaf or small petal when the action needs an object",
        "avoid": "large realistic bird beak, complex feather realism, heavy decorations that hide the long tail",
    },
    "common-kingfisher": {
        "species": "common kingfisher",
        "display": "小蓝",
        "archetype": "tiny curious adventurer",
        "identity": (
            "bright blue-green back, orange belly, small long beak, glossy curious eyes, "
            "round compact body with high-saturation toy colors"
        ),
        "props": "tiny water droplet, small shell, small pebble, explorer goggles when already part of the look",
        "avoid": "oversized realistic beak, sharp wild-bird anatomy, muddy blue colors",
    },
    "brown-shrike": {
        "species": "brown shrike",
        "display": "小守卫",
        "archetype": "stern outside soft inside little guard",
        "identity": (
            "warm brown wings, cream belly, black eye mask, small neat beak, upright reliable posture, "
            "round plush body with a slightly proud chest"
        ),
        "props": "tiny guard badge, little flag, small leaf for carrying actions",
        "avoid": "aggressive expression, sharp predator look, scary mask, realistic claws",
    },
    "red-tailed-shrike": {
        "species": "red-tailed water redstart",
        "display": "小火苗",
        "archetype": "blue little flame",
        "identity": (
            "round vivid blue body, deeper blue wing shadows, bright orange-red tail like a small flame, "
            "sporty headband, lively glossy eyes"
        ),
        "props": "small red berry, glowing pebble, sporty headband, flame-like tail highlight",
        "avoid": "separate fire effects, detached glow, green halo, realistic harsh bird anatomy",
    },
    "red-headed-tit": {
        "species": "red-headed long-tailed tit",
        "display": "小麻薯",
        "archetype": "energetic mochi ball",
        "identity": (
            "red-brown head, cream round body, grey-brown wings, black small face markings, "
            "long tail, bright clingy expression"
        ),
        "props": "tiny red flower clip, small berry, tiny flower or leaf",
        "avoid": "losing the red head, hiding the long tail, adult serious expression",
    },
    "chestnut-flanked-white-eye": {
        "species": "chestnut-flanked white-eye",
        "display": "小青柠",
        "archetype": "lime jelly candy",
        "identity": (
            "lemon-yellow green body, white eye rings, warm cream belly, soft orange flank blush, "
            "small tan beak, leaf hat, tiny feet, glossy dark eyes"
        ),
        "props": "tiny lime leaf, clear water droplet, small jelly-like treasure",
        "avoid": "magenta marks, losing the white eye rings, dark dull green, realistic bird anatomy",
    },
}


def prompt_for(pet_id: str, action: str) -> str:
    pet = PETS[pet_id]
    key_color = "#ff00ff" if pet_id in {"chestnut-flanked-white-eye", "common-kingfisher", "red-tailed-shrike"} else "#00ff00"
    return f"""Create one high-resolution standalone game pet asset for JOYIBIRD.

Asset id: {pet_id}/{action}
Subject: one very cute round {pet['species']} bird pet named {pet['display']}, archetype: {pet['archetype']}.
Identity lock: {pet['identity']}.
Action: {action} - {ACTIONS[action]}.
Allowed tiny prop/accessory guidance: {pet['props']}. Use a prop only when it supports the action; keep it attached to the bird, not floating.

Style target: premium mobile game pet, 3D plush toy / soft vinyl toy, soft feather-fur texture, rounded chubby body, tiny feet, large readable cute face, same family style as the JOYIBIRD home.png assets.
Quality target: native high resolution source suitable for a 720x720 transparent PNG export; smooth antialiased silhouette; clean soft alpha edge; no colored fringe; no jagged outline; no pixelated contact-sheet crop look.
Composition: single full-body bird only, centered, generous padding on all sides, no cropping, no badge, no circular frame.

Background for removal: perfectly flat solid {key_color} chroma-key background only. The background must be one uniform color with no gradients, shadows, reflections, floor plane, texture, scenery, or lighting variation. Do not use {key_color} anywhere in the bird, prop, highlights, shadows, or edge lighting.

Avoid: {pet['avoid']}, text, logo, watermark, UI, speech bubble, scene background, branch, nest, floor shadow, drop shadow, detached sparkles, motion lines, multiple birds, low-resolution edges, rough alpha, hard matte, colored outline.
"""


def main() -> None:
    PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source": "docs/miniprogram-pet-design-v0.2.md",
        "rawDir": str(RAW_DIR.relative_to(ROOT)),
        "outputDir": str(OUT_DIR.relative_to(ROOT)),
        "qualityBar": "Match home.png: native high resolution, smooth antialiased transparent edges, no contact-sheet upscale artifacts.",
        "assets": [],
    }

    for pet_id in PETS:
        for action in ACTIONS:
            prompt_path = PROMPT_DIR / pet_id / f"{action}.txt"
            prompt_path.parent.mkdir(parents=True, exist_ok=True)
            prompt_path.write_text(prompt_for(pet_id, action), encoding="utf-8")
            manifest["assets"].append({
                "petId": pet_id,
                "action": action,
                "prompt": str(prompt_path.relative_to(ROOT)),
                "raw": str((RAW_DIR / pet_id / f"{action}.png").relative_to(ROOT)),
                "output": str((OUT_DIR / pet_id / f"{action}.png").relative_to(ROOT)),
                "reference": str((ROOT / "miniprogram/assets/pets" / pet_id / "home.png").relative_to(ROOT)),
            })

    (PROMPT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(manifest['assets'])} prompt specs")
    print(PROMPT_DIR / "manifest.json")


if __name__ == "__main__":
    main()
