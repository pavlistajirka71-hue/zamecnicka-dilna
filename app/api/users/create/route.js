import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Chybí přihlášení." }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  }

  const body = await request.json();
  const { email, heslo } = body;
  if (!email || !heslo) return NextResponse.json({ error: "Chybí e-mail nebo heslo." }, { status: 400 });
  if (heslo.length < 6) return NextResponse.json({ error: "Heslo musí mít aspoň 6 znaků." }, { status: 400 });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: heslo,
    email_confirm: true, // appka nemá nastavené odesílání potvrzovacích e-mailů — účet je rovnou aktivní
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Založení uživatele se nepovedlo." }, { status: 500 });
  }

  return NextResponse.json({ uzivatel: { id: data.user.id, email: data.user.email, created_at: data.user.created_at } });
}
