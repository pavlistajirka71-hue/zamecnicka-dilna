"use client";
import { useMemo, useState } from "react";
import { Plus, Search, ChevronRight, Camera, MessageSquare, ArrowRight } from "lucide-react";
import { C, FONTS, fmtDate } from "@/lib/theme";
import { STAVY_POPTAVKY, AKTIVNI_STAVY_POPTAVKY, stavPoptavkyInfo } from "@/lib/poptavky";
import { Button, TextInput, Select } from "./ui";

export function StavPoptavkyBadge({ stav, small }) {
  const s = stavPoptavkyInfo(stav);
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: FONTS.display,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontSize: small ? 10 : 12,
        color: s.color,
        border: `2px solid ${s.color}`,
        borderRadius: 3,
        padding: small ? "1px 6px" : "2px 9px",
        transform: "rotate(-2deg)",
        background: "rgba(255,255,255,0.6)",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export default function PoptavkyPanel({ poptavky, nacteno, onNova, onOpen }) {
  const [hledat, setHledat] = useState("");
  const [filtr, setFiltr] = useState("aktivni");

  const zobrazene = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    return (poptavky || [])
      .filter((p) => (filtr === "vse" ? true : filtr === "aktivni" ? AKTIVNI_STAVY_POPTAVKY.includes(p.stav) : p.stav === filtr))
      .filter((p) => {
        if (!q) return true;
        return [p.zakaznik, p.text, p.cislo, p.telefon, p.email, p.zakaznikIdentifikace].some((v) => (v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => ((a.created_at || a.vytvoreno || "") < (b.created_at || b.vytvoreno || "") ? 1 : -1));
  }, [poptavky, hledat, filtr]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: C.inkSoft }} />
          <TextInput value={hledat} onChange={(e) => setHledat(e.target.value)} placeholder="Hledat zákazníka, text, telefon…" style={{ paddingLeft: 32 }} />
        </div>
        <Select value={filtr} onChange={(e) => setFiltr(e.target.value)} style={{ width: 190 }}>
          <option value="aktivni">K vyřízení</option>
          <option value="vse">Všechny poptávky</option>
          {STAVY_POPTAVKY.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button variant="rust" onClick={onNova}>
          <Plus size={15} /> Nová poptávka
        </Button>
      </div>

      {!nacteno ? (
        <div style={{ textAlign: "center", padding: 40, color: C.inkSoft, fontSize: 14 }}>
          Poptávky se nepodařilo načíst. Pokud jde o první spuštění, je potřeba v Supabase jednou spustit skript
          <span style={{ fontFamily: FONTS.mono }}> supabase/poptavky.sql</span> (návod v README).
        </div>
      ) : zobrazene.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.inkSoft }}>
          {filtr === "aktivni" && !hledat ? "Žádné poptávky k vyřízení. Novou založíš tlačítkem výše." : "Žádné poptávky neodpovídají filtru."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {zobrazene.map((p) => (
            <div
              key={p.id}
              onClick={() => onOpen(p)}
              style={{
                background: C.surface,
                border: `1px solid ${C.line}`,
                borderLeft: p.stav === "nova" ? `4px solid ${C.danger}` : "4px solid transparent",
                borderRadius: 8,
                padding: "14px 16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.inkSoft }}>{p.cislo}</span>
                  <StavPoptavkyBadge stav={p.stav} small />
                  {p.zakazkaCislo && (
                    <span style={{ fontSize: 11, color: C.moss, fontFamily: FONTS.mono, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <ArrowRight size={11} /> {p.zakazkaCislo}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{p.zakaznik}</div>
                <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.text}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, fontSize: 12, color: C.inkSoft }}>
                <div>{fmtDate(p.vytvoreno)}</div>
                {p.pozadovanyTermin && <div>do {fmtDate(p.pozadovanyTermin)}</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2, fontFamily: FONTS.mono }}>
                  {(p.fotky || []).length > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Camera size={12} /> {p.fotky.length}
                    </span>
                  )}
                  {(p.poznamky || []).length > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <MessageSquare size={12} /> {p.poznamky.length}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} color={C.inkSoft} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
