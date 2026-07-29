import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { vyhledatVAres } from "@/lib/ares";

export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Chybí přihlášení." }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  }

  const ico = request.nextUrl.searchParams.get("ico");
  if (!ico) return NextResponse.json({ error: "Chybí IČO." }, { status: 400 });

  try {
    const vysledek = await vyhledatVAres(ico);
    return NextResponse.json(vysledek);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Vyhledávání v ARES se nepovedlo." }, { status: 502 });
  }
}
