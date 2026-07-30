"use client";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { C, FONTS, MATERIAL_UNITS, fmtMoney } from "@/lib/theme";
import { TextInput, AutoCompleteTextInput, Select, MiniLabel, iconBtnStyle } from "./ui";

export default function MaterialRow({ item, history, onChange, onRemove }) {
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestions = useMemo(() => {
    const q = (item.nazev || "").trim().toLowerCase();
    if (!q) return [];
    return history.filter((h) => h.nazev.toLowerCase().includes(q)).slice(0, 6);
  }, [item.nazev, history]);

  // Všichni dodavatelé, co se kdy u jakéhokoliv materiálu uložili — dodavatel se tak
  // dá doplnit i u úplně nového materiálu, ne jen když se shoduje i jeho název.
  const dodavateleNavrhy = useMemo(() => {
    const unikatni = new Set();
    (history || []).forEach((h) => {
      if (h.dodavatel && h.dodavatel.trim()) unikatni.add(h.dodavatel.trim());
    });
    return Array.from(unikatni);
  }, [history]);

  const pick = (h) => {
    onChange({ ...item, nazev: h.nazev, dodavatel: h.dodavatel || "", cena: h.cena, jednotka: h.jednotka || "kg", vaha: h.vaha, plocha: h.plocha });
    setShowSuggest(false);
  };

  const mnozstvi = Number(item.mnozstvi) || 0;
  const celkemCena = (Number(item.cena) || 0) * mnozstvi;
  const celkemVaha = (Number(item.vaha) || 0) * mnozstvi;
  const celkemPlocha = (Number(item.plocha) || 0) * mnozstvi;

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, marginBottom: 8, background: C.paper }}>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <MiniLabel>Název materiálu</MiniLabel>
        <TextInput
          value={item.nazev}
          onChange={(e) => {
            onChange({ ...item, nazev: e.target.value });
            setShowSuggest(true);
          }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
        />
        {showSuggest && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: C.surface,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              marginTop: 2,
              zIndex: 10,
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              maxHeight: 180,
              overflowY: "auto",
            }}
          >
            {suggestions.map((h, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => pick(h)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "none",
                  border: "none",
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${C.line}` : "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600 }}>{h.nazev}</div>
                <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono }}>
                  {h.dodavatel ? `${h.dodavatel} · ` : ""}
                  {fmtMoney(h.cena)}/{h.jednotka || "kg"} · {h.vaha || 0} kg/j · {h.plocha || 0} m²/j
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <MiniLabel>Dodavatel (nepovinné)</MiniLabel>
      <AutoCompleteTextInput
        value={item.dodavatel || ""}
        onChange={(e) => onChange({ ...item, dodavatel: e.target.value })}
        navrhy={dodavateleNavrhy}
        style={{ marginBottom: 6 }}
      />

      <div className="material-grid-3">
        <div>
          <MiniLabel>Cena/jednotku</MiniLabel>
          <TextInput type="number" value={item.cena} onChange={(e) => onChange({ ...item, cena: e.target.value })} />
        </div>
        <div>
          <MiniLabel>Jednotka</MiniLabel>
          <Select value={item.jednotka || "kg"} onChange={(e) => onChange({ ...item, jednotka: e.target.value })}>
            {MATERIAL_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <MiniLabel>Množství</MiniLabel>
          <TextInput type="number" value={item.mnozstvi} onChange={(e) => onChange({ ...item, mnozstvi: e.target.value })} />
        </div>
      </div>
      <div className="material-grid-3b" style={{ marginTop: 6 }}>
        <div>
          <MiniLabel>Váha kg/jednotku</MiniLabel>
          <TextInput type="number" value={item.vaha} onChange={(e) => onChange({ ...item, vaha: e.target.value })} />
        </div>
        <div>
          <MiniLabel>Plocha m²/jednotku</MiniLabel>
          <TextInput type="number" value={item.plocha} onChange={(e) => onChange({ ...item, plocha: e.target.value })} />
        </div>
        <button onClick={onRemove} type="button" style={{ ...iconBtnStyle, alignSelf: "end", color: C.danger }}>
          <Trash2 size={16} />
        </button>
      </div>
      <div style={{ textAlign: "right", fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft, marginTop: 6 }}>
        Celkem: {fmtMoney(celkemCena)} · {celkemVaha} kg · {celkemPlocha} m²
      </div>
    </div>
  );
}
