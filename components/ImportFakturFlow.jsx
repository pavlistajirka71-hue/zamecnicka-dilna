"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Check, AlertTriangle } from "lucide-react";
import { C, FONTS, uid, parseFakturyCSV, sestavitNakladZFaktury, jeMoznaDuplicitaNakladu, odhadnoutUdajeFaktury, sparovatFakturySZakazkami } from "@/lib/theme";
import { Button, Select } from "./ui";

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
  // Ruční přiřazení zakázky u nespárovaných položek — klíč je index v poli
  // nesparovane, hodnota je id vybrané zakázky (nebo "" když appka má zahodit).
  const [rucniVyber, setRucniVyber] = useState({});
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
      // Appka nezaškrtne předem položky, co vypadají jako duplicita už existujícího
      // nákladu — ať to uživatel vidomě potvrdí, ne že by appka duplicitu tiše
      // naimportovala jen proto, že byla "spárovaná".
      const vychoziVyber = vysledekSparovani.sparovane
        .map(({ order, radek }, i) => {
          const { popis, castka } = sestavitNakladZFaktury(radek);
          return jeMoznaDuplicitaNakladu(order, popis, castka) ? null : i;
        })
        .filter((i) => i !== null);
      setVybrane(new Set(vychoziVyber));
      setRucniVyber({});
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
      const zeSparovanych = zpracovano.sparovane
        .filter((_, i) => vybrane.has(i))
        .map(({ order, radek }) => ({ order, naklad: { id: uid(), ...sestavitNakladZFaktury(radek) } }));

      // Ručně dopárované — appka bere jen ty, u kterých byla opravdu vybraná
      // konkrétní zakázka; zbytek appka bez dalšího ptaní zahodí (uživatel to
      // takhle výslovně chtěl).
      const zRucnihoVyberu = zpracovano.nesparovane
        .map((polozka, i) => ({ polozka, orderId: rucniVyber[i] }))
        .filter(({ orderId }) => orderId)
        .map(({ polozka, orderId }) => {
          const order = orders.find((o) => o.id === orderId);
          return { order, naklad: { id: uid(), ...sestavitNakladZFaktury(polozka.radek) } };
        })
        .filter(({ order }) => order);

      const kNaimportovani = [...zeSparovanych, ...zRucnihoVyberu];
      await onImportovat(kNaimportovani);
      setVysledek({ pocet: kNaimportovani.length });
    } catch (err) {
      console.error(err);
      setChyba("Import se nepovedl, zkus to znovu.");
    }
    setImportuji(false);
  };

  const pocetKImportu = vybrane.size + Object.values(rucniVyber).filter(Boolean).length;

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
            const { popis: sestavenyPopis, castka: sestavenaCastka } = sestavitNakladZFaktury(radek);
            const jeDuplicita = jeMoznaDuplicitaNakladu(order, sestavenyPopis, sestavenaCastka);
            return (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  border: `1px solid ${jeDuplicita ? C.rust : C.line}`,
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
                  {jeDuplicita && (
                    <div style={{ color: C.rust, fontSize: 11, marginTop: 2, fontWeight: 600 }}>
                      ⚠ zakázka už má náklad se stejným popisem a částkou — možná duplicita, appka to proto nezaškrtla předem
                    </div>
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
            U těchhle appka nenašla (nebo nepoznala) číslo zakázky — vyber ji ručně, nebo nech "Nepřiřazovat" a appka tuhle položku při importu zahodí.
          </div>
          {zpracovano.nesparovane.map((polozka, i) => {
            const { radek, cislo } = polozka;
            const udaje = odhadnoutUdajeFaktury(radek);
            const vybranaZakazkaId = rucniVyber[i] || "";
            const vybranaZakazka = vybranaZakazkaId ? orders.find((o) => o.id === vybranaZakazkaId) : null;
            const { popis: sestavenyPopis, castka: sestavenaCastka } = sestavitNakladZFaktury(radek);
            const jeDuplicita = vybranaZakazka ? jeMoznaDuplicitaNakladu(vybranaZakazka, sestavenyPopis, sestavenaCastka) : false;
            return (
              <div key={i} style={{ padding: "10px 12px", border: `1px solid ${jeDuplicita ? C.rust : C.line}`, borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{udaje.popisPolozky || "(popis položky neznámý)"}</div>
                {udaje.mnozstvi && (
                  <div style={{ color: C.inkSoft, fontSize: 11 }}>
                    {udaje.mnozstvi}
                    {udaje.jednotka ? ` ${udaje.jednotka}` : ""}
                  </div>
                )}
                <div style={{ color: C.inkSoft, marginTop: 2 }}>
                  {udaje.dodavatel || "(dodavatel neznámý)"} — {udaje.castka ? `${udaje.castka} Kč` : "?"}
                  {cislo ? ` — nalezené číslo "${cislo}" appka nezná` : " — číslo zakázky nenalezeno"}
                </div>
                <Select
                  value={vybranaZakazkaId}
                  onChange={(e) => setRucniVyber((prev) => ({ ...prev, [i]: e.target.value }))}
                  style={{ marginTop: 6, fontSize: 12, padding: "6px 8px" }}
                >
                  <option value="">Nepřiřazovat (appka zahodí)</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.cislo} — {o.zakaznik}
                    </option>
                  ))}
                </Select>
                {jeDuplicita && (
                  <div style={{ color: C.rust, fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                    ⚠ vybraná zakázka už má náklad se stejným popisem a částkou — možná duplicita
                  </div>
                )}
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
        <Button variant="primary" onClick={potvrditImport} disabled={importuji || pocetKImportu === 0} type="button">
          {importuji ? "Importuji…" : `Naimportovat (${pocetKImportu})`}
        </Button>
      </div>
    </div>
  );
}
