"use client";
import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { C, FONTS, downloadTextFile } from "@/lib/theme";
import { Button, Field, TextInput } from "./ui";

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PraceReport({ orders, onClose }) {
  const [mesic, setMesic] = useState(currentMonthValue());

  const radky = useMemo(() => {
    const rows = orders
      .map((o) => {
        const entries = (o.prace || []).filter((p) => (p.datum || "").startsWith(mesic));
        if (entries.length === 0) return null;
        const dilna = entries.filter((p) => (p.typ || "dilna") === "dilna").reduce((s, p) => s + (Number(p.hodiny) || 0), 0);
        const montaz = entries.filter((p) => (p.typ || "dilna") === "montaz").reduce((s, p) => s + (Number(p.hodiny) || 0), 0);
        return { id: o.id, cislo: o.cislo, zakaznik: o.zakaznik, dilna, montaz, celkem: dilna + montaz };
      })
      .filter(Boolean)
      .sort((a, b) => b.celkem - a.celkem);
    return rows;
  }, [orders, mesic]);

  const total = useMemo(
    () =>
      radky.reduce(
        (acc, r) => ({ dilna: acc.dilna + r.dilna, montaz: acc.montaz + r.montaz, celkem: acc.celkem + r.celkem }),
        { dilna: 0, montaz: 0, celkem: 0 }
      ),
    [radky]
  );

  const exportCSV = () => {
    const header = ["Cislo", "Zakaznik", "HodinyDilna", "HodinyMontaz", "HodinyCelkem"];
    const rows = radky.map((r) => [r.cislo, r.zakaznik, r.dilna, r.montaz, r.celkem]);
    rows.push(["", "CELKEM", total.dilna, total.montaz, total.celkem]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    downloadTextFile(`report-prace-${mesic}.csv`, csv);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
        <Field label="Měsíc">
          <TextInput type="month" value={mesic} onChange={(e) => setMesic(e.target.value)} style={{ width: 160 }} />
        </Field>
        <Button variant="ghost" onClick={exportCSV} style={{ marginBottom: 12 }}>
          <FileDown size={14} /> Export CSV
        </Button>
      </div>

      {radky.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: C.inkSoft }}>V tomto měsíci nejsou zapsané žádné hodiny.</div>
      ) : (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 12px", background: C.paper, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 11, color: C.inkSoft }}>
            <div>Zakázka</div>
            <div style={{ textAlign: "right" }}>Dílna</div>
            <div style={{ textAlign: "right" }}>Montáž</div>
            <div style={{ textAlign: "right" }}>Celkem</div>
          </div>
          {radky.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                padding: "10px 12px",
                borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                fontSize: 13,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.zakaznik}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.inkSoft }}>{r.cislo}</div>
              </div>
              <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{r.dilna} h</div>
              <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{r.montaz} h</div>
              <div style={{ textAlign: "right", fontFamily: FONTS.mono, fontWeight: 600 }}>{r.celkem} h</div>
            </div>
          ))}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              padding: "12px",
              borderTop: `2px dashed ${C.line}`,
              fontSize: 14,
              fontWeight: 700,
              background: C.paper,
            }}
          >
            <div>Celkem za měsíc</div>
            <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{total.dilna} h</div>
            <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{total.montaz} h</div>
            <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{total.celkem} h</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
