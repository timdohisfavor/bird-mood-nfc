import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(".");
const distDir = path.join(rootDir, "dist");
const audioExtensions = new Set([".mp3", ".m4a", ".ogg", ".wav", ".webm"]);

async function copyIfExists(source, target) {
  try {
    await fs.cp(source, target, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function copyAudioAssets() {
  const sourceDir = path.join(rootDir, "assets/bird-calls");
  const targetDir = path.join(distDir, "assets/bird-calls");

  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });
    const audioFiles = files.filter((file) => file.isFile() && audioExtensions.has(path.extname(file.name).toLowerCase()));
    if (!audioFiles.length) return;

    await fs.mkdir(targetDir, { recursive: true });
    await Promise.all(audioFiles.map((file) => fs.copyFile(path.join(sourceDir, file.name), path.join(targetDir, file.name))));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const birds = JSON.parse(await fs.readFile(path.join(rootDir, "web/assets/meta/birds.json"), "utf8"));
await fs.writeFile(
  path.join(rootDir, "web/assets/meta/birds-data.js"),
  `window.BIRD_SIGN_DATA = ${JSON.stringify(birds, null, 2)};\n`,
  "utf8"
);

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(path.join(distDir, "assets"), { recursive: true });
await fs.mkdir(path.join(distDir, "web/assets"), { recursive: true });

await Promise.all([
  fs.copyFile(path.join(rootDir, "index.html"), path.join(distDir, "index.html")),
  fs.copyFile(path.join(rootDir, "styles.css"), path.join(distDir, "styles.css")),
  fs.copyFile(path.join(rootDir, "script.js"), path.join(distDir, "script.js")),
  copyIfExists(path.join(rootDir, "assets/birds-final"), path.join(distDir, "assets/birds-final")),
  copyIfExists(path.join(rootDir, "assets/birds-final-webp"), path.join(distDir, "assets/birds-final-webp")),
  copyIfExists(path.join(rootDir, "assets/backgrounds"), path.join(distDir, "assets/backgrounds")),
  copyIfExists(path.join(rootDir, "web/assets/meta"), path.join(distDir, "web/assets/meta")),
  copyAudioAssets()
]);

console.log(`Built dist/ with ${birds.length} birds.`);
