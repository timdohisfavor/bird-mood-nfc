import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4180);

const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, { "Content-Type": types.get(path.extname(filePath)) || "application/octet-stream" });
    response.end(body);
  });
}

function resolveFile(url) {
  const requestUrl = new URL(url, `http://${host}:${port}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/" || pathname.startsWith("/nfc/")) {
    pathname = "/index.html";
  }

  const filePath = path.normalize(path.join(distDir, pathname));
  if (!filePath.startsWith(distDir)) {
    return path.join(distDir, "index.html");
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  sendFile(response, resolveFile(request.url || "/"));
});

server.listen(port, host, () => {
  console.log(`Serving dist on http://${host}:${port}/`);
  console.log(`NFC fallback preview: http://${host}:${port}/nfc/demo-tag`);
});
