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
  return (
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
    (p.materialy || []).forEach((m) => {
      if (!m.nazev) return;
      const castka = (Number(m.cena) || 0) * (Number(m.mnozstvi) || 0);
      radky.push({ id: uid(), popis: `${m.nazev}${m.dodavatel ? ` (${m.dodavatel})` : ""} — ${nazevPolozky}`, castka: Math.round(castka * 100) / 100 });
    });
    const v = computeKalkulace(p, nastaveni);
    if (p.zinkovaniAktivni && v.zinkovaniSum > 0) {
      radky.push({ id: uid(), popis: `Zinkování — ${nazevPolozky}`, castka: Math.round(v.zinkovaniSum * 100) / 100 });
    }
    if (p.lakovaniAktivni && v.lakovaniSum > 0) {
      radky.push({ id: uid(), popis: `Lakování — ${nazevPolozky}`, castka: Math.round(v.lakovaniSum * 100) / 100 });
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
  prirazkaPct: 20,
  sDph: true,
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
  const materialy = kalk.materialy || [];
  const materialSum = materialy.reduce((s, m) => s + (Number(m.cena) || 0) * (Number(m.mnozstvi) || 0), 0);
  const vahaSum = materialy.reduce((s, m) => s + (Number(m.vaha) || 0) * (Number(m.mnozstvi) || 0), 0);
  const plochaSum = materialy.reduce((s, m) => s + (Number(m.plocha) || 0) * (Number(m.mnozstvi) || 0), 0);

  const praceDilnaSum = (Number(kalk.praceDilnaHodiny) || 0) * (Number(nastaveni.sazbaDilna) || 0);
  const praceMontazSum = (Number(kalk.praceMontazHodiny) || 0) * (Number(nastaveni.sazbaMontaz) || 0);
  const zinkovaniSum = kalk.zinkovaniAktivni ? vahaSum * (Number(nastaveni.cenaZinkovani) || 0) : 0;
  const lakovaniSum = kalk.lakovaniAktivni ? plochaSum * (Number(nastaveni.cenaLakovani) || 0) : 0;

  const naklady = materialSum + praceDilnaSum + praceMontazSum + zinkovaniSum + lakovaniSum;
  const prirazkaPct = Number(kalk.prirazkaPct) || 0;
  const cenaBezDphRaw = naklady * (1 + prirazkaPct / 100);
  const cenaBezDph = roundTo(cenaBezDphRaw, nastaveni.zaokrouhleniNa);
  const cenaSDph = roundTo(cenaBezDph * (1 + DPH_SAZBA), 1);
  const marzeKc = cenaBezDph - naklady;
  const marzePct = cenaBezDph > 0 ? (marzeKc / cenaBezDph) * 100 : 0;

  return {
    materialSum,
    vahaSum,
    plochaSum,
    praceDilnaSum,
    praceMontazSum,
    zinkovaniSum,
    lakovaniSum,
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
