// Server-only pomocník pro nahrávání souborů do sdílené složky na Google Drive.
// Appka se přihlašuje jako konkrétní lidský Google účet (OAuth), ne jako servisní
// účet — servisní účty nemají na běžném (ne firemním) Google účtu vlastní úložiště,
// takže nahrávání fotek by na ně vždy padalo na "storageQuotaExceeded".
import { getSupabaseAdmin } from "./supabaseAdmin";

// ---------- Uložený refresh token (přihlášení) ----------

export async function ziskatStavPripojeni() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("google_drive_auth").select("*").eq("id", 1).maybeSingle();
  if (error) return { pripojeno: false, email: null };
  return { pripojeno: !!data?.refresh_token, email: data?.connected_email || null };
}

async function ziskatRefreshToken() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("google_drive_auth").select("refresh_token").eq("id", 1).maybeSingle();
  return data?.refresh_token || null;
}

export async function ulozitPripojeni(refreshToken, email) {
  const supabase = getSupabaseAdmin();
  await supabase.from("google_drive_auth").upsert({
    id: 1,
    refresh_token: refreshToken,
    connected_email: email,
    connected_at: new Date().toISOString(),
  });
}

export async function odpojitDrive() {
  const supabase = getSupabaseAdmin();
  await supabase.from("google_drive_auth").upsert({ id: 1, refresh_token: null, connected_email: null, connected_at: null });
}

// ---------- OAuth tokeny ----------

async function getAccessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Chybí GOOGLE_OAUTH_CLIENT_ID nebo GOOGLE_OAUTH_CLIENT_SECRET.");
  }
  const refreshToken = await ziskatRefreshToken();
  if (!refreshToken) {
    throw new Error("Google Drive není propojený — v appce klikni na 'Připojit Google Drive' a přihlas se.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    // Nejčastější příčina: appka (v testovacím režimu Google projektu) má propojení
    // platné jen ~7 dní — po vypršení je potřeba se v appce znovu přihlásit.
    if (text.includes("invalid_grant")) {
      throw new Error("Propojení s Google Drive vypršelo — v appce klikni na 'Připojit Google Drive' a přihlas se znovu.");
    }
    throw new Error("Nepodařilo se obnovit přístup ke Google Drive: " + text);
  }
  const data = await res.json();
  return data.access_token;
}

function escapovatProDotaz(nazev) {
  return nazev.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Najde v rodičovské složce podsložku s daným názvem, nebo ji založí, pokud neexistuje.
async function ziskatNeboVytvoritSlozku(nazev, rodicId, accessToken) {
  const dotaz = `name='${escapovatProDotaz(nazev)}' and '${rodicId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const hledatRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(dotaz)}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (hledatRes.ok) {
    const data = await hledatRes.json();
    if (data.files && data.files.length > 0) return data.files[0].id;
  }

  const vytvoritRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: nazev, mimeType: "application/vnd.google-apps.folder", parents: [rodicId] }),
  });
  if (!vytvoritRes.ok) {
    const text = await vytvoritRes.text();
    throw new Error("Založení složky zakázky na Google Drive se nepovedlo: " + text);
  }
  const { id: novaSlozkaId } = await vytvoritRes.json();

  const sdileniSlozkyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${novaSlozkaId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!sdileniSlozkyRes.ok) {
    console.error("Nastavení sdílení složky se nepovedlo:", await sdileniSlozkyRes.text());
  }

  return novaSlozkaId;
}

// bytes: Buffer, filename: string, mimeType: string, slozkaZakazky: volitelný název podsložky
// Vrací { fileId, previewUrl, viewUrl }
export async function nahratNaGoogleDrive(bytes, filename, mimeType, slozkaZakazky) {
  const hlavniSlozkaId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!hlavniSlozkaId) throw new Error("Chybí GOOGLE_DRIVE_FOLDER_ID.");

  const accessToken = await getAccessToken();

  let cilovaSlozkaId = hlavniSlozkaId;
  if (slozkaZakazky) {
    cilovaSlozkaId = await ziskatNeboVytvoritSlozku(slozkaZakazky, hlavniSlozkaId, accessToken);
  }

  const boundary = "dilnaapp" + Date.now();
  const metadata = { name: filename, parents: [cilovaSlozkaId] };

  // Multipart tělo jako skutečná binární data (Buffer), ne jako base64 text —
  // Google Drive API "Content-Transfer-Encoding: base64" nerespektuje spolehlivě.
  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`,
    "utf-8"
  );
  const postamble = Buffer.from(`\r\n--${boundary}--`, "utf-8");
  const body = Buffer.concat([preamble, bytes, postamble]);

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error("Nahrání na Google Drive se nepovedlo: " + text);
  }
  const { id: fileId } = await uploadRes.json();

  const sdileniRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!sdileniRes.ok) {
    console.error("Nastavení sdílení souboru se nepovedlo:", await sdileniRes.text());
  }

  return {
    fileId,
    previewUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    viewUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
}
