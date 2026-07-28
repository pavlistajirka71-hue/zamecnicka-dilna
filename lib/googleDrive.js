// Server-only pomocník pro nahrávání souborů do sdílené složky na Google Drive
// přes servisní účet. Používá jen vestavěné Node moduly (crypto, fetch) — žádná
// externí knihovna není potřeba. Nikdy needovej z "use client" komponenty.

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKeyRaw) {
    throw new Error("Chybí GOOGLE_SERVICE_ACCOUNT_EMAIL nebo GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.");
  }
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const { createSign } = await import("crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64");
  const jwt = `${unsigned}.${signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Nepodařilo se přihlásit ke Google Drive: " + text);
  }
  const data = await res.json();
  return data.access_token;
}

function escapovatProDotaz(nazev) {
  return nazev.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Najde v rodičovské složce podsložku s daným názvem, nebo ji založí, pokud neexistuje.
// Vrací ID té podsložky.
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

  // Ať je i samotná složka dostupná komukoliv s odkazem (jen ke čtení).
  await fetch(`https://www.googleapis.com/drive/v3/files/${novaSlozkaId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return novaSlozkaId;
}

// bytes: Buffer, filename: string, mimeType: string, slozkaZakazky: volitelný název podsložky
// (např. "Z-2026-0001 – Jan Novák") — pokud je zadaný, soubor se nahraje do téhle
// podsložky (založí se, pokud ještě neexistuje), jinak přímo do hlavní sdílené složky.
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
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${bytes.toString("base64")}\r\n` +
    `--${boundary}--`;

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error("Nahrání na Google Drive se nepovedlo: " + text);
  }
  const { id: fileId } = await uploadRes.json();

  // Zpřístupnit soubor komukoliv s odkazem (jen ke čtení) — appka jinak nemá jak
  // fotku zobrazit bez opakovaného OAuth přihlašování každého člena týmu.
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return {
    fileId,
    previewUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    viewUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
}
