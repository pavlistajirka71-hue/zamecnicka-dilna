"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Copy, FolderInput } from "lucide-react";
import { C, FONTS, uid, novaPolozkaKalkulace, normalizovatKalkulaci, computeKalkulace, computeKalkulaceCelkem, fmtMoney, DPH_SAZBA, maJineSazby, sazbyZNastaveni, fmtCislo } from "@/lib/theme";

import { Field, TextInput, Select, Button, SectionLabel, iconBtnStyle } from "./ui";
import MaterialRow from "./MaterialRow";
import VlozitZJineZakazky from "./VlozitZJineZakazky";

function PolozkaForm({ polozka, nastaveni: nastaveniAktualni, materialHistory, sazbaDph, onChange }) {
  // Sazby, se kterými se položka skutečně počítá (uložené v položce, jinak aktuální).
  const nastaveni = polozka.sazby ? { ...nastaveniAktualni, ...polozka.sazby } : nastaveniAktualni;
  const vysledek = useMemo(() => computeKalkulace(polozka, nastaveniAktualni, sazbaDph), [polozka, nastaveniAktualni, sazbaDph]);
  const materialy = polozka.materialy || [];

  const addMaterial = () =>
    onChange({
      ...polozka,
      materialy: [...materialy, { id: uid(), nazev: "", dodavatel: "", cena: "", jednotka: "m", mnozstvi: "", vaha: "", plocha: "" }],
    });
  const updateMaterial = (idx, item) => onChange({ ...polozka, materialy: materialy.map((m, i) => (i === idx ? item : m)) });
  const removeMaterial = (idx) => onChange({ ...polozka, materialy: materialy.filter((_, i) => i !== idx) });

  return (
    <div>
      <div className="field-row">
        <Field label="Počet kusů (násobí celou položku — materiál, práci, dopravu…)">
          <TextInput type="number" min="1" step="1" value={polozka.pocetKs} onChange={(e) => onChange({ ...polozka, pocetKs: e.target.value })} />
        </Field>
        <Field label="Jednotka (na nabídce, např. ks/bm/m²)">
          <TextInput value={polozka.jednotka || "ks"} onChange={(e) => onChange({ ...polozka, jednotka: e.target.value })} style={{ maxWidth: 120 }} />
        </Field>
      </div>

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

      <SectionLabel>Doprava a příprava</SectionLabel>
      <div className="field-row">
        <Field label="Doprava (Kč)">
          <TextInput type="number" value={polozka.doprava} onChange={(e) => onChange({ ...polozka, doprava: e.target.value })} />
        </Field>
        <Field label="Přípravné práce (Kč)">
          <TextInput type="number" value={polozka.pripravnePrace} onChange={(e) => onChange({ ...polozka, pripravnePrace: e.target.value })} />
        </Field>
      </div>
      <Field label="Spojovací materiál (Kč)">
        <TextInput type="number" value={polozka.spojovaciMaterial} onChange={(e) => onChange({ ...polozka, spojovaciMaterial: e.target.value })} style={{ maxWidth: 200 }} />
      </Field>

      <SectionLabel>Kooperace</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={polozka.zinkovaniAktivni} onChange={(e) => onChange({ ...polozka, zinkovaniAktivni: e.target.checked })} />
          Zinkování — {fmtCislo(vysledek.vahaSum)} kg × {fmtMoney(nastaveni.cenaZinkovani)} = {fmtMoney(vysledek.zinkovaniSum)}
        </label>
        {polozka.zinkovaniAktivni && materialy.length > 0 && vysledek.vahaSum === 0 && (
          <div style={{ fontSize: 12, color: C.danger, marginLeft: 24, marginTop: -4 }}>
            Zinkování je zapnuté, ale materiál nemá vyplněnou váhu (kg/jednotku) — zinkování se počítá 0 Kč.
          </div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={polozka.lakovaniAktivni} onChange={(e) => onChange({ ...polozka, lakovaniAktivni: e.target.checked })} />
          Lakování — {fmtCislo(vysledek.plochaProLakovani)} m² (plocha + 5 % na ztráty) × {fmtMoney(nastaveni.cenaLakovani)} = {fmtMoney(vysledek.lakovaniSum)}
        </label>
        {polozka.lakovaniAktivni && materialy.length > 0 && vysledek.plochaSum === 0 && (
          <div style={{ fontSize: 12, color: C.danger, marginLeft: 24, marginTop: -4 }}>
            Lakování je zapnuté, ale materiál nemá vyplněnou plochu (m²/jednotku) — lakování se počítá 0 Kč.
          </div>
        )}
      </div>

      <SectionLabel>Přirážka</SectionLabel>
      <Field label="Přirážka (%)">
        <TextInput type="number" value={polozka.prirazkaPct} onChange={(e) => onChange({ ...polozka, prirazkaPct: e.target.value })} style={{ maxWidth: 160 }} />
      </Field>

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
            {fmtMoney(vysledek.marzeKc)} ({fmtCislo(vysledek.marzePct, 1, 1)} %)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function KalkulaceForm({ order, orders, nastaveni, materialHistory, onSave, onClose }) {
  const initial = normalizovatKalkulaci(order.kalkulace);
  const [polozky, setPolozky] = useState(initial.length ? initial : [novaPolozkaKalkulace("Položka 1")]);
  const [sazbaDph, setSazbaDph] = useState(order.sazbaDph ?? DPH_SAZBA);
  const [openId, setOpenId] = useState(initial.length ? initial[0].id : null);
  const [saving, setSaving] = useState(false);
  const polozkaRefs = useRef({});

  const celkem = useMemo(() => computeKalkulaceCelkem(polozky, nastaveni, sazbaDph), [polozky, nastaveni, sazbaDph]);
  const planDilna = useMemo(() => polozky.reduce((s, p) => s + (Number(p.praceDilnaHodiny) || 0) * Math.max(1, Number(p.pocetKs) || 1), 0), [polozky]);
  const planMontaz = useMemo(() => polozky.reduce((s, p) => s + (Number(p.praceMontazHodiny) || 0) * Math.max(1, Number(p.pocetKs) || 1), 0), [polozky]);

  const updatePolozka = (id, next) => setPolozky((prev) => prev.map((p) => (p.id === id ? next : p)));

  // Kalkulace uložená se staršími sazbami (před jejich změnou v Nastavení)
  const staraSazbaPolozka = polozky.find((p) => maJineSazby(p, nastaveni));
  const prepocitatNaAktualniSazby = () => setPolozky((prev) => prev.map((p) => ({ ...p, sazby: sazbyZNastaveni(nastaveni) })));

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

  // Kopie položky (např. druhá podobná brána) — vloží se hned pod originál, rozbalená,
  // se všemi materiály, hodinami, kooperacemi i přirážkou. Stačí upravit, co se liší.
  // Materiály dostanou nová ID, ať se úpravy kopie nepletou s originálem.
  const duplikovatPolozku = (id) => {
    const original = polozky.find((p) => p.id === id);
    if (!original) return;
    const kopie = {
      ...original,
      id: uid(),
      nazev: `${original.nazev || "Položka"} (kopie)`,
      materialy: (original.materialy || []).map((m) => ({ ...m, id: uid() })),
    };
    setPolozky((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      return [...prev.slice(0, i + 1), kopie, ...prev.slice(i + 1)];
    });
    setOpenId(kopie.id);
  };

  const [vyberZJine, setVyberZJine] = useState(false);

  // Vloží kopie položek z jiné zakázky. Prázdná výchozí "Položka 1" nové kalkulace
  // se rovnou nahradí, ať v kalkulaci nezůstane prázdný řádek.
  const vlozitZJineZakazky = (kopie) => {
    if (!kopie.length) return;
    setPolozky((prev) => {
      const jePrazdna = (p) =>
        !(p.materialy || []).length &&
        !Number(p.praceDilnaHodiny) &&
        !Number(p.praceMontazHodiny) &&
        !Number(p.doprava) &&
        !Number(p.pripravnePrace) &&
        !Number(p.spojovaciMaterial) &&
        /^Položka \d+$/.test(p.nazev || "");
      const zaklad = prev.length === 1 && jePrazdna(prev[0]) ? [] : prev;
      return [...zaklad, ...kopie];
    });
    setOpenId(kopie[0].id);
    setVyberZJine(false);
  };

  const removePolozka = (id) => {
    setPolozky((prev) => prev.filter((p) => p.id !== id));
    if (openId === id) setOpenId(null);
  };

  return (
    <div>
      {staraSazbaPolozka && (
        <div style={{ background: "#FBF3E4", border: `1px solid ${C.brass}`, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>
          Kalkulace je spočítaná se sazbami platnými při jejím uložení (dílna {fmtMoney(staraSazbaPolozka.sazby.sazbaDilna)}/h, montáž{" "}
          {fmtMoney(staraSazbaPolozka.sazby.sazbaMontaz)}/h, zinkování {fmtMoney(staraSazbaPolozka.sazby.cenaZinkovani)}/kg, lakování{" "}
          {fmtMoney(staraSazbaPolozka.sazby.cenaLakovani)}/m²). V Nastavení jsou teď jiné — cena odeslané nabídky se tím sama nemění.
          <div style={{ marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={prepocitatNaAktualniSazby}>
              Přepočítat podle aktuálních sazeb
            </Button>
          </div>
        </div>
      )}
      {polozky.map((p, idx) => {
        const v = computeKalkulace(p, nastaveni, sazbaDph);
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
                style={{ flex: 1, background: C.surface }}
              />
              <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap" }}>
                {Number(p.pocetKs) > 1 ? `${p.pocetKs}× · ` : ""}
                {fmtMoney(v.finalniCena)}
              </span>
              <button type="button" onClick={() => duplikovatPolozku(p.id)} style={iconBtnStyle} title="Kopírovat položku">
                <Copy size={16} />
              </button>
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
                <PolozkaForm polozka={p} nastaveni={nastaveni} materialHistory={materialHistory} sazbaDph={sazbaDph} onChange={(next) => updatePolozka(p.id, next)} />
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Button variant="ghost" type="button" onClick={addPolozka}>
          <Plus size={14} /> Přidat položku (např. Branka)
        </Button>
        {orders && (
          <Button variant="ghost" type="button" onClick={() => setVyberZJine(true)}>
            <FolderInput size={14} /> Vložit z jiné zakázky
          </Button>
        )}
      </div>
      {vyberZJine && (
        <VlozitZJineZakazky
          orders={orders}
          aktualniOrderId={order.id}
          nastaveni={nastaveni}
          onVlozit={vlozitZJineZakazky}
          onClose={() => setVyberZJine(false)}
        />
      )}

      <Field label="Sazba DPH pro celou zakázku">
        <Select value={sazbaDph} onChange={(e) => setSazbaDph(Number(e.target.value))} style={{ maxWidth: 220 }}>
          <option value={0.21}>21 %</option>
          <option value={0.15}>15 %</option>
          <option value={0.12}>12 % (snížená — stavební práce na bydlení)</option>
          <option value={0}>Bez DPH (neplátce)</option>
        </Select>
      </Field>

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
          <span>Cena s DPH ({Math.round(sazbaDph * 100)} %)</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaSDph)}</span>
        </div>
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600 }}>
            <span>Plánovaná marže</span>
            <span style={{ fontFamily: FONTS.mono, color: celkem.marzeKc >= 0 ? C.moss : C.danger }}>
              {fmtMoney(celkem.marzeKc)} ({fmtCislo(celkem.marzePct, 1, 1)} %)
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>
        Uložením se do zakázky propíše plánovaný čas: <strong>dílna {fmtCislo(planDilna)} h · montáž {fmtCislo(planMontaz)} h</strong> (součet ze všech položek).
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
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
              await onSave(polozky, celkem, sazbaDph);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Ukládám…" : "Uložit kalkulaci"}
        </Button>
      </div>
    </div>
  );
}
