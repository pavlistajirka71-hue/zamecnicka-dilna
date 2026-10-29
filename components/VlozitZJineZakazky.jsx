"use client";
import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { C, FONTS, uid, fmtMoney, fmtDate, normalizovatKalkulaci, computeKalkulace } from "@/lib/theme";
import { Modal, Button, TextInput } from "./ui";

// Výběr položek kalkulace z jiných zakázek. Vybrané položky se vloží jako KOPIE —
// původní zakázka zůstane beze změny. Kopie se počítají s aktuálními sazbami
// z Nastavení (uložené sazby původní kalkulace se nepřenáší), protože jde o novou nabídku.
export default function VlozitZJineZakazky({ orders, aktualniOrderId, nastaveni, onVlozit, onClose }) {
  const [hledat, setHledat] = useState("");
  const [otevrenaId, setOtevrenaId] = useState(null);
  const [vybrane, setVybrane] = useState({}); // { "orderId:polozkaId": polozka }

  const zakazky = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    return (orders || [])
      .filter((o) => o.id !== aktualniOrderId)
      .map((o) => ({ order: o, polozky: normalizovatKalkulaci(o.kalkulace) }))
      .filter(({ polozky }) => polozky.length > 0)
      .filter(({ order, polozky }) => {
        if (!q) return true;
        return [order.cislo, order.zakaznik, order.popis, ...polozky.map((p) => p.nazev)].some((v) => (v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => ((a.order.vytvoreno || "") < (b.order.vytvoreno || "") ? 1 : -1))
      .slice(0, 60);
  }, [orders, aktualniOrderId, hledat]);

  const klic = (o, p) => `${o.id}:${p.id}`;
  const prepnout = (o, p) =>
    setVybrane((prev) => {
      const dalsi = { ...prev };
      if (dalsi[klic(o, p)]) delete dalsi[klic(o, p)];
      else dalsi[klic(o, p)] = p;
      return dalsi;
    });
  const pocetVybranych = Object.keys(vybrane).length;

  const vlozit = () => {
    const kopie = Object.values(vybrane).map(({ sazby, ...p }) => ({
      ...p,
      id: uid(),
      materialy: (p.materialy || []).map((m) => ({ ...m, id: uid() })),
    }));
    onVlozit(kopie);
  };

  return (
    <Modal title="Vložit položky z jiné zakázky" onClose={onClose} width={620} zIndex={60}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: C.inkSoft }} />
        <TextInput
          value={hledat}
          onChange={(e) => setHledat(e.target.value)}
          placeholder="Hledat podle zákazníka, čísla zakázky nebo názvu položky (např. brána)…"
          style={{ paddingLeft: 32 }}
          autoFocus
        />
      </div>

      {zakazky.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: C.inkSoft, fontSize: 14 }}>
          {hledat ? "Nic neodpovídá hledání." : "Žádná jiná zakázka zatím nemá kalkulaci."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto", marginBottom: 12 }}>
          {zakazky.map(({ order: o, polozky }) => {
            const otevrena = otevrenaId === o.id || (hledat && polozky.some((p) => (p.nazev || "").toLowerCase().includes(hledat.trim().toLowerCase())));
            const vybranoZTeto = polozky.filter((p) => vybrane[klic(o, p)]).length;
            return (
              <div key={o.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOtevrenaId(otevrenaId === o.id ? null : o.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.paper, border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft, whiteSpace: "nowrap" }}>{o.cislo}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.zakaznik}</span>
                  <span style={{ fontSize: 12, color: C.inkSoft, whiteSpace: "nowrap" }}>
                    {vybranoZTeto > 0 ? <strong style={{ color: C.moss }}>vybráno {vybranoZTeto} · </strong> : null}
                    {polozky.length} {polozky.length === 1 ? "položka" : polozky.length < 5 ? "položky" : "položek"} · {fmtDate(o.vytvoreno)}
                  </span>
                  {otevrena ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {otevrena && (
                  <div style={{ padding: "6px 12px 10px" }}>
                    {polozky.map((p) => {
                      const v = computeKalkulace({ ...p, sazby: undefined }, nastaveni);
                      return (
                        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px dashed ${C.line}`, cursor: "pointer", fontSize: 14 }}>
                          <input type="checkbox" checked={!!vybrane[klic(o, p)]} onChange={() => prepnout(o, p)} />
                          <span style={{ flex: 1 }}>
                            {p.nazev || "Položka"}
                            <span style={{ fontSize: 12, color: C.inkSoft }}>
                              {" "}
                              · {(p.materialy || []).length} mat. · {Number(p.praceDilnaHodiny) || 0} h dílna · {Number(p.praceMontazHodiny) || 0} h montáž
                            </span>
                          </span>
                          <span style={{ fontFamily: FONTS.mono, fontSize: 13, whiteSpace: "nowrap" }}>
                            {Number(p.pocetKs) > 1 ? `${p.pocetKs}× · ` : ""}
                            {fmtMoney(v.cenaBezDph)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>
        Položky se vloží jako kopie (původní zakázka se nezmění) a spočítají se s aktuálními sazbami z Nastavení. Ceny v seznamu jsou podle aktuálních sazeb.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="ghost" type="button" onClick={onClose}>
          Zrušit
        </Button>
        <Button variant="primary" type="button" onClick={vlozit} disabled={pocetVybranych === 0}>
          Vložit vybrané{pocetVybranych ? ` (${pocetVybranych})` : ""}
        </Button>
      </div>
    </Modal>
  );
}
