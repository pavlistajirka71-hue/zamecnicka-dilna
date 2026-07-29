import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni } from "@/lib/role";

export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await overitPrihlaseni(supabaseAdmin, request);
  if (!user) return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });

  const [{ data: userList, error }, { data: role }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
    supabaseAdmin.from("uzivatele_role").select("*"),
  ]);
  if (error) return NextResponse.json({ error: "Načtení seznamu uživatelů se nepovedlo." }, { status: 500 });

  const roleMapa = new Map((role || []).map((r) => [r.user_id, r.role]));
  const uzivatele = userList.users
    .map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, role: roleMapa.get(u.id) || "user" }))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  return NextResponse.json({ uzivatele });
}
