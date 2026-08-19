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
  // Nákladová sazba — appka to používá pro SKUTEČNÉ náklady zakázky (Vyhodnocení),
  // ne pro to, co se počítá zákazníkovi. Typicky nižší než sazbaDilna/sazbaMontaz
  // výše (ty jsou zákaznická cena hodiny v kalkulaci/nabídce), protože appka tam
  // patří spíš skutečná mzdová/provozní cena hodiny, ne prodejní cena.
  nakladovaSazbaDilna: 500,
  nakladovaSazbaMontaz: 400,
  cenaZinkovani: 23,
  cenaLakovani: 900,
  zaokrouhleniNa: 10,
  firmaNazev: "",
  firmaAdresa: "",
  firmaIco: "",
  firmaDic: "",
  firmaEmail: "",
  firmaLogoPath: "",
  podminkyNabidky:
    "Platební podmínky: záloha 70 % před zahájením prací, doplatek 30 % po dokončení a předání díla.\nTermín realizace: dle vzájemné dohody, obvykle 4–6 týdnů od objednání a zaplacení zálohy.\nZáruka: 24 měsíců od předání díla.\nCeny materiálu platí k datu vystavení nabídky — při výrazném růstu cen vstupů si zhotovitel vyhrazuje právo nabídku upravit.\nNabídka je informativní a platí 30 dní od vystavení.",
  pracovnici: [], // jména brigádníků/pracovníků nabízená při zápisu práce
  nabizetPracovniky: true,
  vybraniUzivatele: [], // id uživatelů appky, kteří se mají taky nabízet (prázdné = žádný)
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
    mistoPredani: "",
    // Jméno osoby, která fyzicky přebírá a podepisuje — může to být jiná osoba
    // než objednatel samotný (zaměstnanec, rodinný příslušník atd.), proto se
    // vede zvlášť. Výchozí je jméno zákazníka, jde ale přepsat.
    jmenoPrebirajiciho: order.zakaznik || "",
    zarucniDobaMesicu: "",
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
      radky.push({ id: uid(), popis: `${m.nazev}${m.dodavatel ? ` (${m.dodavatel})` : ""} — ${nazevPolozky}`, castka: Math.round(castka * 100) / 100, datum: todayISO() });
    });
    const v = computeKalkulace(p, nastaveni);
    if (p.zinkovaniAktivni && v.zinkovaniSum > 0) {
      radky.push({ id: uid(), popis: `Zinkování — ${nazevPolozky}`, castka: Math.round(v.zinkovaniSum * 100) / 100, datum: todayISO() });
    }
    if (p.lakovaniAktivni && v.lakovaniSum > 0) {
      radky.push({ id: uid(), popis: `Lakování — ${nazevPolozky}`, castka: Math.round(v.lakovaniSum * 100) / 100, datum: todayISO() });
    }
    if (v.doprava > 0) {
      radky.push({ id: uid(), popis: `Doprava — ${nazevPolozky}`, castka: Math.round(v.doprava * 100) / 100, datum: todayISO() });
    }
    if (v.pripravnePrace > 0) {
      radky.push({ id: uid(), popis: `Přípravné práce — ${nazevPolozky}`, castka: Math.round(v.pripravnePrace * 100) / 100, datum: todayISO() });
    }
    if (v.spojovaciMaterial > 0) {
      radky.push({ id: uid(), popis: `Spojovací materiál — ${nazevPolozky}`, castka: Math.round(v.spojovaciMaterial * 100) / 100, datum: todayISO() });
    }
  });
  return radky;
}

