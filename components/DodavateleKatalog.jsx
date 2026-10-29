"use client";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
import { C, FONTS } from "@/lib/theme";
import { Field, TextInput, TextArea, Button } from "./ui";

// Adresář dodavatelů materiálu. Název musí odpovídat názvu dodavatele u materiálu
// (v katalogu materiálů a v kalkulaci) — podle něj se pak v poptávce materiálu
// automaticky doplní e-mail.
export default function DodavateleKatalog({ dodavatele, materialHistory, nacteno, onSave, onDelete }) {
  const [editing, setEditing] = useState(null); // null | "novy" | dodavatel
  const [f, setF] = useState({});
  const [chyba, setChyba] = useState("");
  const [ukladam, setUkladam] = useState(false);

  // Dodavatelé z katalogu materiálů, kteří ještě nemají kontakt
  const bezKontaktu = useMemo(() => {
    const znami = new Set((dodavatele || []).map((d) => d.nazev.toLowerCase()));
    const jmena = new Set();
    (materialHistory || []).forEach((m) => {
      const n = (m.dodavatel || "").trim();
      if (n && !znami.has(n.toLowerCase())) jmena.add(n);
    });
    return Array.from(jmena).sort((a, b) => a.localeCompare(b, "cs"));
  }, [dodavatele, materialHistory]);

  const otevrit = (d, predvyplnenyNazev) => {
    setChyba("");
    setEditing(d || "novy");
    setF(d ? { ...d } : { nazev: predvyplnenyNazev || "", email: "", telefon: "", kontakt: "", poznamka: "" });
  };

  const ulozit = async () => {
    if (!f.nazev || !f.nazev.trim()) return;
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setChyba("E-mail nevypadá správně.");
      return;
    }
    setUkladam(true);
    setChyba("");
    try {
      await onSave({ ...f, nazev: f.nazev.trim(), email: (f.email || "").trim() }, editing !== "novy" ? editing.nazev : null);
      setEditing(null);
    } catch (e) {
      setChyba(e.message || "Uložení se nepovedlo.");
    }
    setUkladam(false);
  };

  if (!nacteno) {
    return (
      <div style={{ fontSize: 13, color: C.inkSoft, padding: 12 }}>
        Adresář dodavatelů zatím není zapnutý — v Supabase je potřeba jednou spustit skript <span style={{ fontFamily: FONTS.mono }}>supabase/dodavatele.sql</span>.
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <Field label="Název dodavatele (stejný jako u materiálu)">
          <TextInput value={f.nazev} onChange={(e) => setF((x) => ({ ...x, nazev: e.target.value }))} autoFocus={editing === "novy"} />
        </Field>
        <div className="field-row">
          <Field label="E-mail pro poptávky">
            <TextInput type="email" value={f.email || ""} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} />
          </Field>
          <Field label="Telefon">
            <TextInput type="tel" value={f.telefon || ""} onChange={(e) => setF((x) => ({ ...x, telefon: e.target.value }))} />
          </Field>
        </div>
        <Field label="Kontaktní osoba (nepovinné)">
          <TextInput value={f.kontakt || ""} onChange={(e) => setF((x) => ({ ...x, kontakt: e.target.value }))} />
        </Field>
        <Field label="Poznámka (nepovinné — pobočka, číslo zákazníka, platební podmínky…)">
          <TextArea value={f.poznamka || ""} onChange={(e) => setF((x) => ({ ...x, poznamka: e.target.value }))} style={{ minHeight: 50 }} />
        </Field>
        {chyba && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{chyba}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
            Zrušit
          </Button>
          <Button variant="primary" type="button" onClick={ulozit} disabled={ukladam || !(f.nazev || "").trim()}>
            {ukladam ? "Ukládám…" : "Uložit dodavatele"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" type="button" onClick={() => otevrit(null)} style={{ marginBottom: 12 }}>
        <Plus size={14} /> Přidat dodavatele
      </Button>

      {(dodavatele || []).length === 0 && bezKontaktu.length === 0 && (
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>Zatím žádní dodavatelé.</div>
      )}

      {(dodavatele || [])
        .slice()
        .sort((a, b) => a.nazev.localeCompare(b.nazev, "cs"))
        .map((d) => (
          <div key={d.nazev} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{d.nazev}</div>
              <div style={{ fontSize: 12, color: C.inkSoft, display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {d.email ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Mail size={12} /> {d.email}
                  </span>
                ) : (
                  <span style={{ color: C.rust }}>chybí e-mail</span>
                )}
                {d.telefon && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Phone size={12} /> {d.telefon}
                  </span>
                )}
                {d.kontakt && <span>{d.kontakt}</span>}
              </div>
              {d.poznamka && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2, whiteSpace: "pre-wrap" }}>{d.poznamka}</div>}
            </div>
            <button type="button" title="Upravit" onClick={() => otevrit(d)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 4 }}>
              <Pencil size={15} />
            </button>
            <button
              type="button"
              title="Smazat"
              onClick={() => window.confirm(`Smazat dodavatele ${d.nazev} z adresáře? (Materiály v katalogu ani kalkulace se nezmění.)`) && onDelete(d)}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, padding: 4 }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

      {bezKontaktu.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 6 }}>Dodavatelé z katalogu materiálů bez kontaktu — klikni a doplň e-mail:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {bezKontaktu.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => otevrit(null, n)}
                style={{ border: `1px dashed ${C.line}`, background: C.paper, borderRadius: 14, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: C.ink }}
              >
                + {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
