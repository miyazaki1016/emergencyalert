import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One auth client per browser tab. Recreating clients on every call can
// multiply auth listeners and race session refreshes during PWA resume.
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public config missing");
  if (!browserClient) browserClient = createClient(url, key);
  return browserClient;
}
