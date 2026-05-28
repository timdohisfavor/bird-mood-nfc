from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "birds-final"
PASSES = 24


def bleed_rgb_into_transparency(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()

    known = [[pixels[x, y][3] > 0 for x in range(width)] for y in range(height)]

    for _ in range(PASSES):
        updates = []
        for y in range(height):
            for x in range(width):
                if known[y][x]:
                    continue

                red = green = blue = count = 0
                for ny in range(max(0, y - 1), min(height, y + 2)):
                    for nx in range(max(0, x - 1), min(width, x + 2)):
                        if nx == x and ny == y:
                            continue
                        if not known[ny][nx]:
                            continue
                        nr, ng, nb, _ = pixels[nx, ny]
                        red += nr
                        green += ng
                        blue += nb
                        count += 1

                if count:
                    updates.append((x, y, red // count, green // count, blue // count))

        if not updates:
            break

        for x, y, red, green, blue in updates:
            pixels[x, y] = (red, green, blue, 0)
            known[y][x] = True

    return image


def main() -> None:
    files = sorted(SOURCE_DIR.glob("*.png"))
    if not files:
        raise SystemExit(f"No PNG files found in {SOURCE_DIR}")

    for path in files:
        image = Image.open(path)
        cleaned = bleed_rgb_into_transparency(image)
        cleaned.save(path)

    print(f"Cleaned transparent edge RGB for {len(files)} bird PNG assets.")


if __name__ == "__main__":
    main()
