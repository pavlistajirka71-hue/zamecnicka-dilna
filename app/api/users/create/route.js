import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni, jeSA } from "@/lib/role";

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await overitPrihlaseni(supabaseAdmin, request);
  if (!user) return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  if (!(await jeSA(supabaseAdmin, user.id))) {
    return NextResponse.json({ error: "Přidávat uživatele smí jen správce (role sa)." }, { status: 403 });
  }

  const body = await request.json();
  const { email, heslo, role } = body;
  if (!email || !heslo) return NextResponse.json({ error: "Chybí e-mail nebo heslo." }, { status: 400 });
  if (heslo.length < 6) return NextResponse.json({ error: "Heslo musí mít aspoň 6 znaků." }, { status: 400 });
  const zvolenaRole = role === "sa" ? "sa" : "user";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: heslo,
    email_confirm: true, // appka nemá nastavené odesílání potvrzovacích e-mailů — účet je rovnou aktivní
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Založení uživatele se nepovedlo." }, { status: 500 });
  }

  await supabaseAdmin.from("uzivatele_role").upsert({ user_id: data.user.id, role: zvolenaRole });

  return NextResponse.json({ uzivatel: { id: data.user.id, email: data.user.email, created_at: data.user.created_at, role: zvolenaRole } });
}
