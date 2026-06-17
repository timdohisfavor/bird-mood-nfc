import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(".");
const distDir = path.join(rootDir, "dist");

const forbiddenNames = new Set([
  ".env",
  ".git",
  ".netlify",
  "Dockerfile",
  "docker-compose.yml",
  "package.json",
  "package-lock.json",
  "project.config.json",
  "project.private.config.json",
  "requirements.txt"
]);

const forbiddenDirs = new Set(["backend", "docker", "docs", "outputs", "pages", "scripts", "node_modules", ".git", "__pycache__", ".workbuddy"]);
const forbiddenFilePatterns = [/\.zip$/i, /^tmp-/i, /\.log$/i, /^AGENTS\.md$/i, /^README\.md$/i, /\.py$/i, /\.sh$/i, /\.mjs$/i, /\.ts$/i, /\.tsx$/i, /\.jsx$/i, /\.map$/i, /\.DS_Store$/i, /Thumbs\.db$/i, /\.bak$/i, /\.swp$/i, /\.swo$/i, /~$/i, /\.tmp$/i, /\.temp$/i, /\.orig$/i];
const allowedRootFiles = new Set([
  "index.html",
  "script.js",
  "script-20260617-rank-sort.js",
  "script-20260617-share-fix.js",
  "script-20260617-detail-canvas.js",
  "script-20260617-poster-canvas.js",
  "styles.css",
  "styles-20260617-home-fit.css",
  "styles-20260617-share-fix.css",
  "site.webmanifest",
  "sw.js"
]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(distDir, absolutePath);

    if (entry.isDirectory()) {
      files.push({ path: relativePath, name: entry.name, directory: true });
      files.push(...(await walk(absolutePath)));
      continue;
    }

    files.push({ path: relativePath, name: entry.name, directory: false });
  }

  return files;
}

try {
  await fs.access(distDir);
} catch {
  throw new Error("dist/ does not exist. Run npm run build first.");
}

const entries = await walk(distDir);
const violations = entries.filter((entry) => {
  const parts = entry.path.split(path.sep);

  if (entry.directory) {
    return forbiddenDirs.has(entry.name) || forbiddenNames.has(entry.name);
  }

  if (forbiddenNames.has(entry.name)) return true;
  if (parts.some((part) => forbiddenDirs.has(part))) return true;
  if (forbiddenFilePatterns.some((pattern) => pattern.test(entry.name))) return true;

  const isRootFile = parts.length === 1;
  if (isRootFile && !allowedRootFiles.has(entry.name)) return true;

  return false;
});

if (violations.length) {
  throw new Error(`dist/ contains forbidden publish files:\n${violations.map((entry) => `- ${entry.path}`).join("\n")}`);
}

console.log(`dist/ publish check passed (${entries.filter((entry) => !entry.directory).length} files).`);
