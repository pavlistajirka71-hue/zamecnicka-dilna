export const C = {
  paper: "#EDEAE2",
  surface: "#FFFFFF",
  ink: "#21231F",
  inkSoft: "#5B5A52",
  steel: "#34506B",
  steelDark: "#243A4E",
  rust: "#C6541A",
  brass: "#A9842B",
  moss: "#3F6B4A",
  mossDark: "#2F5233",
  line: "#D9D4C7",
  danger: "#B33A3A",
};

export const FONTS = {
  display: "'Oswald', sans-serif",
  body: "'IBM Plex Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const STATUSES = [
  { key: "nova", label: "Nabídnuto", color: C.steel },
  { key: "probiha", label: "Rozpracováno", color: C.rust },
  { key: "hotovo", label: "Hotovo", color: C.moss },
  { key: "fakturovano", label: "Fakturováno", color: C.brass },
  { key: "neuspesnaNabidka", label: "Neúspěšná nabídka", color: C.danger },
];

// Statuses beyond this point are locked: no more work-log entries or receipts can be added
export const UZAVRENE_STAVY = ["hotovo", "fakturovano", "neuspesnaNabidka"];

export const MATERIAL_UNITS = ["kg", "m", "m2", "ks", "l", "bal"];

export const DPH_SAZBA = 0.21;

export const DEFAULT_NASTAVENI = {
  sazbaDilna: 550,
  sazbaMontaz: 650,
  cenaZinkovani: 23,
  cenaLakovani: 900,
  zaokrouhleniNa: 10,
  firmaNazev: "",
  firmaAdresa: "",
  firmaIco: "",
  firmaDic: "",
};

export function statusInfo(key) {
  return STATUSES.find((s) => s.key === key) || STATUSES[0];
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("cs-CZ", { maximumFractionDigits: 0 }) + " Kč";
}

export function isOverdue(order) {
  return !!(
    order.termin &&
    !UZAVRENE_STAVY.includes(order.stav) &&
    new Date(order.termin) < new Date(todayISO())
  );
}

export function planHodin(order) {
  return (Number(order.planCasDilna) || 0) + (Number(order.planCasMontaz) || 0);
}

export function sumHodin(prace, typ) {
  return (prace || [])
    .filter((p) => !typ || (p.typ || "dilna") === typ)
    .reduce((s, p) => s + (Number(p.hodiny) || 0), 0);
}

export function novyProtokol(order, nastaveni) {
  return {
    token: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : uid() + uid(),
    cislo: order.cislo,
    zakaznik: order.zakaznik,
    zakaznikIdentifikace: order.zakaznikIdentifikace || "",
    popisDila: order.popis || "",
    vyhrady: "",
    datumPredani: todayISO(),
    zhotovitel: {
      nazev: nastaveni.firmaNazev || "",
      adresa: nastaveni.firmaAdresa || "",
      ico: nastaveni.firmaIco || "",
      dic: nastaveni.firmaDic || "",
    },
    podpisPath: null,
    podpisDatum: null,
    stav: "rozpracovany",
  };
}

// Jednorázově vytvoří výchozí řádky nákladů z materiálu a aktivních kooperací v kalkulaci.
// Používá se jen při prvním otevření sledování nákladů — dál se řádky upravují nezávisle.
export function seedNakladyZKalkulace(polozky, nastaveni) {
  const radky = [];
  (polozky || []).forEach((p) => {
    const nazevPolozky = p.nazev || "Položka";
    const pocetKs = Math.max(1, Number(p.pocetKs) || 1);
    (p.materialy || []).forEach((m) => {
      if (!m.nazev) return;
      const castka = (Number(m.cena) || 0) * (Number(m.mnozstvi) || 0) * pocetKs;
      radky.push({ id: uid(), popis: `${m.nazev}${m.dodavatel ? ` (${m.dodavatel})` : ""} — ${nazevPolozky}`, castka: Math.round(castka * 100) / 100 });
    });
    const v = computeKalkulace(p, nastaveni);
    if (p.zinkovaniAktivni && v.zinkovaniSum > 0) {
      radky.push({ id: uid(), popis: `Zinkování — ${nazevPolozky}`, castka: Math.round(v.zinkovaniSum * 100) / 100 });
    }
    if (p.lakovaniAktivni && v.lakovaniSum > 0) {
      radky.push({ id: uid(), popis: `Lakování — ${nazevPolozky}`, castka: Math.round(v.lakovaniSum * 100) / 100 });
    }
    if (v.doprava > 0) {
      radky.push({ id: uid(), popis: `Doprava — ${nazevPolozky}`, castka: Math.round(v.doprava * 100) / 100 });
    }
    if (v.pripravnePrace > 0) {
      radky.push({ id: uid(), popis: `Přípravné práce — ${nazevPolozky}`, castka: Math.round(v.pripravnePrace * 100) / 100 });
    }
    if (v.spojovaciMaterial > 0) {
      radky.push({ id: uid(), popis: `Spojovací materiál — ${nazevPolozky}`, castka: Math.round(v.spojovaciMaterial * 100) / 100 });
    }
  });
  return radky;
}

