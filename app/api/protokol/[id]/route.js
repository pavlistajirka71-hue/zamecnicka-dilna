import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { nahratFotkuNaServeru } from "@/lib/photoUpload";

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

// Podpisy nahrané před zapnutím Google Drive mají podpisPath jako cestu v Supabase
// Storage (bez "http"); nové mají rovnou plnou URL na Drive. Podporujeme obojí.
async function ziskatUrlPodpisu(supabase, podpisPath) {
  if (!podpisPath) return null;
  if (podpisPath.startsWith("http")) return podpisPath;
  const { data } = await supabase.storage.from("protokoly").createSignedUrl(podpisPath, 3600);
  return data?.signedUrl || null;
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

  const signatureUrl = await ziskatUrlPodpisu(supabase, order.protokol.podpisPath);
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

  let podpisPath;
  try {
    podpisPath = await nahratFotkuNaServeru(bytes, `podpis-${id}-${Date.now()}.png`, "image/png", "protokoly");
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Nahrání podpisu se nepovedlo." }, { status: 500 });
  }

  const nextProtokol = {
    ...order.protokol,
    podpisPath,
    podpisDatum: new Date().toISOString().slice(0, 10),
    stav: "podepsano",
  };

  const { error: updateError } = await supabase.from("orders").update({ protokol: nextProtokol }).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: "Uložení podpisu se nepovedlo." }, { status: 500 });
  }

  return NextResponse.json({ protokol: safeProtokol(nextProtokol, podpisPath) });
}
