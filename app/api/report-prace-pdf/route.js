import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni } from "@/lib/role";
import { generovatPdfReportuPrace, generovatPdfNakladu } from "@/lib/reportPracePdf";
import { mesicniPrace, mesicniJizdy, mesicniUctenky } from "@/lib/reporty";

// PDF měsíčních reportů: typ "prace" | "jizdy" | "uctenky". Data se počítají přímo
// z databáze (stejnými funkcemi jako tabulka v aplikaci). Nic se neukládá.
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
  const typ = ["prace", "jizdy", "uctenky"].includes(body.typ) ? body.typ : "prace";

  const [{ data: orders, error }, { data: n }] = await Promise.all([
    supabaseAdmin.from("orders").select("id, cislo, zakaznik, prace, naklady"),
    supabaseAdmin.from("nastaveni").select("firmaNazev").eq("id", 1).maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "Načtení dat se nepovedlo." }, { status: 500 });
  const firmaNazev = n?.firmaNazev || "";

  try {
    let pdf;
    if (typ === "prace") {
      pdf = await generovatPdfReportuPrace({ mesic, radky: mesicniPrace(orders, mesic), firmaNazev });
    } else {
      let radky = typ === "jizdy" ? mesicniJizdy(orders, mesic) : mesicniUctenky(orders, mesic);
      if (typ === "uctenky" && body.filtr === "bezFotky") radky = radky.filter((r) => !r.fotoPath && r.zdroj !== "faktura");
      if (typ === "uctenky" && body.filtr === "sFotkou") radky = radky.filter((r) => r.fotoPath);
      pdf = await generovatPdfNakladu({ typ, mesic, radky, firmaNazev, sFotkami: typ === "uctenky" && body.sFotkami !== false, supabaseAdmin });
    }
    const nazev = `${typ === "prace" ? "report-prace" : typ === "jizdy" ? "jizdy" : "uctenky"}-${mesic}.pdf`;
    return new NextResponse(pdf, {
      status: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nazev}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("PDF reportu selhalo:", e);
    return NextResponse.json({ error: "PDF se nepodařilo vytvořit." }, { status: 500 });
  }
}
