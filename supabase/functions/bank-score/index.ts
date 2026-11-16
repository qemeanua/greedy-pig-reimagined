import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient, getCallerProfileId } from "../_shared/client.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const profileId = await getCallerProfileId(req);

  if (!profileId) {
    return json({ error: "Sign in required." }, 401);
  }

  let body: { sessionId?: string };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { sessionId } = body;

  if (!sessionId) {
    return json({ error: "sessionId is required." }, 400);
  }

  const db = serviceClient();

  const { data: session } = await db
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session || session.owner_profile_id !== profileId) {
    return json({ error: "Game not found." }, 404);
  }

  if (session.status !== "active") {
    return json({ error: "Game has already finished." }, 400);
  }

  const { data: players } = await db
    .from("game_session_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("player_index");

  if (!players?.length) {
    return json({ error: "Unable to load game players." }, 500);
  }

  const current = players.find(
    (player) => player.player_index === session.current_turn_index
  );

  if (!current) {
    return json({ error: "Current player not found." }, 404);
  }

  const newTotalScore = current.total_score + current.turn_score;
  const nextTurnIndex =
    (session.current_turn_index + 1) % players.length;

  const { error: updateError } = await db
    .from("game_session_players")
    .update({
      total_score: newTotalScore,
      turn_score: 0,
      risk_bonus_awarded: false,
    })
    .eq("id", current.id);

  if (updateError) {
    return json({ error: "Unable to bank the score." }, 500);
  }

  const gameOver = newTotalScore >= session.max_score;

  if (gameOver) {
    await db
      .from("game_sessions")
      .update({
        status: "finished",
        winner_profile_id: current.profile_id,
        finished_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } else {
    await db
      .from("game_sessions")
      .update({ current_turn_index: nextTurnIndex })
      .eq("id", sessionId);
  }

  return json({
    newTotalScore,
    nextTurnIndex,
    gameOver,
    winnerPlayerIndex: gameOver ? current.player_index : null,
  });
});