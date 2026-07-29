import { getSupabaseAdmin } from "./supabaseAdmin";
import { nahratNaGoogleDrive, ziskatStavPripojeni } from "./googleDrive";

// Google Drive je "nastavený" jen pokud appka má OAuth přihlašovací údaje ve
// proměnných prostředí A zároveň je v databázi uložené aktivní propojení
// (refresh token) — to druhé appka zjistí jen dotazem do databáze.
export async function jeGoogleDriveNastaveny() {
  const maZakladniNastaveni = !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!maZakladniNastaveni) return false;
  const stav = await ziskatStavPripojeni();
  return stav.pripojeno;
}

// Nahraje fotku buď na Google Drive (pokud je propojený), nebo jako záložní řešení
// do Supabase Storage (appka nikdy nespadne jen kvůli tomu, že Drive není propojený).
// slozkaZakazky: název podsložky na Drive (např. "Z-2026-0001 – Jan Novák") — u Supabase
// fallbacku se jen promítne do názvu souboru (Storage podsložky appka nepoužívá).
// Vrací string, který appka uloží jako "path" — buď plná URL (Drive), nebo cesta
// v bucketu (Supabase); zobrazovací komponenty umí rozlišit obojí.
export async function nahratFotkuNaServeru(bytes, filename, mimeType, bucket, slozkaZakazky) {
  if (await jeGoogleDriveNastaveny()) {
    const result = await nahratNaGoogleDrive(bytes, filename, mimeType, slozkaZakazky);
    // Fotky se v appce zobrazují jako <img> náhled — na to je spolehlivější
    // previewUrl. Ostatní soubory (PDF archivy) appka jen otevírá v novém okně.
    return mimeType.startsWith("image/") ? result.previewUrl : result.viewUrl;
  }
  const supabase = getSupabaseAdmin();
  const path = `${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return path;
}
