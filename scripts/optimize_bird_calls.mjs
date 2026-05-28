import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = path.resolve(".");
const sourceDir = path.join(rootDir, "assets/bird-calls");
const backupDir = path.join(rootDir, "assets/bird-calls-original");
const tempDir = path.join(rootDir, "assets/bird-calls-optimized-tmp");
const maxDurationSeconds = 8;
const fadeDurationSeconds = 0.5;
const audioBitrate = "96k";
const sampleRate = "44100";

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

      reject(new Error(`${command} exited with ${code}\n${stderr}`));
    });
  });
}

async function assertFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
  } catch {
    throw new Error("ffmpeg is required to optimize bird call audio.");
  }
}

async function getMp3Files() {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".mp3")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function ensureOriginalBackup(files) {
  await fs.mkdir(backupDir, { recursive: true });

  for (const file of files) {
    const backupPath = path.join(backupDir, file);
    try {
      await fs.access(backupPath);
    } catch {
      await fs.copyFile(path.join(sourceDir, file), backupPath);
    }
  }
}

async function optimizeFile(file) {
  const input = path.join(sourceDir, file);
  const output = path.join(tempDir, file);
  const fadeStart = maxDurationSeconds - fadeDurationSeconds;
  const filter = `atrim=0:${maxDurationSeconds},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeStart}:d=${fadeDurationSeconds}`;

  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    input,
    "-vn",
    "-t",
    String(maxDurationSeconds),
    "-af",
    filter,
    "-ac",
    "1",
    "-ar",
    sampleRate,
    "-b:a",
    audioBitrate,
    output
  ]);
}

await assertFfmpeg();

const files = await getMp3Files();
if (!files.length) {
  throw new Error(`No mp3 files found in ${sourceDir}`);
}

await ensureOriginalBackup(files);
await fs.rm(tempDir, { recursive: true, force: true });
await fs.mkdir(tempDir, { recursive: true });

for (const file of files) {
  await optimizeFile(file);
}

for (const file of files) {
  await fs.rename(path.join(tempDir, file), path.join(sourceDir, file));
}

await fs.rm(tempDir, { recursive: true, force: true });

console.log(`Optimized ${files.length} bird call mp3 files to ${maxDurationSeconds}s ${audioBitrate} mono.`);
console.log(`Original backup: ${path.relative(rootDir, backupDir)}/`);
