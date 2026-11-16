
import { corsHeaders } from "../_shared/cors.ts";
import {
  serviceClient,
  getCallerProfileId,
} from "../_shared/client.ts";

const BOOSTER_KEYS = [
  "score_shield",
  "lucky_reroll",
  "double_points",
] as const;

type BoosterKey = (typeof BOOSTER_KEYS)[number];

type BoosterInventory = Record<BoosterKey, number>;

function createInventory(quantity = 0): BoosterInventory {
  return {
    score_shield: quantity,
    lucky_reroll: quantity,
    double_points: quantity,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      { error: "Method not allowed." },
      405
    );
  }

  try {
    const profileId = await getCallerProfileId(req);

    if (!profileId) {
      return json(
        { error: "Sign in to start a game." },
        401
      );
    }

    let body: {
      playerNames?: unknown;
      maxScore?: unknown;
      accountPlayerIndex?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return json(
        { error: "Invalid request body." },
        400
      );
    }

    const {
      playerNames,
      maxScore,
      accountPlayerIndex = 0,
    } = body;

    if (
      !Array.isArray(playerNames) ||
      playerNames.length < 2 ||
      playerNames.length > 8
    ) {
      return json(
        {
          error: "A game requires between 2 and 8 players.",
        },
        400
      );
    }

    if (
      !Number.isInteger(maxScore) ||
      Number(maxScore) < 25 ||
      Number(maxScore) > 1000
    ) {
      return json(
        {
          error: "Max score must be between 25 and 1000.",
        },
        400
      );
    }

    if (
      !Number.isInteger(accountPlayerIndex) ||
      Number(accountPlayerIndex) < 0 ||
      Number(accountPlayerIndex) >= playerNames.length
    ) {
      return json(
        {
          error: "Invalid account player position.",
        },
        400
      );
    }

    const cleanedNames = playerNames.map(
      (name, index) => {
        const cleaned =
          typeof name === "string"
            ? name.trim().slice(0, 40)
            : "";

        return cleaned || `Player ${index + 1}`;
      }
    );

    const db = serviceClient();

    // Only the signed-in player can own purchased boosters.
    const {
      data: ownedBoosters,
      error: boosterError,
    } = await db
      .from("player_boosters")
      .select("booster_key, quantity")
      .eq("profile_id", profileId);

    if (boosterError) {
      return json(
        {
          error: "Unable to load purchased boosters.",
        },
        500
      );
    }

    const purchasedInventory = createInventory(0);

    for (const booster of ownedBoosters ?? []) {
      const key = booster.booster_key as BoosterKey;

      if (BOOSTER_KEYS.includes(key)) {
        purchasedInventory[key] = Math.max(
          0,
          Math.floor(Number(booster.quantity) || 0)
        );
      }
    }

    // Free boosters are exclusively for local guests.
    const guestFreeQuantity =
      Number(maxScore) >= 250 ? 2 : 1;

    const {
      data: session,
      error: sessionError,
    } = await db
      .from("game_sessions")
      .insert({
        owner_profile_id: profileId,
        max_score: Number(maxScore),
      })
      .select()
      .single();

    if (sessionError || !session) {
      return json(
        {
          error:
            sessionError?.message ||
            "Unable to create game.",
        },
        500
      );
    }

    const players = cleanedNames.map(
      (name, index) => {
        const isAccountPlayer =
          index === Number(accountPlayerIndex);

        // Account player gets ZERO free boosters.
        // Guests receive their own free inventory.
        const freeBoosters = isAccountPlayer
          ? createInventory(0)
          : createInventory(guestFreeQuantity);

        // Account player sees ONLY purchased inventory.
        // Guests see ONLY their free inventory.
        const activeBoosters = isAccountPlayer
          ? { ...purchasedInventory }
          : { ...freeBoosters };

        return {
          session_id: session.id,
          profile_id: isAccountPlayer
            ? profileId
            : null,
          display_name: name,
          player_index: index,
          free_boosters: freeBoosters,
          active_boosters: activeBoosters,
        };
      }
    );

    const {
      data: sessionPlayers,
      error: playersError,
    } = await db
      .from("game_session_players")
      .insert(players)
      .select();

    if (playersError || !sessionPlayers) {
      await db
        .from("game_sessions")
        .delete()
        .eq("id", session.id);

      return json(
        {
          error:
            playersError?.message ||
            "Unable to create game players.",
        },
        500
      );
    }

    return json({
      session,
      players: sessionPlayers,
    });
  } catch (error) {
    console.error("Start game failed:", error);

    return json(
      {
        error: "Unable to start the game.",
      },
      500
    );
  }
});
