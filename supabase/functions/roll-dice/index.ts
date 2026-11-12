import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient, getCallerProfileId } from "../_shared/client.ts";

function rollDie() {
  return (crypto.getRandomValues(new Uint32Array(1))[0] % 6) + 1;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Server-authoritative dice roll: the client never generates or submits a die result,
// it only requests a roll and which (owned) booster to apply. This is what makes the
// roll untamperable from the browser.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const profileId = await getCallerProfileId(req);
  if (!profileId) return json({ error: "Sign in required." }, 401);

  const { sessionId, useBoosters = {} } = await req.json();
  if (!sessionId) return json({ error: "sessionId is required." }, 400);

  const db = serviceClient();

  const { data: session } = await db.from("game_sessions").select("*").eq("id", sessionId).single();
  if (!session || session.owner_profile_id !== profileId) return json({ error: "Game not found." }, 404);
  if (session.status !== "active") return json({ error: "Game has already finished." }, 400);

  const { data: players } = await db
    .from("game_session_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("player_index");
  const current = players?.find((p) => p.player_index === session.current_turn_index);
  if (!current) return json({ error: "Current player not found." }, 404);

  const inventory: Record<string, number> = current.active_boosters ?? {};
  const wantsShield = !!useBoosters.scoreShield && (inventory.score_shield ?? 0) > 0;
  const wantsReroll = !!useBoosters.luckyReroll && (inventory.lucky_reroll ?? 0) > 0;
  const wantsDouble = !!useBoosters.doublePoints && (inventory.double_points ?? 0) > 0;

  const consumed: string[] = [];
  const rolls: number[] = [rollDie()];
  let bust = false;
  let scoreLost = false;
  let turnScoreDelta = 0;

  if (rolls[0] === 1) {
    if (wantsReroll) {
      consumed.push("lucky_reroll");
      rolls.push(rollDie());
      const second = rolls[1];
      if (second === 1) {
        bust = true;
        scoreLost = true;
      } else {
        turnScoreDelta = second * (wantsDouble ? 2 : 1);
        if (wantsDouble) consumed.push("double_points");
      }
    } else if (wantsShield) {
      consumed.push("score_shield");
      bust = true;
      scoreLost = false;
    } else {
      bust = true;
      scoreLost = true;
    }
  } else {
    turnScoreDelta = rolls[0] * (wantsDouble ? 2 : 1);
    if (wantsDouble) consumed.push("double_points");
  }

  const nextInventory = { ...inventory };
  for (const key of consumed) nextInventory[key] = (nextInventory[key] ?? 0) - 1;

  let newTurnScore = current.turn_score + turnScoreDelta;
  let newTotalScore = current.total_score;
  let nextTurnIndex = session.current_turn_index;

  if (bust) {
    if (!scoreLost) newTotalScore += newTurnScore; // shield: bank what was accumulated
    newTurnScore = 0;
    nextTurnIndex = (session.current_turn_index + 1) % players!.length;
  }

  await db
    .from("game_session_players")
    .update({ turn_score: newTurnScore, total_score: newTotalScore, active_boosters: nextInventory })
    .eq("id", current.id);

  if (current.profile_id && newTurnScore > 0) {
    const { data: profile } = await db
      .from("profiles")
      .select("best_turn_score")
      .eq("id", current.profile_id)
      .single();
    if (profile && newTurnScore > profile.best_turn_score) {
      await db.from("profiles").update({ best_turn_score: newTurnScore }).eq("id", current.profile_id);
      await db.rpc("evaluate_achievements", { p_profile_id: current.profile_id });
    }
  }

  const gameOver = newTotalScore >= session.max_score;
  if (gameOver) {
    await db
      .from("game_sessions")
      .update({ status: "finished", winner_profile_id: current.profile_id, finished_at: new Date().toISOString() })
      .eq("id", sessionId);
  } else if (bust) {
    await db.from("game_sessions").update({ current_turn_index: nextTurnIndex }).eq("id", sessionId);
  }

  return json({
    rolls,
    bust,
    scoreLost,
    turnScoreDelta,
    newTurnScore,
    newTotalScore,
    boostersConsumed: consumed,
    remainingBoosters: nextInventory,
    nextTurnIndex,
    gameOver,
    winnerPlayerIndex: gameOver ? current.player_index : null,
  });
});