// Skutečné náklady a zisk zakázky: ruční/ze-kalkulace-přebrané řádky + živě dopočtená práce
// (odpracované hodiny × aktuální sazba), porovnané s příjmem (cena bez DPH z kalkulace).
export function computeNakladyZakazky(order, nastaveni) {
  const naklady = order.naklady || [];
  const nakladyRadky = naklady.reduce((s, n) => s + (Number(n.castka) || 0), 0);

  const praceDilnaSum = sumHodin(order.prace, "dilna") * (Number(nastaveni.nakladovaSazbaDilna) || 0);
  const praceMontazSum = sumHodin(order.prace, "montaz") * (Number(nastaveni.nakladovaSazbaMontaz) || 0);
  const nakladyPrace = praceDilnaSum + praceMontazSum;

  const nakladyCelkem = nakladyRadky + nakladyPrace;

  const polozky = normalizovatKalkulaci(order.kalkulace);
  const kalkulaceCelkem = computeKalkulaceCelkem(polozky, nastaveni);
  // Když appka nemá vytvořenou kalkulaci, cenaBezDph z ní vyjde 0 — appka by pak
  // "skutečný výsledek zakázky" počítala vůči nulovému příjmu, i když má zakázka
  // reálnou cenu vyplněnou přímo (bez kalkulace). Appka proto v tom případě
  // spadne na skutečnou cenu zakázky, stejně jako appka dělá i jinde (export do
  // ABRA Flexi řeší tenhle stejný případ úplně stejně).
  const prijem = polozky.length > 0 ? kalkulaceCelkem.cenaBezDph : Number(order.cena) || 0;

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

// ---------- Import faktur přijatých (ABRA Flexi CSV) ----------

// Appka hledá číslo zakázky (Z-2026-0008 nebo i podzakázku Z-2026-0008-1) KDEKOLIV
// v textu — nezáleží, jestli ho appka najde ve variabilním symbolu, poznámce nebo
// popisu faktury. Appka se totiž nespoléhá na to, do jakého konkrétního pole ve
// Flexi si číslo zapíšeš.
const VZOR_CISLA_ZAKAZKY = /Z-\d{4}-\d{4}(?:-\d+)?/;

export function najitCisloZakazkyVTextu(text) {
  if (!text) return null;
  const m = String(text).match(VZOR_CISLA_ZAKAZKY);
  return m ? m[0] : null;
}

// Projde jeden řádek importované faktury (objekt sloupec -> hodnota) a najde číslo
// zakázky v JAKÉMKOLIV sloupci — appka tak nemusí vědět předem, do kterého pole si
// ho ve Flexi zapisuješ.
export function najitCisloZakazkyVRadku(radek) {
  // Přednostně appka hledá přímo sloupec "číslo zakázky" / "zakázka" — to je
  // vlastní pole Flexi právě na tohle určené (jde ho vyplnit i na položce faktury,
  // ne jen v hlavičce), spolehlivější než hádat to z libovolného textu.
  const nazevSloupce = Object.keys(radek).find((k) => {
    const n = k.toLowerCase().trim();
    return n === "číslo zakázky" || n === "cislo zakazky" || n === "zakázka" || n === "zakazka";
  });
  if (nazevSloupce) {
    const nalezeno = najitCisloZakazkyVTextu(radek[nazevSloupce]);
    if (nalezeno) return nalezeno;
  }
  // Záložně (kdyby appka název sloupce nerozpoznala) prohledá celý řádek.
  for (const hodnota of Object.values(radek)) {
    const nalezeno = najitCisloZakazkyVTextu(hodnota);
    if (nalezeno) return nalezeno;
  }
  return null;
}

// Spáruje naimportované řádky faktur se zakázkami appky podle nalezeného čísla.
// Vrací zvlášť spárované (appka ví, kam náklad patří) a nespárované (appka nenašla
// číslo zakázky, nebo takové číslo appka nezná) — ty musí uživatel doplnit ručně.
export function sparovatFakturySZakazkami(radky, orders) {
  const podleCisla = new Map(orders.map((o) => [o.cislo, o]));
  const sparovane = [];
  const nesparovane = [];
  radky.forEach((radek) => {
    const cislo = najitCisloZakazkyVRadku(radek);
    const order = cislo ? podleCisla.get(cislo) : null;
    if (order) {
      sparovane.push({ radek, cislo, order });
    } else {
      nesparovane.push({ radek, cislo });
    }
  });
  return { sparovane, nesparovane };
}

// Appka nezná předem přesný tvar CSV exportu z Flexi (liší se podle nastavení
// exportu) — parser proto čte hlavičku podle NÁZVŮ sloupců (ne pevné pozice) a pro
// běžné položky (dodavatel, částka, datum) zkusí uhodnout, který sloupec to je.
// Celý řádek se ale appce zachová beze změny, ať v něm najitCisloZakazkyVRadku
// může hledat číslo zakázky i ve sloupci, který appka neuhodla.
export function parseFakturyCSV(text) {
  const radky = text.trim().split(/\r?\n/);
  if (radky.length < 2) return [];
  const delimiter = radky[0].includes(";") ? ";" : ",";
  const hlavicka = radky[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));

  return radky.slice(1).map((radek) => {
    const bunky = radek.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    const objekt = {};
    hlavicka.forEach((nazev, i) => {
      objekt[nazev] = bunky[i] || "";
    });
    return objekt;
  });
}

