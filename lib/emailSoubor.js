"use client";
// Načte uložený e-mail přímo v prohlížeči (nic se nikam neposílá):
//   .msg — klasický Outlook (přetažení e-mailu z Outlooku na plochu / do složky)
//   .eml — webový a nový Outlook (Stáhnout), Gmail, Seznam, Thunderbird…
// Knihovny se načtou až ve chvíli, kdy je opravdu potřeba (nezpomalují start aplikace).

const MIN_VELIKOST_FOTKY = 20 * 1024; // menší obrázky bývají loga a ikonky z podpisu
const PRIPONY_FOTEK = /\.(jpe?g|png|webp|gif|bmp)$/i;

const KODOVANI = { 65001: "utf-8", 1250: "windows-1250", 1252: "windows-1252", 28592: "iso-8859-2", 28591: "iso-8859-1", 20127: "us-ascii", 852: "ibm852" };

function dekodovat(bytes, codepage) {
  const zacatek = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  const meta = zacatek.match(/charset=["']?([\w-]+)/i);
  const navrhy = [meta && meta[1], KODOVANI[codepage], "utf-8"].filter(Boolean);
  for (const k of navrhy) {
    try {
      return new TextDecoder(k).decode(bytes);
    } catch (e) {
      // neznámé kódování → zkusí se další
    }
  }
  return new TextDecoder().decode(bytes);
}

export function htmlNaText(html) {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]+>/g, " ");
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("style, script, head").forEach((el) => el.remove());
  doc.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
  doc.querySelectorAll("p, div, li, tr, h1, h2, h3, h4, table, blockquote").forEach((el) => el.append("\n"));
  return (doc.body ? doc.body.textContent : "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function jeFotka(nazev, mime, velikost, skryta) {
  if (skryta) return false;
  if (velikost && velikost < MIN_VELIKOST_FOTKY) return false;
  return (mime || "").startsWith("image/") || PRIPONY_FOTEK.test(nazev || "");
}

async function nacistEml(buffer) {
  const { default: PostalMime } = await import("postal-mime");
  const e = await PostalMime.parse(buffer);
  const prilohy = e.attachments || [];
  const fotky = [];
  let ostatni = 0;
  for (const a of prilohy) {
    const velikost = a.content ? a.content.byteLength : 0;
    if (jeFotka(a.filename, a.mimeType, velikost, false) && !(a.related && velikost < 60 * 1024)) {
      fotky.push(new Blob([a.content], { type: a.mimeType || "image/jpeg" }));
    } else if (!(a.mimeType || "").startsWith("image/") && !PRIPONY_FOTEK.test(a.filename || "")) {
      ostatni++; // PDF, výkresy, dokumenty… (do poptávky se zatím neukládají)
    }
  }
  return {
    odJmeno: e.from?.name || "",
    odEmail: e.from?.address || "",
    predmet: e.subject || "",
    text: e.text && e.text.trim() ? e.text : htmlNaText(e.html),
    fotky,
    ostatniPrilohy: ostatni,
  };
}

async function nacistMsg(buffer) {
  const modul = await import("@kenjiuno/msgreader");
  const MsgReader = (modul.default && modul.default.default) || modul.default || modul.MsgReader;
  const reader = new MsgReader(buffer);
  const d = reader.getFileData();
  if (d.error) throw new Error(d.error);
  let text = d.body || "";
  if (!text.trim() && d.html) text = htmlNaText(dekodovat(d.html, d.internetCodepage || d.messageCodepage));
  const fotky = [];
  let ostatni = 0;
  for (const a of d.attachments || []) {
    if (jeFotka(a.fileName, a.attachMimeTag, a.contentLength, a.attachmentHidden)) {
      const priloha = reader.getAttachment(a);
      const pripona = (a.fileName || "").split(".").pop().toLowerCase();
      const mime = a.attachMimeTag || (pripona === "png" ? "image/png" : pripona === "gif" ? "image/gif" : pripona === "webp" ? "image/webp" : "image/jpeg");
      fotky.push(new Blob([priloha.content], { type: mime }));
    } else if (!a.attachmentHidden && !(a.attachMimeTag || "").startsWith("image/") && !PRIPONY_FOTEK.test(a.fileName || "")) {
      ostatni++;
    }
  }
  const odEmail = [d.senderSmtpAddress, d.sentRepresentingSmtpAddress, d.senderEmail].find((x) => x && x.includes("@")) || "";
  return { odJmeno: d.senderName || "", odEmail, predmet: d.subject || "", text, fotky, ostatniPrilohy: ostatni };
}

export async function nacistSouborEmailu(soubor) {
  const nazev = (soubor.name || "").toLowerCase();
  if (soubor.size > 40 * 1024 * 1024) throw new Error("E-mail je moc velký (víc než 40 MB).");
  const buffer = await soubor.arrayBuffer();
  if (nazev.endsWith(".msg")) return nacistMsg(buffer);
  if (nazev.endsWith(".eml")) return nacistEml(buffer);
  // Bez přípony: .msg má na začátku podpis souboru Office (D0 CF 11 E0)
  const zacatek = new Uint8Array(buffer.slice(0, 4));
  if (zacatek[0] === 0xd0 && zacatek[1] === 0xcf && zacatek[2] === 0x11 && zacatek[3] === 0xe0) return nacistMsg(buffer);
  return nacistEml(buffer);
}
