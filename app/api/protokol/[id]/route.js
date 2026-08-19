import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { nahratFotkuNaServeru } from "@/lib/photoUpload";
import { nazevSlozkyZakazky } from "@/lib/theme";

function safeProtokol(protokol, signatureUrl, fotky) {
  return {
    cislo: protokol.cislo,
    zakaznik: protokol.zakaznik,
    zakaznikIdentifikace: protokol.zakaznikIdentifikace,
    popisDila: protokol.popisDila,
    vyhrady: protokol.vyhrady,
    datumPredani: protokol.datumPredani,
    mistoPredani: protokol.mistoPredani,
    jmenoPrebirajiciho: protokol.jmenoPrebirajiciho,
    zarucniDobaMesicu: protokol.zarucniDobaMesicu,
    zhotovitel: protokol.zhotovitel,
    opravaZhotoviteleDatum: protokol.opravaZhotoviteleDatum,
    opravaUdajuDatum: protokol.opravaUdajuDatum,
    podpisDatum: protokol.podpisDatum,
    stav: protokol.stav,
    signatureUrl,
    fotky: fotky || [],
  };
}

// Podpisy/fotky nahrané před zapnutím Google Drive mají cestu jako čistý název
// v Supabase Storage (bez "http"); nové mají rovnou plnou URL na Drive. Funkce
// podporuje obojí a bere bucket jako parametr, ať jde použít pro protokoly
// (podpis) i pro fotky (fotodokumentace).
async function ziskatSignedUrl(supabase, cesta, bucket) {
  if (!cesta) return null;
  if (cesta.startsWith("http")) return cesta;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(cesta, 3600);
  return data?.signedUrl || null;
}

// Veřejná stránka nemá přihlášeného uživatele (zákazník otevírá odkaz bez
// účtu), takže klientský useSignedUrl hook, co počítá s aktivní session, by
// tady nemohl fungovat. URL adresy fotek se proto rozdiskují rovnou na
// serveru přes administrátorský přístup a pošlou se stránce už hotové.
async function ziskatFotkyKProtokolu(supabase, order) {
  const fotky = (order.fotky || []).filter((f) => f.typ === "protokol");
  const sUrl = await Promise.all(
    fotky.map(async (f) => ({ id: f.id, url: await ziskatSignedUrl(supabase, f.path, "fotky") }))
  );
  return sUrl.filter((f) => f.url);
}

export async function GET(request, { params }) {
  const { id } = params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Chybí token." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase.from("orders").select("id, protokol, fotky").eq("id", id).maybeSingle();
  if (error || !order || !order.protokol || order.protokol.token !== token) {
    return NextResponse.json({ error: "Odkaz nenalezen nebo už neplatí." }, { status: 404 });
  }

  const signatureUrl = await ziskatSignedUrl(supabase, order.protokol.podpisPath, "protokoly");
  const fotky = await ziskatFotkyKProtokolu(supabase, order);
  return NextResponse.json({ protokol: safeProtokol(order.protokol, signatureUrl, fotky) });
}

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { token, signature } = body; // signature = base64 PNG data URL

  if (!token || !signature) return NextResponse.json({ error: "Chybí token nebo podpis." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase.from("orders").select("id, cislo, zakaznik, protokol, fotky").eq("id", id).maybeSingle();
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
    podpisPath = await nahratFotkuNaServeru(bytes, `podpis-${id}-${Date.now()}.png`, "image/png", "protokoly", nazevSlozkyZakazky(order));
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

  const fotky = await ziskatFotkyKProtokolu(supabase, order);
  return NextResponse.json({ protokol: safeProtokol(nextProtokol, podpisPath, fotky) });
}
