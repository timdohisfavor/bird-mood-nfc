import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
await loadEnvFiles([
  path.join(rootDir, '.env.local'),
  path.join(rootDir, '.env'),
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '.env'),
]);

const port = Number(process.env.JOYIBIRD_PORT || process.env.PORT || 8099);
let testDateKey = process.env.JOYIBIRD_DATE_KEY || '';
const todayKey = () => testDateKey || new Date().toISOString().slice(0, 10);
const databaseUrl = resolveDatabaseUrl();
const databaseSchema = normalizeDatabaseSchema(process.env.JOYIBIRD_DB_SCHEMA || 'public');
const useDatabase = process.env.JOYIBIRD_USE_DB === '1';
const pool = useDatabase ? new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.JOYIBIRD_DB_POOL_MAX || 10),
  options: `-c search_path=${databaseSchema},public`,
}) : null;

const llmConfig = {
  provider: process.env.JOYIBIRD_LLM_PROVIDER || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : (process.env.OPENAI_API_KEY ? 'openai' : 'mock')),
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
  baseUrl: (process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
  model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'deepseek-v4-flash',
};

const birds = JSON.parse(
  await readFile(path.join(rootDir, 'assets/meta/birds.json'), 'utf8'),
);

const seedRedeemCodes = [
  ['1001', 'issued', 'V0.1 内测默认兑换码'],
  ['1002', 'issued', '老支架用户兑换码'],
  ['1003', 'created', '备用兑换码'],
];

const state = {
  users: new Map(),
  sessions: new Map(),
  pets: new Map(),
  redeemCodes: new Map(seedRedeemCodes.map(([code, status, note]) => [code, {
    id: crypto.randomUUID(),
    code,
    status,
    issued_to_note: note,
    order_source: 'manual',
    order_note: '',
    redeemed_user_id: null,
    redeemed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }])),
  quotas: new Map(),
  signs: new Map(),
  dailyCares: new Map(),
  dailyEvents: new Map(),
  birdMemories: new Map(),
  chatMessages: [],
  visits: [],
  relationships: new Map(),
  auditLogs: [],
};

function nowIso() {
  return new Date().toISOString();
}

// ── V0.2 mood system ──
const MOODS = ['sleepy', 'bright', 'quiet', 'waiting', 'messy', 'cozy'];
const MOOD_NARRATIONS = {
  sleepy: { label: '困困', text: '它今天把脑袋埋进羽毛里。', story: '昨晚窗外的路灯太亮了，它啄了半晚上的窗帘，现在困得不行。' },
  bright: { label: '亮亮', text: '它好像发现了一点好事。', story: '早上窗台上来了一只蜜蜂，它好奇地看了很久，现在心情很好。' },
  quiet:  { label: '安静', text: '它今天话不多，但一直在。', story: '今天外面下着小雨，它就在窗边静静地听雨声。' },
  waiting:{ label: '等你', text: '它在窗边站了一会儿。', story: '它今天在窗台上走了好几个来回，每次有动静就抬头看一眼。' },
  messy:  { label: '乱乱', text: '它的羽毛有点翘。', story: '它刚才扑腾着整理羽毛，结果越整理越乱，干脆不管了。' },
  cozy:   { label: '暖暖', text: '它轻轻靠近了一点。', story: '它把自己缩成一个圆圆的毛球，看起来特别暖和。' },
};

const BOND_LEVELS = [
  { level: 1, name: '刚认识', min: 0, max: 2 },
  { level: 2, name: '会等你', min: 3, max: 6 },
  { level: 3, name: '认得你的脚步声', min: 7, max: 14 },
  { level: 4, name: '把你当窝边的人', min: 15, max: 999 },
];

function computeBondLevel(score) {
  return BOND_LEVELS.find((b) => score >= b.min && score <= b.max) || BOND_LEVELS[0];
}

