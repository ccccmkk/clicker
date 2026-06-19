-- Supabase SQL Editor에서 실행하세요

-- 1. steal_log 테이블
create table if not exists steal_log (
  id uuid primary key default gen_random_uuid(),
  attacker_id text not null,
  defender_id text not null,
  amount bigint not null,
  created_at timestamptz default now()
);
alter table steal_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'steal_log' and policyname = 'Anyone can read/write steal_log') then
    execute 'create policy "Anyone can read/write steal_log" on steal_log for all using (true) with check (true)';
  end if;
end $$;

-- 2. game_state 컬럼 추가
alter table game_state add column if not exists defense_power bigint default 0;
alter table game_state add column if not exists last_defense_regen timestamptz default now();
alter table game_state add column if not exists revenge_map jsonb default '{}'::jsonb;
alter table game_state add column if not exists cps_estimate bigint default 0;

-- 3. 방어막 1개 부수기 RPC (atomic)
create or replace function break_shield(p_attacker text, p_defender text)
returns jsonb language plpgsql security definer as $$
declare v_def bigint;
begin
  if p_attacker = p_defender then
    return jsonb_build_object('success', false, 'reason', 'self');
  end if;
  select defense_power into v_def from game_state where user_id = p_defender for update;
  if v_def is null then return jsonb_build_object('success', false, 'reason', 'not_found'); end if;
  if v_def <= 0 then return jsonb_build_object('success', true, 'defense', 0); end if;
  update game_state set defense_power = defense_power - 1 where user_id = p_defender;
  return jsonb_build_object('success', true, 'defense', v_def - 1);
end;
$$;

-- 4. 쿠키 훔치기 RPC (atomic, 서버 검증)
create or replace function steal_cookies(p_attacker text, p_defender text)
returns jsonb language plpgsql security definer as $$
declare
  v_def record;
  v_att record;
  v_stolen_today bigint;
  v_daily_limit bigint;
  v_steal bigint;
  v_revenge int;
begin
  if p_attacker = p_defender then
    return jsonb_build_object('success', false, 'reason', 'self');
  end if;
  select * into v_def from game_state where user_id = p_defender for update;
  select * into v_att from game_state where user_id = p_attacker for update;
  if v_def is null or v_att is null then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;
  if v_def.defense_power > 0 then
    return jsonb_build_object('success', false, 'reason', 'shields_up', 'defense', v_def.defense_power);
  end if;
  if v_def.cookies <= 0 then
    return jsonb_build_object('success', false, 'reason', 'empty');
  end if;
  -- 일일 한도: 상대 현재 쿠키의 10%
  v_daily_limit := greatest(1, floor(v_def.cookies * 0.1));
  select coalesce(sum(amount), 0) into v_stolen_today
  from steal_log
  where attacker_id = p_attacker and defender_id = p_defender
    and created_at > now() - interval '24 hours';
  if v_stolen_today >= v_daily_limit then
    return jsonb_build_object('success', false, 'reason', 'daily_limit');
  end if;
  -- 복수 배수
  v_revenge := coalesce((v_att.revenge_map->>p_defender)::int, 1);
  v_steal := greatest(1, floor(v_def.cookies * 0.01) * v_revenge);
  v_steal := least(v_steal, v_def.cookies, v_daily_limit - v_stolen_today);
  -- 쿠키 이전
  update game_state set cookies = cookies - v_steal where user_id = p_defender;
  update game_state set cookies = cookies + v_steal where user_id = p_attacker;
  -- 기록
  insert into steal_log (attacker_id, defender_id, amount) values (p_attacker, p_defender, v_steal);
  -- 방어자에게 복수 배수 누적
  update game_state set
    revenge_map = jsonb_set(
      coalesce(revenge_map, '{}'::jsonb),
      array[p_attacker],
      to_jsonb(coalesce((revenge_map->>p_attacker)::int, 1) + 1)
    )
  where user_id = p_defender;
  -- 공격자의 복수 소비 후 리셋
  update game_state set
    revenge_map = revenge_map - p_defender
  where user_id = p_attacker and (revenge_map ? p_defender);
  return jsonb_build_object('success', true, 'amount', v_steal);
end;
$$;

-- 5. 방어막 하루 1회 자동 보충 RPC
create or replace function regen_defense(p_user text, p_cps float)
returns jsonb language plpgsql security definer as $$
declare
  v_state record;
  v_regen bigint;
begin
  select * into v_state from game_state where user_id = p_user for update;
  if v_state is null then return jsonb_build_object('regenerated', false); end if;
  if v_state.last_defense_regen > now() - interval '24 hours' then
    return jsonb_build_object('regenerated', false);
  end if;
  -- CPS × 3.6 (1시간치의 1%), 최소 50, 최대 10000
  v_regen := greatest(50, least(floor(p_cps * 3.6), 10000));
  update game_state set
    defense_power = least(defense_power + v_regen, 50000),
    last_defense_regen = now()
  where user_id = p_user;
  return jsonb_build_object('regenerated', true, 'amount', v_regen);
end;
$$;
