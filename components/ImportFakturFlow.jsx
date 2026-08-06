"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Check, AlertTriangle } from "lucide-react";
import { C, FONTS, uid, parseFakturyCSV, parseCastku, odhadnoutUdajeFaktury, sparovatFakturySZakazkami } from "@/lib/theme";
import { Button } from "./ui";

// Vrátí pole řádků (objekty sloupec -> hodnota) z XLSX souboru — appka na to zjistila,
// že export z Flexi bývá XLSX, ne CSV, takže to umí přečíst přímo, bez nutnosti
// cokoliv ručně převádět.
function parseFakturyXLSX(buffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const list = workbook.Sheets[workbook.SheetNames[0]];
  // raw:false -> appka dostane naformátovaný text (např. datum jako "05.08.2026",
  // ne syrové sériové číslo Excelu) — stejný tvar dat jako z CSV, ať appka nemusí
  // mít pro oba formáty jinou logiku.
  return XLSX.utils.sheet_to_json(list, { defval: "", raw: false });
}

export default function ImportFakturFlow({ orders, onImportovat, onClose }) {
  const [zpracovano, setZpracovano] = useState(null); // { sparovane, nesparovane }
  const [vybrane, setVybrane] = useState(new Set());
  const [chyba, setChyba] = useState("");
  const [importuji, setImportuji] = useState(false);
  const [vysledek, setVysledek] = useState(null);

  const zpracovatSoubor = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setChyba("");
    try {
      const jeExcel = /\.xlsx?$/i.test(file.name);
      const radky = jeExcel ? parseFakturyXLSX(await file.arrayBuffer()) : parseFakturyCSV(await file.text());
      if (radky.length === 0) {
        setChyba("V souboru appka nenašla žádné řádky s daty — zkontroluj, že je to opravdu export faktur z Flexi.");
        return;
      }
      const vysledekSparovani = sparovatFakturySZakazkami(radky, orders);
      setZpracovano(vysledekSparovani);
      setVybrane(new Set(vysledekSparovani.sparovane.map((_, i) => i)));
    } catch (err) {
      console.error(err);
      setChyba("Soubor se nepovedlo přečíst. Zkus ho exportovat z Flexi znovu.");
    }
  };

  const prepnoutVyber = (i) => {
    setVybrane((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const potvrditImport = async () => {
    setImportuji(true);
    setChyba("");
    try {
      const kNaimportovani = zpracovano.sparovane
        .filter((_, i) => vybrane.has(i))
        .map(({ order, radek }) => {
          const udaje = odhadnoutUdajeFaktury(radek);
          const mnozstviText = udaje.mnozstvi ? `${udaje.mnozstvi}${udaje.jednotka ? ` ${udaje.jednotka}` : ""}` : "";
          const popisCasti = [udaje.popisPolozky, mnozstviText, udaje.dodavatel ? `Faktura přijatá — ${udaje.dodavatel}` : "Faktura přijatá (Flexi)"];
          return {
            order,
            naklad: {
              id: uid(),
              popis: popisCasti.filter(Boolean).join(" — "),
              castka: parseCastku(udaje.castka),
            },
          };
        });
      await onImportovat(kNaimportovani);
      setVysledek({ pocet: kNaimportovani.length });
    } catch (err) {
      console.error(err);
      setChyba("Import se nepovedl, zkus to znovu.");
    }
    setImportuji(false);
  };

  if (vysledek) {
    return (
      <div>
        <div style={{ background: "#E6F0E8", border: `1px solid ${C.moss}`, borderRadius: 8, padding: 14, fontSize: 14, marginBottom: 16 }}>
          <Check size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Naimportováno {vysledek.pocet} {vysledek.pocet === 1 ? "faktura" : vysledek.pocet < 5 ? "faktury" : "faktur"} do nákladů zakázek.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" onClick={onClose}>
            Zavřít
          </Button>
        </div>
      </div>
    );
  }

  if (!zpracovano) {
    return (
      <div>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
          Nahraj export "Faktury přijaté" z ABRA Flexi (CSV nebo XLSX, u položek, ne jen v hlavičce). Appka číslo zakázky hledá přednostně přímo
          ve sloupci "Zakázka" — pokud tam číslo nenajde, prohledá i zbytek řádku.
        </div>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: "30px 16px",
            border: `2px dashed ${C.line}`,
            borderRadius: 10,
            cursor: "pointer",
            color: C.steel,
          }}
        >
          <Upload size={24} />
          <span style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13 }}>Vybrat soubor (CSV nebo XLSX)</span>
          <input type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={zpracovatSoubor} style={{ display: "none" }} />
        </label>
        {chyba && <div style={{ color: C.danger, fontSize: 13, marginTop: 12 }}>{chyba}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>
            Zavřít
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {zpracovano.sparovane.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.04em", color: C.moss, marginBottom: 8 }}>
            Spárováno se zakázkou ({zpracovano.sparovane.length})
          </div>
          {zpracovano.sparovane.map(({ order, radek, cislo }, i) => {
            const udaje = odhadnoutUdajeFaktury(radek);
            return (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  border: `1px solid ${C.line}`,
                  borderRadius: 8,
                  marginBottom: 6,
                  fontSize: 13,
                  cursor: "pointer",
                  background: vybrane.has(i) ? C.surface : C.paper,
                }}
              >
                <input type="checkbox" checked={vybrane.has(i)} onChange={() => prepnoutVyber(i)} style={{ marginTop: 3 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{udaje.dodavatel || "(dodavatel neznámý)"}</div>
                  {udaje.popisPolozky && (
                    <div style={{ color: C.inkSoft, fontSize: 12 }}>
                      {udaje.popisPolozky}
                      {udaje.mnozstvi && ` · ${udaje.mnozstvi}${udaje.jednotka ? ` ${udaje.jednotka}` : ""}`}
                    </div>
                  )}
                  <div style={{ color: C.inkSoft, fontSize: 12 }}>
                    {udaje.castka ? `${udaje.castka} Kč` : "částka neznámá"} {udaje.datum && `· ${udaje.datum}`}
                  </div>
                  {!udaje.jeBezDphJiste && udaje.castka && (
                    <div style={{ color: C.rust, fontSize: 11, marginTop: 2 }}>⚠ appka si není jistá, jestli je tahle částka bez DPH — zkontroluj</div>
                  )}
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.steel, marginTop: 2 }}>
                    → {cislo} — {order.zakaznik}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {zpracovano.nesparovane.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.04em", color: C.rust, marginBottom: 8 }}>
            <AlertTriangle size={14} /> Nespárováno ({zpracovano.nesparovane.length})
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>
            U těchhle appka buď nenašla číslo zakázky, nebo takové číslo v appce neexistuje — zapiš je ručně přes "Zapsat náklady/účtenky".
          </div>
          {zpracovano.nesparovane.map(({ radek, cislo }, i) => {
            const udaje = odhadnoutUdajeFaktury(radek);
            return (
              <div key={i} style={{ padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, marginBottom: 6, fontSize: 12, color: C.inkSoft }}>
                {udaje.dodavatel || "(dodavatel neznámý)"} — {udaje.castka ? `${udaje.castka} Kč` : "?"}
                {cislo ? ` — nalezené číslo "${cislo}" appka nezná` : " — číslo zakázky nenalezeno"}
              </div>
            );
          })}
        </div>
      )}

      {chyba && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{chyba}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="ghost" onClick={onClose} type="button">
          Zrušit
        </Button>
        <Button variant="primary" onClick={potvrditImport} disabled={importuji || vybrane.size === 0} type="button">
          {importuji ? "Importuji…" : `Naimportovat (${vybrane.size})`}
        </Button>
      </div>
    </div>
  );
}
