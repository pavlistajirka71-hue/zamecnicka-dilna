"use client";
import { useMemo, useState } from "react";
import { C, FONTS } from "@/lib/theme";
import { hledatOdberatele } from "@/lib/odberatele";
import { TextInput } from "./ui";

// Pole "Zákazník" s našeptávačem z databáze odběratelů. Píše se normálně; když
// napsaný text odpovídá někomu z databáze (jméno, část jména, IČO, telefon, e-mail),
// ukáže se nabídka. Výběrem se doplní i IČO, adresa, telefon a e-mail.
// Ovládání i klávesnicí: šipky nahoru/dolů, Enter vybere, Esc zavře.
export default function ZakaznikNaseptavac({ value, onChange, seznam, onVyber, autoFocus }) {
  const [otevreno, setOtevreno] = useState(false);
  const [aktivni, setAktivni] = useState(0);
  const navrhy = useMemo(() => hledatOdberatele(seznam || [], value), [seznam, value]);
  // Neukazovat nabídku, když je v poli přesně vybraný zákazník a nic jiného nesedí
  const viditelne = otevreno && navrhy.length > 0 && !(navrhy.length === 1 && navrhy[0].nazev === value);

  const vybrat = (o) => {
    onVyber(o);
    setOtevreno(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <TextInput
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOtevreno(true);
          setAktivni(0);
        }}
        onFocus={() => setOtevreno(true)}
        onBlur={() => setTimeout(() => setOtevreno(false), 150)}
        onKeyDown={(e) => {
          if (!viditelne) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAktivni((a) => Math.min(a + 1, navrhy.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAktivni((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            vybrat(navrhy[aktivni]);
          } else if (e.key === "Escape") {
            e.preventDefault(); // ať Esc nezavře celé okno, jen nabídku
            setOtevreno(false);
          }
        }}
        placeholder="Začni psát jméno nebo firmu…"
      />
      {viditelne && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: -8,
            zIndex: 30,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {navrhy.map((o, i) => (
            <div
              key={o.id}
              onMouseDown={(e) => {
                e.preventDefault();
                vybrat(o);
              }}
              onMouseEnter={() => setAktivni(i)}
              style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${C.line}`, background: i === aktivni ? C.paper : "transparent" }}
            >
              <div style={{ fontWeight: 600 }}>
                {o.nazev}
                {o.pocet > 1 && <span style={{ fontWeight: 400, fontSize: 11, color: C.inkSoft }}> · {o.pocet} {o.pocet < 5 ? "zakázky" : "zakázek"}</span>}
              </div>
              <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {[o.ico && `IČO ${o.ico}`, o.telefon, o.email, (o.zakaznikIdentifikace || "").split("\n")[0]].filter(Boolean).join(" · ") || "bez dalších údajů"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
