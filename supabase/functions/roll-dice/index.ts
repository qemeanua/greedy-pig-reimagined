
import { corsHeaders } from "../_shared/cors.ts";
import {
  serviceClient,
  getCallerProfileId,
} from "../_shared/client.ts";

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
        { error: "Sign in required." },
        401
      );
    }

    let body: {
      sessionId?: unknown;
      useBoosters?: {
        scoreShield?: boolean;
        luckyReroll?: boolean;
        doublePoints?: boolean;
      };
    };

    try {
      body = await req.json();
    } catch {
      return json(
        { error: "Invalid request body." },
        400
      );
    }

    const sessionId = body.sessionId;

    if (
      typeof sessionId !== "string" ||
      !sessionId.trim()
    ) {
      return json(
        { error: "sessionId is required." },
        400
      );
    }

    const selected = body.useBoosters ?? {};

    const db = serviceClient();

    const { data, error } = await db.rpc(
      "roll_game_dice_atomic",
      {
        p_session_id: sessionId,
        p_owner_profile_id: profileId,
        p_use_shield:
          selected.scoreShield === true,
        p_use_reroll:
          selected.luckyReroll === true,
        p_use_double:
          selected.doublePoints === true,
      }
    );

    if (error) {
      console.error(
        "Atomic dice roll failed:",
        error
      );

      return json(
        {
          error:
            error.message ||
            "Unable to complete dice roll.",
        },
        409
      );
    }

    if (!data) {
      return json(
        {
          error:
            "No dice roll result was returned.",
        },
        500
      );
    }

    return json(data);
  } catch (error) {
    console.error(
      "Unexpected roll-dice error:",
      error
    );

    return json(
      {
        error:
          "Unable to roll the dice. Please try again.",
      },
      500
    );
  }
});
