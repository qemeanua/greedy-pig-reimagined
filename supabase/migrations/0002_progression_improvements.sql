alter table public.game_session_players
add column if not exists risk_bonus_awarded boolean not null default false;

update public.boosters
set cost_coins = case key
  when 'score_shield' then 40
  when 'lucky_reroll' then 30
  when 'double_points' then 50
  else cost_coins
end
where key in ('score_shield', 'lucky_reroll', 'double_points');

create or replace function public.award_turn_risk_bonus(
  p_player_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  player_row public.game_session_players%rowtype;
begin
  select *
  into player_row
  from public.game_session_players
  where id = p_player_id
  for update;

  if not found then
    return false;
  end if;

  if player_row.profile_id is null
     or player_row.turn_score < 20
     or player_row.risk_bonus_awarded then
    return false;
  end if;

  update public.profiles
  set xp = xp + 10,
      coins = coins + 5
  where id = player_row.profile_id;

  update public.game_session_players
  set risk_bonus_awarded = true
  where id = p_player_id;

  return true;
end;
$$;

revoke all on function public.award_turn_risk_bonus(uuid) from public;
grant execute on function public.award_turn_risk_bonus(uuid) to service_role;