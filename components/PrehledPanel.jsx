"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import {
  C,
  FONTS,
  todayISO,
  fmtMoney,
  obratZaMesic,
  hodnotaRozpracovanych,
  prumernaHodnotaZakazky,
  planVsSkutecnostMarze,
  planVsSkutecnostHodin,
  hodinyPodlePracovnika,
} from "@/lib/theme";
import { Button, SectionLabel } from "./ui";

const NAZVY_MESICU = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function Karta({ label, hodnota, barva }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, textAlign: "center", flex: 1, minWidth: 130 }}>
      <div style={{ fontFamily: FONTS.display, fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 22, fontWeight: 700, color: barva || C.ink }}>{hodnota}</div>
    </div>
  );
}

export default function PrehledPanel({ orders, nastaveni, onOpenOrder }) {
  const dnes = todayISO();
  const [rok, setRok] = useState(Number(dnes.slice(0, 4)));
  const [mesicIndex, setMesicIndex] = useState(Number(dnes.slice(5, 7)) - 1);
  const mesicPrefix = `${rok}-${String(mesicIndex + 1).padStart(2, "0")}`;

  const jit = (delta) => {
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
  };

  const obrat = useMemo(() => obratZaMesic(orders, mesicPrefix), [orders, mesicPrefix]);
  const rozpracovano = useMemo(() => hodnotaRozpracovanych(orders), [orders]);
  const prumer = useMemo(() => prumernaHodnotaZakazky(orders, mesicPrefix), [orders, mesicPrefix]);
  const marzeSrovnani = useMemo(() => planVsSkutecnostMarze(orders, nastaveni, mesicPrefix), [orders, nastaveni, mesicPrefix]);
  const hodinySrovnani = useMemo(() => planVsSkutecnostHodin(orders, 20), [orders]);
  const pracovniciHodiny = useMemo(() => hodinyPodlePracovnika(orders, mesicPrefix), [orders, mesicPrefix]);

  const dilnaCelkem = pracovniciHodiny.reduce((s, p) => s + p.dilna, 0);
  const montazCelkem = pracovniciHodiny.reduce((s, p) => s + p.montaz, 0);
  const nejvicHodin = Math.max(1, ...pracovniciHodiny.map((p) => p.celkem));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {NAZVY_MESICU[mesicIndex]} {rok}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => jit(-1)} style={navBtnStyle}>
            <ChevronLeft size={18} />
          </button>
          <Button
            variant="ghost"
            onClick={() => {
              setRok(Number(dnes.slice(0, 4)));
              setMesicIndex(Number(dnes.slice(5, 7)) - 1);
            }}
          >
            Dnes
          </Button>
          <button onClick={() => jit(1)} style={navBtnStyle}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <SectionLabel>Peníze a marže</SectionLabel>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Karta label="Obrat za měsíc" hodnota={fmtMoney(obrat)} />
        <Karta label="Rozpracované zakázky" hodnota={fmtMoney(rozpracovano)} barva={C.brass} />
        <Karta label="Průměrná zakázka" hodnota={fmtMoney(prumer)} />
      </div>

      {marzeSrovnani.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Plánovaná marže (z kalkulace) vs. skutečná (podle odpracovaných hodin a nákladů):</div>
          {marzeSrovnani.map(({ order, planovanaMarzeKc, planovanaMarzePct, skutecnaMarzeKc, skutecnaMarzePct }) => {
            const horsi = skutecnaMarzeKc < planovanaMarzeKc;
            return (
              <button
                key={order.id}
                onClick={() => onOpenOrder && onOpenOrder(order)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 6,
                  cursor: onOpenOrder ? "pointer" : "default",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.inkSoft }}>{order.cislo}</div>
                  <div style={{ fontSize: 13 }}>{order.zakaznik}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12 }}>
                  <div style={{ color: C.inkSoft }}>
                    plán <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(planovanaMarzeKc)}</span> ({planovanaMarzePct.toFixed(0)} %)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", color: horsi ? C.danger : C.moss, fontWeight: 700 }}>
                    {horsi ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    skutečnost <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(skutecnaMarzeKc)}</span> ({skutecnaMarzePct.toFixed(0)} %)
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 24 }}>Tenhle měsíc nemá žádnou zakázku s kalkulací — nemá appka co srovnávat.</div>
      )}

      <SectionLabel>Vytíženost dílny</SectionLabel>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <Karta label="Dílna celkem" hodnota={`${dilnaCelkem} h`} barva={C.steel} />
        <Karta label="Montáž celkem" hodnota={`${montazCelkem} h`} barva={C.brass} />
      </div>

      {pracovniciHodiny.length > 0 ? (
        <div>
          {pracovniciHodiny.map((p) => (
            <div key={p.pracovnik} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                <span>{p.pracovnik}</span>
                <span style={{ fontFamily: FONTS.mono, color: C.inkSoft }}>
                  D {p.dilna}h · M {p.montaz}h
                </span>
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: C.paper }}>
                <div style={{ width: `${(p.dilna / nejvicHodin) * 100}%`, background: C.steel }} />
                <div style={{ width: `${(p.montaz / nejvicHodin) * 100}%`, background: C.brass }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: C.inkSoft }}>Tenhle měsíc nemá zapsanou žádnou práci.</div>
      )}

      <SectionLabel>Plán vs. skutečnost hodin (posledních {hodinySrovnani.length} dokončených zakázek)</SectionLabel>
      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: -4, marginBottom: 10 }}>
        Appka nesleduje samostatně, kdy byla zakázka reálně dokončená, jen kdy vznikla — tahle sekce se proto neváže na měsíc nahoře, ale vždycky ukazuje
        posledních 20 hotových/fakturovaných zakázek.
      </div>
      {hodinySrovnani.length > 0 ? (
        <div>
          {hodinySrovnani.map(({ order, plan, skutecnost, rozdil }) => {
            const horsi = rozdil > 0; // odpracováno víc, než se plánovalo
            return (
              <button
                key={order.id}
                onClick={() => onOpenOrder && onOpenOrder(order)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 6,
                  cursor: onOpenOrder ? "pointer" : "default",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.inkSoft }}>{order.cislo}</div>
                  <div style={{ fontSize: 13 }}>{order.zakaznik}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12 }}>
                  <div style={{ color: C.inkSoft }}>
                    plán <span style={{ fontFamily: FONTS.mono }}>{plan} h</span> · skutečnost <span style={{ fontFamily: FONTS.mono }}>{skutecnost} h</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", color: horsi ? C.danger : C.moss, fontWeight: 700 }}>
                    {horsi ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {rozdil > 0 ? "+" : ""}
                    {rozdil} h
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: C.inkSoft }}>Zatím žádná hotová ani fakturovaná zakázka.</div>
      )}
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
