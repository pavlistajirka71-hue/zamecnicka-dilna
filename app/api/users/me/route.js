import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni, ziskatRoli } from "@/lib/role";

export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await overitPrihlaseni(supabaseAdmin, request);
  if (!user) return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });

  const role = await ziskatRoli(supabaseAdmin, user.id);
  return NextResponse.json({ id: user.id, email: user.email, role });
}
