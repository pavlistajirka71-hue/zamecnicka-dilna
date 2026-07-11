"use client";
import { useMemo, useState } from "react";
import { Plus, Printer } from "lucide-react";
import { C, FONTS, uid, DEFAULT_KALKULACE, computeKalkulace, fmtMoney } from "@/lib/theme";
import { Field, TextInput, Button, SectionLabel } from "./ui";
import MaterialRow from "./MaterialRow";

export default function KalkulaceForm({ order, nastaveni, materialHistory, onSave, onClose, onPrint }) {
  const [k, setK] = useState(order.kalkulace ? { ...DEFAULT_KALKULACE(), ...order.kalkulace } : DEFAULT_KALKULACE());
  const [saving, setSaving] = useState(false);
  const vysledek = useMemo(() => computeKalkulace(k, nastaveni), [k, nastaveni]);

  const addMaterial = () =>
    setK((prev) => ({
      ...prev,
      materialy: [...prev.materialy, { id: uid(), nazev: "", dodavatel: "", cena: "", jednotka: "kg", mnozstvi: "", vaha: "", plocha: "" }],
    }));
  const updateMaterial = (idx, item) => setK((prev) => ({ ...prev, materialy: prev.materialy.map((m, i) => (i === idx ? item : m)) }));
  const removeMaterial = (idx) => setK((prev) => ({ ...prev, materialy: prev.materialy.filter((_, i) => i !== idx) }));

  return (
    <div>
      <SectionLabel>Materiál</SectionLabel>
      {k.materialy.map((m, idx) => (
        <MaterialRow key={m.id} item={m} history={materialHistory} onChange={(v) => updateMaterial(idx, v)} onRemove={() => removeMaterial(idx)} />
      ))}
      <Button variant="ghost" type="button" onClick={addMaterial} style={{ marginBottom: 16 }}>
        <Plus size={14} /> Přidat materiál
      </Button>

      <SectionLabel>Práce</SectionLabel>
      <div className="field-row">
        <Field label={`Dílna (h) · ${fmtMoney(nastaveni.sazbaDilna)}/h`}>
          <TextInput type="number" step="0.5" value={k.praceDilnaHodiny} onChange={(e) => setK({ ...k, praceDilnaHodiny: e.target.value })} />
        </Field>
        <Field label={`Montáž (h) · ${fmtMoney(nastaveni.sazbaMontaz)}/h`}>
          <TextInput type="number" step="0.5" value={k.praceMontazHodiny} onChange={(e) => setK({ ...k, praceMontazHodiny: e.target.value })} />
        </Field>
      </div>

      <SectionLabel>Kooperace</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={k.zinkovaniAktivni} onChange={(e) => setK({ ...k, zinkovaniAktivni: e.target.checked })} />
          Zinkování — {vysledek.vahaSum} kg × {fmtMoney(nastaveni.cenaZinkovani)} = {fmtMoney(vysledek.zinkovaniSum)}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={k.lakovaniAktivni} onChange={(e) => setK({ ...k, lakovaniAktivni: e.target.checked })} />
          Lakování — {vysledek.plochaSum} m² × {fmtMoney(nastaveni.cenaLakovani)} = {fmtMoney(vysledek.lakovaniSum)}
        </label>
      </div>

      <SectionLabel>Přirážka a DPH</SectionLabel>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="Přirážka (%)">
          <TextInput type="number" value={k.prirazkaPct} onChange={(e) => setK({ ...k, prirazkaPct: e.target.value })} />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, flex: 1 }}>
          <input type="checkbox" checked={k.sDph} onChange={(e) => setK({ ...k, sDph: e.target.checked })} />
          Zobrazit a použít cenu s DPH (21 %)
        </label>
      </div>

      <div style={{ background: C.paper, borderRadius: 8, padding: 14, marginTop: 8, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Náklady celkem</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.naklady)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Cena bez DPH</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.cenaBezDph)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Cena s DPH (21 %)</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.cenaSDph)}</span>
        </div>
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600 }}>
            <span>Plánovaná marže</span>
            <span style={{ fontFamily: FONTS.mono, color: vysledek.marzeKc >= 0 ? C.moss : C.danger }}>
              {fmtMoney(vysledek.marzeKc)} ({vysledek.marzePct.toFixed(1)} %)
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <Button variant="ghost" type="button" onClick={() => onPrint(k, vysledek)}>
          <Printer size={14} /> Tisk nabídky
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Zrušit
          </Button>
          <Button variant="primary" type="button" disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              await onSave(k, vysledek);
            } finally {
              setSaving(false);
            }
          }}>
            {saving ? "Ukládám…" : "Uložit kalkulaci"}
          </Button>
        </div>
      </div>
    </div>
  );
}