// Skutečné náklady a zisk zakázky: ruční/ze-kalkulace-přebrané řádky + živě dopočtená práce
// (odpracované hodiny × aktuální sazba), porovnané s příjmem (cena bez DPH z kalkulace).
export function computeNakladyZakazky(order, nastaveni) {
  const naklady = order.naklady || [];
  const nakladyRadky = naklady.reduce((s, n) => s + (Number(n.castka) || 0), 0);

  const praceDilnaSum = sumHodin(order.prace, "dilna") * (Number(nastaveni.sazbaDilna) || 0);
  const praceMontazSum = sumHodin(order.prace, "montaz") * (Number(nastaveni.sazbaMontaz) || 0);
  const nakladyPrace = praceDilnaSum + praceMontazSum;

  const nakladyCelkem = nakladyRadky + nakladyPrace;

  const polozky = normalizovatKalkulaci(order.kalkulace);
  const kalkulaceCelkem = computeKalkulaceCelkem(polozky, nastaveni);
  const prijem = kalkulaceCelkem.cenaBezDph;

  const zisk = prijem - nakladyCelkem;
  const marzePct = prijem > 0 ? (zisk / prijem) * 100 : 0;

  return {
    nakladyRadky,
    praceDilnaSum,
    praceMontazSum,
    nakladyPrace,
    nakladyCelkem,
    prijem,
    zisk,
    marzePct,
    planNaklady: kalkulaceCelkem.naklady,
    planZisk: kalkulaceCelkem.marzeKc,
    planMarzePct: kalkulaceCelkem.marzePct,
  };
}

export function nazevSlozkyZakazky(order) {
  const cislo = order.cislo || "bez-cisla";
  const zakaznik = (order.zakaznik || "").trim();
  return zakaznik ? `${cislo} – ${zakaznik}` : cislo;
}

