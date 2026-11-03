import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

// PDF měsíčního reportu práce — stejná tabulka jako v aplikaci (zakázka, dílna,
// montáž, celkem) + součet. Fonty jsou přibalené v projektu (plná čeština).
const F = (n) => path.join(process.cwd(), "fonts", n);
const existuje = (p) => {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
};
const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const cislo = (n) => (Number(n) || 0).toLocaleString("cs-CZ", { maximumFractionDigits: 2 });

export function nazevMesice(mesic) {
  const [r, m] = String(mesic || "").split("-");
  return MESICE[Number(m) - 1] ? `${MESICE[Number(m) - 1]} ${r}` : mesic;
}

export async function generovatPdfReportuPrace({ mesic, radky, firmaNazev }) {
  const sans = existuje(F("IBMPlexSans-Regular.ttf")) ? F("IBMPlexSans-Regular.ttf") : F("IBMPlexSerif-Regular.ttf");
  const sansBold = existuje(F("IBMPlexSans-Bold.ttf")) ? F("IBMPlexSans-Bold.ttf") : F("IBMPlexSerif-Bold.ttf");
  const mono = existuje(F("IBMPlexMono-Regular.ttf")) ? F("IBMPlexMono-Regular.ttf") : sans;

  const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 60, left: 50, right: 50 }, bufferPages: true, font: sans, info: { Title: `Report práce ${nazevMesice(mesic)}` } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const hotovo = new Promise((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });
  doc.registerFont("Sans", sans);
  doc.registerFont("SansBold", sansBold);
  doc.registerFont("Mono", mono);

  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const SPODEK = () => doc.page.height - doc.page.margins.bottom;
  const sZak = W - 3 * 90;
  const cols = [L + sZak, L + sZak + 90, L + sZak + 180];
  const t = (s) => String(s ?? "").replace(/[\t\u00a0\u200b-\u200d\ufeff]/g, " ");

  doc.font("SansBold").fontSize(18).fillColor("#000").text("MĚSÍČNÍ REPORT PRÁCE", L, 50, { characterSpacing: 0.4 });
  doc.font("Sans").fontSize(11).fillColor("#555").text(`${nazevMesice(mesic)}${firmaNazev ? ` · ${t(firmaNazev)}` : ""}`, L, doc.y + 2);
  const yLinka = doc.y + 8;
  doc.moveTo(L, yLinka).lineTo(L + W, yLinka).lineWidth(2.5).strokeColor("#000").stroke();
  doc.y = yLinka + 18;

  const hlavicka = () => {
    const y = doc.y;
    doc.font("SansBold").fontSize(8.5).fillColor("#666");
    doc.text("ZAKÁZKA", L, y, { width: sZak - 10, characterSpacing: 0.8 });
    ["DÍLNA", "MONTÁŽ", "CELKEM"].forEach((h, i) => doc.text(h, cols[i], y, { width: 90, align: "right", characterSpacing: 0.8 }));
    const yl = y + 15;
    doc.moveTo(L, yl).lineTo(L + W, yl).lineWidth(1.5).strokeColor("#000").stroke();
    doc.y = yl + 7;
  };
  hlavicka();

  const total = { dilna: 0, montaz: 0, celkem: 0 };
  (radky || []).forEach((r) => {
    total.dilna += Number(r.dilna) || 0;
    total.montaz += Number(r.montaz) || 0;
    total.celkem += Number(r.celkem) || 0;
    doc.font("SansBold").fontSize(10.5);
    const vyska = doc.heightOfString(t(r.zakaznik) || "—", { width: sZak - 10 }) + 13;
    if (doc.y + vyska + 10 > SPODEK()) {
      doc.addPage();
      hlavicka();
    }
    const y = doc.y;
    doc.font("SansBold").fontSize(10.5).fillColor("#161616").text(t(r.zakaznik) || "—", L, y, { width: sZak - 10 });
    doc.font("Mono").fontSize(8.5).fillColor("#68686A").text(t(r.cislo), L, doc.y + 1, { width: sZak - 10 });
    doc.font("Mono").fontSize(10).fillColor("#161616");
    doc.text(`${cislo(r.dilna)} h`, cols[0], y + 4, { width: 90, align: "right" });
    doc.text(`${cislo(r.montaz)} h`, cols[1], y + 4, { width: 90, align: "right" });
    doc.font("SansBold").text(`${cislo(r.celkem)} h`, cols[2], y + 4, { width: 90, align: "right" });
    const yl = y + vyska + 2;
    doc.moveTo(L, yl).lineTo(L + W, yl).lineWidth(0.6).strokeColor("#DEDEDC").stroke();
    doc.y = yl + 7;
  });

  if (doc.y + 40 > SPODEK()) doc.addPage();
  const y = doc.y + 2;
  doc.rect(L, y, W, 30).fill("#F1F0EC");
  doc.font("SansBold").fontSize(11).fillColor("#000").text("Celkem za měsíc", L + 8, y + 9, { width: sZak - 16 });
  doc.font("Mono").fontSize(11);
  doc.text(`${cislo(total.dilna)} h`, cols[0], y + 9, { width: 90, align: "right" });
  doc.text(`${cislo(total.montaz)} h`, cols[1], y + 9, { width: 90, align: "right" });
  doc.font("SansBold").text(`${cislo(total.celkem)} h`, cols[2] - 8, y + 9, { width: 90, align: "right" });

  const rozsah = doc.bufferedPageRange();
  const vytvoreno = new Date().toLocaleDateString("cs-CZ");
  for (let i = rozsah.start; i < rozsah.start + rozsah.count; i++) {
    doc.switchToPage(i);
    const dolni = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const yp = doc.page.height - 42;
    doc.moveTo(L, yp - 8).lineTo(L + W, yp - 8).lineWidth(0.6).strokeColor("#DEDEDC").stroke();
    doc.font("Sans").fontSize(8).fillColor("#68686A").text(`Vytvořeno ${vytvoreno}`, L, yp, { width: W - 80, lineBreak: false });
    doc.text(`Strana ${i + 1} z ${rozsah.count}`, L + W - 80, yp, { width: 80, align: "right", lineBreak: false });
    doc.page.margins.bottom = dolni;
  }
  doc.end();
  return hotovo;
}
