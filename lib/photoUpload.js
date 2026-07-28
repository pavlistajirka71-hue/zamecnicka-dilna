import { getSupabaseAdmin } from "./supabaseAdmin";
import { nahratNaGoogleDrive } from "./googleDrive";

export function jeGoogleDriveNastaveny() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

// Nahraje fotku buď na Google Drive (pokud je nastavený), nebo jako záložní řešení
// do Supabase Storage (stejně jako appka dělala předtím) — appka nikdy nespadne
// jen kvůli tomu, že Google Drive ještě není nastavený.
// Vrací string, který appka uloží jako "path" — buď plná URL (Drive), nebo cesta
// v bucketu (Supabase); zobrazovací komponenty umí rozlišit obojí.
export async function nahratFotkuNaServeru(bytes, filename, mimeType, bucket) {
  if (jeGoogleDriveNastaveny()) {
    const result = await nahratNaGoogleDrive(bytes, filename, mimeType);
    return result.viewUrl;
  }
  const supabase = getSupabaseAdmin();
  const path = `${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return path;
}
