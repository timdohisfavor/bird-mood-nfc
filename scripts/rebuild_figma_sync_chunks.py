from pathlib import Path
import base64
import json

ROOT = Path(".")
manifest = json.loads((ROOT / "assets" / "birds-final-manifest.json").read_text(encoding="utf-8"))


def build_chunks(source_dir, prefix, suffix, chunk_size=10):
    rows = []
    for index, item in enumerate(manifest, start=1):
        path = ROOT / source_dir / f"{item['id']}.{suffix}"
        rows.append({
            "id": item["id"],
            "name": item["name"],
            "index": index,
            "b64": base64.b64encode(path.read_bytes()).decode("ascii"),
        })

    for idx in range(0, len(rows), chunk_size):
        out = ROOT / "assets" / f"{prefix}-{idx // chunk_size + 1}.json"
        out.write_text(json.dumps(rows[idx:idx + chunk_size], ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


build_chunks("assets/figma-sync", "figma-sync-chunk", "png")
build_chunks("assets/figma-sync-lite-jpg", "figma-sync-lite-chunk", "jpg")
print("rebuilt figma sync chunks")
