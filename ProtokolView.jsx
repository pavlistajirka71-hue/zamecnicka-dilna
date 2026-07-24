import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { nahratFotkuNaServeru } from "@/lib/photoUpload";

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
  const { image, filename, kind } = body;
  if (!image || !filename) return NextResponse.json({ error: "Chybí fotka nebo název souboru." }, { status: 400 });

  const match = /^data:(image\/\w+);base64,(.+)$/.exec(image);
  if (!match) return NextResponse.json({ error: "Neplatný formát fotky." }, { status: 400 });
  const [, mediaType, base64Data] = match;

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const bucket = kind === "protokoly" ? "protokoly" : kind === "fotky" ? "fotky" : "uctenky";
    const path = await nahratFotkuNaServeru(bytes, filename, mediaType, bucket);
    return NextResponse.json({ url: path });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Nahrání fotky se nepovedlo." }, { status: 500 });
  }
}
