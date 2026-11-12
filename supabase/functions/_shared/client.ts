import { createClient } from "jsr:@supabase/supabase-js@2";

// Service-role client: bypasses RLS, used only inside Edge Functions after we've
// independently verified the caller via their auth token.
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Resolves the authenticated profile id from the request's bearer token, or null for a guest.
export async function getCallerProfileId(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
