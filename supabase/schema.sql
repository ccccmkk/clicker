create table if not exists game_state (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  nickname text default '익명의 제빵사',
  cookies bigint default 0,
  total_clicks bigint default 0,
  total_cookies bigint default 0,
  upgrades jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table game_state enable row level security;

create policy "Anyone can read/write game state" on game_state
  for all using (true) with check (true);
