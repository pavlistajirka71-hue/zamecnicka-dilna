"use client";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { C, FONTS } from "@/lib/theme";
import { normJmeno, klicOdberatele } from "@/lib/odberatele";
import { Field, TextInput, TextArea, Button } from "./ui";

// Databáze odběratelů: všichni zákazníci ze zakázek a poptávek + ručně přidaní.
// Úpravy se ukládají do tabulky "odberatele". Smazání zákazníka jen skryje
// z našeptávače — zakázky ani poptávky se tím NIKDY nemění.
export default function OdberateleKatalog({ seznam, nacteno, onSave, onSkryt }) {
  const [hledat, setHledat] = useState("");
  const [editing, setEditing] = useState(null); // null | "novy" | odberatel
  const [f, setF] = useState({});
  const [chyba, setChyba] = useState("");
  const [ukladam, setUkladam] = useState(false);

  const zobrazeni = useMemo(() => {
    const q = normJmeno(hledat);
    if (!q) return seznam;
    return seznam.filter((o) => [o.nazev, o.ico, o.telefon, o.email, o.zakaznikIdentifikace].some((v) => normJmeno(v).includes(q)));
  }, [seznam, hledat]);

  if (!nacteno) {
    return (
      <div style={{ fontSize: 13, color: C.inkSoft, padding: 12 }}>
        Našeptávač už funguje ze zákazníků v zakázkách a poptávkách. Aby šlo odběratele i ručně přidávat a upravovat, je potřeba v Supabase jednou spustit
        skript <span style={{ fontFamily: FONTS.mono }}>supabase/odberatele.sql</span>.
      </div>
    );
  }

  const otevrit = (o) => {
    setChyba("");
    setEditing(o || "novy");
    setF(o ? { ...o } : { nazev: "", ico: "", zakaznikIdentifikace: "", telefon: "", email: "", poznamka: "" });
  };

  const ulozit = async () => {
    if (!(f.nazev || "").trim()) return;
    setUkladam(true);
    setChyba("");
    try {
      await onSave({ ...f, nazev: f.nazev.trim() }, editing !== "novy" ? editing.id : null);
      setEditing(null);
    } catch (e) {
      setChyba(e.message || "Uložení se nepovedlo.");
    }
    setUkladam(false);
  };

  if (editing) {
    return (
      <div>
        <Field label="Název / jméno odběratele">
          <TextInput value={f.nazev} onChange={(e) => setF((x) => ({ ...x, nazev: e.target.value }))} autoFocus={editing === "novy"} />
        </Field>
        <div className="field-row">
          <Field label="Telefon">
            <TextInput type="tel" value={f.telefon || ""} onChange={(e) => setF((x) => ({ ...x, telefon: e.target.value }))} />
          </Field>
          <Field label="E-mail">
            <TextInput type="email" value={f.email || ""} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} />
          </Field>
        </div>
        <Field label="IČO (nepovinné)">
          <TextInput value={f.ico || ""} onChange={(e) => setF((x) => ({ ...x, ico: e.target.value.replace(/\D/g, "").slice(0, 8) }))} />
        </Field>
        <Field label="Adresa / identifikace (adresa, DIČ…)">
          <TextArea value={f.zakaznikIdentifikace || ""} onChange={(e) => setF((x) => ({ ...x, zakaznikIdentifikace: e.target.value }))} style={{ minHeight: 50 }} />
        </Field>
        <Field label="Poznámka (nepovinné)">
          <TextArea value={f.poznamka || ""} onChange={(e) => setF((x) => ({ ...x, poznamka: e.target.value }))} style={{ minHeight: 44 }} />
        </Field>
        {chyba && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{chyba}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
            Zrušit
          </Button>
          <Button variant="primary" type="button" onClick={ulozit} disabled={ukladam || !(f.nazev || "").trim()}>
            {ukladam ? "Ukládám…" : "Uložit odběratele"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 12, color: C.inkSoft }} />
          <TextInput value={hledat} onChange={(e) => setHledat(e.target.value)} placeholder="Hledat jméno, IČO, telefon…" style={{ paddingLeft: 30 }} />
        </div>
        <Button variant="ghost" type="button" onClick={() => otevrit(null)}>
          <Plus size={14} /> Přidat odběratele
        </Button>
      </div>
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>
        {seznam.length} odběratelů — automaticky ze zakázek a poptávek, nové se ukládají samy při uložení zakázky.
      </div>
      <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
        {zobrazeni.map((o) => (
          <div key={o.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {o.nazev}
                {o.pocet > 0 && <span style={{ fontWeight: 400, fontSize: 11, color: C.inkSoft }}> · {o.pocet} {o.pocet === 1 ? "zakázka" : o.pocet < 5 ? "zakázky" : "zakázek"}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft, whiteSpace: "pre-line" }}>
                {[o.ico && `IČO ${o.ico}`, o.telefon, o.email].filter(Boolean).join(" · ")}
                {o.zakaznikIdentifikace ? `\n${o.zakaznikIdentifikace}` : ""}
              </div>
            </div>
            <button type="button" title="Upravit" aria-label="Upravit" onClick={() => otevrit(o)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 4 }}>
              <Pencil size={15} />
            </button>
            <button
              type="button"
              title="Odebrat z našeptávače"
              aria-label="Odebrat z našeptávače"
              onClick={() => window.confirm(`Odebrat „${o.nazev}“ z našeptávače? Zakázky a poptávky tohoto zákazníka zůstanou beze změny.`) && onSkryt(o)}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, padding: 4 }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {zobrazeni.length === 0 && <div style={{ fontSize: 13, color: C.inkSoft, padding: 10 }}>Nic nenalezeno.</div>}
      </div>
    </div>
  );
}

export { klicOdberatele };
