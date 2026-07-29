import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni, jeSA } from "@/lib/role";

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await overitPrihlaseni(supabaseAdmin, request);
  if (!user) return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  if (!(await jeSA(supabaseAdmin, user.id))) {
    return NextResponse.json({ error: "Měnit role smí jen správce (role sa)." }, { status: 403 });
  }

  const body = await request.json();
  const { userId, role } = body;
  if (!userId || (role !== "sa" && role !== "user")) {
    return NextResponse.json({ error: "Chybí userId nebo neplatná role." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("uzivatele_role").upsert({ user_id: userId, role });
  if (error) return NextResponse.json({ error: "Nastavení role se nepovedlo." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
