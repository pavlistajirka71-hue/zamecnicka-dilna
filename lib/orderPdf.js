import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import {
  STATUSES,
  fmtDate,
  fmtMoney,
  computeKalkulaceCelkem,
  normalizovatKalkulaci,
  computeNakladyZakazky,
  sumHodin,
} from "./theme";

// Appka si vždycky nahrává vlastní font (přibalený v repozitáři, plná podpora češtiny) a
// NIKDY nesahá na vestavěné fonty pdfkitu (Helvetica apod.) — ty na Vercelu spolehlivě
// padají (pdfkit si je snaží dočíst ze souboru uvnitř node_modules, který se do
// serverless nasazení nezabalí). Vlastní font v projektové složce tenhle problém obchází.
const FONT_PATH = path.join(process.cwd(), "fonts", "IBMPlexSerif-Regular.ttf");
const FONT_BOLD_PATH = path.join(process.cwd(), "fonts", "IBMPlexSerif-Bold.ttf");

function statusLabel(key) {
  const s = STATUSES.find((x) => x.key === key);
  return s ? s.label : key;
}

// Stáhne obrázek z URL (Google Drive) nebo přes signed URL (starší fotky v Supabase
// Storage). Při jakémkoliv selhání vrátí null — appka pak obrázek v PDF prostě vynechá,
// ale zbytek dokumentu se vygeneruje normálně.
async function stahnoutObrazek(pathNeboUrl, bucket, supabaseAdmin) {
  if (!pathNeboUrl) return null;
  try {
    let url = pathNeboUrl;
    if (!url.startsWith("http")) {
      const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(pathNeboUrl, 300);
      url = data?.signedUrl;
      if (!url) return null;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error("Stažení obrázku pro PDF se nepovedlo:", e);
    return null;
  }
}

export async function generovatPdfZakazky(order, nastaveni, supabaseAdmin) {
  const t = (s) => (s === null || s === undefined ? "" : String(s));

  // DŮLEŽITÉ: pdfkit si při vytvoření dokumentu vždycky sám od sebe zavolá interní
  // initFonts(), který se pokusí nastavit výchozí font "Helvetica" (vestavěný, čte se
  // ze souboru uvnitř node_modules) — to je přesně to, co na Vercelu padá, úplně
  // nezávisle na tom, co bychom si zaregistrovali až POTOM. Jediný spolehlivý způsob,
  // jak se tomu vyhnout, je předat vlastní font rovnou v konstruktoru přes "font".
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true, font: FONT_PATH });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const hotovo = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.registerFont("Text", FONT_PATH);
  doc.registerFont("TextBold", fs.existsSync(FONT_BOLD_PATH) ? FONT_BOLD_PATH : FONT_PATH);
  doc.font("Text");

  const INK = "#21231F";
  const SOFT = "#5B5A52";
  const LINE = "#D9D4C7";
  const STEEL = "#34506B";

  function zajistitMisto(potrebnaVyska = 80) {
    if (doc.y > 792 - potrebnaVyska) doc.addPage();
  }

  function nadpisSekce(text) {
    zajistitMisto(40);
    doc.moveDown(0.6);
    doc.font("TextBold").fontSize(13).fillColor(STEEL).text(t(text));
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(LINE).stroke();
    doc.moveDown(0.5);
    doc.font("Text").fontSize(10).fillColor(INK);
  }

  function radek(label, hodnota) {
    zajistitMisto(20);
    doc.font("Text").fontSize(10).fillColor(SOFT).text(t(label), { continued: true }).fillColor(INK).text("  " + t(hodnota));
  }

  // Vloží obrázek do pevně dané "krabice" (nikdy ji nepřekročí, i když má fotka
  // jiný poměr stran) a ručně posune kurzor přesně o výšku téhle krabice — pdfkit
  // po vložení obrázku sám kurzor spolehlivě neposouvá, takže by se bez tohohle
  // další nadpis/text vykreslil přes fotku.
  function vlozitObrazek(buf, maxWidth, maxHeight) {
    const yPred = doc.y;
    doc.image(buf, doc.x, yPred, { fit: [maxWidth, maxHeight] });
    doc.y = yPred + maxHeight;
  }

  // ---------- Hlavička ----------
  doc.font("TextBold").fontSize(20).fillColor(INK).text(t("Archiv zakázky"));
  doc.font("Text").fontSize(11).fillColor(SOFT).text(`${order.cislo}  ·  ${t("vygenerováno")} ${fmtDate(new Date().toISOString().slice(0, 10))}`);
  doc.moveDown();

  // ---------- Základní údaje ----------
  nadpisSekce("Základní údaje");
  radek("Zákazník:", order.zakaznik);
  if (order.zakaznikIdentifikace) radek("Identifikace:", order.zakaznikIdentifikace.replace(/\n/g, ", "));
  radek("Popis zakázky:", order.popis);
  radek("Stav:", statusLabel(order.stav));
  radek("Termín:", fmtDate(order.termin));
  radek("Vytvořeno:", fmtDate(order.vytvoreno));
  if (order.cisloFaktury) radek("Číslo faktury:", order.cisloFaktury);
  radek("Cena zakázky:", fmtMoney(order.cena));
  if (order.poznamka) radek("Poznámka:", order.poznamka);

  // ---------- Kalkulace ----------
  const polozky = normalizovatKalkulaci(order.kalkulace);
  if (polozky.length > 0) {
    const celkem = computeKalkulaceCelkem(polozky, nastaveni);
    nadpisSekce("Kalkulace");
    celkem.items.forEach(({ polozka, vysledek }) => {
      zajistitMisto(60);
      const pocetKsText = Number(polozka.pocetKs) > 1 ? ` (${polozka.pocetKs}×)` : "";
      doc.font("TextBold").fontSize(11).fillColor(INK).text(t(polozka.nazev || "Položka") + pocetKsText);
      doc.font("Text").fontSize(9).fillColor(SOFT);
      (polozka.materialy || []).forEach((m) => {
        const pocetKs = Math.max(1, Number(polozka.pocetKs) || 1);
        const mnozstviCelkem = (Number(m.mnozstvi) || 0) * pocetKs;
        const cena = (Number(m.cena) || 0) * mnozstviCelkem;
        doc.text(`  • ${t(m.nazev)}${m.dodavatel ? ` (${t(m.dodavatel)})` : ""} — ${mnozstviCelkem} ${t(m.jednotka || "")} — ${fmtMoney(cena)}`);
      });
      if (Number(polozka.praceDilnaHodiny) > 0) doc.text(`  • ${t("Práce dílna")}: ${Number(polozka.praceDilnaHodiny) * Math.max(1, Number(polozka.pocetKs) || 1)} h`);
      if (Number(polozka.praceMontazHodiny) > 0) doc.text(`  • ${t("Práce montáž")}: ${Number(polozka.praceMontazHodiny) * Math.max(1, Number(polozka.pocetKs) || 1)} h`);
      if (vysledek.doprava > 0) doc.text(`  • ${t("Doprava")}: ${fmtMoney(vysledek.doprava)}`);
      if (vysledek.pripravnePrace > 0) doc.text(`  • ${t("Přípravné práce")}: ${fmtMoney(vysledek.pripravnePrace)}`);
      if (vysledek.spojovaciMaterial > 0) doc.text(`  • ${t("Spojovací materiál")}: ${fmtMoney(vysledek.spojovaciMaterial)}`);
      if (polozka.zinkovaniAktivni) doc.text(`  • ${t("Zinkování")}: ${fmtMoney(vysledek.zinkovaniSum)}`);
      if (polozka.lakovaniAktivni) doc.text(`  • ${t("Lakování")}: ${fmtMoney(vysledek.lakovaniSum)}`);
      doc.font("Text").fontSize(10).fillColor(INK).text(`  ${t("Cena položky")}: ${fmtMoney(vysledek.finalniCena)}`);
      doc.moveDown(0.4);
    });
    doc.font("TextBold").fontSize(11).fillColor(INK);
    doc.text(`${t("Cena celkem bez DPH")}: ${fmtMoney(celkem.cenaBezDph)}`);
    doc.text(`${t("Cena celkem s DPH")}: ${fmtMoney(celkem.cenaSDph)}`);
    doc.font("Text").fontSize(10);
  }

  // ---------- Práce ----------
  if ((order.prace || []).length > 0) {
    nadpisSekce("Zápisy práce");
    order.prace.forEach((p) => {
      zajistitMisto(16);
      const typ = (p.typ || "dilna") === "dilna" ? "Dílna" : "Montáž";
      doc.text(`${fmtDate(p.datum)}  ·  ${t(typ)}  ·  ${p.hodiny} h${p.pracovnik ? "  ·  " + t(p.pracovnik) : ""}${p.popis ? "  —  " + t(p.popis) : ""}`);
    });
    doc.moveDown(0.3);
    doc.font("TextBold").text(`${t("Celkem dílna")}: ${sumHodin(order.prace, "dilna")} h    ${t("Celkem montáž")}: ${sumHodin(order.prace, "montaz")} h`);
    doc.font("Text");
  }

  // ---------- Náklady, zisk, marže ----------
  if (polozky.length > 0) {
    const nv = computeNakladyZakazky(order, nastaveni);
    nadpisSekce("Náklady, zisk a marže");
    for (const n of order.naklady || []) {
      zajistitMisto(n.fotoPath ? 110 : 16);
      doc.text(`${t(n.popis)} — ${fmtMoney(n.castka)}`);
      if (n.fotoPath) {
        const buf = await stahnoutObrazek(n.fotoPath, "uctenky", supabaseAdmin);
        if (buf) {
          try {
            vlozitObrazek(buf, 90, 90);
          } catch (e) {
            console.error("Vložení fotky nákladu do PDF selhalo:", e);
          }
        }
      }
    }
    doc.moveDown(0.3);
    radek("Náklady na práci:", fmtMoney(nv.nakladyPrace));
    radek("Náklady celkem:", fmtMoney(nv.nakladyCelkem));
    radek("Příjem (cena bez DPH):", fmtMoney(nv.prijem));

    // Finální zisk a marže — zvýrazněný box, ať to na první pohled nejde přehlédnout.
    zajistitMisto(order.stav === "fakturovano" ? 75 : 55);
    doc.moveDown(0.4);
    const boxY = doc.y;
    const boxHeight = order.stav === "fakturovano" ? 58 : 40;
    doc.rect(50, boxY, 495, boxHeight).fillAndStroke("#F0EDE4", LINE);
    doc
      .font("TextBold")
      .fontSize(13)
      .fillColor(nv.zisk >= 0 ? "#3F6B4A" : "#B33A3A")
      .text(`Finální zisk: ${fmtMoney(nv.zisk)}  ·  marže ${nv.marzePct.toFixed(1)} %`, 60, boxY + 10);
    if (order.stav === "fakturovano") {
      doc
        .font("Text")
        .fontSize(9)
        .fillColor(SOFT)
        .text(`Plán z kalkulace: ${fmtMoney(nv.planZisk)} zisk · ${nv.planMarzePct.toFixed(1)} % marže`, 60, boxY + 32);
    }
    doc.y = boxY + boxHeight + 8;
    doc.font("Text").fontSize(10).fillColor(INK);
  }

  // ---------- Předávací protokol ----------
  if (order.protokol) {
    nadpisSekce("Předávací protokol");
    radek("Stav:", order.protokol.stav === "podepsano" ? "Podepsáno" : "Čeká na podpis");
    if (order.protokol.podpisDatum) radek("Datum podpisu:", fmtDate(order.protokol.podpisDatum));
    if (order.protokol.vyhrady) radek("Výhrady:", order.protokol.vyhrady);
    if (order.protokol.podpisPath) {
      const podpisBuffer = await stahnoutObrazek(order.protokol.podpisPath, "protokoly", supabaseAdmin);
      if (podpisBuffer) {
        zajistitMisto(90);
        doc.moveDown(0.3);
        try {
          vlozitObrazek(podpisBuffer, 160, 70);
        } catch (e) {
          console.error("Vložení obrázku podpisu do PDF selhalo:", e);
        }
      }
    }
  }

  // ---------- Materiál objednán ----------
  nadpisSekce("Materiál");
  radek("Objednán:", order.materialObjednano ? `Ano${order.materialObjednanoDatum ? " (" + fmtDate(order.materialObjednanoDatum) + ")" : ""}` : "Ne");

  // ---------- Účtenky ----------
  if ((order.uctenky || []).length > 0) {
    nadpisSekce(`Účtenky (${order.uctenky.length})`);
    for (const u of order.uctenky) {
      zajistitMisto(125);
      doc.text(`${fmtDate(u.datum)}${u.castka ? "  ·  " + fmtMoney(u.castka) : ""}${u.poznamka ? "  —  " + t(u.poznamka) : ""}`);
      const buf = await stahnoutObrazek(u.path, "uctenky", supabaseAdmin);
      if (buf) {
        try {
          vlozitObrazek(buf, 90, 90);
        } catch (e) {
          console.error("Vložení účtenky do PDF selhalo:", e);
        }
      }
      doc.moveDown(0.3);
    }
  }

  // ---------- Fotky z průběhu práce ----------
  if ((order.fotky || []).length > 0) {
    nadpisSekce(`Fotky z průběhu práce (${order.fotky.length})`);
    for (const f of order.fotky) {
      zajistitMisto(175);
      const typLabel = f.typ === "pred" ? "Před" : f.typ === "po" ? "Po" : "Ostatní";
      doc.text(`${fmtDate(f.datum)}  ·  ${t(typLabel)}${f.popis ? "  —  " + t(f.popis) : ""}`);
      const buf = await stahnoutObrazek(f.path, "fotky", supabaseAdmin);
      if (buf) {
        try {
          vlozitObrazek(buf, 140, 140);
        } catch (e) {
          console.error("Vložení fotky do PDF selhalo:", e);
        }
      }
      doc.moveDown(0.3);
    }
  }

  doc.end();
  return hotovo;
}
