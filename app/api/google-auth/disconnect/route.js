import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { odpojitDrive } from "@/lib/googleDrive";

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Chybí přihlášení." }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) {
    return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  }

  try {
    await odpojitDrive();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Odpojení se nepovedlo, zkus to znovu." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
