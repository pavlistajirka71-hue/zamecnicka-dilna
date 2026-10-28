// Vytáhne z e-mailu údaje pro poptávku — čistě pravidly přímo v prohlížeči,
// bez umělé inteligence a bez jakékoli externí služby (zdarma, e-mail nikam neodchází).
// Nic se nedoplňuje "naslepo": co se nenajde spolehlivě, zůstane prázdné k doplnění.

const MESICE = {
  leden: 1, ledna: 1, unor: 2, unora: 2, brezen: 3, brezna: 3, duben: 4, dubna: 4,
  kveten: 5, kvetna: 5, cerven: 6, cervna: 6, cervenec: 7, cervence: 7, srpen: 8, srpna: 8,
  zari: 9, rijen: 10, rijna: 10, listopad: 11, listopadu: 11, prosinec: 12, prosince: 12,
};

const bezDiakritiky = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const RE_FIRMA = /\b(s\.\s?r\.\s?o\.?|spol\.\s?s\s?r\.\s?o\.?|a\.\s?s\.|v\.\s?o\.\s?s\.|k\.\s?s\.|z\.\s?s\.|o\.\s?p\.\s?s\.|s\.\s?p\.|SE)\b/;
const RE_HLAVICKA = /^\s*(od|from|odesláno|odeslano|sent|datum|date|komu|to|kopie|cc|předmět|predmet|subject)\s*:/i;
const RE_ZAVER = /^\s*(s\s+pozdravem|se\s+srdečným\s+pozdravem|s\s+přáním|s\s+úctou|děkuji|děkujeme|dekuji|díky|diky|předem\s+děkuji|predem\s+dekuji|předem\s+díky|predem\s+diky|hezký\s+den|pěkný\s+den|krásný\s+den|přeji\s+hezký|mějte\s+se|best\s+regards|kind\s+regards|regards|thanks|thank\s+you)\b/i;
const RE_POZDRAV = /^\s*(dobrý\s+den|dobry\s+den|dobrý\s+večer|zdravím|zdravim|ahoj|vážen[ýáí]|vazen[yai]|hezký\s+den|good\s+(morning|afternoon)|hello|hi)\b/i;
const RE_CITACE = /^\s*(-{2,}\s*(original message|původní zpráva|puvodni zprava|původní e-mail|forwarded message|přeposlaná zpráva)|_{6,}|dne\s.+napsal|on\s.+wrote:)/i;

export function kontrolaIco(ico) {
  if (!/^\d{8}$/.test(ico)) return false;
  let soucet = 0;
  for (let i = 0; i < 7; i++) soucet += Number(ico[i]) * (8 - i);
  const zbytek = soucet % 11;
  const kontrolni = zbytek === 0 ? 1 : zbytek === 1 ? 0 : 11 - zbytek;
  return kontrolni === Number(ico[7]);
}

// Hlavička přeposlané/citované zprávy (Od: … Odesláno: … Předmět: …) → { od, predmet, konec }
function najitBlokHlavicky(radky, od = 0) {
  for (let i = od; i < radky.length; i++) {
    if (!/^\s*(od|from)\s*:/i.test(radky[i])) continue;
    let j = i;
    const data = {};
    while (j < radky.length && j < i + 10 && (RE_HLAVICKA.test(radky[j]) || (radky[j].trim() === "" && j === i + 1))) {
      const m = radky[j].match(/^\s*([^:]+):\s*(.*)$/);
      if (m) data[bezDiakritiky(m[1]).trim()] = m[2].trim();
      j++;
    }
    if (j - i >= 2) {
      return { start: i, konec: j, od: data.od || data.from || "", predmet: data.predmet || data.subject || "" };
    }
  }
  return null;
}

