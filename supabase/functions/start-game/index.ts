import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient, getCallerProfileId } from "../_shared/client.ts";

// Creates a new game session. The signed-in caller is always player_index 0 (their
// progression/XP is tracked); any other local players are guests (name only, no account).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const profileId = await getCallerProfileId(req);
  if (!profileId) {
    return new Response(JSON.stringify({ error: "Sign in to start a game." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { playerNames, maxScore } = await req.json();

  if (!Array.isArray(playerNames) || playerNames.length < 1 || playerNames.length > 8) {
    return new Response(JSON.stringify({ error: "Need between 1 and 8 players." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!Number.isInteger(maxScore) || maxScore < 25 || maxScore > 1000) {
    return new Response(JSON.stringify({ error: "maxScore must be between 25 and 1000." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = serviceClient();

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .insert({ owner_profile_id: profileId, max_score: maxScore })
    .select()
    .single();
  if (sessionError) {
    return new Response(JSON.stringify({ error: sessionError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: ownedBoosters } = await db
    .from("player_boosters")
    .select("booster_key, quantity")
    .eq("profile_id", profileId);

  const boosterInventory = Object.fromEntries(
    (ownedBoosters ?? []).map((b) => [b.booster_key, b.quantity])
  );

  const players = playerNames.map((name: string, index: number) => ({
    session_id: session.id,
    profile_id: index === 0 ? profileId : null,
    display_name: String(name).slice(0, 40) || `Player ${index + 1}`,
    player_index: index,
    active_boosters: index === 0 ? boosterInventory : {},
  }));

  const { data: sessionPlayers, error: playersError } = await db
    .from("game_session_players")
    .insert(players)
    .select();
  if (playersError) {
    return new Response(JSON.stringify({ error: playersError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ session, players: sessionPlayers }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