function syncBondLevel(pet) {
  const bondLevel = computeBondLevel(pet?.bond_score || 0);
  if (pet) {
    pet.bond_level = bondLevel.level;
    pet.bond_name = bondLevel.name;
  }
  return bondLevel;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function yesterdayKey(dateKey = todayKey()) {
  return addDays(dateKey, -1);
}

// ── V0.2 random daily events ──
const DAILY_EVENT_POOL = [
  { type: 'carrying_leaf', text: '它叼回来一片亮亮的叶子。', emoji: '🍃' },
  { type: 'carrying_pebble', text: '它在窗台上发现了一颗小石头，叼回来给你看。', emoji: '🪨' },
  { type: 'carrying_petal', text: '它从窗台叼来一片花瓣，轻轻放在你常坐的地方。', emoji: '🌸' },
  { type: 'found_shiny', text: '它不知道从哪叼来一小片亮晶晶的东西，很得意。', emoji: '✨' },
  { type: 'stared_outside', text: '它今天对着窗外看了很久，好像在等什么有趣的事。', emoji: '🪟' },
  { type: 'chirped_softly', text: '它今天轻轻唱了几句，好像是自己编的调子。', emoji: '🎵' },
];

async function triggerDailyEvent(userId) {
  const dateKey = todayKey();
  if (!useDatabase) {
    const key = `${userId}:${dateKey}`;
    if (state.dailyEvents.has(key)) return state.dailyEvents.get(key);
    const roll = Math.random();
    if (roll > 0.20) return null;
    const event = DAILY_EVENT_POOL[Math.floor(Math.random() * DAILY_EVENT_POOL.length)];
    const dailyEvent = {
      id: crypto.randomUUID(),
      user_id: userId,
      date_key: dateKey,
      type: event.type,
      text: event.text,
      emoji: event.emoji,
      created_at: nowIso(),
    };
    state.dailyEvents.set(key, dailyEvent);
    return dailyEvent;
  }
  const existing = await dbQuery('select * from daily_events where user_id = $1 and date_key = $2', [userId, dateKey]);
  if (existing.rows[0]) return existing.rows[0];
  const roll = Math.random();
  if (roll > 0.20) return null;
  const event = DAILY_EVENT_POOL[Math.floor(Math.random() * DAILY_EVENT_POOL.length)];
  const inserted = await dbQuery(
    `insert into daily_events (id, user_id, date_key, type, text, emoji, created_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (user_id, date_key) do nothing
     returning *`,
    [crypto.randomUUID(), userId, dateKey, event.type, event.text, event.emoji],
  );
  return inserted.rows[0] || null;
}

async function getOrCreateDailyCare(userId) {
  const dateKey = todayKey();
  if (!useDatabase) {
    const key = `${userId}:${dateKey}`;
    if (!state.dailyCares.has(key)) {
      state.dailyCares.set(key, {
        id: crypto.randomUUID(),
        user_id: userId,
        date_key: dateKey,
        sign_opened: false,
        chat_done: false,
        care_done: false,
        updated_at: nowIso(),
      });
    }
    return state.dailyCares.get(key);
  }
  const inserted = await dbQuery(
    `insert into daily_cares (id, user_id, date_key, sign_opened, chat_done, care_done, updated_at)
     values ($1, $2, $3, false, false, false, now())
     on conflict (user_id, date_key) do nothing
     returning *`,
    [crypto.randomUUID(), userId, dateKey],
  );
  if (inserted.rows[0]) return inserted.rows[0];
  const result = await dbQuery('select * from daily_cares where user_id = $1 and date_key = $2', [userId, dateKey]);
  return result.rows[0];
}

async function getRecentBirdMemories(userId) {
  if (!useDatabase) {
    return [...state.birdMemories.values()]
      .filter((memory) => memory.user_id === userId)
      .sort((a, b) => b.date_key.localeCompare(a.date_key))
      .slice(0, 7);
  }
  const result = await dbQuery(
    'select * from bird_memories where user_id = $1 order by date_key desc limit 7',
    [userId],
  );
  return result.rows;
}

function shortText(text, limit) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[“”"'\n\r]/g, '')
    .slice(0, limit);
}

function summarizeBirdMemory(content) {
  const clean = shortText(content, 24);
  if (!clean) return '';
  if (/累|困|疲惫|睡不着|没精神/.test(clean)) return '你说自己有点累';
  if (/开心|高兴|顺利|喜欢|期待/.test(clean)) return '你分享了一件开心事';
  if (/焦虑|烦|压力|难受|崩|乱/.test(clean)) return '你说心里有点乱';
  if (/孤单|没人|想哭|委屈/.test(clean)) return '你说今天有点委屈';
  if (/工作|上班|开会|项目|作业|考试/.test(clean)) return '你聊到了今天的任务';
  return `你说${clean}`.slice(0, 30);
}

async function rememberBirdChat(user, pet, content, reply) {
  const dateKey = todayKey();
  const summary = summarizeBirdMemory(content, reply);
  if (!summary) return null;
  if (!useDatabase) {
    const key = `${user.id}:${dateKey}`;
    if (!state.birdMemories.has(key)) {
      state.birdMemories.set(key, {
        id: crypto.randomUUID(),
        user_id: user.id,
        pet_id: pet.id,
        date_key: dateKey,
        summary: summary.slice(0, 30),
        created_at: nowIso(),
      });
      const memories = [...state.birdMemories.values()]
        .filter((memory) => memory.user_id === user.id)
        .sort((a, b) => b.date_key.localeCompare(a.date_key));
      memories.slice(7).forEach((memory) => state.birdMemories.delete(`${memory.user_id}:${memory.date_key}`));
    }
    return state.birdMemories.get(key) || null;
  }
  const inserted = await dbQuery(
    `insert into bird_memories (id, user_id, pet_id, date_key, summary, created_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (user_id, date_key) do nothing
     returning *`,
    [crypto.randomUUID(), user.id, pet.id, dateKey, summary.slice(0, 30)],
  );
  if (inserted.rows[0]) return inserted.rows[0];
  const existing = await dbQuery('select * from bird_memories where user_id = $1 and date_key = $2', [user.id, dateKey]);
  return existing.rows[0] || null;
}

async function getYesterdayMemory(userId, dateKey = todayKey()) {
  if (!useDatabase) {
    return state.birdMemories.get(`${userId}:${yesterdayKey(dateKey)}`) || null;
  }
  const result = await dbQuery(
    'select * from bird_memories where user_id = $1 and date_key = $2',
    [userId, yesterdayKey(dateKey)],
  );
  return result.rows[0] || null;
}

function inferMoodFromChat(content, reply, currentMood = 'quiet') {
  const text = `${content} ${reply}`.toLowerCase();
  if (/开心|高兴|顺利|喜欢|期待|太好了|谢谢|安心/.test(text)) return 'bright';
  if (/累|困|疲惫|睡不着|没精神|好晚/.test(text)) return 'sleepy';
  if (/焦虑|烦|压力|难受|崩|乱|生气/.test(text)) return 'messy';
  if (/孤单|没人|想哭|委屈|想你/.test(text)) return 'waiting';
  if (/慢慢|陪|抱|在这里|听见/.test(text)) return 'cozy';
  return currentMood === 'sleepy' ? 'sleepy' : 'cozy';
}

async function buildChatOpening(user, pet) {
  const mood = pet.mood || 'quiet';
  const bondLevel = syncBondLevel(pet);
  const moodLine = {
    sleepy: '我今天有点困，但听到你来就抬头了。',
    bright: '我今天亮亮的，想先听听你的声音。',
    quiet: '我今天话不多，但会认真听你说。',
    waiting: '我刚才在窗边等了一会儿，你来了。',
    messy: '我羽毛还有点乱，不过可以先陪你坐着。',
    cozy: '我把位置挪近了一点，慢慢说就好。',
  }[mood] || '我在这里，慢慢说就好。';
  const bondLine = bondLevel.level >= 4
    ? '我已经很认得你的脚步声了。'
    : bondLevel.level >= 3
      ? '我刚才还在想你今天会不会来。'
      : bondLevel.level >= 2
        ? '你可以直接说，我会听着。'
        : '我们可以从一句很小的话开始。';
  const memory = await getYesterdayMemory(user.id);
  const memoryText = memory ? `昨天${memory.summary}，我还记得一点点。` : '';
  return {
    mood,
    mood_label: MOOD_NARRATIONS[mood]?.label || '安静',
    bond_level: bondLevel.level,
    bond_name: bondLevel.name,
    text: [memoryText, moodLine, bondLine].filter(Boolean).join(' '),
    yesterdayMemory: memory,
    memory_text: memoryText,
  };
}

const defaultPetBirdIds = [
  'long-tailed-tit',
  'common-kingfisher',
  'brown-shrike',
  'red-tailed-shrike',
  'red-headed-tit',
  'chestnut-flanked-white-eye',
];

const seedCodeBirdIds = {
  1001: 'long-tailed-tit',
  1002: 'common-kingfisher',
  1003: 'brown-shrike',
};

const petActionKeys = [
  'idle',
  'happy',
  'talking',
  'sleepy',
  'waiting',
  'reward',
  'waking',
  'carrying',
  'shy',
  'rainy',
  'miss',
];

const petAssets = Object.fromEntries(
  defaultPetBirdIds.map((id) => {
    const assetSet = Object.fromEntries(
      petActionKeys.map((action) => [action, `/assets/pets/${id}/${action}.png`]),
    );
    return [id, {
      home: `/assets/pets/${id}/home.png`,
      assetSet,
    }];
  }),
);

async function loadEnvFiles(files) {
  for (const file of files) {
    let raw = '';
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      continue;
    }
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) return;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    });
  }
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1';
  const dbPort = process.env.PGPORT || process.env.POSTGRES_PORT || '15432';
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'birdsign';
  const user = process.env.PGUSER || process.env.POSTGRES_USER || 'birdsign';
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'birdsign';
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${dbPort}/${database}`;
}

function normalizeDatabaseSchema(schema) {
  const value = String(schema || 'public').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid JOYIBIRD_DB_SCHEMA: ${value}`);
  }
  return value;
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

async function dbQuery(sql, params = []) {
  if (!useDatabase) {
    throw new Error(`Database is disabled for this server run: ${String(sql).slice(0, 80)}`);
  }
  return pool.query(sql, params);
}