function rozebratOdesilatele(od) {
  if (!od) return { jmeno: "", email: "" };
  const email = (od.match(RE_EMAIL) || [""])[0];
  let jmeno = od.replace(/<[^>]*>/g, "").replace(RE_EMAIL, "").replace(/[\[\]"'()]/g, "").replace(/mailto:/gi, "").trim();
  if (jmeno.includes(",")) {
    // "Novák, Jan" → "Jan Novák"
    const [a, b] = jmeno.split(",").map((x) => x.trim());
    if (a && b && !/\s/.test(a) && !/\s/.test(b)) jmeno = `${b} ${a}`;
  }
  return { jmeno, email };
}

function vypadaJakoJmeno(radek) {
  const r = radek.trim().replace(/[,;]$/, "");
  if (!r || r.length > 45 || /\d|@|:|\/|www\./i.test(r)) return false;
  if (RE_FIRMA.test(r) || RE_ZAVER.test(r) || RE_POZDRAV.test(r)) return false;
  const slova = r.split(/\s+/).filter((s) => !/^(ing|mgr|bc|mudr|judr|phdr|rndr|doc|prof|ph\.?d|dis|csc|mba)\.?,?$/i.test(s));
  if (slova.length < 2 || slova.length > 4) return false;
  return slova.every((s) => /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž'-]+\.?$/.test(s));
}

// Odkazy (https://…?print=200000043, <mailto:…>) obsahují čísla, která nejsou telefony ani IČO.
const bezOdkazu = (text) => (text || "").replace(/<?(https?:\/\/|www\.)[^\s>]+>?/gi, " ").replace(/<mailto:[^>]*>/gi, " ");

function najitTelefony(textSOdkazy) {
  const text = bezOdkazu(textSOdkazy);
  const vysledky = [];
  const re = /(?<![\d/=&?#_A-Za-z])(?:(\+|00)\s?(420|421)[\s.-]?)?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{3})(?![\d/&_A-Za-z])/g;
  let m;
  while ((m = re.exec(text))) {
    const pred = bezDiakritiky(text.slice(Math.max(0, m.index - 14), m.index));
    if (/(ic|ico|dic|ucet|u\.|c\.u|iban|psc|pcs|cislo uctu|v\.s|vs|ks)\W*$/.test(pred)) continue;
    const cislice = `${m[3]}${m[4]}${m[5]}`;
    if (!/^[2-9]/.test(cislice)) continue;
    const predvolba = m[2] ? `+${m[2]} ` : "";
    vysledky.push(`${predvolba}${m[3]} ${m[4]} ${m[5]}`);
  }
  return [...new Set(vysledky)];
}

function najitAdresu(radky, vlastniAdresa) {
  const vlastniPsc = ((vlastniAdresa || "").match(/\b\d{3}\s?\d{2}\b/) || [""])[0].replace(/\s/g, "");
  // 1) Výslovně označená adresa / místo realizace
  for (const r of radky) {
    const m = r.match(/(?:^|[\s,;(])(adresa|místo\s+realizace|misto\s+realizace|místo\s+stavby|místo\s+montáže|misto\s+montaze|stavba|realizace|lokalita)\s*:\s*([^\n]{4,})$/i);
    if (m) return m[2].split(/[.!?;](\s|$)/)[0].trim();
  }
  // 2) Řádek s PSČ (123 45 Město), případně i s ulicí na předchozím řádku
  for (let i = 0; i < radky.length; i++) {
    const m = radky[i].match(/\b(\d{3})\s?(\d{2})\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][^\d,;.!?\n]{1,40})/);
    if (!m) continue;
    if (vlastniPsc && `${m[1]}${m[2]}` === vlastniPsc) continue;
    let adresa = radky[i].trim().replace(/^(adresa|bydliště)\s*:\s*/i, "");
    if (adresa.length > 60) {
      // PSČ uprostřed věty ("…cenu. Bydlím Na Výsluní 7, 251 01 Říčany.") → jen ten kousek adresy
      const pozice = adresa.indexOf(m[0]);
      const pred = adresa.slice(0, pozice).split(/[.!?;:]\s+/).pop() || "";
      const ulice = /\d+[a-zA-Z]?(\/\d+[a-zA-Z]?)?\s*,?\s*$/.test(pred)
        ? pred.replace(/^\s*(bydlím|bydlime|bydlíme|jsem\s+z|jsme\s+z|na\s+adrese|adresa|místo|stavba\s+je|nacházíme\s+se|stavíme)\s*:?\s*/i, "").trim()
        : "";
      adresa = `${ulice ? `${ulice.replace(/,$/, "")}, ` : ""}${m[0].trim()}`;
    }
    adresa = adresa.replace(/[.;,]+$/, "");
    const predchozi = (radky[i - 1] || "").trim();
    if (!/\d{3}\s?\d{2}.*\d/.test(adresa) && /[A-Za-zÁ-ž]\s+\d+[a-zA-Z]?(\/\d+[a-zA-Z]?)?\s*,?$/.test(predchozi) && !RE_FIRMA.test(predchozi)) {
      adresa = `${predchozi.replace(/,$/, "")}, ${adresa}`;
    }
    return adresa;
  }
  // 3) Bez přesné adresy aspoň obec: "lokalita Potštejn", "obec Záměl", "město Ústí nad Orlicí" (bez dvojtečky)
  for (const r of radky) {
    const m = r.match(/\b(lokalita|lokalitě|obec|město|katastr)\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+(?:\s+(?:nad|pod|u|v)\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+|[\s-][A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+)?)/);
    if (m) return m[2];
  }
  return "";
}

function najitTermin(text, dnes = new Date()) {
  const t = bezDiakritiky(text);
  const rok = dnes.getFullYear();
  const naDatum = (d, m, r) => {
    let y = r ? Number(r.length === 2 ? `20${r}` : r) : rok;
    const datum = new Date(Date.UTC(y, m - 1, d));
    if (!r && datum < new Date(Date.UTC(rok, dnes.getMonth(), dnes.getDate()))) datum.setUTCFullYear(y + 1);
    if (datum.getUTCMonth() !== m - 1) return "";
    return datum.toISOString().slice(0, 10);
  };
  const uvod = "(?:nejpozdeji\\s+do|hotov\\w*\\s+do|potreb\\w*[^.\\n]{0,40}?\\s+do|termin\\w*[^.\\n]{0,25}?(?:do|:)|realizac\\w*\\s+do|zhotoveni\\s+do|dodani\\s+do|do)";
  let m = t.match(new RegExp(`${uvod}\\s+(\\d{1,2})\\.\\s?(\\d{1,2})\\.(?:\\s?(\\d{4}|\\d{2})\\b)?`));
  if (m) return naDatum(Number(m[1]), Number(m[2]), m[3]);
  m = t.match(new RegExp(`${uvod}\\s+(\\d{1,2})\\.\\s?(${Object.keys(MESICE).join("|")})\\b(?:\\s+(\\d{4}))?`));
  if (m) return naDatum(Number(m[1]), MESICE[m[2]], m[3]);
  m = t.match(new RegExp(`(?:do|nejpozdeji do)\\s+konce\\s+(${Object.keys(MESICE).join("|")})\\b(?:\\s+(\\d{4}))?`));
  if (m) {
    const mesic = MESICE[m[1]];
    const y = m[2] ? Number(m[2]) : rok;
    const posledni = new Date(Date.UTC(y, mesic, 0)).getUTCDate();
    return naDatum(posledni, mesic, m[2] || (mesic - 1 < dnes.getMonth() ? String(rok + 1) : String(rok)));
  }
  return "";
}

// Data z webového formuláře (Webnode a podobné: "Jméno a příjmení:" a hodnota na dalším
// řádku). Hledá se v CELÉM e-mailu včetně citované historie — zákazník často jen odpoví
// na naše "přijetí poptávky" a samotná poptávka je až v citaci.
const POLE_FORMULARE = [
  ["jmeno", /^(jméno\s+a\s+příjmení|příjmení\s+a\s+jméno|jméno|vaše\s+jméno|kontaktní\s+osoba|name)$/i],
  ["firma", /^(firma|společnost|název\s+firmy)$/i],
  ["email", /^(e-?mail|váš\s+e-?mail|emailová\s+adresa)$/i],
  ["telefon", /^(telefon|tel\.?|mobil|telefonní\s+číslo|váš\s+telefon)$/i],
  ["adresa", /^(adresa|místo\s+realizace|obec|město|lokalita|psč\s+a\s+obec)$/i],
  ["zprava", /^(zpráva|vaše\s+zpráva|text\s+zprávy|poptávka|popis|dotaz|message|váš\s+dotaz)$/i],
  ["datum", /^(datum)$/i],
];
const RE_KONEC_FORMULARE = /^\s*(všechna\s+sesbíraná\s+data|s\s+pozdravem|tým\s+webnode|-{3,}|_{3,}|>?\s*(od|from)\s*:)/i;

function najitFormular(radky) {
  const vysledek = {};
  let nalezenoPoli = 0;
  for (let i = 0; i < radky.length; i++) {
    const m = radky[i].trim().match(/^([^:]{2,30}):\s*(.*)$/);
    if (!m) continue;
    const pole = POLE_FORMULARE.find(([, re]) => re.test(m[1].trim()));
    if (!pole) continue;
    const klic = pole[0];
    let hodnota = m[2].trim();
    // "Datum: 21. 10. 2026 16:58" na jednom řádku je hlavička citované zprávy; formulář
    // má hodnotu až na dalším řádku — ta má přednost.
    if (vysledek[klic] && !(klic === "datum" && !hodnota)) continue;
    let j = i + 1;
    if (klic === "zprava") {
      const casti = hodnota ? [hodnota] : [];
      while (j < radky.length && j < i + 60) {
        const r = radky[j];
        const dalsiPole = r.trim().match(/^([^:]{2,30}):\s*$/);
        if (RE_KONEC_FORMULARE.test(r) || (dalsiPole && POLE_FORMULARE.some(([, re]) => re.test(dalsiPole[1].trim())))) break;
        casti.push(r.trim());
        j++;
      }
      while (casti.length && !casti[0]) casti.shift();
      if (casti.length && RE_POZDRAV.test(casti[0]) && casti[0].length < 40) casti.shift();
      // "Dobrý den, mohli byste…" na jednom řádku → jen pryč s pozdravem
      if (casti.length) casti[0] = casti[0].replace(/^\s*(dobrý\s+den|dobry\s+den|zdravím|zdravim|dobrý\s+večer)\s*[,!.]\s*/i, "").replace(/^./, (z) => z.toUpperCase());
      while (casti.length && (!casti[casti.length - 1] || RE_ZAVER.test(casti[casti.length - 1]))) casti.pop();
      hodnota = casti.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    } else if (!hodnota) {
      while (j < radky.length && !radky[j].trim()) j++;
      hodnota = (radky[j] || "").trim();
    }
    if (hodnota) {
      vysledek[klic] = hodnota;
      nalezenoPoli++;
    }
  }
  const jeFormular = vysledek.zprava && (vysledek.jmeno || vysledek.email || vysledek.telefon);
  return jeFormular && nalezenoPoli >= 2 ? vysledek : null;
}

// email: { odJmeno, odEmail, predmet, text }  (u vloženého textu jen { text })
// vlastni: { emaily: [], ico, nazev, adresa } — údaje vlastní firmy, ty se nikdy nedoplní jako zákazník
export function rozebratEmail(email, vlastni = {}, dnes = new Date()) {
  let text = (email.text || "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
  let radky = text.split("\n");
  const formular = najitFormular(radky);
  let odJmeno = email.odJmeno || "";
  let odEmail = email.odEmail || "";
  let predmet = email.predmet || "";

  // Přeposlaný e-mail (nahoře skoro nic, pak "Od: … Předmět: …") → zákazník je až pod hlavičkou.
  // Odpověď s historií → platí jen horní část, citace pod ní se zahodí.
  for (let kolo = 0; kolo < 3; kolo++) {
    const blok = najitBlokHlavicky(radky);
    if (!blok) break;
    const nad = radky.slice(0, blok.start).join("\n").replace(RE_EMAIL, "").trim();
    if (nad.length < 40) {
      const od = rozebratOdesilatele(blok.od);
      if (od.email || od.jmeno) {
        odJmeno = od.jmeno;
        odEmail = od.email;
      }
      if (blok.predmet) predmet = blok.predmet;
      radky = radky.slice(blok.konec);
    } else {
      radky = radky.slice(0, blok.start);
      break;
    }
  }
  const iCitace = radky.findIndex((r) => RE_CITACE.test(r));
  if (iCitace > 0) radky = radky.slice(0, iCitace);
  radky = radky.filter((r) => !/^\s*>/.test(r));

  const vlastniEmaily = (vlastni.emaily || []).filter(Boolean).map((e) => e.toLowerCase());
  const vlastniDomeny = vlastniEmaily.map((e) => e.split("@")[1]).filter((d) => d && !/^(gmail|seznam|email|centrum|post|outlook|hotmail|icloud|volny|atlas|yahoo)\./.test(d));
  const jeVlastni = (e) => {
    const x = (e || "").toLowerCase();
    return vlastniEmaily.includes(x) || vlastniDomeny.some((d) => x.endsWith(`@${d}`)) || /no-?reply|mailer-daemon/.test(x);
  };

  // Závěr a podpis
  const iZaver = radky.findIndex((r) => RE_ZAVER.test(r));
  let telo = iZaver >= 0 ? radky.slice(0, iZaver) : radky.slice();
  let podpis = iZaver >= 0 ? radky.slice(iZaver + 1, iZaver + 14) : radky.slice(-8);
  podpis = podpis.map((r) => r.trim()).filter(Boolean);

  // Pozdrav na začátku pryč
  const iPrvni = telo.findIndex((r) => r.trim());
  if (iPrvni >= 0 && RE_POZDRAV.test(telo[iPrvni]) && telo[iPrvni].trim().length < 60) telo.splice(iPrvni, 1);

  const celyText = radky.join("\n");

  // E-mail zákazníka
  const vsechnyEmaily = [...new Set((celyText.match(RE_EMAIL) || []).map((e) => e.toLowerCase()))];
  const emailZFormulare = formular && formular.email ? ((formular.email.match(RE_EMAIL) || [""])[0] || "").toLowerCase() : "";
  const emailZakaznika =
    (!jeVlastni(odEmail) && odEmail ? odEmail : "") || (emailZFormulare && !jeVlastni(emailZFormulare) ? emailZFormulare : "") || vsechnyEmaily.find((e) => !jeVlastni(e)) || "";

  // Telefon (přednostně z podpisu)
  // Telefon vyplněný zákazníkem ve webovém formuláři má přednost před čímkoli jiným v e-mailu.
  const telefon =
    (formular && formular.telefon && najitTelefony(formular.telefon)[0]) ||
    najitTelefony(podpis.join("\n"))[0] ||
    najitTelefony(celyText)[0] ||
    (formular && najitTelefony(formular.zprava || "")[0]) ||
    "";

  // IČO (s ověřením kontrolní číslice, vlastní IČO se přeskočí)
  let ico = "";
  const reIco = /\bI[ČC]O?\s*[:.]?\s*(\d{2,3}\s?\d{2,3}\s?\d{2,3})\b/gi;
  let mIco;
  const textProIco = bezOdkazu(celyText);
  while ((mIco = reIco.exec(textProIco))) {
    const kandidat = mIco[1].replace(/\s/g, "");
    if (kandidat.length === 8 && kontrolaIco(kandidat) && kandidat !== (vlastni.ico || "")) {
      ico = kandidat;
      break;
    }
  }

  // Firma a jméno
  const vlastniNazev = bezDiakritiky(vlastni.nazev || "").replace(/[^a-z0-9]/g, "");
  const jeVlastniFirma = (r) => vlastniNazev && bezDiakritiky(r).replace(/[^a-z0-9]/g, "").includes(vlastniNazev.slice(0, 8));
  let firma = podpis.find((r) => RE_FIRMA.test(r) && r.length < 70 && !jeVlastniFirma(r)) || "";
  firma = firma.replace(/^(firma|společnost|spolecnost)\s*:\s*/i, "").split(/[,|•·]/)[0].trim();
  let jmeno = odJmeno && !odJmeno.includes("@") && !RE_FIRMA.test(odJmeno) && !jeVlastni(odEmail) ? odJmeno : "";
  if (formular && formular.jmeno && (!jmeno || jeVlastni(odEmail))) jmeno = formular.jmeno;
  if (!firma && formular && formular.firma && !jeVlastniFirma(formular.firma)) firma = formular.firma;
  if (!firma && odJmeno && RE_FIRMA.test(odJmeno) && !jeVlastniFirma(odJmeno)) firma = odJmeno;
  if (!jmeno) jmeno = (podpis.find(vypadaJakoJmeno) || "").replace(/[,;]$/, "").trim();
  if (!jmeno && emailZakaznika) {
    // jan.novak@… → nabídne se jen jako poslední možnost a jen u tvaru jmeno.prijmeni
    const lokal = emailZakaznika.split("@")[0];
    if (/^[a-z]{2,}\.[a-z]{2,}$/.test(lokal)) jmeno = lokal.split(".").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
  }
  const zakaznik = firma && jmeno ? `${firma} (${jmeno})` : firma || jmeno;

  // Adresa / místo realizace (nejdřív v těle — tam bývá místo stavby, pak v podpisu)
  const radkyZpravy = formular && formular.zprava ? formular.zprava.split("\n") : [];
  const zakaznikIdentifikace =
    najitAdresu(telo, vlastni.adresa) ||
    (formular && formular.adresa) ||
    najitAdresu(radkyZpravy, vlastni.adresa) ||
    najitAdresu(podpis, vlastni.adresa);

  const pozadovanyTermin = najitTermin(telo.join("\n"), dnes) || najitTermin(radkyZpravy.join("\n"), dnes);

  // Popis poptávky = předmět + text bez pozdravu, podpisu a citací
  // Předmět jen u nové zprávy od zákazníka — u odpovědi (Re:) je to obvykle náš předmět.
  const jeOdpoved = /^\s*(re|odp|aw)\s*:/i.test(predmet);
  const cistyPredmet = jeOdpoved || formular ? "" : predmet.replace(/^\s*((re|fw|fwd|odp|př|pr|tr|aw|wg)\s*:\s*)+/i, "").trim();
  let cisteTelo = telo.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (formular && formular.zprava) {
    const zpravaUzVTele = bezDiakritiky(cisteTelo).includes(bezDiakritiky(formular.zprava).slice(0, 40));
    const jeToSamotnaNotifikace = /formulář|formular/i.test(cisteTelo) && /webnode|vyplněn/i.test(cisteTelo);
    const poptavkaZWebu = `Poptávka z webového formuláře${formular.datum ? ` (${formular.datum})` : ""}:\n${formular.zprava}`;
    if (jeToSamotnaNotifikace || zpravaUzVTele || !cisteTelo) cisteTelo = poptavkaZWebu;
    else cisteTelo = `${poptavkaZWebu}\n\nDoplnění e-mailem:\n${cisteTelo}`;
  }
  const popis = [cistyPredmet && !bezDiakritiky(cisteTelo).startsWith(bezDiakritiky(cistyPredmet)) ? cistyPredmet : "", cisteTelo]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);

  return {
    zakaznik,
    telefon,
    email: emailZakaznika,
    ico,
    zakaznikIdentifikace,
    pozadovanyTermin,
    text: popis,
  };
}
