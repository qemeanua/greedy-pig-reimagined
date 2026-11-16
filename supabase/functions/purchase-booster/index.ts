
import { corsHeaders } from "../_shared/cors.ts";
import {
  serviceClient,
  getCallerProfileId,
} from "../_shared/client.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const profileId = await getCallerProfileId(req);

    if (!profileId) {
      return json({ error: "Sign in required." }, 401);
    }

    let body: {
      boosterKey?: unknown;
      quantity?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }

    const { boosterKey, quantity = 1 } = body;

    if (
      typeof boosterKey !== "string" ||
      ![
        "score_shield",
        "lucky_reroll",
        "double_points",
      ].includes(boosterKey)
    ) {
      return json({ error: "Invalid booster." }, 400);
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      return json(
        { error: "Quantity must be between 1 and 20." },
        400
      );
    }

    const db = serviceClient();

    const { data, error } = await db.rpc(
      "purchase_booster_atomic",
      {
        p_profile_id: profileId,
        p_booster_key: boosterKey,
        p_quantity: quantity,
      }
    );

    if (error) {
      const message = error.message ?? "Purchase failed.";

      if (message.includes("Not enough coins")) {
        return json({ error: "Not enough coins." }, 400);
      }

      if (message.includes("Unknown booster")) {
        return json({ error: "Unknown booster." }, 404);
      }

      console.error("Booster purchase error:", error);

      return json(
        { error: "Unable to complete purchase." },
        500
      );
    }

    return json(data);
  } catch (error) {
    console.error("Unexpected purchase error:", error);

    return json(
      { error: "Something went wrong. Please try again." },
      500
    );
  }
});
