"use client";
import { useState } from "react";
import { Field, TextInput, Select, Button, SectionLabel } from "./ui";

export default function NastaveniForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <div>
      <SectionLabel>Sazby za práci</SectionLabel>
      <div className="field-row">
        <Field label="Sazba dílna (Kč/h)">
          <TextInput type="number" value={f.sazbaDilna} onChange={(e) => set("sazbaDilna", e.target.value)} />
        </Field>
        <Field label="Sazba montáž (Kč/h)">
          <TextInput type="number" value={f.sazbaMontaz} onChange={(e) => set("sazbaMontaz", e.target.value)} />
        </Field>
      </div>
      <SectionLabel>Kooperace</SectionLabel>
      <div className="field-row">
        <Field label="Zinkování (Kč/kg)">
          <TextInput type="number" value={f.cenaZinkovani} onChange={(e) => set("cenaZinkovani", e.target.value)} />
        </Field>
        <Field label="Lakování (Kč/m²)">
          <TextInput type="number" value={f.cenaLakovani} onChange={(e) => set("cenaLakovani", e.target.value)} />
        </Field>
      </div>
      <SectionLabel>Kalkulace</SectionLabel>
      <Field label="Zaokrouhlovat finální cenu na (Kč)">
        <Select value={f.zaokrouhleniNa} onChange={(e) => set("zaokrouhleniNa", Number(e.target.value))}>
          <option value={1}>Nezaokrouhlovat</option>
          <option value={10}>10 Kč</option>
          <option value={100}>100 Kč</option>
          <option value={1000}>1000 Kč</option>
        </Select>
      </Field>
      <div style={{ fontSize: 12, color: "#5B5A52", marginTop: 4, marginBottom: 16 }}>DPH je pevně 21 % (aktuální česká sazba).</div>

      <SectionLabel>Firma (zhotovitel na předávacím protokolu)</SectionLabel>
      <Field label="Název firmy">
        <TextInput value={f.firmaNazev} onChange={(e) => set("firmaNazev", e.target.value)} placeholder="Zámečnictví Novák s.r.o." />
      </Field>
      <Field label="Adresa">
        <TextInput value={f.firmaAdresa} onChange={(e) => set("firmaAdresa", e.target.value)} placeholder="Dílenská 12, 100 00 Praha" />
      </Field>
      <div className="field-row">
        <Field label="IČO">
          <TextInput value={f.firmaIco} onChange={(e) => set("firmaIco", e.target.value)} />
        </Field>
        <Field label="DIČ">
          <TextInput value={f.firmaDic} onChange={(e) => set("firmaDic", e.target.value)} />
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose} type="button">
          Zrušit
        </Button>
        <Button variant="primary" type="button" onClick={() => onSave(f)}>
          Uložit nastavení
        </Button>
      </div>
    </div>
  );
}
