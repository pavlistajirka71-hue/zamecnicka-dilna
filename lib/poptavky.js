import { C, uid, todayISO, fmtDate } from "./theme";

// Poptávky ZÁKAZNÍKŮ (co po nás zákazník chce) — pozor, neplést s "Poptávkou
// materiálu" v detailu zakázky, což je poptávka materiálu u dodavatelů.

export const STAVY_POPTAVKY = [
  { key: "nova", label: "Nová", color: C.danger },
  { key: "resiSe", label: "Řeší se", color: C.steel },
  { key: "nabidka", label: "Nabídka vytvořena", color: C.moss },
  { key: "odmitnuta", label: "Odmítnutá", color: C.neutral },
];

// Poptávky, se kterými je ještě potřeba něco udělat.
export const AKTIVNI_STAVY_POPTAVKY = ["nova", "resiSe"];

export const ZDROJE_POPTAVKY = ["Telefon", "E-mail", "Osobně", "Web", "Doporučení", "Jiné"];

export function stavPoptavkyInfo(key) {
  return STAVY_POPTAVKY.find((s) => s.key === key) || STAVY_POPTAVKY[0];
}

// Fotky poptávky se na Google Drive ukládají do vlastní podsložky, stejně jako
// u zakázek (nahratFotku bere objekt s cislo + zakaznik).
export function slozkaPoptavky(poptavka) {
  return { cislo: poptavka.cislo || "poptavka", zakaznik: poptavka.zakaznik || "" };
}

export function zalohoveCisloPoptavky(poptavky) {
  const rok = new Date().getFullYear();
  const cisla = (poptavky || [])
    .map((p) => p.cislo)
    .filter((c) => c && c.startsWith(`P-${rok}-`))
    .map((c) => parseInt(c.split("-")[2], 10))
    .filter((n) => !isNaN(n));
  const dalsi = (cisla.length ? Math.max(...cisla) : 0) + 1;
  return `P-${rok}-${String(dalsi).padStart(4, "0")}`;
}

// Předvyplněná zakázka z poptávky. Zakázka vznikne ve stavu "nova" (= Nabídnuto),
// takže v jejím detailu jde rovnou udělat kalkulaci a nabídku jako dosud.
// Fotky se do zakázky jen ODKAZUJÍ (stejná cesta k souboru), nic se nekopíruje
// ani nemaže — poptávka si své fotky ponechá.
export function zakazkaZPoptavky(p) {
  const radkyPoznamek = (p.poznamky || [])
    .slice()
    .reverse()
    .map((n) => `• ${fmtDate(n.datum)}${n.autor ? ` (${n.autor})` : ""}: ${n.text}`);
  const poznamka = [`Z poptávky ${p.cislo}${p.zdroj ? ` (${p.zdroj})` : ""}`, ...radkyPoznamek].join("\n");

  return {
    id: uid(),
    cislo: "",
    zakaznik: p.zakaznik || "",
    zakaznikIdentifikace: p.zakaznikIdentifikace || "",
    ico: p.ico || "",
    telefon: p.telefon || "",
    email: p.email || "",
    popis: p.text || "",
    stav: "nova",
    cena: Number(p.odhadCena) > 0 ? Number(p.odhadCena) : "", // odhad z poptávky; kalkulace ho pak nahradí přesnou cenou
    termin: p.pozadovanyTermin || "",
    terminZahajeni: "",
    vytvoreno: todayISO(),
    poznamka,
    cisloFaktury: "",
    prace: [],
    uctenky: [],
    naklady: [],
    archivy: [],
    fotky: (p.fotky || []).map((f) => ({ id: uid(), datum: f.datum, path: f.path, typ: "poptavka", popis: f.popis || "" })),
    planCasDilna: "",
    planCasMontaz: "",
    nadrazenaZakazkaId: null,
  };
}
