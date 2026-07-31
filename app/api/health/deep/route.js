import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ziskatStavPripojeni } from "@/lib/googleDrive";
import { jeGoogleDriveNastaveny } from "@/lib/photoUpload";
import { vyhledatVAres } from "@/lib/ares";

// Veřejná (bez přihlášení), pomalejší a důkladnější sestra /api/health — místo
// "odpovídá server" appka appce si skutečně VYZKOUŠÍ, že si s appkou externí
// služby rozumí přesně tak, jak appka očekává (přesný tvar odpovědi, ne jen že
// něco vrátí). Chytá tím i situace, kdy třetí strana nespadla, jen si "tiše"
// změnila chování (a stejná chyba, co jsme řešili u PDF, by se objevila hned,
// ne až při skutečném použití appkou).
//
// Doporučené použití: druhý, samostatný monitor v UptimeRobotu (nebo podobné
// službě) s intervalem třeba jednou denně — je to pomalejší a "dražší" kontrola
// než /api/health, nemá smysl ji spouštět každých pár minut.
export async function GET() {
  const vysledek = { ok: true, cas: new Date().toISOString(), kontroly: {} };

  // ---------- Databáze ----------
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("nastaveni").select("id").limit(1);
    if (error) throw error;
    vysledek.kontroly.databaze = "ok";
  } catch (e) {
    vysledek.kontroly.databaze = "chyba: " + e.message;
    vysledek.ok = false;
  }

  // ---------- Google Drive (jen stav přihlášení, viz /api/health) ----------
  try {
    if (await jeGoogleDriveNastaveny()) {
      const stav = await ziskatStavPripojeni();
      vysledek.kontroly.googleDrive = stav.pripojeno ? "ok" : "odpojeno";
    } else {
      vysledek.kontroly.googleDrive = "nenastaveno";
    }
  } catch (e) {
    vysledek.kontroly.googleDrive = "chyba";
  }

  // ---------- ARES — ověří skutečný tvar odpovědi na dobře známé IČO ----------
  try {
    const vysledekAres = await vyhledatVAres("27082440"); // Alza.cz a.s. — stálý, dobře známý subjekt
    const maOcekavanyTvar = vysledekAres && vysledekAres.nazev && vysledekAres.nazev.length > 0 && vysledekAres.adresa && vysledekAres.adresa.length > 0;
    if (!maOcekavanyTvar) throw new Error("odpověď ARES nemá očekávaný tvar (chybí název nebo adresa)");
    vysledek.kontroly.ares = "ok";
  } catch (e) {
    vysledek.kontroly.ares = "chyba: " + e.message;
    // ARES je jen doplňková funkce (appka bez ní jede dál), takže její výpadek
    // appku jako celek neshazuje — jen se to ukáže ve výsledku.
  }

  // ---------- Generování PDF — appka si opravdu zkusí vytvořit dokument ----------
  try {
    const FONT_PATH = path.join(process.cwd(), "fonts", "IBMPlexSerif-Regular.ttf");
    const buffer = await new Promise((resolve, reject) => {
      // DŮLEŽITÉ: pdfkit si při vytvoření dokumentu sám zkusí načíst vestavěné
      // "Helvetica" (viz stejný problém, který jsme řešili u ostrého PDF exportu) —
      // vlastní font se proto musí předat rovnou v konstruktoru, ne až potom.
      const doc = new PDFDocument({ size: "A4", margin: 50, font: FONT_PATH });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.font(FONT_PATH).fontSize(12).text("Kontrolní PDF — háčky a čárky: příliš žluťoučký kůň");
      doc.end();
    });
    const jePlatnePdf = buffer.length > 100 && buffer.toString("utf8", 0, 5) === "%PDF-";
    if (!jePlatnePdf) throw new Error("vygenerovaný soubor nevypadá jako platné PDF");
    vysledek.kontroly.generovaniPdf = "ok";
  } catch (e) {
    vysledek.kontroly.generovaniPdf = "chyba: " + e.message;
    vysledek.ok = false; // generování PDF je klíčová funkce appky (archiv zakázek) — tohle appku shodí
  }

  return NextResponse.json(vysledek, { status: vysledek.ok ? 200 : 503 });
}
