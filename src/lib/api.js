import { supabase } from "./supabase";

// Thin wrapper over the Edge Functions. `functions.invoke` already attaches the
// current session's auth token, so these calls run as the signed-in player.
async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const message = (await error.context?.json?.().catch(() => null))?.error ?? error.message;
    throw new Error(message);
  }
  return data;
}

export function startGame({ playerNames, maxScore }) {
  return callFunction("start-game", { playerNames, maxScore });
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
