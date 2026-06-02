import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = Number.parseInt(process.env.PORT || "3000", 10);
const birdsDataPath =
  process.env.BIRDS_DATA_PATH ||
  path.resolve(__dirname, "../assets/meta/birds.json");
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

function sendInternalError(res, error) {
  console.error(error);
  sendJson(res, 500, { error: "Internal server error" });
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

function parseJsonPayload(rawBody) {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof SyntaxError) {
      error.statusCode = 400;
      error.publicMessage = "Malformed JSON";
    }
    throw error;
  }
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

  await pool.query(`
    create table if not exists visitor_progress (
      visitor_id text primary key,
      recovery_code text unique not null,
      unlocked_birds jsonb not null default '[]'::jsonb,
      daily_draws jsonb not null default '{}'::jsonb,
      last_draw_date text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await pool.query(`
    create or replace function merge_unlocked_birds(existing jsonb, incoming jsonb)
    returns jsonb
    language sql
    stable
    as $$
      select coalesce(
        jsonb_agg(jsonb_build_object('id', id, 'unlockedAt', unlocked_at) order by unlocked_at),
        '[]'::jsonb
      )
      from (
        select id, min(unlocked_at) as unlocked_at
        from (
          select
            item->>'id' as id,
            (item->>'unlockedAt')::bigint as unlocked_at
          from jsonb_array_elements(coalesce(existing, '[]'::jsonb)) as item
          union all
          select
            item->>'id' as id,
            (item->>'unlockedAt')::bigint as unlocked_at
          from jsonb_array_elements(coalesce(incoming, '[]'::jsonb)) as item
        ) all_items
        where id is not null and id <> '' and unlocked_at is not null
        group by id
      ) merged
    $$;
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

  if (requestUrl.pathname === "/api/progress") {
    if (!pool) {
      sendJson(res, 503, { error: "Database is not configured" });
      return;
    }

    if (req.method === "GET") {
      const visitorId = cleanId(requestUrl.searchParams.get("visitorId"));
      const recoveryCode = cleanRecoveryCode(requestUrl.searchParams.get("recoveryCode"));

      if (!visitorId && !recoveryCode) {
        sendJson(res, 400, { error: "visitorId or recoveryCode is required" });
        return;
      }

      const result = recoveryCode
        ? await pool.query("select * from visitor_progress where recovery_code = $1", [recoveryCode])
        : await pool.query("select * from visitor_progress where visitor_id = $1", [visitorId]);

      if (!result.rows.length) {
        sendJson(res, 404, { error: "Progress not found" });
        return;
      }

      sendJson(res, 200, { progress: formatProgress(result.rows[0]) });
      return;
    }

    if (req.method === "PUT") {
      const rawBody = await readBody(req);
      const payload = parseJsonPayload(rawBody);
      const visitorId = cleanId(payload.visitorId);

      if (!visitorId) {
        sendJson(res, 400, { error: "visitorId is required" });
        return;
      }

      const unlockedBirds = normalizeUnlockedBirds(payload.unlockedBirds);
      const dailyDraws = normalizeDailyDraws(payload.dailyDraws);
      const lastDrawDate = typeof payload.lastDrawDate === "string" ? payload.lastDrawDate.slice(0, 20) : null;

      const result = await pool.query(
        `
          insert into visitor_progress (
            visitor_id,
            recovery_code,
            unlocked_birds,
            daily_draws,
            last_draw_date
          )
          values ($1, $2, $3::jsonb, $4::jsonb, $5)
          on conflict (visitor_id) do update set
            unlocked_birds = merge_unlocked_birds(visitor_progress.unlocked_birds, excluded.unlocked_birds),
            daily_draws = visitor_progress.daily_draws || excluded.daily_draws,
            last_draw_date = coalesce(excluded.last_draw_date, visitor_progress.last_draw_date),
            updated_at = now()
          returning *
        `,
        [
          visitorId,
          makeRecoveryCode(visitorId),
          JSON.stringify(unlockedBirds),
          JSON.stringify(dailyDraws),
          lastDrawDate
        ]
      );

      sendJson(res, 200, { progress: formatProgress(result.rows[0]) });
      return;
    }
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/events") {
    if (!pool) {
      sendJson(res, 503, { error: "Database is not configured" });
      return;
    }

    const rawBody = await readBody(req);
    const payload = parseJsonPayload(rawBody);
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

function cleanId(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function cleanRecoveryCode(value) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

function makeRecoveryCode(visitorId) {
  var clean = cleanId(visitorId).toUpperCase().replace(/[^A-Z0-9]/g, "");
  var base = clean.slice(-12).padStart(12, "0");
  return `BIRD${base}`;
}

function normalizeUnlockedBirds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const id = cleanId(typeof entry === "string" ? entry : entry?.id);
      if (!id) return null;
      const unlockedAt = Number.isFinite(entry?.unlockedAt) ? entry.unlockedAt : Date.now();
      return { id, unlockedAt };
    })
    .filter(Boolean)
    .slice(0, 200);
}

function normalizeDailyDraws(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([date, id]) => [String(date).slice(0, 20), cleanId(id)])
      .filter(([date, id]) => date && id)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-366)
  );
}

function formatProgress(row) {
  return {
    visitorId: row.visitor_id,
    recoveryCode: row.recovery_code,
    unlockedBirds: Array.isArray(row.unlocked_birds) ? row.unlocked_birds : [],
    dailyDraws: row.daily_draws && typeof row.daily_draws === "object" ? row.daily_draws : {},
    lastDrawDate: row.last_draw_date || null,
    updatedAt: row.updated_at
  };
}

await ensureDatabase().catch((error) => {
  console.warn(`Database initialization skipped: ${error.message}`);
});

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    if (error.statusCode && error.publicMessage) {
      sendJson(res, error.statusCode, { error: error.publicMessage });
      return;
    }
    sendInternalError(res, error);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Bird mood API listening on ${port}`);
});
