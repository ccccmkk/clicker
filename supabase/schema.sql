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

-- click_upgrades 컬럼 추가 (이미 테이블 있는 경우)
alter table game_state add column if not exists click_upgrades jsonb default '{}'::jsonb;

-- click_upgrades 컬럼 추가 (없을 경우)
alter table game_state add column if not exists click_upgrades jsonb default '{}'::jsonb;

-- cps_estimate 컬럼 추가
alter table game_state add column if not exists cps_estimate bigint default 0;

-- Realtime 활성화
alter publication supabase_realtime add table game_state;
