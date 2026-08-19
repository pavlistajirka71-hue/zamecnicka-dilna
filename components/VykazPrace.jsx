"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { C, FONTS, todayISO, fmtDate, vsechnyZaznamyPrace, soucetHodinPodleTypu, seskupitPraciPodleZakazky, tydenniDny } from "@/lib/theme";
import { Button } from "./ui";

const NAZVY_MESICU = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
const DNY_TYDNE = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export default function VykazPrace({ orders, onOpenOrder, initialDen }) {
  const dnes = todayISO();
  // Aplikace umí aplikaci otevřít rovnou na konkrétním dni (aplikace to používá, když se
  // sem aplikace dostane kliknutím na odznak odpracovaných hodin v kalendáři) —
  // jinak aplikace jako dřív začíná na dnešku, bez vybraného konkrétního dne.
  const pocatecniDen = initialDen || dnes;
  const [rok, setRok] = useState(Number(pocatecniDen.slice(0, 4)));
  const [mesicIndex, setMesicIndex] = useState(Number(pocatecniDen.slice(5, 7)) - 1);
  const [kotva, setKotva] = useState(pocatecniDen); // den, kolem kterého se ukazuje týdenní pruh
  const [vybranyDen, setVybranyDen] = useState(initialDen || null); // null = ukazují se zakázky za celý měsíc
  const [rozbaleneId, setRozbaleneId] = useState(null);

  const vsechnyZaznamy = useMemo(() => vsechnyZaznamyPrace(orders), [orders]);

  const mesicPrefix = `${rok}-${String(mesicIndex + 1).padStart(2, "0")}`;
  const zaznamyMesic = useMemo(() => vsechnyZaznamy.filter((z) => z.entry.datum.startsWith(mesicPrefix)), [vsechnyZaznamy, mesicPrefix]);

  const dilnaCelkem = useMemo(() => soucetHodinPodleTypu(zaznamyMesic, "dilna"), [zaznamyMesic]);
  const montazCelkem = useMemo(() => soucetHodinPodleTypu(zaznamyMesic, "montaz"), [zaznamyMesic]);

  const dnyTydne = useMemo(() => tydenniDny(kotva), [kotva]);
  const hodinyPodleDne = useMemo(() => {
    const mapa = new Map();
    vsechnyZaznamy.forEach((z) => {
      mapa.set(z.entry.datum, (mapa.get(z.entry.datum) || 0) + (Number(z.entry.hodiny) || 0));
    });
    return mapa;
  }, [vsechnyZaznamy]);

  const zaznamyProZakazky = vybranyDen ? vsechnyZaznamy.filter((z) => z.entry.datum === vybranyDen) : zaznamyMesic;
  const podleZakazky = useMemo(() => seskupitPraciPodleZakazky(zaznamyProZakazky), [zaznamyProZakazky]);

  const jitMesic = (delta) => {
    let m = mesicIndex + delta;
    let r = rok;
    if (m < 0) {
      m = 11;
      r -= 1;
    } else if (m > 11) {
      m = 0;
      r += 1;
    }
    setMesicIndex(m);
    setRok(r);

    // Aplikace zachová STEJNÉ číslo dne (např. 17.), na které byl uživatel
    // zaostřený — ať už přes konkrétně vybraný den, nebo jen přes polohu
    // týdenního pruhu — a jen ho přenese do nově zvoleného měsíce (zaokrouhleno
    // dolů, pokud by ten den v novém měsíci vůbec neexistoval, např. 31. → 30.).
    // Aplikace tak po přepnutí měsíce neskáče vždycky na 1. den.
    const aktualniDen = vybranyDen || kotva;
    const [, , dOrigStr] = aktualniDen.split("-");
    const dOrig = Number(dOrigStr);
    const posledniDenNovehoMesice = new Date(r, m + 1, 0).getDate();
    const novyDen = Math.min(dOrig, posledniDenNovehoMesice);
    const novaKotva = `${r}-${String(m + 1).padStart(2, "0")}-${String(novyDen).padStart(2, "0")}`;
    setKotva(novaKotva);
    // Pokud aplikace měla vybraný konkrétní den (ne celý měsíc), zůstane vybraný
    // konkrétní den i po přepnutí — aplikace tak rovnou ukáže práci na stejném
    // datu v novém měsíci, přesně jak aplikace má.
    setVybranyDen(vybranyDen ? novaKotva : null);
    // Aplikace dřív při přepnutí měsíce nahoře zapomínala posunout i týdenní pruh
    // dole (ten se řídí samostatnou "kotvou") — pruh pak zůstával viset na
    // původním týdnu, i když čísla nahoře už ukazovala jiný měsíc. Aplikace teď
    // to synchronizuje s výpočtem výše.
  };

  const jitTyden = (delta) => {
    const [r, m, d] = kotva.split("-").map(Number);
    const dt = new Date(r, m - 1, d + delta * 7);
    const novaKotva = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    setKotva(novaKotva);
    // Pruh se může přesunout i do jiného měsíce — aplikace nahoře pak ukazuje ten,
    // ve kterém je většina zobrazeného týdne (poslední den pruhu).
    setRok(Number(novaKotva.slice(0, 4)));
    setMesicIndex(Number(novaKotva.slice(5, 7)) - 1);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {NAZVY_MESICU[mesicIndex]} {rok}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => jitMesic(-1)} style={navBtnStyle}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => jitMesic(1)} style={navBtnStyle}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Sumace celkových hodin */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 12, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Dílna celkem
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 36, fontWeight: 700, color: C.steel, lineHeight: 1 }}>{dilnaCelkem} h</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 12, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Montáž celkem
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 36, fontWeight: 700, color: C.brass, lineHeight: 1 }}>{montazCelkem} h</div>
        </div>
      </div>

      {/* Denní kalendář (týdenní pruh) */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 8px", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={() => jitTyden(-1)} style={{ ...navBtnStyle, border: "none" }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1, textAlign: "center" }}>
            {dnyTydne.map((den, i) => {
              const cislo = Number(den.slice(8, 10));
              const hodiny = hodinyPodleDne.get(den) || 0;
              const jeVybrany = vybranyDen === den;
              const jeDnes = den === dnes;
              return (
                <button
                  key={den}
                  onClick={() => setVybranyDen(jeVybrany ? null : den)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}
                >
                  <div style={{ fontSize: 10, color: C.inkSoft, fontFamily: FONTS.display, textTransform: "uppercase" }}>{DNY_TYDNE[i]}</div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      margin: "3px auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: jeVybrany ? C.steel : "transparent",
                      border: jeDnes && !jeVybrany ? `1.5px solid ${C.steel}` : "none",
                      color: jeVybrany ? "#fff" : C.ink,
                      fontFamily: FONTS.display,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {cislo}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: hodiny > 0 ? 12 : 10,
                      color: jeVybrany ? C.steel : hodiny > 0 ? C.rust : C.line,
                      fontWeight: hodiny > 0 ? 700 : 400,
                    }}
                  >
                    {hodiny > 0 ? `${hodiny}h` : "–"}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => jitTyden(1)} style={{ ...navBtnStyle, border: "none" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Nadpis + filtr podle dne */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 12, color: C.inkSoft, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Zakázky {vybranyDen ? `— ${fmtDate(vybranyDen)}` : `— ${NAZVY_MESICU[mesicIndex].toLowerCase()}`}
        </div>
        {vybranyDen && (
          <button
            onClick={() => setVybranyDen(null)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.steel, cursor: "pointer", fontSize: 12, fontFamily: FONTS.display, textTransform: "uppercase" }}
          >
            Zobrazit celý měsíc <X size={12} />
          </button>
        )}
      </div>

      {/* Seznam zakázek */}
      {podleZakazky.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkSoft, padding: "10px 0" }}>
          {vybranyDen ? "Tenhle den nemá zapsanou žádnou práci." : "Tenhle měsíc nemá zapsanou žádnou práci."}
        </div>
      ) : (
        podleZakazky.map((g) => {
          const rozbaleno = rozbaleneId === g.order.id;
          return (
            <div key={g.order.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
              <button
                onClick={() => setRozbaleneId(rozbaleno ? null : g.order.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.inkSoft }}>{g.order.cislo}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{g.order.zakaznik}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 20, fontWeight: 700, color: C.steel }}>{g.celkem} h</div>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>
                    {rozbaleno ? "▴ sbalit" : `Dílna ${g.dilna}h · Montáž ${g.montaz}h`}
                  </div>
                </div>
              </button>

              {rozbaleno && (
                <div style={{ padding: "0 14px 14px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, background: C.paper, borderRadius: 6, padding: "6px 0", textAlign: "center" }}>
                      <div style={{ fontFamily: FONTS.display, fontSize: 9, color: C.inkSoft, textTransform: "uppercase" }}>Dílna</div>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: 600 }}>{g.dilna} h</div>
                    </div>
                    <div style={{ flex: 1, background: C.paper, borderRadius: 6, padding: "6px 0", textAlign: "center" }}>
                      <div style={{ fontFamily: FONTS.display, fontSize: 9, color: C.inkSoft, textTransform: "uppercase" }}>Montáž</div>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: 600 }}>{g.montaz} h</div>
                    </div>
                  </div>

                  {g.zaznamy.map((entry) => (
                    <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 12 }}>
                      <div>
                        <span style={{ fontFamily: FONTS.mono, color: C.inkSoft }}>{fmtDate(entry.datum)}</span>
                        {"  ·  "}
                        <span
                          style={{
                            fontFamily: FONTS.display,
                            textTransform: "uppercase",
                            fontSize: 10,
                            color: (entry.typ || "dilna") === "dilna" ? C.steel : C.brass,
                          }}
                        >
                          {(entry.typ || "dilna") === "dilna" ? "Dílna" : "Montáž"}
                        </span>
                        {entry.popis && <div style={{ color: C.inkSoft, marginTop: 1 }}>{entry.popis}</div>}
                        {entry.pracovnik && <div style={{ color: C.inkSoft, fontSize: 11 }}>{entry.pracovnik}</div>}
                      </div>
                      <span style={{ fontFamily: FONTS.mono, fontWeight: 600, flexShrink: 0, paddingLeft: 8 }}>{entry.hodiny} h</span>
                    </div>
                  ))}

                  <div style={{ marginTop: 10 }}>
                    <Button variant="ghost" onClick={() => onOpenOrder(g.order)}>
                      Otevřít detail zakázky
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Souhrn dole */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "14px 16px", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8 }}>
        <span style={{ fontFamily: FONTS.display, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em" }}>Tento měsíc celkem</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 24, fontWeight: 700, color: C.ink }}>{dilnaCelkem + montazCelkem} h</span>
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
