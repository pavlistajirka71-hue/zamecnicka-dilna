"use client";
import { supabase } from "./supabaseClient";

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Nahraje fotku na Google Drive přes appku (server request ověří podle přihlášení),
// nebo se záložně uloží do Supabase Storage, pokud Drive ještě není nastavený.
// kind: 'uctenky' | 'fotky' | 'protokoly' — určuje, do kterého bucketu se uloží záloha.
export async function nahratFotku(blob, filename, kind = "uctenky") {
  const dataUrl = await blobToDataUrl(blob);
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ image: dataUrl, filename, kind }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Nahrání se nepovedlo.");
  return data.url;
}
