// Databáze odběratelů pro našeptávač. Spojuje:
//  1) uložené odběratele (tabulka "odberatele" — upravené nebo skryté záznamy),
//  2) zákazníky ze všech dosavadních zakázek a poptávek (takže našeptávač funguje
//     hned, i bez ručního zakládání),
//  3) katalog organizací z ARES.
// Stejný zákazník se pozná podle IČO, jinak podle jména (bez ohledu na velikost
// písmen a diakritiku). Novější údaje mají přednost, prázdné údaje nic nepřepisují.

export const normJmeno = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function klicOdberatele({ ico, nazev }) {
  const i = String(ico || "").replace(/\D/g, "");
  return i.length === 8 ? `ico:${i}` : `jm:${normJmeno(nazev)}`;
}

const cisteJmeno = (s) => String(s || "").replace(/\s+/g, " ").trim();
const kvalitaJmena = (s) => {
  const t = cisteJmeno(s);
  return (t.match(/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g) || []).length * 2 + (t.match(/[áčďéěíňóřšťúůýž]/gi) || []).length;
};

const POLE = ["nazev", "ico", "zakaznikIdentifikace", "telefon", "email", "poznamka"];
const doplnit = (cil, zdroj) => {
  POLE.forEach((k) => {
    if (!cil[k] && zdroj[k]) cil[k] = zdroj[k];
  });
};

export function sestavitSeznamOdberatelu({ odberatele = [], organizace = [], orders = [], poptavky = [] }) {
  const mapa = new Map();
  const pridat = (zaznam, zdroj, cas) => {
    if (!zaznam.nazev || !String(zaznam.nazev).trim()) return;
    const id = klicOdberatele(zaznam);
    const ex = mapa.get(id);
    if (!ex) {
      mapa.set(id, { id, ...Object.fromEntries(POLE.map((k) => [k, zaznam[k] || ""])), nazev: cisteJmeno(zaznam.nazev), zdroj, cas: cas || "", pocet: zdroj === "zakazka" ? 1 : 0 });
    } else {
      if (zdroj === "zakazka") ex.pocet += 1;
      // U stejného zákazníka zapsaného různě ("jan novak" / "Jan Novák") se ukáže
      // pečlivěji napsaná podoba — s velkými písmeny a diakritikou.
      if (ex.zdroj !== "databaze" && kvalitaJmena(zaznam.nazev) > kvalitaJmena(ex.nazev)) ex.nazev = cisteJmeno(zaznam.nazev);
      doplnit(ex, zaznam);
      if (cas && cas > ex.cas) ex.cas = cas;
    }
  };
  // 1) uložení odběratelé mají přednost (jejich údaje se nepřepisují)
  const skryte = new Set();
  odberatele.forEach((o) => {
    if (o.skryto) {
      skryte.add(o.id);
      return;
    }
    mapa.set(o.id, { ...Object.fromEntries(POLE.map((k) => [k, o[k] || ""])), id: o.id, zdroj: "databaze", cas: o.posledniPouziti || "", pocet: 0 });
  });
  // 2) zakázky a poptávky — od nejnovějších, ať mají přednost aktuální kontakty
  const zZakazek = [...orders]
    .filter((o) => !o.nadrazenaZakazkaId)
    .sort((a, b) => ((a.vytvoreno || "") < (b.vytvoreno || "") ? 1 : -1));
  zZakazek.forEach((o) => pridat(odberatelZFormulare(o), "zakazka", o.vytvoreno));
  [...poptavky].sort((a, b) => ((a.vytvoreno || "") < (b.vytvoreno || "") ? 1 : -1)).forEach((p) => pridat(odberatelZFormulare(p), "poptavka", p.vytvoreno));
  // 3) organizace z ARES
  organizace.forEach((o) =>
    pridat({ nazev: o.nazev, ico: o.ico, zakaznikIdentifikace: o.dic ? `${o.adresa || ""}\nDIČ: ${o.dic}` : o.adresa, telefon: o.telefon, email: o.email }, "ares", o.aktualizovano)
  );
  return Array.from(mapa.values())
    .filter((o) => !skryte.has(o.id))
    .sort((a, b) => normJmeno(a.nazev).localeCompare(normJmeno(b.nazev), "cs"));
}

// Hledání pro našeptávač: jméno (i bez diakritiky, i část slova), IČO, telefon, e-mail
export function hledatOdberatele(seznam, dotaz, max = 8) {
  const q = normJmeno(dotaz);
  if (q.length < 2) return [];
  const cislice = q.replace(/\D/g, "");
  const skore = (o) => {
    const jm = normJmeno(o.nazev);
    if (jm.startsWith(q)) return 0;
    if (jm.split(/[\s,.-]+/).some((slovo) => slovo.startsWith(q))) return 1;
    if (jm.includes(q)) return 2;
    if (cislice.length >= 3 && (String(o.ico || "").includes(cislice) || String(o.telefon || "").replace(/\D/g, "").includes(cislice))) return 3;
    if (q.includes("@") || q.length >= 3) if (String(o.email || "").toLowerCase().includes(q)) return 4;
    return 9;
  };
  return seznam
    .map((o) => ({ o, s: skore(o) }))
    .filter((x) => x.s < 9)
    .sort((a, b) => a.s - b.s || b.o.pocet - a.o.pocet)
    .slice(0, max)
    .map((x) => x.o);
}

// Odběratel z vyplněného formuláře zakázky / poptávky
export function odberatelZFormulare(f) {
  return {
    nazev: String(f.zakaznik || f.nazev || "").trim(),
    ico: String(f.ico || "").replace(/\D/g, "").slice(0, 8),
    zakaznikIdentifikace: String(f.zakaznikIdentifikace || "").trim(),
    telefon: String(f.telefon || "").trim(),
    email: String(f.email || "").trim(),
  };
}
