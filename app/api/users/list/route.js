import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Chybí přihlášení." }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  if (error) return NextResponse.json({ error: "Načtení seznamu uživatelů se nepovedlo." }, { status: 500 });

  const uzivatele = data.users
    .map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at }))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  return NextResponse.json({ uzivatele });
}
