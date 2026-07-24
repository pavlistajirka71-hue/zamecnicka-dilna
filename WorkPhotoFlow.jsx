"use client";
import { useState } from "react";
import { C, FONTS, STATUSES, uid, todayISO, nextOrderNumber } from "@/lib/theme";
import { Field, TextInput, TextArea, Select, Button, SectionLabel } from "./ui";

export default function OrderForm({ initial, orders, onSave, onClose }) {
  const [f, setF] = useState(
    initial || {
      id: uid(),
      cislo: nextOrderNumber(orders),
      zakaznik: "",
      zakaznikIdentifikace: "",
      popis: "",
      stav: "nova",
      cena: "",
      termin: "",
      vytvoreno: todayISO(),
      reseni: "",
      poznamka: "",
      cisloFaktury: "",
      prace: [],
      uctenky: [],
      planCasDilna: "",
      planCasMontaz: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="field-row">
        <Field label="Číslo zakázky">
          <TextInput value={f.cislo} readOnly style={{ fontFamily: FONTS.mono, background: C.paper }} />
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
      <Field label="Zákazník">
        <TextInput value={f.zakaznik} onChange={(e) => set("zakaznik", e.target.value)} placeholder="Jméno / firma" />
      </Field>
      <Field label="Identifikace zákazníka (adresa, IČO... nepovinné)">
        <TextArea
          value={f.zakaznikIdentifikace || ""}
          onChange={(e) => set("zakaznikIdentifikace", e.target.value)}
          placeholder="Adresa, IČO/DIČ — použije se na předávacím protokolu"
          style={{ minHeight: 44 }}
        />
      </Field>
      <Field label="Popis zakázky">
        <TextArea value={f.popis} onChange={(e) => set("popis", e.target.value)} placeholder="Co se má vyrobit / opravit" />
      </Field>
      <div className="field-row">
        <Field label="Cena (Kč)">
          <TextInput type="number" value={f.cena} onChange={(e) => set("cena", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Termín dokončení">
          <TextInput type="date" value={f.termin} onChange={(e) => set("termin", e.target.value)} />
        </Field>
      </div>
      <Field label="Kdo dělá">
        <TextInput value={f.reseni} onChange={(e) => set("reseni", e.target.value)} placeholder="Jméno pracovníka" />
      </Field>

      <SectionLabel>Fond pracovní (povinné)</SectionLabel>
      <div className="field-row">
        <Field label="Plánovaný čas – dílna (h) *">
          <TextInput
            type="number"
            step="0.5"
            required
            value={f.planCasDilna}
            onChange={(e) => set("planCasDilna", e.target.value)}
            placeholder="např. 8"
            style={f.planCasDilna === "" ? { borderColor: C.rust } : {}}
          />
        </Field>
        <Field label="Plánovaný čas – montáž (h) *">
          <TextInput
            type="number"
            step="0.5"
            required
            value={f.planCasMontaz}
            onChange={(e) => set("planCasMontaz", e.target.value)}
            placeholder="např. 4"
            style={f.planCasMontaz === "" ? { borderColor: C.rust } : {}}
          />
        </Field>
      </div>

      <Field label="Poznámka">
        <TextArea value={f.poznamka} onChange={(e) => set("poznamka", e.target.value)} placeholder="Interní poznámky…" />
      </Field>

      {f.stav === "fakturovano" && (
        <Field label="Číslo faktury">
          <TextInput value={f.cisloFaktury} onChange={(e) => set("cisloFaktury", e.target.value)} placeholder="F-2026-..." />
        </Field>
      )}

      {(!f.zakaznik || f.planCasDilna === "" || f.planCasMontaz === "") && (
        <div style={{ fontSize: 12, color: C.rust, marginTop: 4, textAlign: "right" }}>
          Vyplň zákazníka a plánovaný čas (dílna i montáž), ať jde zakázku uložit.
        </div>
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
            if (!f.zakaznik || f.planCasDilna === "" || f.planCasMontaz === "") return;
            setSaving(true);
            setError("");
            try {
              await onSave(f);
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
