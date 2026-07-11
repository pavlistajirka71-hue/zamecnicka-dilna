import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function safeProtokol(protokol, signatureUrl) {
  return {
    cislo: protokol.cislo,
    zakaznik: protokol.zakaznik,
    zakaznikIdentifikace: protokol.zakaznikIdentifikace,
    popisDila: protokol.popisDila,
    vyhrady: protokol.vyhrady,
    datumPredani: protokol.datumPredani,
    zhotovitel: protokol.zhotovitel,
    podpisDatum: protokol.podpisDatum,
    stav: protokol.stav,
    signatureUrl,
  };
}

export async function GET(request, { params }) {
  const { id } = params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Chybí token." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase.from("orders").select("id, protokol").eq("id", id).maybeSingle();
  if (error || !order || !order.protokol || order.protokol.token !== token) {
    return NextResponse.json({ error: "Odkaz nenalezen nebo už neplatí." }, { status: 404 });
  }

  let signatureUrl = null;
  if (order.protokol.podpisPath) {
    const { data } = await supabase.storage.from("protokoly").createSignedUrl(order.protokol.podpisPath, 3600);
    signatureUrl = data?.signedUrl || null;
  }

  return NextResponse.json({ protokol: safeProtokol(order.protokol, signatureUrl) });
}

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { token, signature } = body; // signature = base64 PNG data URL

  if (!token || !signature) return NextResponse.json({ error: "Chybí token nebo podpis." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase.from("orders").select("id, protokol").eq("id", id).maybeSingle();
  if (error || !order || !order.protokol || order.protokol.token !== token) {
    return NextResponse.json({ error: "Odkaz nenalezen nebo už neplatí." }, { status: 404 });
  }
  if (order.protokol.stav === "podepsano") {
    return NextResponse.json({ error: "Protokol je už podepsaný." }, { status: 409 });
  }

  const base64 = signature.split(",")[1] || signature;
  const bytes = Buffer.from(base64, "base64");
  const path = `${id}/podpis-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage.from("protokoly").upload(path, bytes, {
    contentType: "image/png",
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: "Nahrání podpisu se nepovedlo." }, { status: 500 });
  }

  const nextProtokol = {
    ...order.protokol,
    podpisPath: path,
    podpisDatum: new Date().toISOString().slice(0, 10),
    stav: "podepsano",
  };

  const { error: updateError } = await supabase.from("orders").update({ protokol: nextProtokol }).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: "Uložení podpisu se nepovedlo." }, { status: 500 });
  }

  const { data: signedUrlData } = await supabase.storage.from("protokoly").createSignedUrl(path, 3600);
  return NextResponse.json({ protokol: safeProtokol(nextProtokol, signedUrlData?.signedUrl || null) });
}
