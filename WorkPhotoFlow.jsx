"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Printer, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { C, FONTS, uid, novaPolozkaKalkulace, normalizovatKalkulaci, computeKalkulace, computeKalkulaceCelkem, fmtMoney } from "@/lib/theme";
import { Field, TextInput, Button, SectionLabel, iconBtnStyle } from "./ui";
import MaterialRow from "./MaterialRow";

function PolozkaForm({ polozka, nastaveni, materialHistory, onChange }) {
  const vysledek = useMemo(() => computeKalkulace(polozka, nastaveni), [polozka, nastaveni]);
  const materialy = polozka.materialy || [];

  const addMaterial = () =>
    onChange({
      ...polozka,
      materialy: [...materialy, { id: uid(), nazev: "", dodavatel: "", cena: "", jednotka: "kg", mnozstvi: "", vaha: "", plocha: "" }],
    });
  const updateMaterial = (idx, item) => onChange({ ...polozka, materialy: materialy.map((m, i) => (i === idx ? item : m)) });
  const removeMaterial = (idx) => onChange({ ...polozka, materialy: materialy.filter((_, i) => i !== idx) });

  return (
    <div>
      <SectionLabel>Materiál</SectionLabel>
      {materialy.map((m, idx) => (
        <MaterialRow key={m.id} item={m} history={materialHistory} onChange={(v) => updateMaterial(idx, v)} onRemove={() => removeMaterial(idx)} />
      ))}
      <Button variant="ghost" type="button" onClick={addMaterial} style={{ marginBottom: 16 }}>
        <Plus size={14} /> Přidat materiál
      </Button>

      <SectionLabel>Práce</SectionLabel>
      <div className="field-row">
        <Field label={`Dílna (h) · ${fmtMoney(nastaveni.sazbaDilna)}/h`}>
          <TextInput type="number" step="0.5" value={polozka.praceDilnaHodiny} onChange={(e) => onChange({ ...polozka, praceDilnaHodiny: e.target.value })} />
        </Field>
        <Field label={`Montáž (h) · ${fmtMoney(nastaveni.sazbaMontaz)}/h`}>
          <TextInput type="number" step="0.5" value={polozka.praceMontazHodiny} onChange={(e) => onChange({ ...polozka, praceMontazHodiny: e.target.value })} />
        </Field>
      </div>

      <SectionLabel>Kooperace</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={polozka.zinkovaniAktivni} onChange={(e) => onChange({ ...polozka, zinkovaniAktivni: e.target.checked })} />
          Zinkování — {vysledek.vahaSum} kg × {fmtMoney(nastaveni.cenaZinkovani)} = {fmtMoney(vysledek.zinkovaniSum)}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={polozka.lakovaniAktivni} onChange={(e) => onChange({ ...polozka, lakovaniAktivni: e.target.checked })} />
          Lakování — {vysledek.plochaSum} m² × {fmtMoney(nastaveni.cenaLakovani)} = {fmtMoney(vysledek.lakovaniSum)}
        </label>
      </div>

      <SectionLabel>Přirážka a DPH</SectionLabel>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="Přirážka (%)">
          <TextInput type="number" value={polozka.prirazkaPct} onChange={(e) => onChange({ ...polozka, prirazkaPct: e.target.value })} />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, flex: 1 }}>
          <input type="checkbox" checked={polozka.sDph} onChange={(e) => onChange({ ...polozka, sDph: e.target.checked })} />
          Zobrazit a použít cenu s DPH (21 %)
        </label>
      </div>

      <div style={{ background: C.paper, borderRadius: 8, padding: 12, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
          <span>Náklady</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.naklady)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
          <span>Cena bez DPH / s DPH</span>
          <span style={{ fontFamily: FONTS.mono }}>
            {fmtMoney(vysledek.cenaBezDph)} / {fmtMoney(vysledek.cenaSDph)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0", fontWeight: 600 }}>
          <span>Marže položky</span>
          <span style={{ fontFamily: FONTS.mono, color: vysledek.marzeKc >= 0 ? C.moss : C.danger }}>
            {fmtMoney(vysledek.marzeKc)} ({vysledek.marzePct.toFixed(1)} %)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function KalkulaceForm({ order, nastaveni, materialHistory, onSave, onClose, onPrint }) {
  const initial = normalizovatKalkulaci(order.kalkulace);
  const [polozky, setPolozky] = useState(initial.length ? initial : [novaPolozkaKalkulace("Položka 1")]);
  const [openId, setOpenId] = useState(initial.length ? initial[0].id : null);
  const [saving, setSaving] = useState(false);
  const polozkaRefs = useRef({});

  const celkem = useMemo(() => computeKalkulaceCelkem(polozky, nastaveni), [polozky, nastaveni]);
  const planDilna = useMemo(() => polozky.reduce((s, p) => s + (Number(p.praceDilnaHodiny) || 0), 0), [polozky]);
  const planMontaz = useMemo(() => polozky.reduce((s, p) => s + (Number(p.praceMontazHodiny) || 0), 0), [polozky]);

  const updatePolozka = (id, next) => setPolozky((prev) => prev.map((p) => (p.id === id ? next : p)));

  const addPolozka = () => {
    const p = novaPolozkaKalkulace(`Položka ${polozky.length + 1}`);
    setPolozky((prev) => [...prev, p]);
    setOpenId(p.id);
  };

  // Nová položka se přidává rozbalená na konec seznamu — bez tohohle by v delším
  // formuláři nemuselo být vidět, že se vůbec něco stalo, a vypadalo by to jako chyba.
  useEffect(() => {
    if (openId && polozkaRefs.current[openId]) {
      polozkaRefs.current[openId].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [openId, polozky.length]);

  const removePolozka = (id) => {
    setPolozky((prev) => prev.filter((p) => p.id !== id));
    if (openId === id) setOpenId(null);
  };

  return (
    <div>
      {polozky.map((p, idx) => {
        const v = computeKalkulace(p, nastaveni);
        const open = openId === p.id;
        return (
          <div
            key={p.id}
            ref={(el) => {
              polozkaRefs.current[p.id] = el;
            }}
            style={{ border: `1px solid ${C.line}`, borderRadius: 8, marginBottom: 10, overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: C.paper }}>
              <TextInput
                value={p.nazev}
                onChange={(e) => updatePolozka(p.id, { ...p, nazev: e.target.value })}
                placeholder={`Položka ${idx + 1} (např. Brána)`}
                style={{ flex: 1, background: C.surface }}
              />
              <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap" }}>{fmtMoney(v.finalniCena)}</span>
              <button type="button" onClick={() => setOpenId(open ? null : p.id)} style={iconBtnStyle}>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {polozky.length > 1 && (
                <button type="button" onClick={() => removePolozka(p.id)} style={{ ...iconBtnStyle, color: C.danger }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {open && (
              <div style={{ padding: 12, borderTop: `1px solid ${C.line}` }}>
                <PolozkaForm polozka={p} nastaveni={nastaveni} materialHistory={materialHistory} onChange={(next) => updatePolozka(p.id, next)} />
              </div>
            )}
          </div>
        );
      })}

      <Button variant="ghost" type="button" onClick={addPolozka} style={{ marginBottom: 16 }}>
        <Plus size={14} /> Přidat položku (např. Branka)
      </Button>

      <SectionLabel>Celkem za zakázku ({polozky.length} {polozky.length === 1 ? "položka" : polozky.length < 5 ? "položky" : "položek"})</SectionLabel>
      <div style={{ background: C.paper, borderRadius: 8, padding: 14, marginBottom: 8, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Náklady celkem</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.naklady)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Cena bez DPH</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaBezDph)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Cena s DPH (21 %)</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaSDph)}</span>
        </div>
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600 }}>
            <span>Plánovaná marže</span>
            <span style={{ fontFamily: FONTS.mono, color: celkem.marzeKc >= 0 ? C.moss : C.danger }}>
              {fmtMoney(celkem.marzeKc)} ({celkem.marzePct.toFixed(1)} %)
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>
        Uložením se do zakázky propíše plánovaný čas: <strong>dílna {planDilna} h · montáž {planMontaz} h</strong> (součet ze všech položek).
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <Button variant="ghost" type="button" onClick={() => onPrint(polozky, celkem)}>
          <Printer size={14} /> Tisk nabídky
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Zrušit
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(polozky, celkem);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Ukládám…" : "Uložit kalkulaci"}
          </Button>
        </div>
      </div>
    </div>
  );
}
