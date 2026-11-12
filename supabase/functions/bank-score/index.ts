import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient, getCallerProfileId } from "../_shared/client.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Locks in the current player's turn score. Score math happens here, not in the client,
// so a player can't bank a total they didn't actually earn from server-validated rolls.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const profileId = await getCallerProfileId(req);
  if (!profileId) return json({ error: "Sign in required." }, 401);

  const { sessionId } = await req.json();
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

  const newTotalScore = current.total_score + current.turn_score;
  const nextTurnIndex = (session.current_turn_index + 1) % players!.length;

  await db
    .from("game_session_players")
    .update({ total_score: newTotalScore, turn_score: 0 })
    .eq("id", current.id);

  const gameOver = newTotalScore >= session.max_score;
  if (gameOver) {
    await db
      .from("game_sessions")
      .update({ status: "finished", winner_profile_id: current.profile_id, finished_at: new Date().toISOString() })
      .eq("id", sessionId);
  } else {
    await db.from("game_sessions").update({ current_turn_index: nextTurnIndex }).eq("id", sessionId);
  }

  return json({
    newTotalScore,
    nextTurnIndex,
    gameOver,
    winnerPlayerIndex: gameOver ? current.player_index : null,
  });
});
