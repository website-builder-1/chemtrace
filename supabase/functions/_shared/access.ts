// Platform access guard: only signed-in clients, moderators and admins may use the tools.
import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function hasPlatformAccess(admin: SupabaseClient, req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  let userId: string | undefined;
  try { const { data } = await admin.auth.getUser(token); userId = data?.user?.id; } catch { return false; }
  if (!userId) return false;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId).in("role", ["client", "moderator", "admin"]);
  return (roles ?? []).length > 0;
}
