
import { supabase } from "./supabase";

// Thin wrapper over the Edge Functions.
// Supabase attaches the signed-in user's authentication token.
async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    const message =
      (await error.context?.json?.().catch(() => null))?.error ??
      error.message;

    throw new Error(message);
  }

  return data;
}

export function startGame({
  playerNames,
  maxScore,
  accountPlayerIndex = 0,
}) {
  return callFunction("start-game", {
    playerNames,
    maxScore,
    accountPlayerIndex,
  });
}

export function rollDice({ sessionId, useBoosters }) {
  return callFunction("roll-dice", { sessionId, useBoosters });
}

export function bankScore({ sessionId }) {
  return callFunction("bank-score", { sessionId });
}

export function purchaseBooster({ boosterKey, quantity = 1 }) {
  return callFunction("purchase-booster", { boosterKey, quantity });
}
