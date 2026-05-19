import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(".");
const sourcePath = path.join(rootDir, "pages/index/index.js");
const outputPath = path.join(rootDir, "web/assets/meta/birds.json");

const source = await fs.readFile(sourcePath, "utf8");
const match = source.match(/const rawBirds = \[([\s\S]*?)\n\];/);

if (!match) {
  throw new Error("Could not find rawBirds in pages/index/index.js");
}

const rawBirds = Function(`"use strict"; const rawBirds = [${match[1]}\n]; return rawBirds;`)();

function stars(value) {
  return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
}

const birds = rawBirds
  .slice()
  .sort((a, b) => a.rank - b.rank)
  .map((bird) => ({
    id: bird.id,
    rank: bird.rank,
    name: bird.name,
    heat: bird.heat,
    rarity: bird.rarity,
    look: bird.look,
    line: bird.line,
    quote: bird.quote,
    fish: bird.fish,
    social: bird.social,
    meeting: bird.meeting,
    fishText: stars(bird.fish),
    socialText: stars(bird.social),
    meetingText: stars(bird.meeting),
    image: `assets/birds-final-webp/${bird.id}.webp`,
    fallbackImage: `assets/birds-final/${bird.id}.png`
  }));

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(birds, null, 2)}\n`, "utf8");
console.log(`Exported ${birds.length} birds to ${outputPath}`);
