import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { stahnoutObrazek } from "./orderPdf";
import { popisZakazek } from "./reporty";

// PDF měsíčních reportů (práce, jízdy, účtenky) — tabulka jako v aplikaci + součet,
// u účtenek navíc fotky dokladů na konci. Fonty jsou přibalené v projektu (čeština).
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
const kc = (n) => `${(Number(n) || 0).toLocaleString("cs-CZ", { maximumFractionDigits: 2, minimumFractionDigits: Number(n) % 1 ? 2 : 0 })} Kč`;
const datumCz = (iso) => {
  const [r, m, d] = String(iso || "").split("-");
  return d ? `${Number(d)}. ${Number(m)}. ${r}` : "";
};
const jePngNeboJpg = (b) => !!b && b.length > 4 && ((b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0xff && b[1] === 0xd8));

export function nazevMesice(mesic) {
  const [r, m] = String(mesic || "").split("-");
  return MESICE[Number(m) - 1] ? `${MESICE[Number(m) - 1]} ${r}` : mesic;
}

// sloupce: [{ nadpis, sirka (null = zbytek), zarovnani, mono }]
// radky: [{ bunky: [{ text, pod?, tucne? }] }]   souhrn: { popis, bunky: [..] }
async function generovatPdfReportu({ titul, podtitul, sloupce, radky, souhrn, fotky = [], supabaseAdmin }) {
  const sans = existuje(F("IBMPlexSans-Regular.ttf")) ? F("IBMPlexSans-Regular.ttf") : F("IBMPlexSerif-Regular.ttf");
  const sansBold = existuje(F("IBMPlexSans-Bold.ttf")) ? F("IBMPlexSans-Bold.ttf") : F("IBMPlexSerif-Bold.ttf");
  const mono = existuje(F("IBMPlexMono-Regular.ttf")) ? F("IBMPlexMono-Regular.ttf") : sans;
  const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 60, left: 50, right: 50 }, bufferPages: true, font: sans, info: { Title: `${titul} ${podtitul}` } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const hotovo = new Promise((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });
  doc.registerFont("Sans", sans);
  doc.registerFont("SansBold", sansBold);
  doc.registerFont("Mono", mono);
  const t = (s) => String(s ?? "").replace(/[\t\u00a0\u200b-\u200d\ufeff]/g, " ");

  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const SPODEK = () => doc.page.height - doc.page.margins.bottom;
  const pevne = sloupce.reduce((s, c) => s + (c.sirka || 0), 0);
  const sirky = sloupce.map((c) => c.sirka || W - pevne);
  const xs = sirky.map((_, i) => L + sirky.slice(0, i).reduce((a, b) => a + b, 0));

  doc.font("SansBold").fontSize(18).fillColor("#000").text(t(titul).toUpperCase(), L, 50, { characterSpacing: 0.4 });
  doc.font("Sans").fontSize(11).fillColor("#555").text(t(podtitul), L, doc.y + 2);
  const yLinka = doc.y + 8;
  doc.moveTo(L, yLinka).lineTo(L + W, yLinka).lineWidth(2.5).strokeColor("#000").stroke();
  doc.y = yLinka + 18;

  const hlavicka = () => {
    const y = doc.y;
    doc.font("SansBold").fontSize(8.5).fillColor("#666");
    sloupce.forEach((c, i) => doc.text(c.nadpis.toUpperCase(), xs[i], y, { width: sirky[i] - 8, align: c.zarovnani || "left", characterSpacing: 0.8 }));
    const yl = y + 15;
    doc.moveTo(L, yl).lineTo(L + W, yl).lineWidth(1.5).strokeColor("#000").stroke();
    doc.y = yl + 7;
  };
  hlavicka();

  const vyskaBunky = (b, i) => {
    doc.font(b.tucne ? "SansBold" : sloupce[i].mono ? "Mono" : "Sans").fontSize(sloupce[i].mono ? 10 : 10.5);
    let h = doc.heightOfString(t(b.text) || " ", { width: sirky[i] - 8 });
    if (b.pod) {
      doc.font("Mono").fontSize(8.5);
      h += doc.heightOfString(t(b.pod), { width: sirky[i] - 8 }) + 1;
    }
    return h;
  };
  (radky || []).forEach((r) => {
    const vyska = Math.max(...r.bunky.map(vyskaBunky)) + 6;
    if (doc.y + vyska + 10 > SPODEK()) {
      doc.addPage();
      hlavicka();
    }
    const y = doc.y;
    r.bunky.forEach((b, i) => {
      const c = sloupce[i];
      doc.font(b.tucne ? "SansBold" : c.mono ? "Mono" : "Sans").fontSize(c.mono ? 10 : 10.5).fillColor("#161616");
      doc.text(t(b.text), xs[i], y + (c.mono ? 1 : 0), { width: sirky[i] - 8, align: c.zarovnani || "left" });
      if (b.pod) doc.font("Mono").fontSize(8.5).fillColor("#68686A").text(t(b.pod), xs[i], doc.y + 1, { width: sirky[i] - 8, align: c.zarovnani || "left" });
    });
    const yl = y + vyska + 2;
    doc.moveTo(L, yl).lineTo(L + W, yl).lineWidth(0.6).strokeColor("#DEDEDC").stroke();
    doc.y = yl + 7;
  });

  if (souhrn) {
    if (doc.y + 40 > SPODEK()) doc.addPage();
    const y = doc.y + 2;
    doc.rect(L, y, W, 30).fill("#F1F0EC");
    // popis souhrnu zabere všechny sloupce až po první s hodnotou
    const prvniHodnota = souhrn.bunky.findIndex((b) => b !== null && b !== undefined) + 1;
    doc.font("SansBold").fontSize(11).fillColor("#000").text(t(souhrn.popis), L + 8, y + 9, { width: xs[prvniHodnota] - L - 16 });
    souhrn.bunky.forEach((text, j) => {
      if (text === null || text === undefined) return;
      const i = j + 1;
      doc.font(j === souhrn.bunky.length - 1 ? "SansBold" : "Mono").fontSize(11).fillColor("#000");
      doc.text(t(text), xs[i], y + 9, { width: sirky[i] - (i === sloupce.length - 1 ? 16 : 8), align: sloupce[i].zarovnani || "left" });
    });
    doc.y = y + 40;
  }

  // Fotky dokladů — dvě na stránku, každá s popiskem (datum, částka, zakázka)
  const stazene = [];
  if (fotky.length && supabaseAdmin) {
    for (const f of fotky.slice(0, 80)) {
      const buf = await stahnoutObrazek(f.path, "uctenky", supabaseAdmin).catch(() => null);
      if (jePngNeboJpg(buf)) stazene.push({ ...f, buf });
    }
  }
  if (stazene.length) {
    const vyskaFotky = (SPODEK() - doc.page.margins.top - 60) / 2;
    stazene.forEach((f, i) => {
      if (i % 2 === 0) doc.addPage();
      const y = doc.page.margins.top + (i % 2) * (vyskaFotky + 30);
      doc.font("SansBold").fontSize(10).fillColor("#000").text(t(f.popisek), L, y, { width: W, height: 28, ellipsis: true });
      const yFotka = Math.max(doc.y, y + 16) + 4;
      try {
        doc.image(f.buf, L, yFotka, { fit: [W, vyskaFotky - (yFotka - y)], align: "center", valign: "top" });
      } catch (e) {
        doc.font("Sans").fontSize(9).fillColor("#999").text("(fotku nešlo vložit)", L, y + 20);
      }
    });
  }

  const rozsah = doc.bufferedPageRange();
  const vytvoreno = new Date().toLocaleDateString("cs-CZ");
  for (let i = rozsah.start; i < rozsah.start + rozsah.count; i++) {
    doc.switchToPage(i);
    const dolni = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const yp = doc.page.height - 42;
    doc.moveTo(L, yp - 8).lineTo(L + W, yp - 8).lineWidth(0.6).strokeColor("#DEDEDC").stroke();
    doc.font("Sans").fontSize(8).fillColor("#68686A").text(`${t(titul)} · ${t(podtitul)} · vytvořeno ${vytvoreno}`, L, yp, { width: W - 80, lineBreak: false });
    doc.text(`Strana ${i + 1} z ${rozsah.count}`, L + W - 80, yp, { width: 80, align: "right", lineBreak: false });
    doc.page.margins.bottom = dolni;
  }
  doc.end();
  return hotovo;
}

