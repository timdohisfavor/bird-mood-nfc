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
        coalesce((item->>'unlockedAt')::bigint, 0) as unlocked_at
      from jsonb_array_elements(coalesce(existing, '[]'::jsonb)) as item
      union all
      select
        item->>'id' as id,
        coalesce((item->>'unlockedAt')::bigint, 0) as unlocked_at
      from jsonb_array_elements(coalesce(incoming, '[]'::jsonb)) as item
    ) all_items
    where id is not null and id <> ''
    group by id
  ) merged
$$;
