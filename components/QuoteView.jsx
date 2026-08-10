"use client";
import { useState } from "react";
import { X, Printer } from "lucide-react";
import { C, FONTS, fmtMoney, fmtDate, todayISO } from "@/lib/theme";
import { Button, Select } from "./ui";

// Nabídka se tiskne s vybranou sazbou DPH nezávisle na tom, s jakou appka počítá
// interně kalkulaci/marži (u stavebních prací na bydlení jde občas použít snížená
// sazba) — appka si to jen dopočítá pro tisk, uloženou kalkulaci to nemění.
const SAZBY_DPH = [
  { hodnota: 0.21, label: "21 %" },
  { hodnota: 0.15, label: "15 %" },
  { hodnota: 0.12, label: "12 %" },
  { hodnota: 0, label: "bez DPH" },
];

// celkem = computeKalkulaceCelkem(...) výstup, obsahuje celkem.items = [{ polozka, vysledek }, ...]
export default function QuoteView({ order, polozky, celkem, nastaveni, onClose }) {
  const [sazbaDph, setSazbaDph] = useState(order.sazbaDph ?? 0.21);
  const items = celkem.items || [];
  const cenaSDphNabidka = celkem.cenaBezDph * (1 + sazbaDph);
  const n = nastaveni || {};

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto" }}>
      <div
        className="no-print"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 16, borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSoft }}>
          Sazba DPH na nabídce:
          <Select value={sazbaDph} onChange={(e) => setSazbaDph(Number(e.target.value))} style={{ width: "auto", padding: "6px 10px" }}>
            {SAZBY_DPH.map((s) => (
              <option key={s.hodnota} value={s.hodnota}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>
            <X size={14} /> Zavřít
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={14} /> Tisk
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 32px 28px", color: C.ink, fontFamily: FONTS.body }}>
        {/* Hlavička s názvem firmy */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderBottom: `3px solid ${C.steelDark}`,
            paddingBottom: 12,
            marginBottom: 32,
          }}
        >
          <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", color: C.steelDark }}>
            {n.firmaNazev || "Cenová nabídka"}
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{fmtDate(todayISO())}</div>
        </div>

        {/* Odběratel / Dodavatel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: C.rust, marginBottom: 8 }}>
              Odběratel
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{order.zakaznik}</div>
            {order.zakaznikIdentifikace && (
              <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "pre-line" }}>{order.zakaznikIdentifikace}</div>
            )}
          </div>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: C.rust, marginBottom: 8 }}>
              Dodavatel
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{n.firmaNazev || "—"}</div>
            {n.firmaAdresa && <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "pre-line" }}>{n.firmaAdresa}</div>}
            {(n.firmaIco || n.firmaDic) && (
              <div style={{ fontSize: 13, color: C.inkSoft, fontFamily: FONTS.mono, marginTop: 4 }}>
                {n.firmaIco && <div>IČO: {n.firmaIco}</div>}
                {n.firmaDic && <div>DIČ: {n.firmaDic}</div>}
              </div>
            )}
            {n.firmaEmail && <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{n.firmaEmail}</div>}
          </div>
        </div>

        {/* Nadpis nabídky */}
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderBottom: `1px solid ${C.line}`,
            paddingBottom: 8,
            marginBottom: 16,
          }}
        >
          Nabídka výroby a montáže — {order.cislo}
        </div>
        {order.popis && <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 20, whiteSpace: "pre-line" }}>{order.popis}</div>}

        {/* Tabulka položek */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.steelDark}` }}>
              <th style={{ textAlign: "left", padding: "8px 10px 8px 0", fontFamily: FONTS.display, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: C.inkSoft }}>
                Položka
              </th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontFamily: FONTS.display, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: C.inkSoft, width: 90 }}>
                MJ
              </th>
              <th style={{ textAlign: "right", padding: "8px 0 8px 10px", fontFamily: FONTS.display, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: C.inkSoft, width: 140 }}>
                Celkem
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ polozka, vysledek }, i) => (
              <tr key={polozka.id || i} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: "10px 10px 10px 0", fontSize: 14 }}>{polozka.nazev || `Položka ${i + 1}`}</td>
                <td style={{ padding: "10px", fontSize: 14, fontFamily: FONTS.mono, color: C.inkSoft }}>
                  {polozka.pocetKs || 1} {polozka.jednotka || "ks"}
                </td>
                <td style={{ padding: "10px 0 10px 10px", fontSize: 14, fontFamily: FONTS.mono, textAlign: "right" }}>{fmtMoney(vysledek.cenaBezDph)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Součty */}
        <div style={{ marginLeft: "auto", width: "62%", marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", fontSize: 14, fontWeight: 600, borderTop: `1px solid ${C.line}` }}>
            <span>Celkem bez DPH</span>
            <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaBezDph)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 14px",
              fontSize: 17,
              fontWeight: 700,
              background: C.steelDark,
              color: "#fff",
              borderRadius: 6,
              marginTop: 6,
            }}
          >
            <span>Celkem s DPH {(sazbaDph * 100).toFixed(0)} %</span>
            <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(cenaSDphNabidka)}</span>
          </div>
        </div>

        <div style={{ marginTop: 32, fontSize: 12, color: C.inkSoft }}>Nabídka je informativní a platí 30 dní od vystavení.</div>

        {/* Patička */}
        <div style={{ marginTop: 60, paddingTop: 14, borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.inkSoft }}>
          {[n.firmaNazev, n.firmaAdresa, n.firmaIco && `IČO: ${n.firmaIco}`, n.firmaEmail].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}
