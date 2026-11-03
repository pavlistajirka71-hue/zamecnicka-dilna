import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni } from "@/lib/role";
import { generovatPdfReportuPrace } from "@/lib/reportPracePdf";

// PDF měsíčního reportu práce. Řádky reportu posílá aplikace (spočítané stejně
// jako tabulka na obrazovce); nic se neukládá, jen se vytvoří soubor.
export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await overitPrihlaseni(supabaseAdmin, request);
  if (!user) return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Chybí data reportu." }, { status: 400 });
  }
  const mesic = /^\d{4}-\d{2}$/.test(body.mesic || "") ? body.mesic : null;
  if (!mesic) return NextResponse.json({ error: "Neplatný měsíc." }, { status: 400 });
  const radky = (Array.isArray(body.radky) ? body.radky : []).slice(0, 500).map((r) => ({
    cislo: String(r.cislo || "").slice(0, 40),
    zakaznik: String(r.zakaznik || "").slice(0, 200),
    dilna: Number(r.dilna) || 0,
    montaz: Number(r.montaz) || 0,
    celkem: Number(r.celkem) || 0,
  }));
  const { data: n } = await supabaseAdmin.from("nastaveni").select("firmaNazev").eq("id", 1).maybeSingle();

  try {
    const pdf = await generovatPdfReportuPrace({ mesic, radky, firmaNazev: n?.firmaNazev || "" });
    return new NextResponse(pdf, {
      status: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="report-prace-${mesic}.pdf"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("PDF reportu práce selhalo:", e);
    return NextResponse.json({ error: "PDF se nepodařilo vytvořit." }, { status: 500 });
  }
}
