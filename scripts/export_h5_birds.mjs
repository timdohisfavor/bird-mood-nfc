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

const habitatByBirdId = {
  sparrow: "城市村落",
  egret: "浅水湿地",
  "zebra-dove": "城市绿地",
  moorhen: "海岸湖泊",
  "falco-subbuteo": "山崖高楼",
  "long-tailed-tit": "林地灌丛",
  "snowy-owl": "北方冻原",
  "red-billed-leiothrix": "开阔田野",
  "golden-eagle": "高山草原",
  "night-heron": "河岸湿地",
  swan: "湖泊湿地",
  blackbird: "林地花园",
  "white-headed-duck": "树林灌丛",
  "large-billed-crow": "城市山林",
  "red-eared-bulbul": "灌丛果树",
  "scarlet-ibis": "稻田湿地",
  "red-headed-tit": "山地林缘",
  "silver-throated-tit": "山林灌丛",
  goshawk: "森林山地",
  "common-kingfisher": "水边河岸",
  cockatoo: "林地树冠",
  "bee-eater": "林缘蜂巢",
  "dai-sheng": "草地林缘",
  "white-wagtail": "河岸地面",
  mallard: "湖泊湿地",
  "red-tailed-shrike": "溪流岩岸",
  sparrowhawk: "林地边缘",
  "spotted-owlet": "村落林地",
  "horned-lark": "热带森林",
  "brown-headed-bunting": "灌丛草地",
  "yellow-rumped-warbler": "林地枝头",
  "chestnut-flanked-white-eye": "花园林缘",
  "brown-shrike": "灌丛农田",
  robin: "花园林地"
};

const missingHabitats = rawBirds.filter((bird) => !habitatByBirdId[bird.id]);
if (missingHabitats.length) {
  throw new Error(`Missing habitat for bird ids: ${missingHabitats.map((bird) => bird.id).join(", ")}`);
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
    habitat: habitatByBirdId[bird.id],
    line: bird.line,
    quote: bird.quote,
    fish: bird.fish,
    social: bird.social,
    meeting: bird.meeting,
    fishText: stars(bird.fish),
    socialText: stars(bird.social),
    meetingText: stars(bird.meeting),
    image: `assets/birds-final-webp/${bird.id}.webp`,
    fallbackImage: `assets/birds-final/${bird.id}.png`,
    call: `assets/bird-calls/${bird.id}.mp3`
  }));

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(birds, null, 2)}\n`, "utf8");
console.log(`Exported ${birds.length} birds to ${outputPath}`);
