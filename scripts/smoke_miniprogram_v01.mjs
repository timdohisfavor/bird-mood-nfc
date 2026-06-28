import { spawn } from 'node:child_process';

const port = Number(process.env.JOYIBIRD_SMOKE_PORT || (22000 + Math.floor(Math.random() * 20000)));
const base = `http://127.0.0.1:${port}`;
const smokeSchema = `smoke_v01_${process.pid}_${Date.now()}`;

const server = spawn(process.execPath, ['server/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    JOYIBIRD_PORT: String(port),
    JOYIBIRD_LLM_PROVIDER: 'mock',
    JOYIBIRD_DB_SCHEMA: smokeSchema,
    JOYIBIRD_DB_RESET: '1',
    JOYIBIRD_ENABLE_TEST_CLOCK: '1',
    JOYIBIRD_DATE_KEY: '2026-06-10',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

process.on('exit', () => {
  if (!server.killed) server.kill();
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const res = await fetch(`${base}/admin/api/summary`);
      if (res.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`server did not start\n${serverOutput}`);
}

async function request(path, { method = 'GET', token = '', data } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function login(mockUser) {
  const res = await request('/api/auth/wechat-login', {
    method: 'POST',
    data: { mockUser },
  });
  assert(res.status === 200, `login failed: ${res.status}`);
  assert(res.body.token, 'login did not return token');
  return res.body.token;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function setServerDate(dateKey) {
  const res = await request('/admin/api/debug/date', {
    method: 'PATCH',
    data: { date_key: dateKey },
  });
  assert(res.status === 200 && res.body.date_key === dateKey, `debug date failed: ${dateKey}`);
}

try {
  await waitForServer();

  const hostToken = await login(`host-${Date.now()}`);
  const locked = await request('/api/me', { token: hostToken });
  assert(locked.body.locked === true, 'new user should be locked');

  const hostRedeem = await request('/api/redeem', {
    method: 'POST',
    token: hostToken,
    data: { code: '1001' },
  });
  assert(hostRedeem.status === 200 && hostRedeem.body.redeemed, 'host redeem failed');
  assert(hostRedeem.body.pet.bird_id === 'long-tailed-tit', 'seed code 1001 should unlock long-tailed tit');
  assert(hostRedeem.body.pet.petAsset?.home === '/assets/pets/long-tailed-tit/home.png', 'pet home asset missing');
  ['idle', 'happy', 'talking', 'sleepy', 'waiting', 'reward', 'waking', 'carrying', 'shy', 'rainy', 'miss'].forEach((action) => {
    assert(
      hostRedeem.body.pet.petAsset?.assetSet?.[action] === `/assets/pets/long-tailed-tit/${action}.png`,
      `pet action asset missing: ${action}`,
    );
  });
  const hostPetId = hostRedeem.body.pet.id;

  const rename = await request('/api/pet/me', {
    method: 'PATCH',
    token: hostToken,
    data: { name: '小圆鸟', persona_prompt: '说话像一只温柔、短句、会先陪伴再建议的小鸟。' },
  });
  assert(rename.body.pet.name === '小圆鸟', 'pet rename did not persist');
  assert(rename.body.pet.persona_prompt.includes('温柔'), 'pet persona prompt did not persist');

  const signA = await request('/api/sign/today', { token: hostToken });
  const signB = await request('/api/sign/today', { token: hostToken });
  assert(signA.body.sign.id === signB.body.sign.id, 'daily sign should be stable');

  const chat = await request('/api/chat/messages', {
    method: 'POST',
    token: hostToken,
    data: { content: '今天有点累' },
  });
  assert(chat.status === 200 && chat.body.quota.used_count === 1, 'chat send/quota failed');
  assert(
    chat.body.message?.role === 'assistant' && chat.body.message.content.includes('自己的设定'),
    'chat reply did not use persona prompt',
  );
  assert(chat.body.bond_delta === 1 && chat.body.bond_feedback === '它更安心了一点', 'first chat bond feedback missing');
  assert(chat.body.memory?.summary && chat.body.memory.summary.length <= 30, 'chat memory summary missing or too long');

  const homeAfterChat = await request('/api/pet/me', { token: hostToken });
  assert(homeAfterChat.body.todayCare.chat_done === true, 'home care state did not mark chat done');
  assert(homeAfterChat.body.bond_score === 1 && homeAfterChat.body.bond_name === '刚认识', 'home bond state did not update');
  assert(homeAfterChat.body.latestMemory?.summary === chat.body.memory.summary, 'home latest memory missing');

  const quotaPatch = await request(`/admin/api/chat-quotas/${signA.body.sign.user_id}`, {
    method: 'PATCH',
    data: { free_limit: 1 },
  });
  assert(quotaPatch.body.quota.free_limit === 1, 'admin quota patch failed');

  const quotaBlocked = await request('/api/chat/messages', {
    method: 'POST',
    token: hostToken,
    data: { content: '再说一句' },
  });
  assert(quotaBlocked.status === 429 && quotaBlocked.body.error === 'QUOTA_EXHAUSTED', 'quota exhaustion failed');

  await setServerDate('2026-06-11');
  const nextDayMessages = await request('/api/chat/messages', { token: hostToken });
  assert(nextDayMessages.body.opening?.text.includes('昨天'), 'next-day opening should mention yesterday naturally');
  assert(nextDayMessages.body.opening?.yesterdayMemory?.summary === chat.body.memory.summary, 'next-day opening did not use yesterday memory');

  const nextDayChat = await request('/api/chat/messages', {
    method: 'POST',
    token: hostToken,
    data: { content: '今天开会有点乱' },
  });
  assert(nextDayChat.status === 200 && nextDayChat.body.bond_delta === 1, 'next-day first chat should add bond once');

  for (let day = 2; day <= 8; day += 1) {
    await setServerDate(addDays('2026-06-10', day));
    const res = await request('/api/chat/messages', {
      method: 'POST',
      token: hostToken,
      data: { content: `第${day}天的小事` },
    });
    assert(res.status === 200, `chat memory retention send failed on day ${day}`);
  }
  const memoriesAfterEightDays = await request('/api/pet/me', { token: hostToken });
  assert(memoriesAfterEightDays.body.birdMemories.length === 7, 'bird memories should keep latest 7 days');
  assert(
    !memoriesAfterEightDays.body.birdMemories.some((memory) => memory.date_key === '2026-06-10'),
    'oldest bird memory should be pruned after 8 memory days',
  );

  const visitorToken = await login(`visitor-${Date.now()}`);
  const visitorRedeem = await request('/api/redeem', {
    method: 'POST',
    token: visitorToken,
    data: { code: '1002' },
  });
  assert(visitorRedeem.status === 200, 'visitor redeem failed');

  const visit = await request('/api/share/visit', {
    method: 'POST',
    token: visitorToken,
    data: { hostPetId },
  });
  assert(visit.status === 200 && visit.body.relationshipCreated, 'share visit failed');

  const duplicateToken = await login(`duplicate-${Date.now()}`);
  const duplicate = await request('/api/redeem', {
    method: 'POST',
    token: duplicateToken,
    data: { code: '1001' },
  });
  assert(duplicate.status === 409 && duplicate.body.error === 'CODE_USED', 'duplicate code check failed');

  const batch = await request('/admin/api/redeem-codes/batch', {
    method: 'POST',
    data: { count: 2 },
  });
  assert(batch.status === 201 && batch.body.redeemCodes.length === 2, 'batch code creation failed');

  const summary = await request('/admin/api/summary');
  assert(summary.body.users >= 3, 'admin summary did not count users');

  const adminPage = await fetch(`${base}/admin`);
  assert(adminPage.status === 200, 'admin page did not render');

  console.log('miniprogram V0.1 smoke ok');
} finally {
  server.kill();
}
