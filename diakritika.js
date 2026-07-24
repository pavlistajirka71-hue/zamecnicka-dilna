"use client";
import { X, Printer } from "lucide-react";
import { C, FONTS, DPH_SAZBA, fmtMoney, fmtDate, todayISO } from "@/lib/theme";
import { Button } from "./ui";

function polozkaLines(vysledek) {
  // Scale raw cost lines proportionally so they sum exactly to the položka's price,
  // without exposing the markup as a separate line.
  const scale = vysledek.naklady > 0 ? vysledek.cenaBezDph / vysledek.naklady : 1;
  const lines = [];
  if (vysledek.materialSum > 0) lines.push({ label: "Materiál", cena: vysledek.materialSum * scale });
  if (vysledek.praceDilnaSum > 0) lines.push({ label: "Práce — dílna", cena: vysledek.praceDilnaSum * scale });
  if (vysledek.praceMontazSum > 0) lines.push({ label: "Práce — montáž", cena: vysledek.praceMontazSum * scale });
  if (vysledek.zinkovaniSum > 0) lines.push({ label: "Zinkování", cena: vysledek.zinkovaniSum * scale });
  if (vysledek.lakovaniSum > 0) lines.push({ label: "Lakování", cena: vysledek.lakovaniSum * scale });
  return lines;
}

// celkem = computeKalkulaceCelkem(...) výstup, obsahuje celkem.items = [{ polozka, vysledek }, ...]
export default function QuoteView({ order, polozky, celkem, onClose }) {
  const items = celkem.items || [];
  const vicePolozek = items.length > 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 16, borderBottom: `1px solid ${C.line}` }}>
        <Button variant="ghost" onClick={onClose}>
          <X size={14} /> Zavřít
        </Button>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer size={14} /> Tisk
        </Button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "30px 24px", color: C.ink, fontFamily: FONTS.body }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 26, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>
          Cenová nabídka
        </div>
        <div style={{ color: C.inkSoft, marginBottom: 24, fontFamily: FONTS.mono, fontSize: 13 }}>
          {order.cislo} · {fmtDate(todayISO())}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>Zákazník</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{order.zakaznik}</div>
          <div style={{ color: C.inkSoft }}>{order.popis}</div>
        </div>

        {items.map(({ polozka, vysledek }, pi) => {
          const lines = polozkaLines(vysledek);
          return (
            <div key={polozka.id || pi} style={{ marginBottom: 18 }}>
              {vicePolozek && (
                <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 15, marginBottom: 6 }}>
                  {polozka.nazev || `Položka ${pi + 1}`}
                </div>
              )}
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                {lines.map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
                    <span>{l.label}</span>
                    <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(l.cena)}</span>
                  </div>
                ))}
                {vicePolozek && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 14, background: C.paper, fontWeight: 600 }}>
                    <span>Mezisoučet bez DPH</span>
                    <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.cenaBezDph)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 14, background: C.paper }}>
            <span>Cena celkem bez DPH</span>
            <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaBezDph)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 14, background: C.paper }}>
            <span>DPH 21 %</span>
            <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaBezDph * DPH_SAZBA)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px", fontSize: 18, fontWeight: 700, background: C.steelDark, color: "#fff" }}>
            <span>Cena celkem s DPH</span>
            <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaSDph)}</span>
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: C.inkSoft }}>Nabídka je informativní a platí 30 dní od vystavení.</div>
      </div>
    </div>
  );
}
