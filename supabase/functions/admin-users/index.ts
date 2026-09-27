// Staff account management. Every action (except one-time bootstrap) requires
// the caller to hold the admin role. The main admin account cannot be modified.
import { adminClient, corsHeaders, json } from "../_shared/aiRouter.ts";

const MAIN_ADMIN = "aryan@chemtraceit.com";
type Role = "admin" | "moderator";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = adminClient();
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");

  // One-time bootstrap: only works while no admin exists, and only for the main admin email.
  if (action === "bootstrap") {
    const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) return json({ error: "Already set up." }, 403);
    const password = String(body.password ?? "");
    if (password.length < 8) return json({ error: "Password too short." }, 400);
    let userId: string | undefined;
    const { data: created, error } = await admin.auth.admin.createUser({ email: MAIN_ADMIN, password, email_confirm: true });
    if (error) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === MAIN_ADMIN);
      if (!existing) return json({ error: error.message }, 400);
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else userId = created.user.id;
    await admin.from("profiles").upsert({ id: userId, email: MAIN_ADMIN, display_name: "Aryan" });
    await admin.from("user_roles").insert({ user_id: userId, role: "admin" });
    return json({ ok: true });
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Admins only." }, 403);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Admins only." }, 403);

  const targetId = body.userId ? String(body.userId) : null;
  if (targetId) {
    const { data: t } = await admin.auth.admin.getUserById(targetId);
    if (t?.user?.email?.toLowerCase() === MAIN_ADMIN) return json({ error: "The main admin account can't be changed here." }, 403);
  }
  const setTitles = async (id: string, titles: unknown) => {
    if (!Array.isArray(titles)) return;
    await admin.from("user_titles").delete().eq("user_id", id);
    if (titles.length) await admin.from("user_titles").insert(titles.map((t) => ({ user_id: id, title_id: String(t) })));
  };
  const setRole = async (id: string, role: unknown) => {
    await admin.from("user_roles").delete().eq("user_id", id).in("role", ["admin", "moderator"]);
    if (role === "admin" || role === "moderator") await admin.from("user_roles").insert({ user_id: id, role: role as Role });
  };

  try {
    switch (action) {
      case "list": {
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const [{ data: roles }, { data: ut }, { data: profiles }] = await Promise.all([
          admin.from("user_roles").select("user_id, role"),
          admin.from("user_titles").select("user_id, title_id"),
          admin.from("profiles").select("id, display_name, disabled"),
        ]);
        const users = (list?.users ?? []).map((x) => ({
          id: x.id, email: x.email, created_at: x.created_at, last_sign_in_at: x.last_sign_in_at,
          display_name: profiles?.find((p) => p.id === x.id)?.display_name ?? null,
          disabled: !!profiles?.find((p) => p.id === x.id)?.disabled,
          roles: (roles ?? []).filter((r) => r.user_id === x.id).map((r) => r.role),
          titles: (ut ?? []).filter((r) => r.user_id === x.id).map((r) => r.title_id),
          is_main: x.email?.toLowerCase() === MAIN_ADMIN,
        }));
        return json({ users });
      }
      case "create": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        if (!email || password.length < 8) return json({ error: "Email and a password of at least 8 characters are required." }, 400);
        const { data: c, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) return json({ error: error.message }, 400);
        await admin.from("profiles").upsert({ id: c.user.id, email, display_name: body.displayName ? String(body.displayName) : null });
        await setRole(c.user.id, body.role);
        await setTitles(c.user.id, body.titles);
        return json({ ok: true });
      }
      case "update": {
        if (!targetId) return json({ error: "Missing user." }, 400);
        if ("role" in body) {
          if (targetId === u.user.id && body.role !== "admin") return json({ error: "You can't remove your own admin role." }, 400);
          await setRole(targetId, body.role);
        }
        if ("titles" in body) await setTitles(targetId, body.titles);
        if ("displayName" in body) await admin.from("profiles").update({ display_name: String(body.displayName ?? "") || null }).eq("id", targetId);
        return json({ ok: true });
      }
      case "reset_password": {
        const password = String(body.password ?? "");
        if (!targetId || password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
        const { error } = await admin.auth.admin.updateUserById(targetId, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      case "disable":
      case "enable": {
        if (!targetId) return json({ error: "Missing user." }, 400);
        if (targetId === u.user.id) return json({ error: "You can't disable yourself." }, 400);
        const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: action === "disable" ? "876000h" : "none" });
        if (error) return json({ error: error.message }, 400);
        await admin.from("profiles").update({ disabled: action === "disable" }).eq("id", targetId);
        return json({ ok: true });
      }
      case "delete": {
        if (!targetId || targetId === u.user.id) return json({ error: "Can't delete this account." }, 400);
        await admin.from("user_titles").delete().eq("user_id", targetId);
        await admin.from("user_roles").delete().eq("user_id", targetId);
        await admin.from("profiles").delete().eq("id", targetId);
        const { error } = await admin.auth.admin.deleteUser(targetId);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});