async function initDatabase() {
  const client = await pool.connect();
  try {
    if (process.env.JOYIBIRD_DB_RESET === '1' && databaseSchema !== 'public') {
      await client.query(`drop schema if exists ${quoteIdent(databaseSchema)} cascade`);
    }
    await client.query(`create schema if not exists ${quoteIdent(databaseSchema)}`);
    await client.query(`set search_path to ${quoteIdent(databaseSchema)}, public`);
    const initSql = await readFile(path.join(rootDir, 'docker/db/init.sql'), 'utf8');
    await client.query(initSql);
    await client.query(`
      alter table pets add column if not exists persona_prompt text not null default '';
      alter table pets add column if not exists mood text not null default 'quiet';
      alter table pets add column if not exists mood_text text not null default '它今天话不多，但一直在。';
      alter table pets add column if not exists bond_score integer not null default 0;
      alter table pets add column if not exists feather_count integer not null default 0;
      alter table pets add column if not exists last_interaction_at timestamptz;

      create table if not exists sessions (
        token text primary key,
        user_id uuid not null references users(id) on delete cascade,
        created_at timestamptz not null default now()
      );

      create table if not exists daily_cares (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        date_key text not null,
        sign_opened boolean not null default false,
        chat_done boolean not null default false,
        care_done boolean not null default false,
        updated_at timestamptz not null default now(),
        unique(user_id, date_key)
      );

      create table if not exists daily_events (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        date_key text not null,
        type text not null,
        text text not null,
        emoji text not null default '',
        created_at timestamptz not null default now(),
        unique(user_id, date_key)
      );

      create table if not exists bird_memories (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        pet_id uuid not null references pets(id) on delete cascade,
        date_key text not null,
        summary text not null,
        created_at timestamptz not null default now(),
        unique(user_id, date_key)
      );
    `);
    for (const [code, status, note] of seedRedeemCodes) {
      await client.query(
        `insert into redeem_codes (
          id, code, status, issued_to_note, order_source, order_note, redeemed_user_id, redeemed_at, created_at, updated_at
        ) values ($1, $2, $3, $4, 'manual', '', null, null, now(), now())
        on conflict (code) do nothing`,
        [crypto.randomUUID(), code, status, note],
      );
    }
  } finally {
    client.release();
  }
}

function normalizeRedeemCode(code) {
  return String(code || '').trim().replace(/\D/g, '').slice(0, 4);
}

async function generateRedeemCode(client = pool) {
  for (let attempt = 0; attempt < 20000; attempt += 1) {
    const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
    if (!useDatabase) {
      if (!state.redeemCodes.has(code)) return code;
      continue;
    }
    const existing = await client.query('select 1 from redeem_codes where code = $1', [code]);
    if (!existing.rowCount) return code;
  }
  throw Object.assign(new Error('No available 4-digit redeem code'), { code: 'CODE_POOL_EXHAUSTED' });
}

function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  });
  res.end(body);
}

function text(res, body, status = 200, type = 'text/html; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

async function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  if (!useDatabase) {
    const userId = state.sessions.get(token);
    return userId ? state.users.get(userId) || null : null;
  }
  const result = await dbQuery(
    `select u.*
     from sessions s
     join users u on u.id = s.user_id
     where s.token = $1`,
    [token],
  );
  return result.rows[0] || null;
}

async function requireUser(req, res) {
  const user = await getUser(req);
  if (!user) {
    json(res, { error: 'UNAUTHORIZED' }, 401);
    return null;
  }
  return user;
}

async function createSession(userId) {
  const token = crypto.randomUUID();
  if (!useDatabase) {
    state.sessions.set(token, userId);
    return token;
  }
  await dbQuery('insert into sessions (token, user_id) values ($1, $2)', [token, userId]);
  return token;
}

async function userPet(userId) {
  if (!useDatabase) {
    return [...state.pets.values()].find((pet) => pet.owner_user_id === userId) || null;
  }
  const result = await dbQuery('select * from pets where owner_user_id = $1', [userId]);
  return result.rows[0] || null;
}

async function getPetById(petId) {
  if (!useDatabase) return state.pets.get(petId) || null;
  const result = await dbQuery('select * from pets where id = $1', [petId]);
  return result.rows[0] || null;
}

async function getUserByIdOrOpenid(id) {
  if (!useDatabase) {
    const needle = String(id || '');
    return [...state.users.values()].find((user) => user.id === needle || user.openid === needle) || null;
  }
  const result = await dbQuery('select * from users where id::text = $1 or openid = $1 limit 1', [String(id || '')]);
  return result.rows[0] || null;
}

function publicPet(pet) {
  if (!pet) return null;
  syncBondLevel(pet);
  const bird = birds.find((item) => item.id === pet.bird_id);
  return { ...pet, bird, petAsset: petAssets[pet.bird_id] || null };
}

async function recentVisitsForPet(petId, limit = 5) {
  if (!useDatabase) {
    return state.visits
      .filter((visit) => visit.to_pet_id === petId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit)
      .map((visit) => ({
        ...visit,
        fromPet: publicPet(state.pets.get(visit.from_pet_id)),
      }));
  }
  const result = await dbQuery(
    `select
       v.*,
       row_to_json(p.*) as from_pet
     from pet_visits v
     left join pets p on p.id = v.from_pet_id
     where v.to_pet_id = $1
     order by v.created_at desc
     limit $2`,
    [petId, limit],
  );
  return result.rows.map(({ from_pet, ...visit }) => ({
    ...visit,
    fromPet: publicPet(from_pet),
  }));
}

async function createUser(openid) {
  if (!useDatabase) {
    const existing = [...state.users.values()].find((user) => user.openid === openid);
    if (existing) {
      existing.last_login_at = nowIso();
      return existing;
    }
    const user = {
      id: crypto.randomUUID(),
      openid,
      unionid: null,
      nickname: `内测用户${state.users.size + 1}`,
      avatar_url: '',
      chat_disabled_at: null,
      created_at: nowIso(),
      last_login_at: nowIso(),
    };
    state.users.set(user.id, user);
    return user;
  }
  const existing = await dbQuery(
    'update users set last_login_at = now() where openid = $1 returning *',
    [openid],
  );
  if (existing.rows[0]) return existing.rows[0];

  const countResult = await dbQuery('select count(*)::integer as count from users');
  const nickname = `内测用户${Number(countResult.rows[0]?.count || 0) + 1}`;
  const created = await dbQuery(
    `insert into users (id, openid, unionid, nickname, avatar_url, chat_disabled_at, created_at, last_login_at)
     values ($1, $2, null, $3, '', null, now(), now())
     returning *`,
    [crypto.randomUUID(), openid, nickname],
  );
  return created.rows[0];
}

