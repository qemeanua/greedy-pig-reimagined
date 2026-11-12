-- Core schema for Greedy Pig Reimagined: progression, boosters, server-authoritative game sessions.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  xp integer not null default 0,
  level integer generated always as (floor(xp / 100.0) + 1) stored,
  coins integer not null default 0,
  games_played integer not null default 0,
  games_won integer not null default 0,
  best_turn_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table boosters (
  key text primary key,
  name text not null,
  description text not null,
  cost_coins integer not null
);

create table player_boosters (
  profile_id uuid not null references profiles (id) on delete cascade,
  booster_key text not null references boosters (key),
  quantity integer not null default 0 check (quantity >= 0),
  primary key (profile_id, booster_key)
);

create table achievements (
  key text primary key,
  name text not null,
  description text not null,
  requirement_type text not null check (requirement_type in ('games_won', 'games_played', 'best_turn_score')),
  requirement_value integer not null,
  coin_reward integer not null default 0,
  booster_reward_key text references boosters (key),
  booster_reward_qty integer not null default 0
);

create table player_achievements (
  profile_id uuid not null references profiles (id) on delete cascade,
  achievement_key text not null references achievements (key),
  unlocked_at timestamptz not null default now(),
  primary key (profile_id, achievement_key)
);

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles (id) on delete cascade,
  max_score integer not null check (max_score > 0),
  status text not null default 'active' check (status in ('active', 'finished')),
  current_turn_index integer not null default 0,
  winner_profile_id uuid references profiles (id),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table game_session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions (id) on delete cascade,
  profile_id uuid references profiles (id),
  display_name text not null,
  player_index integer not null,
  total_score integer not null default 0,
  turn_score integer not null default 0,
  active_boosters jsonb not null default '{}'::jsonb,
  unique (session_id, player_index)
);

-- Row Level Security: clients read their own data directly; all writes to
-- progression/session tables go through Edge Functions using the service role.

alter table profiles enable row level security;
alter table boosters enable row level security;
alter table player_boosters enable row level security;
alter table achievements enable row level security;
alter table player_achievements enable row level security;
alter table game_sessions enable row level security;
alter table game_session_players enable row level security;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile username" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "boosters are public" on boosters for select using (true);
create policy "achievements are public" on achievements for select using (true);

create policy "read own boosters" on player_boosters for select using (auth.uid() = profile_id);
create policy "read own achievements" on player_achievements for select using (auth.uid() = profile_id);

create policy "read own sessions" on game_sessions for select using (auth.uid() = owner_profile_id);
create policy "read own session players" on game_session_players for select using (
  session_id in (select id from game_sessions where owner_profile_id = auth.uid())
);

-- New auth user -> profile row.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Grants any achievements the profile now qualifies for; applies coin/booster rewards once per achievement.
create function evaluate_achievements(p_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  a record;
  current_value integer;
begin
  for a in select * from achievements loop
    if exists (
      select 1 from player_achievements
      where profile_id = p_profile_id and achievement_key = a.key
    ) then
      continue;
    end if;

    select case a.requirement_type
      when 'games_won' then games_won
      when 'games_played' then games_played
      when 'best_turn_score' then best_turn_score
    end into current_value
    from profiles where id = p_profile_id;

    if current_value >= a.requirement_value then
      insert into player_achievements (profile_id, achievement_key) values (p_profile_id, a.key);

      update profiles set coins = coins + a.coin_reward where id = p_profile_id;

      if a.booster_reward_key is not null and a.booster_reward_qty > 0 then
        insert into player_boosters (profile_id, booster_key, quantity)
        values (p_profile_id, a.booster_reward_key, a.booster_reward_qty)
        on conflict (profile_id, booster_key)
        do update set quantity = player_boosters.quantity + excluded.quantity;
      end if;
    end if;
  end loop;
end;
$$;

-- On game finish: update per-player stats, award participation/win XP, re-check achievements.
create function handle_game_finished()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  p game_session_players%rowtype;
begin
  if new.status = 'finished' and old.status = 'active' then
    for p in select * from game_session_players where session_id = new.id and profile_id is not null loop
      update profiles
      set games_played = games_played + 1,
          games_won = games_won + case when p.profile_id = new.winner_profile_id then 1 else 0 end,
          xp = xp + 10 + case when p.profile_id = new.winner_profile_id then 25 else 0 end
      where id = p.profile_id;

      perform evaluate_achievements(p.profile_id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger on_game_session_finished
  after update on game_sessions
  for each row execute function handle_game_finished();

insert into boosters (key, name, description, cost_coins) values
  ('score_shield', 'Score Shield', 'Protects your current turn score from being lost if you roll a 1. Used once per activation.', 50),
  ('lucky_reroll', 'Lucky Reroll', 'Reroll immediately after rolling a 1 instead of losing your turn. Used once per activation.', 40),
  ('double_points', 'Double Points', 'Doubles the points earned from your next successful roll.', 60);

insert into achievements (key, name, description, requirement_type, requirement_value, coin_reward, booster_reward_key, booster_reward_qty) values
  ('first_victory', 'First Victory', 'Win 1 game', 'games_won', 1, 20, null, 0),
  ('getting_started', 'Getting Started', 'Win 10 games', 'games_won', 10, 100, 'lucky_reroll', 1),
  ('risk_taker', 'Risk Taker', 'Reach 30 points in a single turn', 'best_turn_score', 30, 50, 'double_points', 1),
  ('experienced_player', 'Experienced Player', 'Win 50 games', 'games_won', 50, 300, 'score_shield', 2),
  ('greedy_legend', 'Greedy Legend', 'Win 100 games', 'games_won', 100, 1000, 'score_shield', 3);