export async function generovatPdfReportuPrace({ mesic, radky, firmaNazev }) {
  const tot = radky.reduce((a, r) => ({ d: a.d + r.dilna, m: a.m + r.montaz, c: a.c + r.celkem }), { d: 0, m: 0, c: 0 });
  return generovatPdfReportu({
    titul: "Měsíční report práce",
    podtitul: `${nazevMesice(mesic)}${firmaNazev ? ` · ${firmaNazev}` : ""}`,
    sloupce: [{ nadpis: "Zakázka" }, { nadpis: "Dílna", sirka: 90, zarovnani: "right", mono: true }, { nadpis: "Montáž", sirka: 90, zarovnani: "right", mono: true }, { nadpis: "Celkem", sirka: 90, zarovnani: "right", mono: true }],
    radky: radky.map((r) => ({ bunky: [{ text: r.zakaznik || "—", pod: r.cislo, tucne: true }, { text: `${cislo(r.dilna)} h` }, { text: `${cislo(r.montaz)} h` }, { text: `${cislo(r.celkem)} h`, tucne: true }] })),
    souhrn: { popis: "Celkem za měsíc", bunky: [`${cislo(tot.d)} h`, `${cislo(tot.m)} h`, `${cislo(tot.c)} h`] },
  });
}

// Jízdy a účtenky mají stejnou tabulku: datum, zakázka(y), popis, částka.
export async function generovatPdfNakladu({ typ, mesic, radky, firmaNazev, sFotkami, supabaseAdmin }) {
  const jizdy = typ === "jizdy";
  const celkem = radky.reduce((s, r) => s + (Number(r.castka) || 0), 0);
  const fotky = sFotkami
    ? radky
        .filter((r) => r.fotoPath)
        .map((r) => ({ path: r.fotoPath, popisek: `${datumCz(r.datum)} · ${kc(r.castka)} · ${r.popis || ""} · ${r.zakazky.map((z) => z.cislo).join(", ")}` }))
    : [];
  return generovatPdfReportu({
    titul: jizdy ? "Jízdy za měsíc" : "Účtenky za měsíc",
    podtitul: `${nazevMesice(mesic)}${firmaNazev ? ` · ${firmaNazev}` : ""}`,
    sloupce: [{ nadpis: "Datum", sirka: 70, mono: true }, { nadpis: "Zakázka" }, { nadpis: "Popis", sirka: 170 }, { nadpis: jizdy ? "Částka" : "Bez DPH", sirka: 85, zarovnani: "right", mono: true }],
    radky: radky.map((r) => ({
      bunky: [
        { text: datumCz(r.datum).replace(/\s\d{4}$/, "") }, // měsíc je v nadpisu, rok netřeba
        { text: r.zakazky.map((z) => z.zakaznik || z.cislo).join(", "), pod: r.zakazky.map((z) => z.cislo).join(", ") },
        { text: `${r.popis || ""}${!jizdy && r.zdroj === "faktura" ? " (faktura)" : ""}`, pod: !jizdy && !r.fotoPath && r.zdroj !== "faktura" ? "bez fotky účtenky" : undefined },
        { text: kc(r.castka) },
      ],
    })),
    souhrn: { popis: `Celkem (${radky.length})`, bunky: [null, null, kc(celkem)] },
    fotky,
    supabaseAdmin,
  });
}