async function createPet(user, redeemCodeValue = '', client = pool) {
  const hash = crypto.createHash('sha256').update(user.id).digest();
  const defaultBirds = defaultPetBirdIds
    .map((id) => birds.find((item) => item.id === id))
    .filter(Boolean);
  const birdId = seedCodeBirdIds[redeemCodeValue] || defaultBirds[hash[0] % defaultBirds.length]?.id;
  const bird = birds.find((item) => item.id === birdId) || defaultBirds[0] || birds[0];
  const personalities = ['温柔慢热', '安静可靠', '机灵会安慰人', '嘴硬但关心人', '轻轻陪你待着'];
  const tones = ['短句', '温柔', '不说教', '有一点小鸟感'];
  if (!useDatabase) {
    const pet = {
      id: crypto.randomUUID(),
      owner_user_id: user.id,
      bird_id: bird.id,
      name: `${bird.name}小鸟`,
      personality: personalities[hash[1] % personalities.length],
      tone: tones[hash[2] % tones.length],
      persona_prompt: '',
      mood: 'quiet',
      mood_text: MOOD_NARRATIONS.quiet.text,
      bond_score: 0,
      bond_level: 1,
      feather_count: 0,
      last_interaction_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.pets.set(pet.id, pet);
    return pet;
  }
  const result = await client.query(
    `insert into pets (
      id, owner_user_id, bird_id, name, personality, tone, persona_prompt,
      mood, mood_text, bond_score, feather_count, last_interaction_at, created_at, updated_at
    ) values ($1, $2, $3, $4, $5, $6, '', 'quiet', $7, 0, 0, null, now(), now())
    returning *`,
    [
      crypto.randomUUID(),
      user.id,
      bird.id,
      `${bird.name}小鸟`,
      personalities[hash[1] % personalities.length],
      tones[hash[2] % tones.length],
      MOOD_NARRATIONS.quiet.text,
    ],
  );
  return result.rows[0];
}

async function getOrCreateQuota(userId) {
  const dateKey = todayKey();
  if (!useDatabase) {
    const key = `${userId}:${dateKey}`;
    if (!state.quotas.has(key)) {
      state.quotas.set(key, {
        id: crypto.randomUUID(),
        user_id: userId,
        date_key: dateKey,
        free_limit: 5,
        used_count: 0,
        updated_at: nowIso(),
      });
    }
    return state.quotas.get(key);
  }
  const inserted = await dbQuery(
    `insert into chat_quotas (id, user_id, date_key, free_limit, used_count, updated_at)
     values ($1, $2, $3, 5, 0, now())
     on conflict (user_id, date_key) do nothing
     returning *`,
    [crypto.randomUUID(), userId, dateKey],
  );
  if (inserted.rows[0]) return inserted.rows[0];
  const result = await dbQuery('select * from chat_quotas where user_id = $1 and date_key = $2', [userId, dateKey]);
  return result.rows[0];
}

async function getOrCreateSign(user, pet) {
  const dateKey = todayKey();
  const bird = birds.find((item) => item.id === pet.bird_id) || birds[0];
  const quote = String(bird.quote || '今天适合慢慢来。').split('\n');
  if (!useDatabase) {
    const key = `${user.id}:${dateKey}`;
    if (!state.signs.has(key)) {
      state.signs.set(key, {
        id: crypto.randomUUID(),
        user_id: user.id,
        pet_id: pet.id,
        date_key: dateKey,
        sign_title: quote[0]?.replace(/[【】]/g, '') || '今日鸟签',
        sign_text: quote.slice(1).join('\n') || bird.line,
        pet_comment: `我是${pet.name}。今天先把步子放小一点，也算向前。`,
        action_tip: '给自己留十分钟安静时间。',
        created_at: nowIso(),
      });
    }
    return { ...state.signs.get(key), reminder: '不要急着证明什么，先照顾好自己。' };
  }
  const sign = await dbQuery(
    `insert into daily_signs (
      id, user_id, pet_id, date_key, sign_title, sign_text, pet_comment, action_tip, created_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
    on conflict (user_id, date_key) do nothing
    returning *`,
    [
      crypto.randomUUID(),
      user.id,
      pet.id,
      dateKey,
      quote[0]?.replace(/[【】]/g, '') || '今日鸟签',
      quote.slice(1).join('\n') || bird.line,
      `我是${pet.name}。今天先把步子放小一点，也算向前。`,
      '给自己留十分钟安静时间。',
    ],
  );
  if (sign.rows[0]) return { ...sign.rows[0], reminder: '不要急着证明什么，先照顾好自己。' };
  const existing = await dbQuery('select * from daily_signs where user_id = $1 and date_key = $2', [user.id, dateKey]);
  return { ...existing.rows[0], reminder: '不要急着证明什么，先照顾好自己。' };
}

function makeMockAiReply(pet, content) {
  const short = content.length > 80 ? `${content.slice(0, 80)}...` : content;
  const persona = pet.persona_prompt ? `我会记住自己的设定：${pet.persona_prompt}。` : '';
  return `${persona}我听见啦。你说“${short}”。先把肩膀放下来一点，我会在这里陪你待一会儿。`.slice(0, 260);
}

function buildChatPrompt(pet) {
  const bird = birds.find((item) => item.id === pet.bird_id) || {};
  const persona = pet.persona_prompt || [
    `你是用户的小鸟 ${pet.name}。`,
    `鸟种是${bird.name || '小鸟'}，性格是${pet.personality}，口吻是${pet.tone}。`,
    '你会用温柔、简短、不说教的方式陪用户说话。',
  ].join('\n');

  return [
    '你是 JOYIBIRD 小程序里的陪伴型小鸟。',
    '你的任务不是诊断疾病，也不要替代专业心理咨询。',
    '回复要像真实聊天：先接住用户情绪，再给一个很小、今天就能做的建议。',
    '每次回复控制在 80 个中文字符以内。',
    '不要提到自己是 AI，不要输出 markdown。',
    '',
    `小鸟资料：名字=${pet.name}；鸟种=${bird.name || pet.bird_id}；性格=${pet.personality}；口吻=${pet.tone}。`,
    `用户自定义人设：${persona}`,
  ].join('\n');
}

async function callOpenAIChat(pet, messages, content) {
  if (!llmConfig.apiKey) {
    throw Object.assign(new Error('DEEPSEEK_API_KEY or OPENAI_API_KEY is not configured'), { code: 'LLM_NOT_CONFIGURED' });
  }

  const recentMessages = messages.slice(-8).map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const response = await fetch(`${llmConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${llmConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: llmConfig.model,
      messages: [
        { role: 'system', content: buildChatPrompt(pet) },
        ...recentMessages,
        { role: 'user', content },
      ],
      temperature: 0.8,
      max_tokens: 180,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `LLM request failed with ${response.status}`;
    throw Object.assign(new Error(message), { code: 'LLM_REQUEST_FAILED', status: response.status });
  }

  const reply = String(body?.choices?.[0]?.message?.content || '').trim();
  if (!reply) throw Object.assign(new Error('LLM returned empty content'), { code: 'LLM_EMPTY_REPLY' });
  return {
    content: reply.slice(0, 300),
    tokenUsage: Number(body?.usage?.total_tokens || 0),
  };
}

async function makeAiReply(pet, history, content) {
  if (llmConfig.provider === 'mock') {
    return { content: makeMockAiReply(pet, content), tokenUsage: 0, provider: 'mock' };
  }
  const result = await callOpenAIChat(pet, history, content);
  return { ...result, provider: llmConfig.provider };
}

async function addAudit(action, targetType, targetId, before = null, after = null, client = pool) {
  if (!useDatabase) {
    state.auditLogs.push({
      id: crypto.randomUUID(),
      operator: 'Admin_Joyi',
      action,
      target_type: targetType,
      target_id: String(targetId),
      before_json: before,
      after_json: after,
      created_at: nowIso(),
    });
    return;
  }
  await client.query(
    `insert into admin_audit_logs (
      id, operator, action, target_type, target_id, before_json, after_json, created_at
    ) values ($1, 'Admin_Joyi', $2, $3, $4, $5, $6, now())`,
    [crypto.randomUUID(), action, targetType, String(targetId), before, after],
  );
}

function relationshipKey(a, b) {
  return [a, b].sort().join(':');
}

async function updatePet(petId, fields, client = pool) {
  const allowed = new Set([
    'name',
    'personality',
    'tone',
    'persona_prompt',
    'mood',
    'mood_text',
    'bond_score',
    'feather_count',
    'last_interaction_at',
  ]);
  const entries = Object.entries(fields).filter(([key]) => allowed.has(key));
  if (!entries.length) return getPetById(petId);
  if (!useDatabase) {
    const pet = state.pets.get(petId);
    if (!pet) return null;
    entries.forEach(([key, value]) => {
      pet[key] = value;
    });
    pet.updated_at = nowIso();
    return pet;
  }
  const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
  const values = entries.map(([, value]) => value);
  const result = await client.query(
    `update pets set ${assignments.join(', ')}, updated_at = now() where id = $1 returning *`,
    [petId, ...values],
  );
  return result.rows[0] || null;
}

async function listChatMessages(userId, limit = 50) {
  if (!useDatabase) {
    return state.chatMessages
      .filter((message) => message.user_id === userId)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .slice(-limit);
  }
  const result = await dbQuery(
    `select * from (
       select * from chat_messages where user_id = $1 order by created_at desc limit $2
     ) recent
     order by created_at asc`,
    [userId, limit],
  );
  return result.rows;
}

async function insertChatMessage(message, client = pool) {
  if (!useDatabase) {
    const saved = {
      ...message,
      token_usage: message.token_usage || 0,
      created_at: message.created_at || nowIso(),
    };
    state.chatMessages.push(saved);
    return saved;
  }
  const result = await client.query(
    `insert into chat_messages (id, user_id, pet_id, role, content, token_usage, created_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [
      message.id,
      message.user_id,
      message.pet_id,
      message.role,
      message.content,
      message.token_usage || 0,
      message.created_at || new Date(),
    ],
  );
  return { ...result.rows[0], provider: message.provider };
}

async function handleApi(req, res, url) {
  const method = req.method;
  if (method === 'OPTIONS') return json(res, {});

  if (method === 'GET' && url.pathname === '/api/health') {
    if (useDatabase) await dbQuery('select 1');
    return json(res, { ok: true, database: useDatabase ? 'ok' : 'memory' });
  }

  if (method === 'POST' && url.pathname === '/api/auth/wechat-login') {
    const body = await parseBody(req);
    const openid = body.openid || body.code || `mock-openid-${body.mockUser || 'joyi'}`;
    const user = await createUser(openid);
    const token = await createSession(user.id);
    const pet = await userPet(user.id);
    return json(res, { token, user, hasPet: Boolean(pet), pet: publicPet(pet) });
  }

  if (url.pathname === '/api/me') {
    const user = await requireUser(req, res);
    if (!user) return;
    const pet = await userPet(user.id);
    return json(res, { user, pet: publicPet(pet), locked: !pet });
  }

  if (method === 'POST' && url.pathname === '/api/redeem') {
    const user = await requireUser(req, res);
    if (!user) return;
    if (await userPet(user.id)) return json(res, { error: 'USER_ALREADY_HAS_PET' }, 409);
    const body = await parseBody(req);
    const code = normalizeRedeemCode(body.code);
    if (code.length !== 4) return json(res, { error: 'CODE_NOT_FOUND' }, 404);
    if (!useDatabase) {
      const redeemCode = state.redeemCodes.get(code);
      if (!redeemCode) return json(res, { error: 'CODE_NOT_FOUND' }, 404);
      if (redeemCode.status === 'void') return json(res, { error: 'CODE_VOID' }, 409);
      if (redeemCode.status === 'redeemed') return json(res, { error: 'CODE_USED' }, 409);
      const before = { ...redeemCode };
      const pet = await createPet(user, code);
      redeemCode.status = 'redeemed';
      redeemCode.redeemed_user_id = user.id;
      redeemCode.redeemed_at = nowIso();
      redeemCode.updated_at = nowIso();
      await addAudit('redeem_code', 'redeem_code', redeemCode.id, before, { ...redeemCode });
      return json(res, { redeemed: true, pet: publicPet(pet) });
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const codeResult = await client.query('select * from redeem_codes where code = $1 for update', [code]);
      const redeemCode = codeResult.rows[0];
      if (!redeemCode) {
        await client.query('rollback');
        return json(res, { error: 'CODE_NOT_FOUND' }, 404);
      }
      if (redeemCode.status === 'void') {
        await client.query('rollback');
        return json(res, { error: 'CODE_VOID' }, 409);
      }
      if (redeemCode.status === 'redeemed') {
        await client.query('rollback');
        return json(res, { error: 'CODE_USED' }, 409);
      }
      const before = { ...redeemCode };
      const pet = await createPet(user, code, client);
      const redeemed = await client.query(
        `update redeem_codes
         set status = 'redeemed', redeemed_user_id = $1, redeemed_at = now(), updated_at = now()
         where id = $2
         returning *`,
        [user.id, redeemCode.id],
      );
      await addAudit('redeem_code', 'redeem_code', redeemCode.id, before, redeemed.rows[0], client);
      await client.query('commit');
      return json(res, { redeemed: true, pet: publicPet(pet) });
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  if (method === 'PATCH' && url.pathname === '/api/pet/me') {
    const user = await requireUser(req, res);
    if (!user) return;
    const pet = await userPet(user.id);
    if (!pet) return json(res, { error: 'PET_NOT_FOUND' }, 404);
    const body = await parseBody(req);
    const updates = {};
    if (body.name) updates.name = String(body.name).slice(0, 20);
    if (Object.prototype.hasOwnProperty.call(body, 'persona_prompt')) {
      updates.persona_prompt = String(body.persona_prompt || '').trim().slice(0, 500);
    }
    const updatedPet = await updatePet(pet.id, updates);
    return json(res, { pet: publicPet(updatedPet) });
  }

  if (method === 'GET' && url.pathname === '/api/pet/me') {
    const user = await requireUser(req, res);
    if (!user) return;
    const pet = await userPet(user.id);
    if (!pet) return json(res, { pet: null, locked: true });
    const todayCare = await getOrCreateDailyCare(user.id);
    const todayEvent = await triggerDailyEvent(user.id);
    const bondLevel = syncBondLevel(pet);
    const memories = await getRecentBirdMemories(user.id);
    const yesterdayMemory = await getYesterdayMemory(user.id);
    return json(res, {
      pet: publicPet(pet),
      mood: pet.mood || 'quiet',
      mood_text: pet.mood_text || MOOD_NARRATIONS.quiet.text,
      mood_label: MOOD_NARRATIONS[pet.mood]?.label || '安静',
      mood_story: MOOD_NARRATIONS[pet.mood]?.story || MOOD_NARRATIONS.quiet.story,
      bond_score: pet.bond_score || 0,
      bond_level: bondLevel.level,
      bond_name: bondLevel.name,
      feather_count: pet.feather_count || 0,
      last_interaction_at: pet.last_interaction_at || null,
      todayCare,
      todayEvent,
      chatOpening: await buildChatOpening(user, pet),
      latestMemory: memories[0] || null,
      yesterdayMemory,
      birdMemories: memories,
      recentVisits: await recentVisitsForPet(pet.id),
    });
  }

  if (method === 'POST' && url.pathname === '/api/sign/today/open') {
    const user = await requireUser(req, res);
    if (!user) return;
    let pet = await userPet(user.id);
    if (!pet) return json(res, { error: 'PET_NOT_FOUND' }, 404);
    let todayCare = await getOrCreateDailyCare(user.id);
    if (!todayCare.sign_opened) {
      const updates = { feather_count: (pet.feather_count || 0) + 1 };
      if (pet.mood === 'waiting' || pet.mood === 'sleepy') {
        updates.mood = 'bright';
        updates.mood_text = MOOD_NARRATIONS.bright.text;
      }
      pet = await updatePet(pet.id, updates);
      if (!useDatabase) {
        todayCare.sign_opened = true;
        todayCare.care_done = Boolean(todayCare.chat_done);
        todayCare.updated_at = nowIso();
      } else {
        const careResult = await dbQuery(
          `update daily_cares
           set sign_opened = true, care_done = chat_done, updated_at = now()
           where user_id = $1 and date_key = $2
           returning *`,
          [user.id, todayKey()],
        );
        todayCare = careResult.rows[0] || todayCare;
      }
    }
    const bondLevel = syncBondLevel(pet);
    return json(res, {
      pet: publicPet(pet),
      mood: pet.mood,
      mood_text: pet.mood_text,
      mood_label: MOOD_NARRATIONS[pet.mood]?.label || '安静',
      feather_count: pet.feather_count,
      bond_score: pet.bond_score || 0,
      bond_name: bondLevel.name,
      todayCare,
    });
  }

  if (method === 'GET' && url.pathname === '/api/sign/today') {
    const user = await requireUser(req, res);
    if (!user) return;
    const pet = await userPet(user.id);
    if (!pet) return json(res, { error: 'PET_NOT_FOUND' }, 404);
    return json(res, { sign: await getOrCreateSign(user, pet), pet: publicPet(pet) });
  }

  if (method === 'GET' && url.pathname === '/api/chat/quota') {
    const user = await requireUser(req, res);
    if (!user) return;
    return json(res, { quota: await getOrCreateQuota(user.id) });
  }

  if (url.pathname === '/api/chat/messages' && method === 'GET') {
    const user = await requireUser(req, res);
    if (!user) return;
    const pet = await userPet(user.id);
    if (!pet) return json(res, { error: 'PET_NOT_FOUND' }, 404);
    return json(res, {
      messages: await listChatMessages(user.id, 20),
      quota: await getOrCreateQuota(user.id),
      pet: publicPet(pet),
      todayCare: await getOrCreateDailyCare(user.id),
      opening: await buildChatOpening(user, pet),
      birdMemories: await getRecentBirdMemories(user.id),
    });
  }

  if (url.pathname === '/api/chat/messages' && method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return;
    let pet = await userPet(user.id);
    if (!pet) return json(res, { error: 'PET_NOT_FOUND' }, 404);
    if (user.chat_disabled_at) return json(res, { error: 'CHAT_DISABLED' }, 403);
    let quota = await getOrCreateQuota(user.id);
    if (quota.used_count >= quota.free_limit) return json(res, { error: 'QUOTA_EXHAUSTED', quota }, 429);
    const body = await parseBody(req);
    const content = String(body.content || '').trim().slice(0, 300);
    if (!content) return json(res, { error: 'EMPTY_CONTENT' }, 400);
    const history = await listChatMessages(user.id, 50);
    const userMsg = { id: crypto.randomUUID(), user_id: user.id, pet_id: pet.id, role: 'user', content, token_usage: 0, created_at: new Date().toISOString() };
    let reply;
    try {
      reply = await makeAiReply(pet, history, content);
    } catch (error) {
      return json(res, { error: error.code || 'LLM_REQUEST_FAILED', message: error.message }, error.status || 502);
    }
    const aiMsg = {
      id: crypto.randomUUID(),
      user_id: user.id,
      pet_id: pet.id,
      role: 'assistant',
      content: reply.content,
      token_usage: reply.tokenUsage,
      provider: reply.provider,
      created_at: new Date().toISOString(),
    };
    await insertChatMessage(userMsg);
    const savedAiMsg = await insertChatMessage(aiMsg);
    if (!useDatabase) {
      quota.used_count += 1;
      quota.updated_at = nowIso();
    } else {
      const quotaResult = await dbQuery(
        `update chat_quotas
         set used_count = used_count + 1, updated_at = now()
         where id = $1
         returning *`,
        [quota.id],
      );
      quota = quotaResult.rows[0] || quota;
    }
    let todayCare = await getOrCreateDailyCare(user.id);
    const firstChatToday = !todayCare.chat_done;
    const petUpdates = {};
    if (firstChatToday) {
      petUpdates.bond_score = (pet.bond_score || 0) + 1;
      if (!useDatabase) {
        todayCare.chat_done = true;
        todayCare.care_done = Boolean(todayCare.sign_opened);
        todayCare.updated_at = nowIso();
      } else {
        const careResult = await dbQuery(
          `update daily_cares
           set chat_done = true, care_done = sign_opened, updated_at = now()
           where user_id = $1 and date_key = $2
           returning *`,
          [user.id, todayKey()],
        );
        todayCare = careResult.rows[0] || todayCare;
      }
    }
    const nextMood = inferMoodFromChat(content, reply.content, pet.mood);
    petUpdates.mood = nextMood;
    petUpdates.mood_text = MOOD_NARRATIONS[nextMood]?.text || MOOD_NARRATIONS.cozy.text;
    petUpdates.last_interaction_at = aiMsg.created_at;
    pet = await updatePet(pet.id, petUpdates);
    const bondLevel = syncBondLevel(pet);
    const memory = await rememberBirdChat(user, pet, content, reply.content);
    return json(res, {
      message: savedAiMsg,
      quota,
      pet: publicPet(pet),
      todayCare,
      memory,
      bond_delta: firstChatToday ? 1 : 0,
      bond_name: bondLevel.name,
      bond_feedback: firstChatToday ? '它更安心了一点' : '',
    });
  }

  if (url.pathname === '/api/share/pet' && method === 'GET') {
    const hostPet = await getPetById(url.searchParams.get('hostPetId'));
    if (!hostPet) return json(res, { error: 'HOST_PET_NOT_FOUND' }, 404);
    return json(res, { hostPet: publicPet(hostPet) });
  }

  if (url.pathname === '/api/share/visit' && method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const hostPet = await getPetById(body.hostPetId);
    if (!hostPet) return json(res, { error: 'HOST_PET_NOT_FOUND' }, 404);
    const visitorPet = await userPet(user.id);
    if (!visitorPet) return json(res, { hostPet: publicPet(hostPet), visitorHasPet: false, relationshipCreated: false });
    if (!useDatabase) {
      const visit = {
        id: crypto.randomUUID(),
        from_pet_id: visitorPet.id,
        to_pet_id: hostPet.id,
        source: 'wechat_share',
        created_at: nowIso(),
      };
      state.visits.push(visit);
      const [petAId, petBId] = relationshipKey(visitorPet.id, hostPet.id).split(':');
      const key = `${petAId}:${petBId}`;
      const relationship = state.relationships.get(key) || {
        id: crypto.randomUUID(),
        pet_a_id: petAId,
        pet_b_id: petBId,
        relationship_type: 'wechat_friend_visit',
        visit_count: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      relationship.visit_count += 1;
      relationship.updated_at = nowIso();
      state.relationships.set(key, relationship);
      return json(res, { hostPet: publicPet(hostPet), visitorPet: publicPet(visitorPet), visitorHasPet: true, relationshipCreated: true, relationship });
    }
    await dbQuery(
      `insert into pet_visits (id, from_pet_id, to_pet_id, source, created_at)
       values ($1, $2, $3, 'wechat_share', now())`,
      [crypto.randomUUID(), visitorPet.id, hostPet.id],
    );
    const [petAId, petBId] = relationshipKey(visitorPet.id, hostPet.id).split(':');
    const relationshipResult = await dbQuery(
      `insert into pet_relationships (
         id, pet_a_id, pet_b_id, relationship_type, visit_count, created_at, updated_at
       ) values ($1, $2, $3, 'wechat_friend_visit', 1, now(), now())
       on conflict (pet_a_id, pet_b_id)
       do update set visit_count = pet_relationships.visit_count + 1, updated_at = now()
       returning *`,
      [crypto.randomUUID(), petAId, petBId],
    );
    const relationship = relationshipResult.rows[0];
    return json(res, { hostPet: publicPet(hostPet), visitorPet: publicPet(visitorPet), visitorHasPet: true, relationshipCreated: true, relationship });
  }

  return json(res, { error: 'NOT_FOUND' }, 404);
}

async function handleAdminApi(req, res, url) {
  if (req.method === 'OPTIONS') return json(res, {});

  if (url.pathname === '/admin/api/debug/date') {
    if (process.env.JOYIBIRD_ENABLE_TEST_CLOCK !== '1') return json(res, { error: 'NOT_FOUND' }, 404);
    if (req.method === 'GET') return json(res, { date_key: todayKey() });
    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      const dateKey = String(body.date_key || '').trim();
      if (dateKey && !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return json(res, { error: 'INVALID_DATE_KEY' }, 400);
      }
      testDateKey = dateKey;
      return json(res, { date_key: todayKey() });
    }
  }

  if (url.pathname === '/admin/api/summary') {
    if (!useDatabase) {
      return json(res, {
        users: state.users.size,
        redeemed: [...state.redeemCodes.values()].filter((code) => code.status === 'redeemed').length,
        aiMessages: state.chatMessages.filter((message) => message.role === 'assistant').length,
        visits: state.visits.length,
        issues: 0,
      });
    }
    const [users, redeemed, aiMessages, visits] = await Promise.all([
      dbQuery('select count(*)::integer as count from users'),
      dbQuery("select count(*)::integer as count from redeem_codes where status = 'redeemed'"),
      dbQuery("select count(*)::integer as count from chat_messages where role = 'assistant'"),
      dbQuery('select count(*)::integer as count from pet_visits'),
    ]);
    return json(res, {
      users: users.rows[0].count,
      redeemed: redeemed.rows[0].count,
      aiMessages: aiMessages.rows[0].count,
      visits: visits.rows[0].count,
      issues: 0,
    });
  }
  if (url.pathname === '/admin/api/redeem-codes' && req.method === 'GET') {
    if (!useDatabase) {
      return json(res, {
        redeemCodes: [...state.redeemCodes.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || a.code.localeCompare(b.code)),
      });
    }
    const result = await dbQuery('select * from redeem_codes order by created_at desc, code asc');
    return json(res, { redeemCodes: result.rows });
  }
  if (url.pathname === '/admin/api/redeem-codes' && req.method === 'POST') {
    const body = await parseBody(req);
    const code = body.code ? normalizeRedeemCode(body.code) : await generateRedeemCode();
    if (code.length !== 4) return json(res, { error: 'INVALID_CODE_FORMAT' }, 400);
    if (!useDatabase) {
      if (state.redeemCodes.has(code)) return json(res, { error: 'CODE_EXISTS' }, 409);
      const redeemCode = {
        id: crypto.randomUUID(),
        code,
        status: 'created',
        issued_to_note: body.issued_to_note || '',
        order_source: body.order_source || 'manual',
        order_note: body.order_note || '',
        redeemed_user_id: null,
        redeemed_at: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      state.redeemCodes.set(code, redeemCode);
      await addAudit('create_code', 'redeem_code', redeemCode.id, null, redeemCode);
      return json(res, { redeemCode }, 201);
    }
    try {
      const result = await dbQuery(
        `insert into redeem_codes (
          id, code, status, issued_to_note, order_source, order_note, redeemed_user_id, redeemed_at, created_at, updated_at
        ) values ($1, $2, 'created', $3, $4, $5, null, null, now(), now())
        returning *`,
        [
          crypto.randomUUID(),
          code,
          body.issued_to_note || '',
          body.order_source || 'manual',
          body.order_note || '',
        ],
      );
      const redeemCode = result.rows[0];
      await addAudit('create_code', 'redeem_code', redeemCode.id, null, redeemCode);
      return json(res, { redeemCode }, 201);
    } catch (error) {
      if (error.code === '23505') return json(res, { error: 'CODE_EXISTS' }, 409);
      throw error;
    }
  }
  if (url.pathname === '/admin/api/redeem-codes/batch' && req.method === 'POST') {
    const body = await parseBody(req);
    const count = Math.max(1, Math.min(Number(body.count || 10), 100));
    const redeemCodes = [];
    if (!useDatabase) {
      while (redeemCodes.length < count) {
        const code = await generateRedeemCode();
        if (state.redeemCodes.has(code)) continue;
        const redeemCode = {
          id: crypto.randomUUID(),
          code,
          status: 'created',
          issued_to_note: body.issued_to_note || '批量生成',
          order_source: body.order_source || 'manual_batch',
          order_note: body.order_note || '',
          redeemed_user_id: null,
          redeemed_at: null,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        state.redeemCodes.set(code, redeemCode);
        redeemCodes.push(redeemCode);
      }
      await addAudit('batch_create_codes', 'redeem_code', 'batch', null, { count, codes: redeemCodes.map((item) => item.code) });
      return json(res, { redeemCodes }, 201);
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const usedCodes = new Set();
      while (redeemCodes.length < count) {
        const code = await generateRedeemCode(client);
        if (usedCodes.has(code)) continue;
        usedCodes.add(code);
        const result = await client.query(
          `insert into redeem_codes (
            id, code, status, issued_to_note, order_source, order_note, redeemed_user_id, redeemed_at, created_at, updated_at
          ) values ($1, $2, 'created', $3, $4, $5, null, null, now(), now())
          returning *`,
          [
            crypto.randomUUID(),
            code,
            body.issued_to_note || '批量生成',
            body.order_source || 'manual_batch',
            body.order_note || '',
          ],
        );
        redeemCodes.push(result.rows[0]);
      }
      await addAudit('batch_create_codes', 'redeem_code', 'batch', null, { count, codes: redeemCodes.map((item) => item.code) }, client);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    return json(res, { redeemCodes }, 201);
  }
  if (url.pathname.startsWith('/admin/api/redeem-codes/') && req.method === 'PATCH') {
    const id = url.pathname.split('/').pop();
    const existing = await dbQuery('select * from redeem_codes where id::text = $1', [id]);
    const redeemCode = existing.rows[0];
    if (!redeemCode) return json(res, { error: 'CODE_NOT_FOUND' }, 404);
    const before = { ...redeemCode };
    const body = await parseBody(req);
    const status = ['created', 'issued', 'void'].includes(body.status) ? body.status : redeemCode.status;
    const issuedToNote = body.issued_to_note !== undefined ? body.issued_to_note : redeemCode.issued_to_note;
    const updated = await dbQuery(
      `update redeem_codes
       set status = $1, issued_to_note = $2, updated_at = now()
       where id = $3
       returning *`,
      [status, issuedToNote, redeemCode.id],
    );
    await addAudit('update_code', 'redeem_code', redeemCode.id, before, updated.rows[0]);
    return json(res, { redeemCode: updated.rows[0] });
  }
  if (url.pathname === '/admin/api/users') {
    if (!useDatabase) {
      const users = await Promise.all([...state.users.values()].map(async (user) => ({ ...user, pet: publicPet(await userPet(user.id)) })));
      return json(res, { users });
    }
    const result = await dbQuery('select * from users order by created_at desc');
    const users = await Promise.all(result.rows.map(async (user) => ({ ...user, pet: publicPet(await userPet(user.id)) })));
    return json(res, { users });
  }
  if (url.pathname.startsWith('/admin/api/users/') && req.method === 'GET') {
    const id = url.pathname.split('/').pop();
    const user = await getUserByIdOrOpenid(id);
    if (!user) return json(res, { error: 'USER_NOT_FOUND' }, 404);
    return json(res, { user: { ...user, pet: publicPet(await userPet(user.id)) } });
  }
  if (url.pathname.startsWith('/admin/api/users/') && url.pathname.endsWith('/chat-status') && req.method === 'PATCH') {
    const parts = url.pathname.split('/');
    const id = parts.at(-2);
    const user = await getUserByIdOrOpenid(id);
    if (!user) return json(res, { error: 'USER_NOT_FOUND' }, 404);
    const before = { ...user };
    const body = await parseBody(req);
    const updated = await dbQuery(
      'update users set chat_disabled_at = $1 where id = $2 returning *',
      [body.disabled ? new Date() : null, user.id],
    );
    await addAudit(body.disabled ? 'disable_chat' : 'enable_chat', 'user', user.id, before, updated.rows[0]);
    return json(res, { user: { ...updated.rows[0], pet: publicPet(await userPet(user.id)) } });
  }
  if (url.pathname === '/admin/api/pets') {
    if (!useDatabase) return json(res, { pets: [...state.pets.values()].map(publicPet) });
    const result = await dbQuery('select * from pets order by created_at desc');
    return json(res, { pets: result.rows.map(publicPet) });
  }
  if (url.pathname.startsWith('/admin/api/pets/') && req.method === 'PATCH') {
    const id = url.pathname.split('/').pop();
    const pet = await getPetById(id);
    if (!pet) return json(res, { error: 'PET_NOT_FOUND' }, 404);
    const before = { ...pet };
    const body = await parseBody(req);
    const updates = {};
    if (body.name) updates.name = String(body.name).slice(0, 20);
    if (body.personality) updates.personality = String(body.personality).slice(0, 40);
    if (body.tone) updates.tone = String(body.tone).slice(0, 40);
    const updatedPet = await updatePet(pet.id, updates);
    await addAudit('update_pet', 'pet', pet.id, before, updatedPet);
    return json(res, { pet: publicPet(updatedPet) });
  }
  if (url.pathname.startsWith('/admin/api/pets/') && req.method === 'GET') {
    const id = url.pathname.split('/').pop();
    const pet = await getPetById(id);
    if (!pet) return json(res, { error: 'PET_NOT_FOUND' }, 404);
    const owner = await getUserByIdOrOpenid(pet.owner_user_id);
    return json(res, { pet: publicPet(pet), owner, recentVisits: await recentVisitsForPet(pet.id) });
  }
  if (url.pathname === '/admin/api/ai-usage') {
    if (!useDatabase) {
      return json(res, {
        quotas: [...state.quotas.values()].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))),
        messages: state.chatMessages.filter((message) => message.role === 'assistant').slice(-200).reverse(),
      });
    }
    const [quotas, messages] = await Promise.all([
      dbQuery('select * from chat_quotas order by updated_at desc'),
      dbQuery("select * from chat_messages where role = 'assistant' order by created_at desc limit 200"),
    ]);
    return json(res, {
      quotas: quotas.rows,
      messages: messages.rows,
    });
  }
  if (url.pathname.startsWith('/admin/api/chat-quotas/') && req.method === 'PATCH') {
    const userId = url.pathname.split('/').pop();
    const user = await getUserByIdOrOpenid(userId);
    if (!user) return json(res, { error: 'USER_NOT_FOUND' }, 404);
    const quota = await getOrCreateQuota(user.id);
    const before = { ...quota };
    const body = await parseBody(req);
    const freeLimit = body.free_limit !== undefined
      ? Math.max(0, Math.min(Number(body.free_limit), 100))
      : quota.free_limit;
    const usedCount = body.used_count !== undefined
      ? Math.max(0, Math.min(Number(body.used_count), freeLimit))
      : Math.min(quota.used_count, freeLimit);
    if (!useDatabase) {
      quota.free_limit = freeLimit;
      quota.used_count = usedCount;
      quota.updated_at = nowIso();
      await addAudit('update_chat_quota', 'chat_quota', quota.id, before, { ...quota });
      return json(res, { quota });
    }
    const updated = await dbQuery(
      `update chat_quotas
       set free_limit = $1, used_count = $2, updated_at = now()
       where id = $3
       returning *`,
      [freeLimit, usedCount, quota.id],
    );
    await addAudit('update_chat_quota', 'chat_quota', quota.id, before, updated.rows[0]);
    return json(res, { quota: updated.rows[0] });
  }
  if (url.pathname === '/admin/api/manual-unlock' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = await getUserByIdOrOpenid(body.userId || body.openid);
    if (!user) return json(res, { error: 'USER_NOT_FOUND' }, 404);
    const existingPet = await userPet(user.id);
    if (existingPet) return json(res, { error: 'USER_ALREADY_HAS_PET', pet: publicPet(existingPet) }, 409);
    const pet = await createPet(user);
    await addAudit('manual_unlock', 'user', user.id, null, pet);
    return json(res, { unlocked: true, user, pet: publicPet(pet) });
  }
  if (url.pathname === '/admin/api/visits') {
    if (!useDatabase) return json(res, { visits: state.visits.slice(-200).reverse() });
    const result = await dbQuery('select * from pet_visits order by created_at desc limit 200');
    return json(res, { visits: result.rows });
  }
  if (url.pathname === '/admin/api/audit-logs') {
    if (!useDatabase) return json(res, { auditLogs: state.auditLogs.slice(-200).reverse() });
    const result = await dbQuery('select * from admin_audit_logs order by created_at desc limit 200');
    return json(res, { auditLogs: result.rows });
  }
  return json(res, { error: 'NOT_FOUND' }, 404);
}

async function serveStatic(req, res, url) {
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    const html = await readFile(path.join(__dirname, 'public/admin.html'), 'utf8');
    return text(res, html);
  }
  if (url.pathname.startsWith('/assets/')) {
    const filePath = path.join(rootDir, url.pathname);
    const ext = path.extname(filePath);
    const type = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'application/octet-stream';
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': type });
    return res.end(file);
  }
  if (url.pathname === '/') {
    return text(res, '<h1>JoyiBird V0.1 server</h1><p>Admin: <a href="/admin">/admin</a></p>');
  }
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }
  return text(res, 'Not found', 404, 'text/plain; charset=utf-8');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname.startsWith('/admin/api/')) return await handleAdminApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return json(res, { error: 'SERVER_ERROR', message: error.message }, 500);
  }
});

try {
  if (useDatabase) await initDatabase();
} catch (error) {
  console.error('Failed to initialize PostgreSQL persistence');
  console.error(error);
  await pool?.end().catch(() => {});
  process.exit(1);
}

server.listen(port, '0.0.0.0', () => {
  console.log(`JoyiBird V0.1 server listening on http://0.0.0.0:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    server.close(async () => {
      await pool?.end().catch(() => {});
      process.exit(0);
    });
  });
}