export function nextOrderNumber(orders) {
  const year = new Date().getFullYear();
  const nums = orders
    .map((o) => o.cislo)
    .filter((c) => c && c.startsWith(`Z-${year}-`))
    .map((c) => parseInt(c.split("-")[2], 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `Z-${year}-${String(next).padStart(4, "0")}`;
}

export function roundTo(value, step) {
  const s = Number(step) || 1;
  return Math.round(value / s) * s;
}

export const DEFAULT_KALKULACE = () => ({
  materialy: [],
  praceDilnaHodiny: "",
  praceMontazHodiny: "",
  zinkovaniAktivni: false,
  lakovaniAktivni: false,
  prirazkaPct: 40,
  sDph: true,
  pocetKs: 1,
  doprava: "",
  pripravnePrace: "",
  spojovaciMaterial: "",
});

// Jedna položka v kalkulaci zakázky (např. "Brána", "Branka") — stejný tvar jako dřív
// jedna kalkulace na zakázku, jen teď jich může být v zakázce víc vedle sebe.
export function novaPolozkaKalkulace(nazev = "") {
  return { id: uid(), nazev, ...DEFAULT_KALKULACE() };
}

// Starší zakázky měly order.kalkulace jako jeden objekt místo pole položek.
// Tahle funkce to při čtení sjednotí, ať zbytek appky pracuje vždy jen s polem.
export function normalizovatKalkulaci(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return [{ id: uid(), nazev: "Položka 1", ...raw }];
}

export function computeKalkulace(kalk, nastaveni) {
  // Počet kusů násobí celou položku (materiál, práci, dopravu, kooperace...) — appka
  // nejdřív spočítá "za jeden kus" a na konci vynásobí, ať to zůstane přehledné.
  const pocetKs = Math.max(1, Number(kalk.pocetKs) || 1);

  const materialy = kalk.materialy || [];
  const materialSumJednotka = materialy.reduce((s, m) => s + (Number(m.cena) || 0) * (Number(m.mnozstvi) || 0), 0);
  const vahaSumJednotka = materialy.reduce((s, m) => s + (Number(m.vaha) || 0) * (Number(m.mnozstvi) || 0), 0);
  const plochaSumJednotka = materialy.reduce((s, m) => s + (Number(m.plocha) || 0) * (Number(m.mnozstvi) || 0), 0);
  // Lakování počítá s plochou o 5 % větší, než je čistý součet z materiálu — pokrývá
  // přesahy, ořezy a ztráty při stříkání/nanášení, ne jen holou plochu dílů.
  const plochaProLakovaniJednotka = plochaSumJednotka * 1.05;

  const praceDilnaSumJednotka = (Number(kalk.praceDilnaHodiny) || 0) * (Number(nastaveni.sazbaDilna) || 0);
  const praceMontazSumJednotka = (Number(kalk.praceMontazHodiny) || 0) * (Number(nastaveni.sazbaMontaz) || 0);
  const zinkovaniSumJednotka = kalk.zinkovaniAktivni ? vahaSumJednotka * (Number(nastaveni.cenaZinkovani) || 0) : 0;
  const lakovaniSumJednotka = kalk.lakovaniAktivni ? plochaProLakovaniJednotka * (Number(nastaveni.cenaLakovani) || 0) : 0;
  const dopravaJednotka = Number(kalk.doprava) || 0;
  const pripravnePraceJednotka = Number(kalk.pripravnePrace) || 0;
  const spojovaciMaterialJednotka = Number(kalk.spojovaciMaterial) || 0;

  const materialSum = materialSumJednotka * pocetKs;
  const vahaSum = vahaSumJednotka * pocetKs;
  const plochaSum = plochaSumJednotka * pocetKs;
  const plochaProLakovani = plochaProLakovaniJednotka * pocetKs;
  const praceDilnaSum = praceDilnaSumJednotka * pocetKs;
  const praceMontazSum = praceMontazSumJednotka * pocetKs;
  const zinkovaniSum = zinkovaniSumJednotka * pocetKs;
  const lakovaniSum = lakovaniSumJednotka * pocetKs;
  const doprava = dopravaJednotka * pocetKs;
  const pripravnePrace = pripravnePraceJednotka * pocetKs;
  const spojovaciMaterial = spojovaciMaterialJednotka * pocetKs;

  const naklady = materialSum + praceDilnaSum + praceMontazSum + zinkovaniSum + lakovaniSum + doprava + pripravnePrace + spojovaciMaterial;
  const prirazkaPct = Number(kalk.prirazkaPct) || 0;
  const cenaBezDphRaw = naklady * (1 + prirazkaPct / 100);
  const cenaBezDph = roundTo(cenaBezDphRaw, nastaveni.zaokrouhleniNa);
  const cenaSDph = roundTo(cenaBezDph * (1 + DPH_SAZBA), 1);
  const marzeKc = cenaBezDph - naklady;
  const marzePct = cenaBezDph > 0 ? (marzeKc / cenaBezDph) * 100 : 0;

  return {
    pocetKs,
    materialSum,
    vahaSum,
    plochaSum,
    plochaProLakovani,
    praceDilnaSum,
    praceMontazSum,
    zinkovaniSum,
    lakovaniSum,
    doprava,
    pripravnePrace,
    spojovaciMaterial,
    naklady,
    cenaBezDph,
    cenaSDph,
    marzeKc,
    marzePct,
    finalniCena: kalk.sDph ? cenaSDph : cenaBezDph,
  };
}

// Spočítá každou položku zvlášť (computeKalkulace) a sečte je do celkových součtů za zakázku.
export function computeKalkulaceCelkem(polozky, nastaveni) {
  const items = (polozky || []).map((p) => ({ polozka: p, vysledek: computeKalkulace(p, nastaveni) }));
  const sum = (key) => items.reduce((s, it) => s + it.vysledek[key], 0);
  const naklady = sum("naklady");
  const cenaBezDph = sum("cenaBezDph");
  const cenaSDph = sum("cenaSDph");
  const marzeKc = sum("marzeKc");
  return {
    items,
    materialSum: sum("materialSum"),
    praceDilnaSum: sum("praceDilnaSum"),
    praceMontazSum: sum("praceMontazSum"),
    zinkovaniSum: sum("zinkovaniSum"),
    lakovaniSum: sum("lakovaniSum"),
    doprava: sum("doprava"),
    pripravnePrace: sum("pripravnePrace"),
    spojovaciMaterial: sum("spojovaciMaterial"),
    naklady,
    cenaBezDph,
    cenaSDph,
    marzeKc,
    marzePct: cenaBezDph > 0 ? (marzeKc / cenaBezDph) * 100 : 0,
    finalniCena: sum("finalniCena"),
  };
}

export function upsertMaterialHistory(history, materialy) {
  const map = new Map(history.map((h) => [h.nazev.trim().toLowerCase(), h]));
  materialy.forEach((m) => {
    if (!m.nazev || !m.nazev.trim()) return;
    map.set(m.nazev.trim().toLowerCase(), {
      nazev: m.nazev.trim(),
      dodavatel: m.dodavatel || "",
      cena: m.cena,
      jednotka: m.jednotka,
      vaha: m.vaha,
      plocha: m.plocha,
    });
  });
  return Array.from(map.values());
}

// Katalog organizací (firem doplněných z ARES) — stejný princip jako historie materiálů,
// jen klíčovaný podle IČO místo názvu.
export function upsertOrganizaceHistory(historie, organizace) {
  if (!organizace || !organizace.ico) return historie;
  const map = new Map(historie.map((o) => [o.ico, o]));
  const existujici = map.get(organizace.ico) || {};
  // Merguje se s tím, co už tam bylo — např. doplnění z ARES nemá telefon/e-mail
  // vůbec v datech, takže by je jinak při každém doplnění vymazalo.
  map.set(organizace.ico, {
    ico: organizace.ico,
    nazev: organizace.nazev !== undefined ? organizace.nazev : existujici.nazev || "",
    adresa: organizace.adresa !== undefined ? organizace.adresa : existujici.adresa || "",
    dic: organizace.dic !== undefined ? organizace.dic : existujici.dic || "",
    telefon: organizace.telefon !== undefined ? organizace.telefon : existujici.telefon || "",
    email: organizace.email !== undefined ? organizace.email : existujici.email || "",
  });
  return Array.from(map.values());
}

// Rozpočítá jednu částku (např. náklad na víc zakázek) poměrově podle ceny každé
// zakázky. Poslední podíl se dorovná, ať součet částí přesně sedí na celkovou částku
// (jinak by běžné zaokrouhlení jednotlivých podílů mohlo o pár haléřů "uletět").
export function rozpocitatNaklad(zakazky, castkaCelkem) {
  if (!zakazky || zakazky.length === 0) return [];
  if (zakazky.length === 1) return [{ order: zakazky[0], castka: Math.round(castkaCelkem * 100) / 100 }];

  const cenySoucet = zakazky.reduce((s, o) => s + (Number(o.cena) || 0), 0);
  if (cenySoucet <= 0) {
    // Žádná ze zakázek nemá cenu — rozděl rovným dílem, ať to appka nespadne na dělení nulou.
    const dil = Math.round((castkaCelkem / zakazky.length) * 100) / 100;
    const vysledek = zakazky.map((o) => ({ order: o, castka: dil }));
    vysledek[vysledek.length - 1].castka = Math.round((castkaCelkem - dil * (zakazky.length - 1)) * 100) / 100;
    return vysledek;
  }

  let prideleno = 0;
  const vysledek = zakazky.map((o, i) => {
    if (i === zakazky.length - 1) {
      // poslední položka dostane zbytek, ať součet sedí přesně
      return { order: o, castka: Math.round((castkaCelkem - prideleno) * 100) / 100 };
    }
    const podil = Math.round(((castkaCelkem * (Number(o.cena) || 0)) / cenySoucet) * 100) / 100;
    prideleno += podil;
    return { order: o, castka: podil };
  });
  return vysledek;
}

// ---------- Výkaz práce ----------

// Vrátí 7 po sobě jdoucích dnů (pondělí-neděle) obsahujících daný den — pro týdenní pruh.
export function tydenniDny(dateStr) {
  const [r, m, d] = dateStr.split("-").map(Number);
  const anchor = new Date(r, m - 1, d);
  const jsDen = anchor.getDay();
  const posunNaPondeli = jsDen === 0 ? 6 : jsDen - 1;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - posunNaPondeli);
  const dny = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    dny.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`);
  }
  return dny;
}

// Všechny záznamy práce napříč všemi zakázkami, zploštěné do jednoho pole {order, entry}.
export function vsechnyZaznamyPrace(orders) {
  const zaznamy = [];
  (orders || []).forEach((order) => {
    (order.prace || []).forEach((entry) => {
      if (entry.datum) zaznamy.push({ order, entry });
    });
  });
  return zaznamy;
}

export function soucetHodinPodleTypu(zaznamy, typ) {
  return zaznamy.filter((z) => (z.entry.typ || "dilna") === typ).reduce((s, z) => s + (Number(z.entry.hodiny) || 0), 0);
}

// Seskupí záznamy podle zakázky — vrátí i součty dílna/montáž/celkem za každou.
export function seskupitPraciPodleZakazky(zaznamy) {
  const mapa = new Map();
  zaznamy.forEach((z) => {
    if (!mapa.has(z.order.id)) mapa.set(z.order.id, { order: z.order, zaznamy: [] });
    mapa.get(z.order.id).zaznamy.push(z.entry);
  });
  return Array.from(mapa.values())
    .map((g) => {
      const zabalene = g.zaznamy.map((entry) => ({ entry }));
      const dilna = soucetHodinPodleTypu(zabalene, "dilna");
      const montaz = soucetHodinPodleTypu(zabalene, "montaz");
      return { order: g.order, zaznamy: g.zaznamy.sort((a, b) => (a.datum < b.datum ? 1 : -1)), dilna, montaz, celkem: dilna + montaz };
    })
    .sort((a, b) => b.celkem - a.celkem);
}

export function resizeImageFile(file, maxDim = 1000, quality = 0.62) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function downloadTextFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
