"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { C, FONTS, STATUSES, uid, todayISO, nextOrderNumber, dalsiCisloPodzakazky } from "@/lib/theme";
import { supabase } from "@/lib/supabaseClient";
import { Field, TextInput, TextArea, Select, Button, SectionLabel } from "./ui";

export default function OrderForm({ initial, orders, organizace, nadrazenaZakazka, duplikatZakazky, onSaveOrganizace, onSave, onClose }) {
  const [f, setF] = useState(() => {
    if (initial) return initial;
    if (duplikatZakazky) {
      // Duplikace: přenese se zákazník, popis a kalkulace (s novými id, ať jsou
      // nezávislé na originálu) — ale ne stav, termín, práce, náklady, fotky,
      // protokol ani archivy. Ty patří ke KONKRÉTNÍMU průběhu té staré zakázky,
      // ne k šabloně, kterou appka duplikuje.
      const d = duplikatZakazky;
      const novaKalkulace = (d.kalkulace || []).map((p) => ({
        ...p,
        id: uid(),
        materialy: (p.materialy || []).map((m) => ({ ...m, id: uid() })),
      }));
      const planCasDilna = novaKalkulace.reduce((s, p) => s + (Number(p.praceDilnaHodiny) || 0) * Math.max(1, Number(p.pocetKs) || 1), 0);
      const planCasMontaz = novaKalkulace.reduce((s, p) => s + (Number(p.praceMontazHodiny) || 0) * Math.max(1, Number(p.pocetKs) || 1), 0);
      return {
        id: uid(),
        cislo: "",
        zakaznik: d.zakaznik || "",
        zakaznikIdentifikace: d.zakaznikIdentifikace || "",
        ico: d.ico || "",
        telefon: d.telefon || "",
        email: d.email || "",
        popis: d.popis || "",
        stav: "nova",
        cena: "",
        termin: "",
        terminZahajeni: "",
        vytvoreno: todayISO(),
        poznamka: "",
        cisloFaktury: "",
        prace: [],
        uctenky: [],
        naklady: [],
        fotky: [],
        archivy: [],
        kalkulace: novaKalkulace,
        planCasDilna: planCasDilna || "",
        planCasMontaz: planCasMontaz || "",
        nadrazenaZakazkaId: null,
      };
    }
    return {
      id: uid(),
      cislo: "", // přidělí se bezpečně na serveru až při uložení, ne tady
      zakaznik: nadrazenaZakazka?.zakaznik || "",
      zakaznikIdentifikace: nadrazenaZakazka?.zakaznikIdentifikace || "",
      ico: nadrazenaZakazka?.ico || "",
      telefon: nadrazenaZakazka?.telefon || "",
      email: nadrazenaZakazka?.email || "",
      popis: "",
      stav: "nova",
      cena: "",
      termin: "",
      terminZahajeni: "",
      vytvoreno: todayISO(),
      poznamka: "",
      cisloFaktury: "",
      prace: [],
      uctenky: [],
      planCasDilna: "",
      planCasMontaz: "",
      nadrazenaZakazkaId: nadrazenaZakazka?.id || null,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hledamAres, setHledamAres] = useState(false);
  const [aresChyba, setAresChyba] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  // Číslo zakázky se u nové zakázky získává atomicky ze serveru (databázová funkce),
  // ne spočítáním "nejvyšší dosavadní +1" v prohlížeči — to by při současném založení
  // dvou zakázek různými lidmi mohlo dvěma zakázkám přidělit stejné číslo. U podzakázky
  // se místo toho odvozuje poddíslo hlavní zakázky (riziko souběhu je tu výrazně nižší).
  const ziskatCisloZeSeru = async () => {
    if (nadrazenaZakazka) {
      const existujiciPodzakazky = orders.filter((o) => o.nadrazenaZakazkaId === nadrazenaZakazka.id);
      return dalsiCisloPodzakazky(nadrazenaZakazka.cislo, existujiciPodzakazky);
    }
    const rok = new Date().getFullYear();
    try {
      const { data, error } = await supabase.rpc("ziskat_dalsi_cislo_zakazky", { p_rok: rok });
      if (error) throw error;
      return `Z-${rok}-${String(data).padStart(4, "0")}`;
    } catch (e) {
      console.error("Serverové přidělení čísla se nepovedlo, používám záložní výpočet:", e);
      return nextOrderNumber(orders); // záložní řešení (např. offline) — vzácně se může potkat s jiným číslem
    }
  };


  const navrhy = useMemo(() => {
    const dotaz = (f.ico || "").trim().toLowerCase();
    const dotazJmeno = (f.zakaznik || "").trim().toLowerCase();
    if (!dotaz && !dotazJmeno) return [];
    return (organizace || [])
      .filter((o) => (dotaz && o.ico.includes(dotaz)) || (dotazJmeno.length > 1 && o.nazev.toLowerCase().includes(dotazJmeno)))
      .slice(0, 6);
  }, [f.ico, f.zakaznik, organizace]);

  const vybratZKatalogu = (o) => {
    setF((prev) => ({
      ...prev,
      ico: o.ico,
      zakaznik: o.nazev,
      zakaznikIdentifikace: o.dic ? `${o.adresa}\nDIČ: ${o.dic}` : o.adresa,
      telefon: o.telefon || prev.telefon,
      email: o.email || prev.email,
    }));
    setShowSuggest(false);
  };

  const doplnitZAres = async () => {
    const ico = (f.ico || "").trim();
    if (!ico) return;
    setHledamAres(true);
    setAresChyba("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/ares?ico=${encodeURIComponent(ico)}`, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Vyhledávání v ARES se nepovedlo.");
      setF((prev) => ({
        ...prev,
        ico: data.ico,
        zakaznik: data.nazev || prev.zakaznik,
        zakaznikIdentifikace: data.dic ? `${data.adresa}\nDIČ: ${data.dic}` : data.adresa,
      }));
      if (onSaveOrganizace) onSaveOrganizace(data);
    } catch (e) {
      setAresChyba(e.message || "Vyhledávání v ARES se nepovedlo.");
    }
    setHledamAres(false);
  };

  return (
    <div>
      {nadrazenaZakazka && (
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>
          Podzakázka k <strong>{nadrazenaZakazka.cislo}</strong> — {nadrazenaZakazka.zakaznik}
        </div>
      )}
      {duplikatZakazky && (
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>
          Kopie zakázky <strong>{duplikatZakazky.cislo}</strong> — kalkulace se přenesla, uprav zákazníka a popis podle potřeby.
        </div>
      )}
      <div className="field-row">
        <Field label="Číslo zakázky">
          <TextInput value={f.cislo || "Přidělí se při uložení"} readOnly style={{ fontFamily: FONTS.mono, background: C.paper, color: f.cislo ? C.ink : C.inkSoft }} />
        </Field>
        <Field label="Stav">
          <Select value={f.stav} onChange={(e) => set("stav", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div style={{ position: "relative" }}>
        <Field label="Zákazník">
          <TextInput
            value={f.zakaznik}
            onChange={(e) => set("zakaznik", e.target.value)}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          />
        </Field>
        {showSuggest && navrhy.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 5,
              background: C.surface,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              maxHeight: 180,
              overflowY: "auto",
            }}
          >
            {navrhy.map((o) => (
              <div
                key={o.ico}
                onMouseDown={() => vybratZKatalogu(o)}
                style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${C.line}` }}
              >
                <div style={{ fontWeight: 600 }}>{o.nazev}</div>
                <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono }}>
                  IČO {o.ico}
                  {o.adresa ? ` · ${o.adresa}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="field-row" style={{ alignItems: "flex-end" }}>
        <Field label="IČO (nepovinné)">
          <TextInput
            value={f.ico || ""}
            onChange={(e) => set("ico", e.target.value.replace(/\D/g, "").slice(0, 8))}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          />
        </Field>
        <Button variant="ghost" type="button" onClick={doplnitZAres} disabled={hledamAres || !(f.ico || "").trim()} style={{ marginBottom: 12 }}>
          <Search size={14} /> {hledamAres ? "Hledám…" : "Doplnit z ARES"}
        </Button>
      </div>
      {aresChyba && <div style={{ fontSize: 12, color: C.rust, marginTop: -6, marginBottom: 10 }}>{aresChyba}</div>}

      <Field label="Identifikace zákazníka (adresa, DIČ... nepovinné)">
        <TextArea
          value={f.zakaznikIdentifikace || ""}
          onChange={(e) => set("zakaznikIdentifikace", e.target.value)}
          style={{ minHeight: 44 }}
        />
      </Field>
      <div className="field-row">
        <Field label="Telefon (nepovinné)">
          <TextInput type="tel" value={f.telefon || ""} onChange={(e) => set("telefon", e.target.value)} />
        </Field>
        <Field label="E-mail (nepovinné)">
          <TextInput type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      <Field label="Popis zakázky">
        <TextArea value={f.popis} onChange={(e) => set("popis", e.target.value)} />
      </Field>
      <div className="field-row">
        <Field label="Cena (Kč, nepovinné — doplní se z kalkulace)">
          <TextInput type="number" value={f.cena} onChange={(e) => set("cena", e.target.value)} />
        </Field>
        <Field label="Termín dokončení">
          <TextInput type="date" value={f.termin} onChange={(e) => set("termin", e.target.value)} />
        </Field>
      </div>
      <Field label="Termín zahájení výroby (nepovinné)">
        <TextInput type="date" value={f.terminZahajeni} onChange={(e) => set("terminZahajeni", e.target.value)} style={{ maxWidth: 220 }} />
      </Field>

      <SectionLabel>Fond pracovní (nepovinné — doplní se automaticky z kalkulace)</SectionLabel>
      <div className="field-row">
        <Field label="Plánovaný čas – dílna (h)">
          <TextInput
            type="number"
            step="0.5"
            value={f.planCasDilna}
            onChange={(e) => set("planCasDilna", e.target.value)}
          />
        </Field>
        <Field label="Plánovaný čas – montáž (h)">
          <TextInput
            type="number"
            step="0.5"
            value={f.planCasMontaz}
            onChange={(e) => set("planCasMontaz", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Poznámka">
        <TextArea value={f.poznamka} onChange={(e) => set("poznamka", e.target.value)} />
      </Field>

      {f.stav === "fakturovano" && (
        <Field label="Číslo faktury">
          <TextInput value={f.cisloFaktury} onChange={(e) => set("cisloFaktury", e.target.value)} />
        </Field>
      )}

      {!f.zakaznik && (
        <div style={{ fontSize: 12, color: C.rust, marginTop: 4, textAlign: "right" }}>Vyplň zákazníka, ať jde zakázku uložit.</div>
      )}
      {error && <div style={{ fontSize: 13, color: C.rust, marginTop: 4, textAlign: "right" }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Button variant="ghost" onClick={onClose} type="button">
          Zrušit
        </Button>
        <Button
          variant="primary"
          type="button"
          disabled={saving}
          onClick={async () => {
            if (!f.zakaznik) return;
            setSaving(true);
            setError("");
            try {
              const zaUlozeni = f.cislo ? f : { ...f, cislo: await ziskatCisloZeSeru() };
              await onSave(zaUlozeni);
              // I bez ARES appka uloží telefon/e-mail do katalogu organizací, ať se
              // příště nabídnou znovu — jen když má zakázka vyplněné IČO.
              if (f.ico && (f.telefon || f.email) && onSaveOrganizace) {
                onSaveOrganizace({ ico: f.ico, telefon: f.telefon || "", email: f.email || "" });
              }
            } catch (e) {
              setError("Uložení se nepovedlo, zkus to prosím znovu.");
              setSaving(false);
            }
          }}
        >
          {saving ? "Ukládám…" : "Uložit zakázku"}
        </Button>
      </div>
    </div>
  );
}
