import { getSupabaseAdmin } from "./supabaseAdmin";
import { nahratNaGoogleDrive, ziskatStavPripojeni } from "./googleDrive";

// Google Drive je "nastavený" jen pokud aplikace má OAuth přihlašovací údaje ve
// proměnných prostředí A zároveň je v databázi uložené aktivní propojení
// (refresh token) — to druhé aplikace zjistí jen dotazem do databáze.
export async function jeGoogleDriveNastaveny() {
  const maZakladniNastaveni = !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!maZakladniNastaveni) return false;
  const stav = await ziskatStavPripojeni();
  return stav.pripojeno;
}

// Nahraje fotku buď na Google Drive (pokud je propojený), nebo jako záložní řešení
// do Supabase Storage (aplikace nikdy nespadne jen kvůli tomu, že Drive není propojený).
// slozkaZakazky: název podsložky na Drive (např. "Z-2026-0001 – Jan Novák") — u Supabase
// fallbacku se jen promítne do názvu souboru (Storage podsložky aplikace nepoužívá).
// Vrací string, který aplikace uloží jako "path" — buď plná URL (Drive), nebo cesta
// v bucketu (Supabase); zobrazovací komponenty umí rozlišit obojí.
export async function nahratFotkuNaServeru(bytes, filename, mimeType, bucket, slozkaZakazky) {
  if (await jeGoogleDriveNastaveny()) {
    try {
      const result = await nahratNaGoogleDrive(bytes, filename, mimeType, slozkaZakazky);
      // Fotky se v aplikaci zobrazují jako <img> náhled — na to je spolehlivější
      // previewUrl. Ostatní soubory (PDF archivy) aplikace jen otevírá v novém okně.
      return mimeType.startsWith("image/") ? result.previewUrl : result.viewUrl;
    } catch (err) {
      // Cokoliv se při nahrávání na Drive pokazí (vypršelé přihlášení, výpadek Google,
      // ...) aplikace potichu obejde záložním uložením do Supabase Storage — soubor se
      // vždycky uloží, i když ne tam, kam by primárně měl.
      console.error("Nahrání na Google Drive selhalo, ukládám záložně do Supabase Storage:", err);
    }
  }
  const supabase = getSupabaseAdmin();
  const path = `${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return path;
}
