
import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient, getCallerProfileId } from "../_shared/client.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Creates a game session.
// The signed-in account can occupy any player position.
// All other players are local guests.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const profileId = await getCallerProfileId(req);

  if (!profileId) {
    return json({ error: "Sign in to start a game." }, 401);
  }

  let body: {
    playerNames?: unknown;
    maxScore?: unknown;
    accountPlayerIndex?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { playerNames, maxScore, accountPlayerIndex = 0 } = body;

  // Progression Mode requires at least two players.
  if (
    !Array.isArray(playerNames) ||
    playerNames.length < 2 ||
    playerNames.length > 8
  ) {
    return json(
      { error: "A game requires between 2 and 8 players." },
      400,
    );
  }

  if (
    !Number.isInteger(maxScore) ||
    Number(maxScore) < 25 ||
    Number(maxScore) > 1000
  ) {
    return json(
      { error: "Max score must be between 25 and 1000." },
      400,
    );
  }

  if (
    !Number.isInteger(accountPlayerIndex) ||
    Number(accountPlayerIndex) < 0 ||
    Number(accountPlayerIndex) >= playerNames.length
  ) {
    return json(
      { error: "Invalid account player position." },
      400,
    );
  }

  const cleanedNames = playerNames.map((name, index) => {
    const cleanedName =
      typeof name === "string" ? name.trim().slice(0, 40) : "";

    return cleanedName || `Player ${index + 1}`;
  });

  const db = serviceClient();

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .insert({
      owner_profile_id: profileId,
      max_score: Number(maxScore),
    })
    .select()
    .single();

  if (sessionError) {
    return json({ error: sessionError.message }, 500);
  }

  const { data: ownedBoosters, error: boosterError } = await db
    .from("player_boosters")
    .select("booster_key, quantity")
    .eq("profile_id", profileId);

  if (boosterError) {
    return json({ error: boosterError.message }, 500);
  }

  const boosterInventory = Object.fromEntries(
    (ownedBoosters ?? []).map((booster) => [
      booster.booster_key,
      booster.quantity,
    ]),
  );

  const players = cleanedNames.map((name, index) => {
    const isAccountPlayer = index === Number(accountPlayerIndex);

    return {
      session_id: session.id,
      profile_id: isAccountPlayer ? profileId : null,
      display_name: name,
      player_index: index,
      active_boosters: isAccountPlayer ? boosterInventory : {},
    };
  });

  const { data: sessionPlayers, error: playersError } = await db
    .from("game_session_players")
    .insert(players)
    .select();

  if (playersError) {
    // Avoid leaving an empty session if player creation fails.
    await db.from("game_sessions").delete().eq("id", session.id);

    return json({ error: playersError.message }, 500);
  }

  return json({
    session,
    players: sessionPlayers,
  });
});
