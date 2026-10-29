"use client";
import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { C, FONTS, uid, fmtDate, fmtMoney, fmtCislo, seznamMaterialuKObjednani } from "@/lib/theme";
import { Button, TextInput } from "./ui";

// Checklist objednání materiálu v detailu zakázky. Každé odškrtnutí se ukládá hned
// (přes onZmena, která čte aktuální stav z databáze — dva lidé si nic nepřepíšou).
export default function MaterialChecklist({ order, nastaveni, mujEmail, onZmena }) {
  const radky = seznamMaterialuKObjednani(order, nastaveni);
  const [pridavam, setPridavam] = useState(false);
  const [novy, setNovy] = useState({ nazev: "", mnozstvi: "", jednotka: "ks" });
  const [ukladam, setUkladam] = useState(null);
  const [chyba, setChyba] = useState("");
  // Zaškrtnutí se ukáže hned (i na pomalém mobilním připojení), uloží se na pozadí;
  // když uložení selže, vrátí se zpět.
  const [hned, setHned] = useState({});

  const popisMnozstvi = (r) => (r.popisMnozstvi ? r.popisMnozstvi : r.mnozstvi ? `${fmtCislo(r.mnozstvi)} ${r.jednotka || ""}`.trim() : "");
  const jeObjednano = (r) => (r.klic in hned ? hned[r.klic] : !!(r.stav && r.stav.objednano));
  const kObjednani = radky.filter((r) => r.zdroj !== "mimoKalkulaci");
  const hotovo = kObjednani.filter(jeObjednano).length;

  const ulozit = async (klic, zmena, okamzite) => {
    setUkladam(klic);
    setChyba("");
    if (okamzite) setHned((h) => ({ ...h, ...okamzite }));
    try {
      await onZmena(order, zmena);
    } catch (e) {
      setChyba(
        /materialChecklist/.test(e?.message || "")
          ? "Checklist zatím nejde uložit — v Supabase je potřeba jednou spustit supabase/material-checklist.sql."
          : "Uložení se nepovedlo, zkus to znovu."
      );
    }
    if (okamzite) setHned((h) => {
      const dalsi = { ...h };
      Object.keys(okamzite).forEach((k) => delete dalsi[k]);
      return dalsi;
    });
    setUkladam(null);
  };

  const prepnout = (r) => {
    const objednat = !jeObjednano(r);
    ulozit(r.klic, (ch) => {
      const stav = { ...(ch.stav || {}) };
      if (objednat) stav[r.klic] = { objednano: true, datum: new Date().toISOString().slice(0, 10), kdo: mujEmail || "", nazev: r.nazev, popisMnozstvi: popisMnozstvi(r) };
      else delete stav[r.klic];
      return { ...ch, stav };
    }, { [r.klic]: objednat });
  };

  const oznacitVse = () =>
    ulozit("vse", (ch) => {
      const stav = { ...(ch.stav || {}) };
      kObjednani.forEach((r) => {
        if (!(stav[r.klic] && stav[r.klic].objednano))
          stav[r.klic] = { objednano: true, datum: new Date().toISOString().slice(0, 10), kdo: mujEmail || "", nazev: r.nazev, popisMnozstvi: popisMnozstvi(r) };
      });
      return { ...ch, stav };
    });

  const pridatRucni = () => {
    if (!novy.nazev.trim()) return;
    const polozka = { id: uid(), nazev: novy.nazev.trim(), mnozstvi: Number(novy.mnozstvi) || 0, jednotka: novy.jednotka || "" };
    ulozit("novy", (ch) => ({ ...ch, rucni: [...(ch.rucni || []), polozka] })).then(() => {
      setNovy({ nazev: "", mnozstvi: "", jednotka: "ks" });
      setPridavam(false);
    });
  };

  const smazatRucni = (r) => {
    if (!window.confirm(`Odebrat „${r.nazev}“ z checklistu?`)) return;
    ulozit(r.klic, (ch) => {
      const stav = { ...(ch.stav || {}) };
      delete stav[r.klic];
      return { ...ch, stav, rucni: (ch.rucni || []).filter((x) => `rucni|${x.id}` !== r.klic) };
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: kObjednani.length && hotovo === kObjednani.length ? C.moss : C.inkSoft, fontWeight: 600 }}>
          {kObjednani.length === 0
            ? "Zatím žádný materiál k objednání."
            : hotovo === kObjednani.length
              ? `✓ Objednáno vše (${hotovo}/${kObjednani.length})`
              : `Objednáno ${hotovo} z ${kObjednani.length}`}
        </div>
        {kObjednani.length > 0 && hotovo < kObjednani.length && (
          <button type="button" onClick={oznacitVse} disabled={!!ukladam} style={{ background: "none", border: "none", color: C.steel, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            Označit vše jako objednané
          </button>
        )}
      </div>

      {radky.length > 0 && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
          {radky.map((r, i) => {
            const objednano = jeObjednano(r);
            return (
              <div
                key={r.klic}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "9px 12px",
                  borderTop: i ? `1px solid ${C.line}` : "none",
                  background: objednano ? "#EEF5EF" : C.surface,
                }}
              >
                <input
                  type="checkbox"
                  checked={objednano}
                  disabled={ukladam === "vse"}
                  onChange={() => prepnout(r)}
                  style={{ width: 20, height: 20, marginTop: 1, cursor: "pointer", flexShrink: 0 }}
                  aria-label={`Objednáno: ${r.nazev}`}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, textDecoration: objednano ? "line-through" : "none", color: objednano ? C.inkSoft : C.ink }}>
                    {r.nazev}
                    {r.dodavatel ? <span style={{ color: C.inkSoft }}> · {r.dodavatel}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft }}>
                    {popisMnozstvi(r)}
                    {r.cena ? ` · ${fmtMoney(r.cena)}` : ""}
                    {r.zdroj === "rucni" && " · přidáno ručně"}
                    {r.zdroj === "mimoKalkulaci" && <span style={{ color: C.rust }}> · už není v kalkulaci</span>}
                  </div>
                  {objednano && r.stav && (
                    <div style={{ fontSize: 11, color: C.moss, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={12} /> objednáno {fmtDate(r.stav.datum)}
                      {r.stav.kdo ? ` · ${r.stav.kdo}` : ""}
                    </div>
                  )}
                </div>
                {r.zdroj === "rucni" && (
                  <button type="button" onClick={() => smazatRucni(r)} title="Odebrat" style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", padding: 2 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pridavam ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <TextInput value={novy.nazev} onChange={(e) => setNovy((n) => ({ ...n, nazev: e.target.value }))} placeholder="Např. chemické kotvy" style={{ flex: "2 1 160px" }} autoFocus />
          <TextInput type="number" min="0" value={novy.mnozstvi} onChange={(e) => setNovy((n) => ({ ...n, mnozstvi: e.target.value }))} placeholder="Množství" style={{ flex: "1 1 70px" }} />
          <TextInput value={novy.jednotka} onChange={(e) => setNovy((n) => ({ ...n, jednotka: e.target.value }))} placeholder="ks" style={{ flex: "0 1 60px" }} />
          <Button variant="primary" type="button" onClick={pridatRucni} disabled={!novy.nazev.trim() || ukladam === "novy"}>
            Přidat
          </Button>
          <Button variant="ghost" type="button" onClick={() => setPridavam(false)}>
            Zrušit
          </Button>
        </div>
      ) : (
        <Button variant="ghost" type="button" onClick={() => setPridavam(true)} style={{ marginBottom: 10 }}>
          <Plus size={14} /> Přidat položku mimo kalkulaci
        </Button>
      )}
      {chyba && <div style={{ color: C.danger, fontSize: 12, marginBottom: 8 }}>{chyba}</div>}
      <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.body }}>
        Seznam se skládá z materiálu v kalkulaci (stejný materiál z více položek se sečte), zinkování a lakování. Když je objednáno vše, zakázka se v seznamu označí „Materiál ✓“.
      </div>
    </div>
  );
}
