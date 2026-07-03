import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 服务端客户端（用 service_role key，绕过 RLS）。
 *
 * 注意：本环境沙箱封了直连 Postgres 5432 端口，但 HTTPS 443 可达，
 * 因此走 Supabase REST API（PostgREST），不直连数据库。
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 凭据未配置（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "study-island-uploads";
