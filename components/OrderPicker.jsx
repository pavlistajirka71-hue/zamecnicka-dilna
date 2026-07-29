"use client";
import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { C, FONTS } from "@/lib/theme";
import { TextInput, StampBadge } from "./ui";

export default function OrderPicker({ orders, onPick, excludeStavy, excludeNote }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const query = q.toLowerCase();
    return orders
      .filter((o) => !excludeStavy || !excludeStavy.includes(o.stav))
      .filter(
        (o) =>
          !query ||
          o.zakaznik.toLowerCase().includes(query) ||
          o.cislo.toLowerCase().includes(query) ||
          (o.popis || "").toLowerCase().includes(query)
      )
      .sort((a, b) => (a.vytvoreno < b.vytvoreno ? 1 : -1));
  }, [orders, q, excludeStavy]);

  return (
    <div>
      {excludeStavy && excludeNote && (
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>{excludeNote}</div>
      )}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: 13, color: C.inkSoft }} />
        <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32 }} />
      </div>
      {list.length === 0 ? (
        <div style={{ color: C.inkSoft, textAlign: "center", padding: 20 }}>Žádná zakázka nenalezena.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
          {list.map((o) => (
            <button
              key={o.id}
              onClick={() => onPick(o)}
              style={{
                textAlign: "left",
                background: C.paper,
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{o.cislo}</span>
                  <StampBadge status={o.stav} small />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{o.zakaznik}</div>
                <div style={{ fontSize: 12, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {o.popis}
                </div>
              </div>
              <ChevronRight size={16} color={C.inkSoft} style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
