import { access, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = path.resolve(".");
const sourceDir = path.join(rootDir, "assets/birds-final");
const outputDir = path.join(rootDir, "assets/birds-final-webp");
const quality = "78";

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findMagick() {
  const candidates = [
    process.env.MAGICK_BIN,
    "/opt/homebrew/bin/magick",
    "/usr/local/bin/magick",
    "magick"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes("/") && !(await fileExists(candidate))) continue;
    return candidate;
  }

  throw new Error("ImageMagick was not found. Install it with: brew install imagemagick");
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

const magick = await findMagick();
await mkdir(outputDir, { recursive: true });

const files = (await readdir(sourceDir))
  .filter((file) => file.endsWith(".png"))
  .sort();

let originalBytes = 0;
let webpBytes = 0;

for (const file of files) {
  const sourcePath = path.join(sourceDir, file);
  const outputPath = path.join(outputDir, file.replace(/\.png$/, ".webp"));

  await run(magick, [
    sourcePath,
    "-strip",
    "-quality",
    quality,
    "-define",
    "webp:method=6",
    outputPath
  ]);

  originalBytes += (await stat(sourcePath)).size;
  webpBytes += (await stat(outputPath)).size;
}

const saved = originalBytes - webpBytes;
const percent = originalBytes ? Math.round((saved / originalBytes) * 100) : 0;

console.log(`Converted ${files.length} bird images to WebP.`);
console.log(`PNG: ${(originalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`WebP: ${(webpBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Saved: ${(saved / 1024 / 1024).toFixed(2)} MB (${percent}%)`);
