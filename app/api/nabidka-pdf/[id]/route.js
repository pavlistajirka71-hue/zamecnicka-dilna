import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni } from "@/lib/role";
import { generovatPdfNabidky, nazevSouboruNabidky } from "@/lib/nabidkaPdf";
import { DEFAULT_NASTAVENI, DPH_SAZBA, computeKalkulaceCelkem, normalizovatKalkulaci } from "@/lib/theme";

const POVOLENE_SAZBY = [0, 0.12, 0.15, 0.21];

// Vygeneruje PDF cenové nabídky zakázky a vrátí ho ke stažení / sdílení.
// Data (kalkulace, nastavení firmy) si bere přímo z databáze, ne z prohlížeče.
// Nic se neukládá ani nemění — jen se vytvoří soubor.
export async function POST(request, { params }) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await overitPrihlaseni(supabaseAdmin, request);
  if (!user) return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    // bez těla = výchozí sazba DPH zakázky
  }

  const [{ data: order, error }, { data: nastaveniRow }] = await Promise.all([
    supabaseAdmin.from("orders").select("*").eq("id", params.id).maybeSingle(),
    supabaseAdmin.from("nastaveni").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (error || !order) return NextResponse.json({ error: "Zakázka nenalezena." }, { status: 404 });

  const nastaveni = { ...DEFAULT_NASTAVENI, ...(nastaveniRow || {}) };
  const polozky = normalizovatKalkulaci(order.kalkulace);
  if (!polozky.length) return NextResponse.json({ error: "Zakázka nemá kalkulaci — nabídku není z čeho udělat." }, { status: 400 });

  // Ceny bez DPH se počítají stejně jako v náhledu nabídky (sazbou zakázky);
  // zvolená sazba v náhledu mění jen řádek DPH a celkovou cenu na dokumentu.
  const celkem = computeKalkulaceCelkem(polozky, nastaveni, order.sazbaDph ?? DPH_SAZBA);
  const sazbaDph = POVOLENE_SAZBY.includes(Number(body.sazbaDph)) ? Number(body.sazbaDph) : order.sazbaDph ?? DPH_SAZBA;

  try {
    const pdf = await generovatPdfNabidky({ order, celkem, sazbaDph, nastaveni, supabaseAdmin });
    const nazev = nazevSouboruNabidky(order);
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nazev}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Generování PDF nabídky selhalo:", e);
    return NextResponse.json({ error: "PDF nabídky se nepodařilo vytvořit." }, { status: 500 });
  }
}
