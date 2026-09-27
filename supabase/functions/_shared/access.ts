// Platform access guard: only signed-in clients, moderators and admins may use the tools.
import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function hasPlatformAccess(admin: SupabaseClient, req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return false;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["client", "moderator", "admin"]);
  return (roles ?? []).length > 0;
}
