import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { presunoutNaDrive } from "@/lib/migrace";
import { jeGoogleDriveNastaveny } from "@/lib/photoUpload";

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Chybí přihlášení." }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  }

  if (!(await jeGoogleDriveNastaveny())) {
    return NextResponse.json({ error: "Google Drive není propojený." }, { status: 400 });
  }

  try {
    const vysledek = await presunoutNaDrive();
    return NextResponse.json(vysledek);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Přesun se nepovedl." }, { status: 500 });
  }
}
