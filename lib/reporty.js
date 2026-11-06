// Data měsíčních reportů — stejné výpočty v aplikaci (tabulka) i na serveru (PDF).

const vMesici = (datum, mesic) => typeof datum === "string" && datum.startsWith(mesic);

// Hodiny práce po zakázkách
export function mesicniPrace(orders, mesic) {
  return (orders || [])
    .map((o) => {
      const entries = (o.prace || []).filter((p) => vMesici(p.datum, mesic));
      if (entries.length === 0) return null;
      const dilna = entries.filter((p) => (p.typ || "dilna") === "dilna").reduce((s, p) => s + (Number(p.hodiny) || 0), 0);
      const montaz = entries.filter((p) => (p.typ || "dilna") === "montaz").reduce((s, p) => s + (Number(p.hodiny) || 0), 0);
      return { id: o.id, cislo: o.cislo, zakaznik: o.zakaznik, dilna, montaz, celkem: dilna + montaz };
    })
    .filter(Boolean)
    .sort((a, b) => b.celkem - a.celkem);
}

// Náklady (jízdy nebo účtenky) za měsíc. Náklad rozpočítaný mezi víc zakázek
// (stejné rozpocetId) se spojí do jednoho řádku s celou částkou a všemi zakázkami.
function mesicniNaklady(orders, mesic, podminka) {
  const skupiny = new Map();
  const radky = [];
  (orders || []).forEach((o) => {
    (o.naklady || []).forEach((n) => {
      if (!vMesici(n.datum, mesic) || !podminka(n)) return;
      const zakazka = { id: o.id, cislo: o.cislo, zakaznik: o.zakaznik };
      if (n.rozpocetId) {
        if (!skupiny.has(n.rozpocetId)) {
          const r = { id: n.rozpocetId, datum: n.datum, popis: n.popis, castka: 0, fotoPath: n.fotoPath || null, zdroj: n.zdroj || "", zakazky: [] };
          skupiny.set(n.rozpocetId, r);
          radky.push(r);
        }
        const r = skupiny.get(n.rozpocetId);
        r.castka += Number(n.castka) || 0;
        r.zakazky.push(zakazka);
        if (!r.fotoPath && n.fotoPath) r.fotoPath = n.fotoPath;
      } else {
        radky.push({ id: n.id || `${o.id}-${radky.length}`, datum: n.datum, popis: n.popis, castka: Number(n.castka) || 0, fotoPath: n.fotoPath || null, zdroj: n.zdroj || "", zakazky: [zakazka] });
      }
    });
  });
  radky.forEach((r) => (r.castka = Math.round(r.castka * 100) / 100));
  return radky.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}

export function mesicniJizdy(orders, mesic) {
  return mesicniNaklady(orders, mesic, (n) => !!n.jeJizda);
}

// Účtenky = ostatní náklady kromě jízd a kromě řádků převzatých z kalkulace
// (ty jsou jen odhad, ne skutečný doklad).
export function mesicniUctenky(orders, mesic) {
  return mesicniNaklady(orders, mesic, (n) => !n.jeJizda && n.zdroj !== "kalkulace");
}

export function popisZakazek(zakazky) {
  return (zakazky || []).map((z) => `${z.cislo}${z.zakaznik ? ` · ${z.zakaznik}` : ""}`).join(", ");
}
