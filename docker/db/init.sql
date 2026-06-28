create table if not exists app_events (
  id bigserial primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists visitor_progress (
  visitor_id text primary key,
  recovery_code text unique not null,
  unlocked_birds jsonb not null default '[]'::jsonb,
  daily_draws jsonb not null default '{}'::jsonb,
  last_draw_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists users (
  id uuid primary key,
  openid text unique not null,
  unionid text,
  nickname text not null,
  avatar_url text not null default '',
  chat_disabled_at timestamptz,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists redeem_codes (
  id uuid primary key,
  code text unique not null,
  status text not null check (status in ('created', 'issued', 'redeemed', 'void')),
  issued_to_note text not null default '',
  order_source text not null default 'manual',
  order_note text not null default '',
  redeemed_user_id uuid references users(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pets (
  id uuid primary key,
  owner_user_id uuid unique not null references users(id),
  bird_id text not null,
  name text not null,
  personality text not null,
  tone text not null,
  persona_prompt text not null default '',
  mood text not null default 'quiet',
  mood_text text not null default '它今天话不多，但一直在。',
  bond_score integer not null default 0,
  feather_count integer not null default 0,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_signs (
  id uuid primary key,
  user_id uuid not null references users(id),
  pet_id uuid not null references pets(id),
  date_key text not null,
  sign_title text not null,
  sign_text text not null,
  pet_comment text not null,
  action_tip text not null,
  created_at timestamptz not null default now(),
  unique(user_id, date_key)
);

create table if not exists chat_messages (
  id uuid primary key,
  user_id uuid not null references users(id),
  pet_id uuid not null references pets(id),
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  token_usage integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chat_quotas (
  id uuid primary key,
  user_id uuid not null references users(id),
  date_key text not null,
  free_limit integer not null default 5,
  used_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, date_key)
);

create table if not exists pet_relationships (
  id uuid primary key,
  pet_a_id uuid not null references pets(id),
  pet_b_id uuid not null references pets(id),
  relationship_type text not null,
  visit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pet_a_id, pet_b_id)
);

create table if not exists pet_visits (
  id uuid primary key,
  from_pet_id uuid references pets(id),
  to_pet_id uuid not null references pets(id),
  source text not null default 'wechat_share',
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id uuid primary key,
  operator text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

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
