import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(".");
const distDir = path.join(rootDir, "dist");
const audioExtensions = new Set([".mp3", ".m4a", ".ogg", ".wav", ".webm"]);

function shouldSkipPublishFile(name) {
  return name.startsWith(".") || name === "Thumbs.db";
}

async function copyIfExists(source, target) {
  try {
    await fs.cp(source, target, {
      recursive: true,
      filter: (sourcePath) => !shouldSkipPublishFile(path.basename(sourcePath))
    });
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

async function copyAmbientAudioAssets() {
  await copyIfExists(path.join(rootDir, "assets/audio"), path.join(distDir, "assets/audio"));
}

async function copyBackgroundAssets() {
  const sourceDir = path.join(rootDir, "assets/backgrounds");
  const targetDir = path.join(distDir, "assets/backgrounds");
  const publishableNames = new Set([
    "forest-bg-option-6.webp",
    "forest-bg-option-6-lqip.jpg"
  ]);

  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });
    const publishableImages = files.filter((file) => file.isFile() && publishableNames.has(file.name));
    if (!publishableImages.length) return;

    await fs.mkdir(targetDir, { recursive: true });
    await Promise.all(publishableImages.map((file) => fs.copyFile(path.join(sourceDir, file.name), path.join(targetDir, file.name))));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function copyVendorAssets() {
  const source = path.join(rootDir, "node_modules/html2canvas/dist/html2canvas.esm.js");
  const target = path.join(distDir, "assets/vendor/html2canvas.esm.js");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

const birds = JSON.parse(await fs.readFile(path.join(rootDir, "assets/meta/birds.json"), "utf8"));
await fs.writeFile(
  path.join(rootDir, "assets/meta/birds-data.js"),
  `window.BIRD_SIGN_DATA = ${JSON.stringify(birds, null, 2)};\n`,
  "utf8"
);

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(path.join(distDir, "assets"), { recursive: true });

await Promise.all([
  fs.copyFile(path.join(rootDir, "index.html"), path.join(distDir, "index.html")),
  fs.copyFile(path.join(rootDir, "styles.css"), path.join(distDir, "styles.css")),
  fs.copyFile(path.join(rootDir, "styles.css"), path.join(distDir, "styles-20260617-home-fit.css")),
  fs.copyFile(path.join(rootDir, "styles.css"), path.join(distDir, "styles-20260617-share-fix.css")),
  fs.copyFile(path.join(rootDir, "script.js"), path.join(distDir, "script.js")),
  fs.copyFile(path.join(rootDir, "script.js"), path.join(distDir, "script-20260617-rank-sort.js")),
  fs.copyFile(path.join(rootDir, "script.js"), path.join(distDir, "script-20260617-share-fix.js")),
  fs.copyFile(path.join(rootDir, "script.js"), path.join(distDir, "script-20260617-detail-canvas.js")),
  fs.copyFile(path.join(rootDir, "site.webmanifest"), path.join(distDir, "site.webmanifest")),
  fs.copyFile(path.join(rootDir, "sw.js"), path.join(distDir, "sw.js")),
  fs.copyFile(path.join(rootDir, "assets/unopened-bird-egg.png"), path.join(distDir, "assets/unopened-bird-egg.png")),
  copyIfExists(path.join(rootDir, "assets/birds-final-webp"), path.join(distDir, "assets/birds-final-webp")),
  copyBackgroundAssets(),
  copyAmbientAudioAssets(),
  copyIfExists(path.join(rootDir, "assets/icons"), path.join(distDir, "assets/icons")),
  copyIfExists(path.join(rootDir, "assets/meta"), path.join(distDir, "assets/meta")),
  copyVendorAssets(),
  copyAudioAssets()
]);

console.log(`Built dist/ with ${birds.length} birds.`);
