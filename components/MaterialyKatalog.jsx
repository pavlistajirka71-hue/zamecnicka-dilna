"use client";
import { useRef, useState } from "react";
import { Plus, Trash2, Pencil, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, MATERIAL_UNITS, fmtMoney } from "@/lib/theme";
import { Field, TextInput, Select, Button, iconBtnStyle } from "./ui";

function ParseError(msg) {
  this.msg = msg;
}

function parseCSV(text) {
  // Podporuje oddělovač ; nebo , a hlavičku: dodavatel;nazev;cena;jednotka;vaha;plocha
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new ParseError("Soubor neobsahuje žádná data.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
  const idx = {
    dodavatel: header.indexOf("dodavatel"),
    nazev: header.indexOf("nazev"),
    cena: header.indexOf("cena"),
    jednotka: header.indexOf("jednotka"),
    vaha: header.indexOf("vaha"),
    plocha: header.indexOf("plocha"),
  };
  if (idx.nazev === -1) throw new ParseError('CSV musí mít sloupec "nazev".');

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      nazev: cols[idx.nazev] || "",
      dodavatel: idx.dodavatel > -1 ? cols[idx.dodavatel] || "" : "",
      cena: idx.cena > -1 ? Number(cols[idx.cena].replace(",", ".")) || 0 : 0,
      jednotka: idx.jednotka > -1 ? cols[idx.jednotka] || "kg" : "kg",
      vaha: idx.vaha > -1 ? Number(cols[idx.vaha].replace(",", ".")) || 0 : 0,
      plocha: idx.plocha > -1 ? Number(cols[idx.plocha].replace(",", ".")) || 0 : 0,
    };
  });
}

export default function MaterialyKatalog({ materialHistory, onChange, onClose }) {
  const [editing, setEditing] = useState(null); // material object being edited, or "new"
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const saveItem = async (item, originalNazev) => {
    const clean = {
      nazev: item.nazev.trim(),
      dodavatel: item.dodavatel || "",
      cena: Number(item.cena) || 0,
      jednotka: item.jednotka || "kg",
      vaha: Number(item.vaha) || 0,
      plocha: Number(item.plocha) || 0,
    };
    if (!clean.nazev) return;
    const renamed = originalNazev && originalNazev.toLowerCase() !== clean.nazev.toLowerCase();
    if (renamed) {
      // "nazev" is the primary key — upserting under a new name would leave the old row behind.
      await supabase.from("material_history").delete().eq("nazev", originalNazev);
    }
    await supabase.from("material_history").upsert(clean);
    const next = [...materialHistory.filter((m) => m.nazev.toLowerCase() !== clean.nazev.toLowerCase() && m.nazev !== originalNazev), clean];
    onChange(next);
    setEditing(null);
  };

  const deleteItem = async (nazev) => {
    await supabase.from("material_history").delete().eq("nazev", nazev);
    onChange(materialHistory.filter((m) => m.nazev !== nazev));
  };

  const handleImport = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportError("");
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text).filter((r) => r.nazev);
      if (rows.length === 0) throw new ParseError("V souboru se nenašly žádné platné řádky.");
      const { error } = await supabase.from("material_history").upsert(rows);
      if (error) throw error;
      const map = new Map(materialHistory.map((m) => [m.nazev.toLowerCase(), m]));
      rows.forEach((r) => map.set(r.nazev.toLowerCase(), r));
      onChange(Array.from(map.values()));
    } catch (err) {
      setImportError(err.msg || "Import se nepovedl — zkontroluj formát souboru.");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const list = [...materialHistory].sort((a, b) => a.nazev.localeCompare(b.nazev, "cs"));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: C.inkSoft, maxWidth: 340 }}>
          CSV formát (oddělovač <code>;</code> nebo <code>,</code>): <br />
          <span style={{ fontFamily: FONTS.mono }}>dodavatel;nazev;cena;jednotka;vaha;plocha</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImport} style={{ display: "none" }} />
          <Button variant="ghost" onClick={() => fileRef.current && fileRef.current.click()} disabled={importing}>
            <Upload size={14} /> {importing ? "Importuji…" : "Import CSV"}
          </Button>
          <Button variant="rust" onClick={() => setEditing("new")}>
            <Plus size={14} /> Přidat
          </Button>
        </div>
      </div>

      {importError && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{importError}</div>}

      {editing && (
        <MaterialEditForm
          initial={editing === "new" ? null : editing}
          onSave={(item) => saveItem(item, editing === "new" ? null : editing.nazev)}
          onCancel={() => setEditing(null)}
        />
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: C.inkSoft }}>Katalog materiálů je zatím prázdný.</div>
      ) : (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", marginTop: 10 }}>
          {list.map((m) => (
            <div
              key={m.nazev}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderBottom: `1px solid ${C.line}`,
                fontSize: 13,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{m.nazev}</div>
                <div style={{ color: C.inkSoft, fontFamily: FONTS.mono, fontSize: 11 }}>
                  {m.dodavatel ? `${m.dodavatel} · ` : ""}
                  {fmtMoney(m.cena)}/{m.jednotka} · {m.vaha || 0} kg/j · {m.plocha || 0} m²/j
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <button onClick={() => setEditing(m)} style={{ ...iconBtnStyle, color: C.steel }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => deleteItem(m.nazev)} style={{ ...iconBtnStyle, color: C.danger }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>
          <X size={14} /> Zavřít
        </Button>
      </div>
    </div>
  );
}

function MaterialEditForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { nazev: "", dodavatel: "", cena: "", jednotka: "kg", vaha: "", plocha: "" });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, marginBottom: 12, background: C.paper }}>
      <Field label="Název">
        <TextInput value={f.nazev} onChange={(e) => set("nazev", e.target.value)} placeholder="např. Plochá ocel 20x5" />
      </Field>
      <Field label="Dodavatel">
        <TextInput value={f.dodavatel} onChange={(e) => set("dodavatel", e.target.value)} placeholder="např. MZ Hutní materiály" />
      </Field>
      <div className="field-row">
        <Field label="Cena/jednotka">
          <TextInput type="number" value={f.cena} onChange={(e) => set("cena", e.target.value)} />
        </Field>
        <Field label="Jednotka">
          <Select value={f.jednotka} onChange={(e) => set("jednotka", e.target.value)}>
            {MATERIAL_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="field-row">
        <Field label="Váha kg/jednotka">
          <TextInput type="number" value={f.vaha} onChange={(e) => set("vaha", e.target.value)} />
        </Field>
        <Field label="Plocha m²/jednotka">
          <TextInput type="number" value={f.plocha} onChange={(e) => set("plocha", e.target.value)} />
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="ghost" onClick={onCancel}>
          Zrušit
        </Button>
        <Button variant="primary" onClick={() => onSave(f)}>
          Uložit
        </Button>
      </div>
    </div>
  );
}
