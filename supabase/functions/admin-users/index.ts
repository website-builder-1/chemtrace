// Account management. Admins manage everyone; moderators manage client accounts only.
// The main admin account cannot be modified. Signed-in users can change their own
// password once while `must_change_password` is set (first sign-in).
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, corsHeaders, json } from "../_shared/aiRouter.ts";

const MAIN_ADMIN = "aryan@chemtraceit.com";
type Role = "admin" | "moderator" | "client";
const ROLES: Role[] = ["admin", "moderator", "client"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = adminClient();
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");

  if (action === "bootstrap") {
    const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) return json({ error: "Already set up." }, 403);
    return json({ error: "Bootstrap disabled." }, 403);
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Please sign in." }, 401);

  // First-sign-in password change (any signed-in user with the flag set).
  if (action === "change_own_password") {
    const { data: prof } = await admin.from("profiles").select("must_change_password").eq("id", u.user.id).maybeSingle();
    if (!prof?.must_change_password) return json({ error: "Password change not required." }, 400);
    const password = String(body.password ?? "");
    if (password.length < 10 || password.length > 72) return json({ error: "Password must be 10–72 characters." }, 400);
    // Must differ from the temporary password.
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: same } = await anon.auth.signInWithPassword({ email: u.user.email!, password });
    if (same?.session) return json({ error: "Choose a password different from your temporary one." }, 400);
    const { error } = await admin.auth.admin.updateUserById(u.user.id, { password });
    if (error) return json({ error: error.message }, 400);
    await admin.from("profiles").update({ must_change_password: false }).eq("id", u.user.id);
    return json({ ok: true });
  }

  const { data: myRoles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const mine = (myRoles ?? []).map((r) => r.role);
  const isAdmin = mine.includes("admin");
  const isMod = mine.includes("moderator");
  if (!isAdmin && !isMod) return json({ error: "Staff only." }, 403);

  const targetId = body.userId ? String(body.userId) : null;
  if (targetId) {
    const { data: t } = await admin.auth.admin.getUserById(targetId);
    if (t?.user?.email?.toLowerCase() === MAIN_ADMIN) return json({ error: "The main admin account can't be changed here." }, 403);
    if (!isAdmin) {
      const { data: tr } = await admin.from("user_roles").select("role").eq("user_id", targetId);
      const troles = (tr ?? []).map((r) => r.role);
      if (troles.includes("admin") || troles.includes("moderator")) return json({ error: "Moderators can only manage client accounts." }, 403);
    }
  }
  const setTitles = async (id: string, titles: unknown) => {
    if (!Array.isArray(titles)) return;
    await admin.from("user_titles").delete().eq("user_id", id);
    if (titles.length) await admin.from("user_titles").insert(titles.map((t) => ({ user_id: id, title_id: String(t) })));
  };
  const setRole = async (id: string, role: unknown) => {
    await admin.from("user_roles").delete().eq("user_id", id).in("role", ROLES);
    if (ROLES.includes(role as Role)) await admin.from("user_roles").insert({ user_id: id, role: role as Role });
  };

  const listAll = async () => {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const [{ data: roles }, { data: ut }, { data: profiles }] = await Promise.all([
      admin.from("user_roles").select("user_id, role"),
      admin.from("user_titles").select("user_id, title_id"),
      admin.from("profiles").select("id, display_name, disabled, company, must_change_password, terms_version, terms_signed_name, terms_signed_at"),
    ]);
    return (list?.users ?? []).map((x) => {
      const p = profiles?.find((q) => q.id === x.id);
      return {
        id: x.id, email: x.email, created_at: x.created_at, last_sign_in_at: x.last_sign_in_at,
        display_name: p?.display_name ?? null, company: p?.company ?? null, disabled: !!p?.disabled,
        must_change_password: !!p?.must_change_password,
        terms_version: p?.terms_version ?? null, terms_signed_name: p?.terms_signed_name ?? null, terms_signed_at: p?.terms_signed_at ?? null,
        roles: (roles ?? []).filter((r) => r.user_id === x.id).map((r) => r.role),
        titles: (ut ?? []).filter((r) => r.user_id === x.id).map((r) => r.title_id),
        is_main: x.email?.toLowerCase() === MAIN_ADMIN,
      };
    });
  };

  try {
    switch (action) {
      case "list":
      case "search": {
        let users = await listAll();
        const q = String(body.query ?? "").trim().toLowerCase().slice(0, 100);
        const role = String(body.role ?? "all");
        const status = String(body.status ?? "all");
        if (q) users = users.filter((x) => [x.email, x.display_name, x.company].some((v) => v?.toLowerCase().includes(q)));
        if (role !== "all") users = users.filter((x) => role === "none" ? !x.roles.length : x.roles.includes(role));
        if (status !== "all") users = users.filter((x) => status === "disabled" ? x.disabled : !x.disabled);
        return json({ users });
      }
      case "create": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        const role = String(body.role ?? "client");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return json({ error: "Please enter a valid email address." }, 400);
        if (password.length < 10 || password.length > 72) return json({ error: "The temporary password must be 10–72 characters. Use the Generate button for a strong one." }, 400);
        if (!ROLES.includes(role as Role)) return json({ error: "Choose a role." }, 400);
        if (!isAdmin && role !== "client") return json({ error: "Moderators can only create client accounts." }, 403);
        const { data: c, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) return json({ error: error.message }, 400);
        await admin.from("profiles").upsert({
          id: c.user.id, email, must_change_password: true,
          display_name: body.displayName ? String(body.displayName).slice(0, 120) : null,
          company: body.company ? String(body.company).slice(0, 120) : null,
        });
        await setRole(c.user.id, role);
        if (isAdmin) await setTitles(c.user.id, body.titles);
        return json({ ok: true });
      }
      case "update": {
        if (!targetId) return json({ error: "Missing user." }, 400);
        if ("role" in body) {
          if (!isAdmin && body.role !== "client" && body.role !== "none") return json({ error: "Moderators can only manage client accounts." }, 403);
          if (targetId === u.user.id && body.role !== "admin") return json({ error: "You can't remove your own admin role." }, 400);
          await setRole(targetId, body.role);
        }
        if ("titles" in body && isAdmin) await setTitles(targetId, body.titles);
        if ("displayName" in body) await admin.from("profiles").update({ display_name: String(body.displayName ?? "").slice(0, 120) || null }).eq("id", targetId);
        if ("company" in body) await admin.from("profiles").update({ company: String(body.company ?? "").slice(0, 120) || null }).eq("id", targetId);
        return json({ ok: true });
      }
      case "reset_password": {
        const password = String(body.password ?? "");
        if (!targetId || password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
        const { error } = await admin.auth.admin.updateUserById(targetId, { password });
        if (error) return json({ error: error.message }, 400);
        await admin.from("profiles").update({ must_change_password: true }).eq("id", targetId);
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
        if (!isAdmin) return json({ error: "Only admins can delete accounts." }, 403);
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
