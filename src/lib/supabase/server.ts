import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { env } from "./env";

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function getServiceClient() {
  if (!cached) {
    cached = createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}