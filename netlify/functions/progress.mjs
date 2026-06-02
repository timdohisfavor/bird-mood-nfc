import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
let pool;

function getPool() {
  if (!databaseUrl) return null;
  if (!pool) pool = new pg.Pool({ connectionString: databaseUrl });
  return pool;
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function parseJsonPayload(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      error.statusCode = 400;
      error.publicMessage = "Malformed JSON";
    }
    throw error;
  }
}

async function ensureDatabase(db) {
  await db.query(`
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

  await db.query(`
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
}

export async function handler(event) {
  const db = getPool();
  if (!db) return json(503, { error: "Database is not configured" });

  try {
    await ensureDatabase(db);

    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const visitorId = cleanId(params.visitorId);
      const recoveryCode = cleanRecoveryCode(params.recoveryCode);

      if (!visitorId && !recoveryCode) return json(400, { error: "visitorId or recoveryCode is required" });

      const result = recoveryCode
        ? await db.query("select * from visitor_progress where recovery_code = $1", [recoveryCode])
        : await db.query("select * from visitor_progress where visitor_id = $1", [visitorId]);

      if (!result.rows.length) return json(404, { error: "Progress not found" });
      return json(200, { progress: formatProgress(result.rows[0]) });
    }

    if (event.httpMethod === "PUT") {
      const payload = parseJsonPayload(event.body);
      const visitorId = cleanId(payload.visitorId);
      if (!visitorId) return json(400, { error: "visitorId is required" });

      const result = await db.query(
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
          JSON.stringify(normalizeUnlockedBirds(payload.unlockedBirds)),
          JSON.stringify(normalizeDailyDraws(payload.dailyDraws)),
          typeof payload.lastDrawDate === "string" ? payload.lastDrawDate.slice(0, 20) : null
        ]
      );

      return json(200, { progress: formatProgress(result.rows[0]) });
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    if (error.statusCode && error.publicMessage) return json(error.statusCode, { error: error.publicMessage });
    console.error("Progress handler error:", error);
    return json(500, { error: "Internal server error" });
  }
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
