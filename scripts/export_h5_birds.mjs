import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

const rootDir = path.resolve(".");
const sourcePath = path.join(rootDir, "data/birds-source.json");
const outputPath = path.join(rootDir, "assets/meta/birds.json");

const rawBirds = JSON.parse(await fs.readFile(sourcePath, "utf8"));

async function fileHashVersion(relativePath) {
  const buffer = await fs.readFile(path.join(rootDir, relativePath));
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12);
}

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
  robin: "花园林地",
  "bee-hummingbird": "古巴花林",
  "european-bee-eater": "河谷沙坡",
  "golden-headed-manakin": "热带林下",
  "tropical-parula": "附生林地"
};

const conservationByBirdId = {
  sparrow: { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数亿只", chinaStatus: "安全" },
  egret: { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数十万只", chinaStatus: "安全" },
  "zebra-dove": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数千万只", chinaStatus: "安全" },
  moorhen: { iucn: "LC", protectionLevel: "三有", chinaPopulation: "约4.2万只", chinaStatus: "安全" },
  "falco-subbuteo": { iucn: "LC", protectionLevel: "二级", chinaPopulation: "数千-万只", chinaStatus: "安全" },
  "long-tailed-tit": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数百万只", chinaStatus: "安全" },
  "snowy-owl": { iucn: "LC", protectionLevel: "二级", chinaPopulation: "极少", chinaStatus: "罕见" },
  "red-billed-leiothrix": { iucn: "LC", protectionLevel: "二级", chinaPopulation: "数十万对", chinaStatus: "安全" },
  "golden-eagle": { iucn: "LC", protectionLevel: "一级", chinaPopulation: "数千只", chinaStatus: "易危" },
  "night-heron": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数十万只", chinaStatus: "安全" },
  swan: { iucn: "CR", protectionLevel: "一级", chinaPopulation: "约6000只", chinaStatus: "极危" },
  blackbird: { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数百万只", chinaStatus: "安全" },
  "white-headed-duck": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数千万只", chinaStatus: "安全" },
  "large-billed-crow": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "常见", chinaStatus: "安全" },
  "red-eared-bulbul": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "常见", chinaStatus: "安全" },
  "scarlet-ibis": { iucn: "EN", protectionLevel: "一级", chinaPopulation: "约1.1万只", chinaStatus: "濒危" },
  "red-headed-tit": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数十万只", chinaStatus: "安全" },
  "silver-throated-tit": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数十万只", chinaStatus: "安全" },
  goshawk: { iucn: "LC", protectionLevel: "二级", chinaPopulation: "数万只", chinaStatus: "安全" },
  "common-kingfisher": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数十万只", chinaStatus: "安全" },
  cockatoo: { iucn: "-", protectionLevel: "二级", chinaPopulation: "人工养殖为主", chinaStatus: "人工" },
  "bee-eater": { iucn: "LC", protectionLevel: "二级", chinaPopulation: "稀少", chinaStatus: "近危" },
  "dai-sheng": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "常见", chinaStatus: "安全" },
  "white-wagtail": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数百万只", chinaStatus: "安全" },
  mallard: { iucn: "LC", protectionLevel: "三有", chinaPopulation: "约1万只", chinaStatus: "减少" },
  "red-tailed-shrike": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "丰富", chinaStatus: "安全" },
  sparrowhawk: { iucn: "LC", protectionLevel: "二级", chinaPopulation: "数万只", chinaStatus: "安全" },
  "spotted-owlet": { iucn: "LC", protectionLevel: "二级", chinaPopulation: "数万只", chinaStatus: "安全" },
  "horned-lark": { iucn: "VU", protectionLevel: "一级", chinaPopulation: "约555-600只", chinaStatus: "极危" },
  "brown-headed-bunting": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "数千万只", chinaStatus: "安全" },
  "yellow-rumped-warbler": { iucn: "LC", protectionLevel: "-", chinaPopulation: "数百万只", chinaStatus: "安全" },
  "chestnut-flanked-white-eye": { iucn: "LC", protectionLevel: "二级", chinaPopulation: "数万只", chinaStatus: "安全" },
  "brown-shrike": { iucn: "LC", protectionLevel: "三有", chinaPopulation: "常见", chinaStatus: "安全" },
  robin: { iucn: "LC", protectionLevel: "-", chinaPopulation: "极少", chinaStatus: "非本地" },
  "bee-hummingbird": { iucn: "NT", protectionLevel: "-", chinaPopulation: "非本地", chinaStatus: "非本地" },
  "european-bee-eater": { iucn: "LC", protectionLevel: "-", chinaPopulation: "非本地", chinaStatus: "非本地" },
  "golden-headed-manakin": { iucn: "LC", protectionLevel: "-", chinaPopulation: "非本地", chinaStatus: "非本地" },
  "tropical-parula": { iucn: "LC", protectionLevel: "-", chinaPopulation: "非本地", chinaStatus: "非本地" }
};

const missingHabitats = rawBirds.filter((bird) => !habitatByBirdId[bird.id]);
if (missingHabitats.length) {
  throw new Error(`Missing habitat for bird ids: ${missingHabitats.map((bird) => bird.id).join(", ")}`);
}

const missingConservation = rawBirds.filter((bird) => !conservationByBirdId[bird.id]);
if (missingConservation.length) {
  throw new Error(`Missing conservation data for bird ids: ${missingConservation.map((bird) => bird.id).join(", ")}`);
}

const birds = await Promise.all(rawBirds
  .slice()
  .sort((a, b) => a.rank - b.rank)
  .map(async (bird) => {
    const callPath = `assets/bird-calls/${bird.id}.mp3`;
    const callVersion = await fileHashVersion(callPath);
    return {
    id: bird.id,
    rank: bird.rank,
    name: bird.name,
    heat: bird.heat,
    rarity: bird.rarity,
    look: bird.look,
    habitat: habitatByBirdId[bird.id],
    conservation: conservationByBirdId[bird.id],
    line: bird.line,
    quote: bird.quote,
    fish: bird.fish,
    social: bird.social,
    meeting: bird.meeting,
    fishText: stars(bird.fish),
    socialText: stars(bird.social),
    meetingText: stars(bird.meeting),
    image: `assets/birds-final-webp/${bird.id}.webp`,
    fallbackImage: `assets/birds-final-webp/${bird.id}.webp`,
    call: `${callPath}?v=${callVersion}`
    };
  }));

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(birds, null, 2)}\n`, "utf8");
console.log(`Exported ${birds.length} birds to ${outputPath}`);
