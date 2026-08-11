"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, FONTS, statusInfo, todayISO, hodinyPodleDne } from "@/lib/theme";
import { Button } from "./ui";

const DNY_TYDNE = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const NAZVY_MESICU = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function toDateStr(rok, mesicIndex, den) {
  const m = String(mesicIndex + 1).padStart(2, "0");
  const d = String(den).padStart(2, "0");
  return `${rok}-${m}-${d}`;
}

// Vrací pole 42 dnů (6 týdnů) pro daný měsíc, s pondělím jako prvním dnem týdne —
// obsahuje i dny z předchozího/následujícího měsíce, ať je mřížka vždy celá.
function mesicniMrizka(rok, mesicIndex) {
  const prvniDenMesice = new Date(rok, mesicIndex, 1);
  const jsDenVTydnu = prvniDenMesice.getDay(); // 0 = neděle
  const posunNaPondeli = jsDenVTydnu === 0 ? 6 : jsDenVTydnu - 1;

  const start = new Date(rok, mesicIndex, 1 - posunNaPondeli);
  const dny = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dny.push({
      dateStr: toDateStr(d.getFullYear(), d.getMonth(), d.getDate()),
      den: d.getDate(),
      vAktualnimMesici: d.getMonth() === mesicIndex,
    });
  }
  return dny;
}

export default function Kalendar({ orders, onOpen }) {
  const dnes = todayISO();
  const [rok, setRok] = useState(Number(dnes.slice(0, 4)));
  const [mesicIndex, setMesicIndex] = useState(Number(dnes.slice(5, 7)) - 1);

  const dny = useMemo(() => mesicniMrizka(rok, mesicIndex), [rok, mesicIndex]);

  const zakazkyPodleDne = useMemo(() => {
    const mapa = new Map();
    orders
      .filter((o) => o.termin && o.stav === "probiha")
      .forEach((o) => {
        if (!mapa.has(o.termin)) mapa.set(o.termin, []);
        mapa.get(o.termin).push(o);
      });
    return mapa;
  }, [orders]);

  const hodinyDne = useMemo(() => hodinyPodleDne(orders), [orders]);

  const jit = (delta) => {
    let novyMesic = mesicIndex + delta;
    let novyRok = rok;
    if (novyMesic < 0) {
      novyMesic = 11;
      novyRok -= 1;
    } else if (novyMesic > 11) {
      novyMesic = 0;
      novyRok += 1;
    }
    setMesicIndex(novyMesic);
    setRok(novyRok);
  };

  const jitNaDnes = () => {
    setRok(Number(dnes.slice(0, 4)));
    setMesicIndex(Number(dnes.slice(5, 7)) - 1);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {NAZVY_MESICU[mesicIndex]} {rok}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => jit(-1)} style={{ ...navBtnStyle }}>
            <ChevronLeft size={18} />
          </button>
          <Button variant="ghost" onClick={jitNaDnes}>
            Dnes
          </Button>
          <button onClick={() => jit(1)} style={{ ...navBtnStyle }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DNY_TYDNE.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono, textTransform: "uppercase", padding: "2px 0" }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {dny.map(({ dateStr, den, vAktualnimMesici }) => {
          const zakazkyDne = zakazkyPodleDne.get(dateStr) || [];
          const jeDnes = dateStr === dnes;
          const zobrazene = zakazkyDne.slice(0, 3);
          const zbyva = zakazkyDne.length - zobrazene.length;
          const hodiny = hodinyDne.get(dateStr);
          return (
            <div
              key={dateStr}
              style={{
                minHeight: 92,
                border: `1px solid ${jeDnes ? C.steel : C.line}`,
                borderRadius: 6,
                padding: 4,
                background: vAktualnimMesici ? C.surface : C.paper,
                opacity: vAktualnimMesici ? 1 : 0.5,
              }}
            >
              <div style={{ fontSize: 11, fontFamily: FONTS.mono, color: jeDnes ? C.steel : C.inkSoft, fontWeight: jeDnes ? 700 : 400, marginBottom: 3 }}>
                {den}
              </div>
              {hodiny && (hodiny.dilna > 0 || hodiny.montaz > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 3 }}>
                  {hodiny.dilna > 0 && (
                    <span style={{ fontSize: 10, fontFamily: FONTS.mono, fontWeight: 700, color: "#fff", background: C.steel, borderRadius: 3, padding: "1px 4px" }}>
                      D {hodiny.dilna}h
                    </span>
                  )}
                  {hodiny.montaz > 0 && (
                    <span style={{ fontSize: 10, fontFamily: FONTS.mono, fontWeight: 700, color: "#fff", background: C.brass, borderRadius: 3, padding: "1px 4px" }}>
                      M {hodiny.montaz}h
                    </span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {zobrazene.map((o) => {
                  const s = statusInfo(o.stav);
                  return (
                    <button
                      key={o.id}
                      onClick={() => onOpen(o)}
                      title={`${o.cislo} — ${o.zakaznik}`}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: s.color,
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "3px 6px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.35,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                      }}
                    >
                      {o.zakaznik}
                    </button>
                  );
                })}
                {zbyva > 0 && <div style={{ fontSize: 11, fontWeight: 600, color: C.inkSoft, paddingLeft: 4 }}>+{zbyva} další</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: C.inkSoft }}>
        Barevné štítky = rozpracované zakázky s vyplněným termínem. Číselné štítky (D/M) = odpracované hodiny dílna/montáž ten den, podle výkazu práce.
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: "none",
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  cursor: "pointer",
  color: C.steel,
  padding: 8,
  display: "flex",
  alignItems: "center",
};