// Z libovolného tvaru řádku (různé appky/exporty nazývají sloupce jinak) appka
// zkusí odhadnout dodavatele, částku a datum pro přehledné zobrazení uživateli —
// samotné párování na zakázku na tomhle odhadu ale nezávisí.
// Rozpozná "1 234,50 Kč" / "1234.5" / "2 000" a vrátí číslo — appka nezná přesně,
// jak Flexi částky formátuje, takže je radši ke všem obvyklým tvarům shovívavá.
export function parseCastku(text) {
  if (!text && text !== 0) return 0;
  const cislo = String(text)
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
  return Number(cislo) || 0;
}

// Poskládá stejný popis a částku nákladu, jaké appka zapíše při importu — appka
// tohle používá i PŘED samotným importem (na odhalení možných duplicit), ne až
// v okamžiku uložení, ať se to nikde nerozejde na dvě různá místa.
// Import faktur z Flexi mívá datum v českém formátu (např. "5.8.2026"), zatímco
// zbytek aplikace (pole u nákladu, hledání v kalendáři) počítá vždy s ISO
// tvarem "YYYY-MM-DD". Tahle funkce to sjednotí — formát, který nepozná,
// vrátí jako null, ať se netváří jako platné datum omylem.
function normalizovatDatumNaISO(text) {
  if (!text) return null;
  const t = String(text).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})$/);
  if (m) {
    const [, d, mesic, r] = m;
    return `${r}-${mesic.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function sestavitNakladZFaktury(radek) {
  const udaje = odhadnoutUdajeFaktury(radek);
  const mnozstviText = udaje.mnozstvi ? `${udaje.mnozstvi}${udaje.jednotka ? ` ${udaje.jednotka}` : ""}` : "";
  const popisCasti = [udaje.popisPolozky, mnozstviText, udaje.dodavatel ? `Faktura přijatá — ${udaje.dodavatel}` : "Faktura přijatá (Flexi)"];
  return { popis: popisCasti.filter(Boolean).join(" — "), castka: parseCastku(udaje.castka), datum: normalizovatDatumNaISO(udaje.datum) || todayISO() };
}

// Appka to bere jako možnou duplicitu, když na zakázce už existuje náklad se
// STEJNÝM popisem a STEJNOU částkou — typicky proto, že appka stejnou fakturu
// (nebo stejný soubor) omylem naimportovala podruhé. Appka na to jen upozorní,
// nerozhoduje sama — nedá se vyloučit, že jde o dvě opravdu různé, jen náhodou
// stejně vypadající platby.
export function jeMoznaDuplicitaNakladu(order, popis, castka) {
  if (!order || !popis) return false;
  return (order.naklady || []).some((n) => n.popis === popis && Math.abs((Number(n.castka) || 0) - castka) < 0.01);
}

export function odhadnoutUdajeFaktury(radek) {
  const najit = (klicova) => {
    const klic = Object.keys(radek).find((k) => k.toLowerCase().includes(klicova));
    return klic ? radek[klic] : "";
  };
  const mnozstvi = najit("množství") || najit("mnozstvi") || najit("počet") || najit("pocet") || "";

  // DŮLEŽITÉ: appka rozlišuje CENU ZA JEDNOTKU (tu je potřeba vynásobit množstvím,
  // ať appka nezapíše jen cenu za 1 kus místo celé položky) od CELKOVÉ částky za
  // řádek (tu appka použije přímo, beze změny). Sloupec "Cena za MJ" je přesně ten
  // první případ — appka to zjistila na reálném exportu z Flexi.
  const cenaZaJednotku = najit("cena za mj") || najit("cena za jednotku") || najit("jednotková cena");
  const castkaBezDph = najit("bez dph") || najit("základ") || najit("zaklad");
  const castkaCelkemObecna = najit("celkem") || najit("částka") || najit("castka");

  let castka = "";
  let jeBezDphJiste = false;
  if (castkaBezDph) {
    castka = castkaBezDph;
    jeBezDphJiste = true;
  } else if (castkaCelkemObecna) {
    castka = castkaCelkemObecna;
  } else if (cenaZaJednotku) {
    // appka cenu za jednotku vynásobí množstvím (výchozí množství 1, kdyby appka
    // sloupec s množstvím nenašla) — jinak by u položky "5 ks × 200 Kč" zapsala
    // jen 200 Kč místo správných 1000 Kč.
    const pocet = mnozstvi ? parseCastku(mnozstvi) : 1;
    castka = String(Math.round(parseCastku(cenaZaJednotku) * pocet * 100) / 100);
  } else {
    castka = najit("cena") || "";
  }

  return {
    dodavatel: najit("dodavatel") || najit("firma") || najit("partner") || "",
    castka,
    jeBezDphJiste,
    datum: najit("datum") || "",
    // Text položky faktury (ne celé faktury) — ať jde na první pohled poznat, i
    // když ze stejné faktury přijde víc řádků na stejnou zakázku.
    popisPolozky: najit("položka") || najit("text") || najit("popis") || najit("název") || "",
    mnozstvi,
    jednotka: (() => {
      const presnyMJ = Object.keys(radek).find((k) => k.trim().toLowerCase() === "mj");
      return presnyMJ ? radek[presnyMJ] : najit("jednotka") || "";
    })(),
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
  pocetKs: 1,
  jednotka: "ks", // jen popisek množství na nabídce (ks/bm/m²...), na výpočet nemá vliv
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

export function computeKalkulace(kalk, nastaveni, sazbaDph = DPH_SAZBA) {
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
  const cenaSDph = roundTo(cenaBezDph * (1 + sazbaDph), 1);
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
    finalniCena: cenaBezDph,
  };
}

// Spočítá každou položku zvlášť (computeKalkulace) a sečte je do celkových součtů za zakázku.
export function computeKalkulaceCelkem(polozky, nastaveni, sazbaDph = DPH_SAZBA) {
  const items = (polozky || []).map((p) => ({ polozka: p, vysledek: computeKalkulace(p, nastaveni, sazbaDph) }));
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
      // Databáze má tahle pole číselná (numeric) — nikdy do nich neposílat prázdný
      // text "", jinak Supabase celý dávkový zápis (i s ostatními materiály v něm)
      // tiše odmítne a nic z něj se neuloží.
      cena: Number(m.cena) || 0,
      jednotka: m.jednotka || "kg",
      vaha: Number(m.vaha) || 0,
      plocha: Number(m.plocha) || 0,
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

// Seskupí odpracované hodiny podle DATA napříč VŠEMI zakázkami — appka to
// používá v kalendáři, ať u každého dne ukáže, kolik se ten den odvedlo na dílně
// a kolik na montáži. Dny bez jakékoliv práce se v mapě vůbec neobjeví (appka je
// tak nechá v kalendáři prázdné, ne s nulou).

// Plánované hodiny (z kalkulace — planCasDilna/planCasMontaz) přiřazené k týdnu
// PODLE TERMÍNU ZAHÁJENÍ VÝROBY dané zakázky — appka to bere jako "kolik práce
// má tenhle týden začít", ne kolik jí skutečně proběhne (appka nezná rozvržení
// práce uvnitř zakázky po dnech). Zakázky bez vyplněného termínu zahájení appka
// do přehledu nezahrne — nemá appka podle čeho poznat, do kterého týdne patří.
export function planovaneHodinyPodleTydne(orders) {
  const mapa = new Map(); // klíč = pondělí toho týdne (YYYY-MM-DD)
  (orders || [])
    .filter((o) => o.terminZahajeni && o.stav === "probiha")
    .forEach((o) => {
      const pondeli = tydenniDny(o.terminZahajeni)[0];
      if (!mapa.has(pondeli)) mapa.set(pondeli, { dilna: 0, montaz: 0, zakazky: [] });
      const zaznam = mapa.get(pondeli);
      zaznam.dilna += Number(o.planCasDilna) || 0;
      zaznam.montaz += Number(o.planCasMontaz) || 0;
      zaznam.zakazky.push(o);
    });
  return mapa;
}

// Seskupí náklady označené jako "jízda" podle data napříč VŠEMI zakázkami —
// stejný princip jako hodinyPodleDne, jen appka to bere z pole naklady místo
// prace. Dny bez jízdy se v mapě vůbec neobjeví.
export function jizdyPodleDne(orders) {
  const mapa = new Map();
  (orders || []).forEach((order) => {
    (order.naklady || []).forEach((n) => {
      if (!n.jeJizda || !n.datum) return;
      if (!mapa.has(n.datum)) mapa.set(n.datum, { pocet: 0, castkaCelkem: 0, jizdy: [] });
      const den = mapa.get(n.datum);
      den.pocet += 1;
      den.castkaCelkem += Number(n.castka) || 0;
      den.jizdy.push({ order, naklad: n });
    });
  });
  return mapa;
}

export function hodinyPodleDne(orders) {
  const zaznamy = vsechnyZaznamyPrace(orders);
  const mapa = new Map();
  zaznamy.forEach(({ entry }) => {
    const hodiny = Number(entry.hodiny) || 0;
    if (hodiny <= 0) return;
    const typ = entry.typ === "montaz" ? "montaz" : "dilna";
    if (!mapa.has(entry.datum)) mapa.set(entry.datum, { dilna: 0, montaz: 0 });
    mapa.get(entry.datum)[typ] += hodiny;
  });
  return mapa;
}

// Seskupí záznamy podle zakázky — vrátí i součty dílna/montáž/celkem za každou.
// ---------- Podzakázky ----------

// Další volné poddíslo podzakázky pro danou hlavní zakázku, např. "Z-2026-0008-1",
// "Z-2026-0008-2"... Počítá se z toho, co appka aktuálně vidí (podobně jako dřívější
// klientský výpočet čísla zakázky) — u podzakázek jedné zakázky je riziko souběžného
// zakládání dvou lidí ve stejnou chvíli výrazně nižší než u hlavních zakázek.
export function dalsiCisloPodzakazky(cisloRodice, existujiciPodzakazky) {
  let nejvyssi = 0;
  (existujiciPodzakazky || []).forEach((o) => {
    const m = (o.cislo || "").match(/-(\d+)$/);
    if (m) nejvyssi = Math.max(nejvyssi, Number(m[1]));
  });
  return `${cisloRodice}-${nejvyssi + 1}`;
}

// Souhrn přes všechny podzakázky jedné hlavní zakázky — pro zobrazení na hlavní
// zakázce (celková cena, odpracované hodiny, počty podle stavu).
// Spojí ručně zadané pracovníky (brigádníci) s e-maily VYBRANÝCH uživatelů appky
// (ne všech — appka nabídne jen ty, koho si admin v Nastavení zaškrtl) do jedné
// nabídky pro zápis práce — bez duplicit (i když se liší velikostí písmen).
// Když je nabízení v nastavení vypnuté, appka nevrátí nic.
export function nabidkaPracovniku(nastaveni, uzivatele) {
  if (!nastaveni?.nabizetPracovniky) return [];
  const vybraniIds = new Set(nastaveni.vybraniUzivatele || []);
  const vybraniEmaily = (uzivatele || []).filter((u) => vybraniIds.has(u.id)).map((u) => u.email);
  const vse = [...(nastaveni.pracovnici || []), ...vybraniEmaily];
  const videne = new Set();
  const vysledek = [];
  vse.forEach((jmeno) => {
    const klic = (jmeno || "").trim().toLowerCase();
    if (!klic || videne.has(klic)) return;
    videne.add(klic);
    vysledek.push(jmeno.trim());
  });
  return vysledek;
}

export function souhrnPodzakazek(podzakazky) {
  const souhrn = {
    pocet: (podzakazky || []).length,
    cenaCelkem: 0,
    dilnaHodiny: 0,
    montazHodiny: 0,
    podleStavu: {},
  };
  (podzakazky || []).forEach((o) => {
    souhrn.cenaCelkem += Number(o.cena) || 0;
    souhrn.dilnaHodiny += sumHodin(o.prace, "dilna");
    souhrn.montazHodiny += sumHodin(o.prace, "montaz");
    souhrn.podleStavu[o.stav] = (souhrn.podleStavu[o.stav] || 0) + 1;
  });
  return souhrn;
}

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
