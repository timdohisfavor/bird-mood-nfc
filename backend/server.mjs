import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = Number.parseInt(process.env.PORT || "3000", 10);
const birdsDataPath =
  process.env.BIRDS_DATA_PATH ||
  path.resolve(__dirname, "../web/assets/meta/birds.json");
const databaseUrl = process.env.DATABASE_URL;

const pool = await createPool(databaseUrl);

async function createPool(connectionString) {
  if (!connectionString) return null;

  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy(new Error("Request body is too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function ensureDatabase() {
  if (!pool) return { ok: false, reason: "DATABASE_URL is not configured" };

  await pool.query(`
    create table if not exists app_events (
      id bigserial primary key,
      event_type text not null,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);

  return { ok: true };
}

async function checkDatabase() {
  if (!pool) return { ok: false, reason: "DATABASE_URL is not configured" };
  await pool.query("select 1");
  return { ok: true };
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && (requestUrl.pathname === "/health" || requestUrl.pathname === "/api/health")) {
    try {
      const database = await checkDatabase();
      if (!database.ok) {
        sendJson(res, 503, {
          status: "degraded",
          service: "bird-mood-api",
          database: "unavailable",
          message: database.reason
        });
        return;
      }
      sendJson(res, 200, { status: "ok", service: "bird-mood-api", database: "ok" });
    } catch (error) {
      sendJson(res, 503, {
        status: "degraded",
        service: "bird-mood-api",
        database: "unavailable",
        message: error.message
      });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/birds") {
    const birds = JSON.parse(await readFile(birdsDataPath, "utf8"));
    sendJson(res, 200, { birds });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/events") {
    if (!pool) {
      sendJson(res, 503, { error: "Database is not configured" });
      return;
    }

    const rawBody = await readBody(req);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const eventType = typeof payload.type === "string" ? payload.type : "unknown";

    const result = await pool.query(
      "insert into app_events (event_type, payload) values ($1, $2) returning id, created_at",
      [eventType, payload]
    );

    sendJson(res, 201, { event: result.rows[0] });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/stats") {
    if (!pool) {
      sendJson(res, 503, { error: "Database is not configured" });
      return;
    }

    const result = await pool.query("select count(*)::int as events from app_events");
    sendJson(res, 200, { events: result.rows[0].events });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

await ensureDatabase().catch((error) => {
  console.warn(`Database initialization skipped: ${error.message}`);
});

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, { error: error.message });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Bird mood API listening on ${port}`);
});
