"use client";
import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, uid, todayISO } from "@/lib/theme";
import { nahratFotku } from "@/lib/uploadClient";
import { ZDROJE_POPTAVKY, slozkaPoptavky, zalohoveCisloPoptavky } from "@/lib/poptavky";
import { Field, TextInput, TextArea, Select, Button, SectionLabel } from "./ui";
import VyberFotek from "./VyberFotek";
import NacistZEmailu from "./NacistZEmailu";

const NAZVY_POLI = {
  zakaznik: "zákazník",
  telefon: "telefon",
  email: "e-mail",
  ico: "IČO",
  zakaznikIdentifikace: "adresa",
  pozadovanyTermin: "termín",
  text: "popis",
};

// Založení nové poptávky (i s fotkami najednou) nebo úprava údajů existující.
// Fotky a poznámky u existující poptávky se přidávají v jejím detailu.
export default function PoptavkaForm({ initial, poptavky, vlastni, organizace, onSaveOrganizace, onSave, onClose }) {
  const jeNova = !initial;
  const [f, setF] = useState(
    () =>
      initial || {
        zakaznik: "",
        telefon: "",
        email: "",
        ico: "",
        zakaznikIdentifikace: "",
        zdroj: "Telefon",
        text: "",
        pozadovanyTermin: "",
      }
  );
  const [bloby, setBloby] = useState([]); // fotky čekající na nahrání (jen u nové poptávky)
  const [nahledy, setNahledy] = useState([]);
  const [ukladam, setUkladam] = useState(false);
  const [stavNahravani, setStavNahravani] = useState("");
  const [chyba, setChyba] = useState("");
  const [zEmailu, setZEmailu] = useState(null); // shrnutí, co se z e-mailu načetlo
  const [ares, setAres] = useState(null); // { stav: "hledam" | "ok" | "chyba", text }

  // Údaje firmy podle IČO: nejdřív z katalogu organizací v aplikaci (bez čekání),
  // jinak z ARES (veřejný státní registr, zdarma) a výsledek se uloží do katalogu.
  const najitFirmu = async (ico) => {
    const zKatalogu = (organizace || []).find((o) => o.ico === ico && o.nazev);
    if (zKatalogu) return { ...zKatalogu, zdroj: "katalog" };
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await fetch(`/api/ares?ico=${encodeURIComponent(ico)}`, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Vyhledávání v ARES se nepovedlo.");
    if (onSaveOrganizace) onSaveOrganizace(data);
    return { ...data, zdroj: "ARES" };
  };

  // Doplní oficiální název firmy a sídlo. Jméno kontaktní osoby (z e-mailu nebo
  // ručně napsané) se zachová v závorce, místo realizace z e-mailu se nepřepíše.
  const doplnitZAres = async (ico, { prepsatNazev }) => {
    if (!/^\d{8}$/.test(ico || "")) return;
    setAres({ stav: "hledam", text: `Ověřuji IČO ${ico} v ARES…` });
    try {
      const firma = await najitFirmu(ico);
      setF((prev) => {
        const dalsi = { ...prev, ico: firma.ico || ico };
        const puvodni = (prev.zakaznik || "").trim();
        if (firma.nazev && (prepsatNazev || !puvodni)) {
          const vZavorce = puvodni.match(/\(([^)]+)\)\s*$/);
          const osoba = vZavorce ? vZavorce[1] : /\b(s\.\s?r\.\s?o|a\.\s?s\.|spol\.|v\.\s?o\.\s?s)/i.test(puvodni) ? "" : puvodni;
          dalsi.zakaznik = osoba && osoba.toLowerCase() !== firma.nazev.toLowerCase() ? `${firma.nazev} (${osoba})` : firma.nazev;
        }
        if (!(prev.zakaznikIdentifikace || "").trim() && firma.adresa) {
          dalsi.zakaznikIdentifikace = firma.dic ? `${firma.adresa}\nDIČ: ${firma.dic}` : firma.adresa;
        }
        return dalsi;
      });
      setAres({ stav: "ok", text: `${firma.zdroj === "ARES" ? "Ověřeno v ARES" : "Nalezeno v katalogu organizací"}: ${firma.nazev}${firma.adresa ? `, ${firma.adresa}` : ""}` });
    } catch (e) {
      setAres({ stav: "chyba", text: e.message || "ARES teď neodpovídá, údaje doplň ručně nebo to zkus později." });
    }
  };

  // Doplní jen prázdná pole — nic, co už je ve formuláři napsané, se nepřepíše.
  const prevzitZEmailu = ({ udaje, fotky, ostatniPrilohy }) => {
    const jePrazdne = (k) => !(f[k] || "").toString().trim();
    const nalezeno = Object.keys(NAZVY_POLI).filter((k) => udaje[k] && jePrazdne(k));
    setF((prev) => {
      const dalsi = { ...prev, zdroj: "E-mail" };
      nalezeno.forEach((k) => (dalsi[k] = udaje[k]));
      return dalsi;
    });
    if (fotky.length) setBloby((prev) => [...prev, ...fotky]);
    setZEmailu({ nalezeno: nalezeno.map((k) => NAZVY_POLI[k]), fotek: fotky.length, ostatniPrilohy });
    // Našlo se IČO → rovnou oficiální údaje firmy z ARES. Název se přepíše jen tehdy,
    // když zákazníka doplnil e-mail (ne když už byl ručně napsaný).
    if (udaje.ico && jePrazdne("ico")) {
      doplnitZAres(udaje.ico, { prepsatNazev: jePrazdne("zakaznik") });
    }
  };

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    const urls = bloby.map((b) => URL.createObjectURL(b));
    setNahledy(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [bloby]);

  const ziskatCislo = async () => {
    const rok = new Date().getFullYear();
    try {
      const { data, error } = await supabase.rpc("ziskat_dalsi_cislo_poptavky", { p_rok: rok });
      if (error) throw error;
      return `P-${rok}-${String(data).padStart(4, "0")}`;
    } catch (e) {
      console.error("Serverové přidělení čísla poptávky se nepovedlo, používám záložní výpočet:", e);
      return zalohoveCisloPoptavky(poptavky);
    }
  };

  const ulozit = async () => {
    if (!f.zakaznik.trim()) return;
    setUkladam(true);
    setChyba("");
    try {
      const zaznam = {
        ...f,
        zakaznik: f.zakaznik.trim(),
        pozadovanyTermin: f.pozadovanyTermin || null,
      };
      if (jeNova) {
        zaznam.cislo = await ziskatCislo();
        zaznam.stav = "nova";
        zaznam.vytvoreno = todayISO();
        const fotky = [];
        for (let i = 0; i < bloby.length; i++) {
          setStavNahravani(`Nahrávám fotku ${i + 1} z ${bloby.length}…`);
          const path = await nahratFotku(bloby[i], `poptavka-${zaznam.cislo}-${uid()}.jpg`, "fotky", slozkaPoptavky(zaznam));
          fotky.push({ id: uid(), datum: todayISO(), path, popis: "" });
        }
        zaznam.fotky = fotky;
        zaznam.poznamky = [];
      }
      setStavNahravani("Ukládám…");
      await onSave(zaznam);
    } catch (e) {
      console.error(e);
      setChyba("Uložení se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      setUkladam(false);
      setStavNahravani("");
    }
  };

  return (
    <div>
      {!jeNova && (
        <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>Poptávka {initial.cislo}</div>
      )}
      {jeNova && <NacistZEmailu vlastni={vlastni} onNacteno={prevzitZEmailu} />}
      {zEmailu && (
        <div style={{ background: "#E6F0E8", border: `1px solid ${C.moss}`, borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>
          {zEmailu.nalezeno.length ? (
            <>Z e-mailu doplněno: <strong>{zEmailu.nalezeno.join(", ")}</strong>.</>
          ) : (
            <>V e-mailu jsem nenašel nic, co by šlo doplnit do prázdných polí.</>
          )}
          {zEmailu.fotek > 0 && <> Přidáno fotek z příloh: <strong>{zEmailu.fotek}</strong>.</>}
          {zEmailu.ostatniPrilohy > 0 && <> Ostatní přílohy ({zEmailu.ostatniPrilohy}, např. PDF) se nepřenesly — zůstávají v Outlooku.</>}
          <div style={{ color: C.inkSoft, marginTop: 2 }}>Všechno prosím zkontroluj, rozpoznávání není neomylné.</div>
        </div>
      )}
      <Field label="Zákazník (jméno nebo firma)">
        <TextInput value={f.zakaznik} onChange={(e) => set("zakaznik", e.target.value)} autoFocus={jeNova} />
      </Field>
      <div className="field-row">
        <Field label="Telefon">
          <TextInput type="tel" value={f.telefon || ""} onChange={(e) => set("telefon", e.target.value)} />
        </Field>
        <Field label="E-mail">
          <TextInput type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Odkud poptávka přišla">
          <Select value={f.zdroj || ""} onChange={(e) => set("zdroj", e.target.value)}>
            {ZDROJE_POPTAVKY.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kdy to zákazník potřebuje (nepovinné)">
          <TextInput type="date" value={f.pozadovanyTermin || ""} onChange={(e) => set("pozadovanyTermin", e.target.value)} />
        </Field>
      </div>
      <Field label="Adresa / místo realizace (nepovinné)">
        <TextArea value={f.zakaznikIdentifikace || ""} onChange={(e) => set("zakaznikIdentifikace", e.target.value)} style={{ minHeight: 44 }} />
      </Field>
      <div className="field-row" style={{ alignItems: "flex-end" }}>
        <Field label="IČO (nepovinné — u firem)">
          <TextInput value={f.ico || ""} onChange={(e) => set("ico", e.target.value.replace(/\D/g, "").slice(0, 8))} />
        </Field>
        <Button
          variant="ghost"
          type="button"
          onClick={() => doplnitZAres(f.ico, { prepsatNazev: true })}
          disabled={!/^\d{8}$/.test(f.ico || "") || ares?.stav === "hledam"}
          style={{ marginBottom: 12 }}
        >
          <Search size={14} /> {ares?.stav === "hledam" ? "Hledám…" : "Doplnit z ARES"}
        </Button>
      </div>
      {ares && (
        <div style={{ fontSize: 12, marginTop: -6, marginBottom: 12, color: ares.stav === "chyba" ? C.rust : ares.stav === "ok" ? C.moss : C.inkSoft }}>
          {ares.text}
        </div>
      )}
      <Field label="Co zákazník poptává">
        <TextArea value={f.text || ""} onChange={(e) => set("text", e.target.value)} style={{ minHeight: 110 }} />
      </Field>

      {jeNova && (
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Fotky {bloby.length ? `(${bloby.length})` : ""}</SectionLabel>
          {nahledy.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {nahledy.map((url, i) => (
                <div key={url} style={{ position: "relative" }}>
                  <img src={url} alt="" style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.line}`, display: "block" }} />
                  <button
                    type="button"
                    onClick={() => setBloby((prev) => prev.filter((_, j) => j !== i))}
                    disabled={ukladam}
                    title="Odebrat"
                    style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 10, width: 20, height: 20, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <VyberFotek disabled={ukladam} onVybrano={(nove) => setBloby((prev) => [...prev, ...nove])} />
        </div>
      )}

      {!f.zakaznik.trim() && <div style={{ fontSize: 12, color: C.rust, textAlign: "right" }}>Vyplň zákazníka, ať jde poptávku uložit.</div>}
      {chyba && <div style={{ fontSize: 13, color: C.danger, marginTop: 4, textAlign: "right" }}>{chyba}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 8 }}>
        {stavNahravani && <span style={{ fontSize: 12, color: C.inkSoft }}>{stavNahravani}</span>}
        <Button variant="ghost" type="button" onClick={onClose} disabled={ukladam}>
          Zrušit
        </Button>
        <Button variant="primary" type="button" onClick={ulozit} disabled={ukladam || !f.zakaznik.trim()}>
          {ukladam ? "Ukládám…" : jeNova ? "Uložit poptávku" : "Uložit změny"}
        </Button>
      </div>
    </div>
  );
}
