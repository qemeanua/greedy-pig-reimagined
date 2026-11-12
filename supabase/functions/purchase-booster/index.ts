import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient, getCallerProfileId } from "../_shared/client.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Validates coin balance server-side before granting a booster, so the shop can't be
// used to mint boosters for free by replaying or editing a client-side request.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const profileId = await getCallerProfileId(req);
  if (!profileId) return json({ error: "Sign in required." }, 401);

  const { boosterKey, quantity = 1 } = await req.json();
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return json({ error: "quantity must be between 1 and 20." }, 400);
  }

  const db = serviceClient();

  const { data: booster } = await db.from("boosters").select("*").eq("key", boosterKey).single();
  if (!booster) return json({ error: "Unknown booster." }, 404);

  const totalCost = booster.cost_coins * quantity;

  const { data: profile } = await db.from("profiles").select("coins").eq("id", profileId).single();
  if (!profile || profile.coins < totalCost) return json({ error: "Not enough coins." }, 400);

  const { data: updated, error: deductError } = await db
    .from("profiles")
    .update({ coins: profile.coins - totalCost })
    .eq("id", profileId)
    .gte("coins", totalCost) // guards against a concurrent purchase racing the balance check
    .select("coins")
    .single();
  if (deductError || !updated) return json({ error: "Not enough coins." }, 400);

  const { data: ownedBooster } = await db
    .from("player_boosters")
    .select("quantity")
    .eq("profile_id", profileId)
    .eq("booster_key", boosterKey)
    .maybeSingle();

  const newQuantity = (ownedBooster?.quantity ?? 0) + quantity;

  await db
    .from("player_boosters")
    .upsert({ profile_id: profileId, booster_key: boosterKey, quantity: newQuantity });

  return json({ coins: updated.coins, boosterKey, quantity: newQuantity });
});
