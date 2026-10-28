import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { fmtDate, fmtMoney, todayISO } from "./theme";
import { stahnoutObrazek } from "./orderPdf";

// PDF cenové nabídky — stejný obsah a vzhled jako náhled nabídky v aplikaci
// (QuoteView). Fonty jsou přibalené v projektu (fonts/), plná podpora češtiny;
// vestavěné fonty pdfkitu se nikdy nepoužívají (na Vercelu by padaly).
const F = (n) => path.join(process.cwd(), "fonts", n);
const FONT_SANS = F("IBMPlexSans-Regular.ttf");
const FONT_SANS_BOLD = F("IBMPlexSans-Bold.ttf");
const FONT_MONO = F("IBMPlexMono-Regular.ttf");
// Záloha, kdyby nové fonty v nasazení chyběly — serif fonty aplikace už spolehlivě používá.
const ZALOHA = F("IBMPlexSerif-Regular.ttf");
const ZALOHA_BOLD = F("IBMPlexSerif-Bold.ttf");
const existuje = (p) => {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
};

const INK = "#161616";
const SOFT = "#68686A";
const LABEL = "#666668";
const LINE = "#DEDEDC";
const DARK = "#000000";

// celkem = computeKalkulaceCelkem(...) → { cenaBezDph, items: [{ polozka, vysledek }] }
export async function generovatPdfNabidky({ order, celkem, sazbaDph, nastaveni, supabaseAdmin }) {
  const n = nastaveni || {};
  const t = (s) => (s === null || s === undefined ? "" : String(s));
  const sans = existuje(FONT_SANS) ? FONT_SANS : ZALOHA;

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
    font: sans,
    info: { Title: `Cenová nabídka ${t(order.cislo)}`, Author: t(n.firmaNazev) },
  });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const hotovo = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.registerFont("Sans", sans);
  doc.registerFont("SansBold", existuje(FONT_SANS_BOLD) ? FONT_SANS_BOLD : existuje(ZALOHA_BOLD) ? ZALOHA_BOLD : sans);
  doc.registerFont("Mono", existuje(FONT_MONO) ? FONT_MONO : sans);

  const L = doc.page.margins.left;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const SPODEK = () => doc.page.height - doc.page.margins.bottom;
  const zajistitMisto = (h) => {
    if (doc.y + h > SPODEK()) doc.addPage();
  };
  const stitek = (text, x, y, w) =>
    doc.font("SansBold").fontSize(8.5).fillColor(LABEL).text(text.toUpperCase(), x, y, { width: w, characterSpacing: 1 });

  // ---------- Hlavička ----------
  let logoSirka = 0;
  if (n.firmaLogoPath && supabaseAdmin) {
    const logo = await stahnoutObrazek(n.firmaLogoPath, "logo", supabaseAdmin);
    if (logo) {
      try {
        doc.image(logo, L, 46, { fit: [110, 40] });
        const img = doc.openImage(logo);
        logoSirka = Math.min(110, (img.width / img.height) * 40) + 12;
      } catch (e) {
        console.error("Logo do PDF nabídky vložit nešlo (podporované je PNG/JPG):", e.message);
      }
    }
  }
  doc
    .font("SansBold")
    .fontSize(18)
    .fillColor(DARK)
    .text(t(n.firmaNazev || "Cenová nabídka").toUpperCase(), L + logoSirka, 54, { width: W - logoSirka - 90, characterSpacing: 0.4 });
  doc.font("Mono").fontSize(9).fillColor(SOFT).text(fmtDate(todayISO()), L + W - 90, 60, { width: 90, align: "right" });
  const podHlavickou = Math.max(doc.y, 92) + 4;
  doc.moveTo(L, podHlavickou).lineTo(L + W, podHlavickou).lineWidth(2.5).strokeColor(DARK).stroke();

  // ---------- Odběratel / Dodavatel ----------
  const yBloky = podHlavickou + 22;
  const sloupec = (W - 24) / 2;
  const xD = L + sloupec + 24;

  stitek("Odběratel", L, yBloky, sloupec);
  doc.font("SansBold").fontSize(12).fillColor(INK).text(t(order.zakaznik), L, yBloky + 15, { width: sloupec });
  if (order.zakaznikIdentifikace) doc.font("Sans").fontSize(9.5).fillColor(SOFT).text(t(order.zakaznikIdentifikace), { width: sloupec });
  const kontakt = [order.telefon, order.email].filter(Boolean).join("  ·  ");
  if (kontakt) doc.font("Sans").fontSize(9.5).fillColor(SOFT).text(kontakt, { width: sloupec });
  const yKonecOdb = doc.y;

  stitek("Dodavatel", xD, yBloky, sloupec);
  doc.font("SansBold").fontSize(12).fillColor(INK).text(t(n.firmaNazev || "—"), xD, yBloky + 15, { width: sloupec });
  doc.font("Sans").fontSize(9.5).fillColor(SOFT);
  if (n.firmaAdresa) doc.text(t(n.firmaAdresa), xD, doc.y, { width: sloupec });
  if (n.firmaIco) doc.font("Mono").fontSize(9).text(`IČO: ${n.firmaIco}`, xD, doc.y + 2, { width: sloupec });
  if (n.firmaDic) doc.font("Mono").fontSize(9).text(`DIČ: ${n.firmaDic}`, xD, doc.y, { width: sloupec });
  if (n.firmaEmail) doc.font("Sans").fontSize(9.5).fillColor(INK).text(t(n.firmaEmail), xD, doc.y + 2, { width: sloupec });
  const yKonecDod = doc.y;

  // ---------- Nadpis a popis ----------
  doc.y = Math.max(yKonecOdb, yKonecDod) + 26;
  doc.x = L;
  doc
    .font("SansBold")
    .fontSize(12)
    .fillColor(INK)
    .text(`NABÍDKA VÝROBY A MONTÁŽE — ${t(order.cislo)}`, L, doc.y, { width: W, characterSpacing: 0.5 });
  const yPodNadpisem = doc.y + 5;
  doc.moveTo(L, yPodNadpisem).lineTo(L + W, yPodNadpisem).lineWidth(0.8).strokeColor(LINE).stroke();
  doc.y = yPodNadpisem + 10;
  if (order.popis) {
    doc.font("Sans").fontSize(10).fillColor(SOFT).text(t(order.popis), L, doc.y, { width: W, lineGap: 1.5 });
    doc.moveDown(0.9);
  }

  // ---------- Tabulka položek ----------
  const sMj = 90;
  const sCena = 120;
  const sNazev = W - sMj - sCena;
  const hlavickaTabulky = () => {
    const y = doc.y;
    doc.font("SansBold").fontSize(8.5).fillColor(LABEL);
    doc.text("POLOŽKA", L, y, { width: sNazev - 10, characterSpacing: 0.8 });
    doc.text("MJ", L + sNazev, y, { width: sMj - 10, characterSpacing: 0.8 });
    doc.text("CELKEM BEZ DPH", L + sNazev + sMj, y, { width: sCena, align: "right", characterSpacing: 0.8 });
    const yL = y + 15;
    doc.moveTo(L, yL).lineTo(L + W, yL).lineWidth(1.5).strokeColor(DARK).stroke();
    doc.y = yL + 7;
  };
  zajistitMisto(60);
  hlavickaTabulky();

  (celkem.items || []).forEach(({ polozka, vysledek }, i) => {
    const nazev = t(polozka.nazev) || `Položka ${i + 1}`;
    doc.font("Sans").fontSize(10.5);
    const vyska = doc.heightOfString(nazev, { width: sNazev - 10 });
    if (doc.y + vyska + 14 > SPODEK()) {
      doc.addPage();
      hlavickaTabulky();
    }
    const y = doc.y;
    doc.font("Sans").fontSize(10.5).fillColor(INK).text(nazev, L, y, { width: sNazev - 10 });
    doc.font("Mono").fontSize(10).fillColor(SOFT).text(`${t(polozka.pocetKs || 1)} ${t(polozka.jednotka || "ks")}`, L + sNazev, y + 0.5, { width: sMj - 10 });
    doc.font("Mono").fontSize(10).fillColor(INK).text(fmtMoney(vysledek.cenaBezDph), L + sNazev + sMj, y + 0.5, { width: sCena, align: "right" });
    const yL = y + vyska + 7;
    doc.moveTo(L, yL).lineTo(L + W, yL).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.y = yL + 7;
  });

  // ---------- Součty ----------
  zajistitMisto(110);
  const sSouctu = W * 0.62;
  const xS = L + W - sSouctu;
  const radekSouctu = (popis, castka, tucne) => {
    const y = doc.y;
    doc.font(tucne ? "SansBold" : "Sans").fontSize(10.5).fillColor(INK).text(popis, xS + 10, y, { width: sSouctu - 150 });
    doc.font("Mono").fontSize(10.5).fillColor(INK).text(castka, xS + sSouctu - 150, y, { width: 140, align: "right" });
    doc.y = y + 20;
  };
  doc.y += 4;
  const bezDph = Number(celkem.cenaBezDph) || 0;
  const dph = bezDph * sazbaDph;
  radekSouctu("Celkem bez DPH", fmtMoney(bezDph), true);
  if (sazbaDph > 0) radekSouctu(`DPH ${Math.round(sazbaDph * 100)} %`, fmtMoney(dph), false);

  const yBox = doc.y + 2;
  doc.roundedRect(xS, yBox, sSouctu, 34, 4).fill(DARK);
  doc
    .font("SansBold")
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text(sazbaDph > 0 ? `Celkem s DPH ${Math.round(sazbaDph * 100)} %` : "Celkem (bez DPH)", xS + 14, yBox + 10, { width: sSouctu - 170 });
  doc.font("Mono").fontSize(13).fillColor("#FFFFFF").text(fmtMoney(bezDph + dph), xS + sSouctu - 164, yBox + 10, { width: 150, align: "right" });
  doc.y = yBox + 34 + 26;
  doc.x = L;

  // ---------- Podmínky ----------
  if (n.podminkyNabidky) {
    zajistitMisto(60);
    const y = doc.y;
    doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.font("Sans").fontSize(9).fillColor(SOFT).text(t(n.podminkyNabidky), L, y + 12, { width: W, lineGap: 1.5 });
  }

  // ---------- Patička a čísla stran na každé stránce ----------
  const paticka = [n.firmaNazev, n.firmaAdresa && n.firmaAdresa.replace(/\n/g, ", "), n.firmaIco && `IČO: ${n.firmaIco}`, n.firmaEmail]
    .filter(Boolean)
    .join("  ·  ");
  const rozsah = doc.bufferedPageRange();
  for (let i = rozsah.start; i < rozsah.start + rozsah.count; i++) {
    doc.switchToPage(i);
    const spodniOkraj = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // ať psaní do patičky nezaloží novou stránku
    const y = doc.page.height - 42;
    doc.moveTo(L, y - 8).lineTo(L + W, y - 8).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.font("Sans").fontSize(8).fillColor(SOFT).text(paticka, L, y, { width: W - 70, lineBreak: false, ellipsis: true });
    doc.text(`Strana ${i + 1} z ${rozsah.count}`, L + W - 70, y, { width: 70, align: "right", lineBreak: false });
    doc.page.margins.bottom = spodniOkraj;
  }

  doc.end();
  return hotovo;
}

// Bezpečný název souboru: Nabidka_Z-2026-0012_Novak.pdf
export function nazevSouboruNabidky(order) {
  const zakaznik = (order.zakaznik || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return `Nabidka_${order.cislo || "bez-cisla"}${zakaznik ? `_${zakaznik}` : ""}.pdf`;
}
