"use client";
import { useMemo, useState } from "react";
import { X, Printer, Copy, Check } from "lucide-react";
import { C, FONTS, normalizovatKalkulaci, fmtDate, todayISO } from "@/lib/theme";
import { Button } from "./ui";

// Sebere materiál ze všech položek kalkulace, seskupí podle dodavatele a stejné
// materiály (stejný název + jednotka) napříč položkami sečte do jednoho řádku.
function sestavitPoptavku(polozky) {
  const bySupplier = new Map();

  polozky.forEach((p) => {
    const pocetKs = Math.max(1, Number(p.pocetKs) || 1);
    (p.materialy || []).forEach((m) => {
      if (!m.nazev) return;
      const dodavatel = m.dodavatel && m.dodavatel.trim() ? m.dodavatel.trim() : "Bez uvedeného dodavatele";
      const key = `${m.nazev.trim().toLowerCase()}|${m.jednotka || ""}`;
      if (!bySupplier.has(dodavatel)) bySupplier.set(dodavatel, new Map());
      const items = bySupplier.get(dodavatel);
      const mnozstvi = (Number(m.mnozstvi) || 0) * pocetKs;
      if (!items.has(key)) {
        items.set(key, { nazev: m.nazev, jednotka: m.jednotka || "", mnozstvi: 0, zPolozek: [] });
      }
      const entry = items.get(key);
      entry.mnozstvi += mnozstvi;
      entry.zPolozek.push({ nazev: p.nazev || "Položka", mnozstvi });
    });
  });

  return Array.from(bySupplier.entries()).map(([dodavatel, items]) => [dodavatel, Array.from(items.values())]);
}

export default function MaterialOrderView({ order, onClose }) {
  const [copied, setCopied] = useState(false);
  const polozky = normalizovatKalkulaci(order.kalkulace);
  const groups = useMemo(() => sestavitPoptavku(polozky), [polozky]);

  const asText = () => {
    let out = `POPTÁVKA MATERIÁLU\nReference: ${order.cislo}\nDatum: ${fmtDate(todayISO())}\n\n`;
    groups.forEach(([dodavatel, items]) => {
      out += `${dodavatel}:\n`;
      items.forEach((m) => {
        out += `  - ${m.nazev} — ${m.mnozstvi || 0} ${m.jednotka || ""}\n`;
      });
      out += "\n";
    });
    return out.trim();
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 16, borderBottom: `1px solid ${C.line}` }}>
        <Button variant="ghost" onClick={onClose}>
          <X size={14} /> Zavřít
        </Button>
        <Button variant="ghost" onClick={copyText}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Zkopírováno" : "Kopírovat text"}
        </Button>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer size={14} /> Tisk
        </Button>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "30px 24px", color: C.ink, fontFamily: FONTS.body }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 26, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>
          Poptávka materiálu
        </div>
        <div style={{ color: C.inkSoft, marginBottom: 28, fontFamily: FONTS.mono, fontSize: 13 }}>
          Reference: {order.cislo} · {fmtDate(todayISO())}
        </div>

        {groups.length === 0 ? (
          <div style={{ color: C.inkSoft }}>Kalkulace zatím neobsahuje žádný materiál.</div>
        ) : (
          groups.map(([dodavatel, items], gi) => (
            <div key={gi} style={{ marginBottom: 22, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
              <div
                style={{
                  background: C.steelDark,
                  color: "#fff",
                  padding: "10px 14px",
                  fontFamily: FONTS.display,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontSize: 14,
                }}
              >
                {dodavatel}
              </div>
              {items.map((m, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 14px",
                    borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                    fontSize: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{m.nazev}</span>
                    <span style={{ fontFamily: FONTS.mono, fontWeight: 600 }}>
                      {m.mnozstvi || 0} {m.jednotka || ""}
                    </span>
                  </div>
                  {m.zPolozek.length > 1 && (
                    <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>
                      {m.zPolozek.map((z, zi) => `${z.nazev}: ${z.mnozstvi} ${m.jednotka || ""}`).join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}

        <div style={{ marginTop: 24, fontSize: 12, color: C.inkSoft }}>Prosíme o potvrzení dostupnosti a termínu dodání.</div>
      </div>
    </div>
  );
}
