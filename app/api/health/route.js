import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ziskatStavPripojeni } from "@/lib/googleDrive";
import { jeGoogleDriveNastaveny } from "@/lib/photoUpload";

// Veřejná (bez přihlášení) kontrolní routa pro automatické sledování aplikace —
// bezpečná k volání zvenčí, nic necitlivého nevrací, jen "funguje / nefunguje".
// Doporučený způsob použití: napojit na ni bezplatnou externí službu (viz README),
// ať aplikaci sama pravidelně kontroluje a upozorní e-mailem, když něco selže.
export async function GET() {
  const vysledek = { ok: true, cas: new Date().toISOString(), kontroly: {} };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("nastaveni").select("id").limit(1);
    if (error) throw error;
    vysledek.kontroly.databaze = "ok";
  } catch (e) {
    vysledek.kontroly.databaze = "chyba";
    vysledek.ok = false;
  }

  try {
    if (await jeGoogleDriveNastaveny()) {
      const stav = await ziskatStavPripojeni();
      vysledek.kontroly.googleDrive = stav.pripojeno ? "ok" : "odpojeno";
      // Google Drive je jen doplňkové úložiště (aplikace má záložní řešení), takže
      // jeho výpadek aplikaci neshazuje jako celek — jen se to ukáže ve výsledku.
    } else {
      vysledek.kontroly.googleDrive = "nenastaveno";
    }
  } catch (e) {
    vysledek.kontroly.googleDrive = "chyba";
  }

  return NextResponse.json(vysledek, { status: vysledek.ok ? 200 : 503 });
}
