"use client";
import { useState } from "react";
import { Users, ArrowRightLeft, Trash2, Plus, Upload } from "lucide-react";
import { Field, TextInput, Select, Button, SectionLabel, Modal } from "./ui";
import UzivateleForm from "./UzivateleForm";

export default function NastaveniForm({ initial, uzivatele, onSave, onMigrovatUctenky, onOpenImportFaktur, onClose }) {
  const [f, setF] = useState(initial);
  const [showUzivatele, setShowUzivatele] = useState(false);
  const [migruji, setMigruji] = useState(false);
  const [migraceVysledek, setMigraceVysledek] = useState(null);
  const [novePracovnikJmeno, setNovePracovnikJmeno] = useState("");
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const prepnoutVybranehoUzivatele = (id) => {
    const aktualni = f.vybraniUzivatele || [];
    set("vybraniUzivatele", aktualni.includes(id) ? aktualni.filter((x) => x !== id) : [...aktualni, id]);
  };

  const pridatPracovnika = () => {
    const jmeno = novePracovnikJmeno.trim();
    if (!jmeno) return;
    if ((f.pracovnici || []).some((p) => p.toLowerCase() === jmeno.toLowerCase())) {
      setNovePracovnikJmeno("");
      return;
    }
    set("pracovnici", [...(f.pracovnici || []), jmeno]);
    setNovePracovnikJmeno("");
  };

  const odebratPracovnika = (jmeno) => {
    set("pracovnici", (f.pracovnici || []).filter((p) => p !== jmeno));
  };

  const spustitMigraci = async () => {
    setMigruji(true);
    setMigraceVysledek(null);
    try {
      const vysledek = await onMigrovatUctenky();
      setMigraceVysledek(vysledek);
    } catch (e) {
      // chyba se appce ukáže přes globální hlášku, tady nic navíc dělat nemusíme
    }
    setMigruji(false);
  };

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

      <SectionLabel>Firma (zhotovitel na protokolu a nabídce)</SectionLabel>
      <Field label="Název firmy">
        <TextInput value={f.firmaNazev} onChange={(e) => set("firmaNazev", e.target.value)} />
      </Field>
      <Field label="Fakturační adresa">
        <TextInput value={f.firmaAdresa} onChange={(e) => set("firmaAdresa", e.target.value)} />
      </Field>
      <div className="field-row">
        <Field label="IČO">
          <TextInput value={f.firmaIco} onChange={(e) => set("firmaIco", e.target.value)} />
        </Field>
        <Field label="DIČ">
          <TextInput value={f.firmaDic} onChange={(e) => set("firmaDic", e.target.value)} />
        </Field>
      </div>
      <Field label="E-mail (nepovinné, zobrazí se na nabídce)">
        <TextInput type="email" value={f.firmaEmail} onChange={(e) => set("firmaEmail", e.target.value)} />
      </Field>
      <SectionLabel>Uživatelé</SectionLabel>
      <div style={{ marginBottom: 16 }}>
        <Button variant="ghost" type="button" onClick={() => setShowUzivatele(true)}>
          <Users size={14} /> Spravovat uživatele
        </Button>
      </div>

      <SectionLabel>Pracovníci (brigádníci)</SectionLabel>
      <div style={{ fontSize: 12, color: "#5B5A52", marginBottom: 8 }}>
        Jména se nabízí při zápisu práce — pro pracovníky, kteří nemají vlastní přihlášení do appky.
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 10 }}>
        <input type="checkbox" checked={f.nabizetPracovniky} onChange={(e) => set("nabizetPracovniky", e.target.checked)} />
        Nabízet jména při zápisu práce
      </label>

      {uzivatele && uzivatele.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#5B5A52", marginBottom: 6 }}>Kteří uživatelé appky se mají nabízet (kromě brigádníků níže):</div>
          <div style={{ border: "1px solid #D9D4C7", borderRadius: 6, overflow: "hidden" }}>
            {uzivatele.map((u, i) => (
              <label
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderTop: i > 0 ? "1px solid #D9D4C7" : "none",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input type="checkbox" checked={(f.vybraniUzivatele || []).includes(u.id)} onChange={() => prepnoutVybranehoUzivatele(u.id)} />
                {u.email}
              </label>
            ))}
          </div>
        </div>
      )}

      {(f.pracovnici || []).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {f.pracovnici.map((jmeno) => (
            <div key={jmeno} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", border: "1px solid #D9D4C7", borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
              <span>{jmeno}</span>
              <button type="button" onClick={() => odebratPracovnika(jmeno)} style={{ background: "none", border: "none", color: "#B33A3A", cursor: "pointer", padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TextInput
          value={novePracovnikJmeno}
          onChange={(e) => setNovePracovnikJmeno(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              pridatPracovnika();
            }
          }}
          style={{ flex: 1 }}
        />
        <Button variant="ghost" type="button" onClick={pridatPracovnika} disabled={!novePracovnikJmeno.trim()}>
          <Plus size={14} /> Přidat
        </Button>
      </div>

      <SectionLabel>Faktury přijaté (ABRA Flexi)</SectionLabel>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#5B5A52", marginBottom: 8 }}>
          Nahraj CSV export faktur přijatých z Flexi — appka je podle čísla zakázky (kdekoliv v řádku, třeba ve variabilním symbolu) sama přiřadí
          do nákladů.
        </div>
        <Button variant="ghost" type="button" onClick={onOpenImportFaktur}>
          <Upload size={14} /> Importovat faktury z Flexi
        </Button>
      </div>

      <SectionLabel>Údržba dat</SectionLabel>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#5B5A52", marginBottom: 8 }}>
          Starší samostatně vyfocené účtenky appka teď zapisuje rovnou jako náklad — tímhle tlačítkem přesuneš i ty už dřív uložené.
        </div>
        <Button variant="ghost" type="button" onClick={spustitMigraci} disabled={migruji}>
          <ArrowRightLeft size={14} /> {migruji ? "Přesouvám…" : "Přesunout staré účtenky do nákladů"}
        </Button>
        {migraceVysledek && (
          <div style={{ fontSize: 12, marginTop: 8, color: "#5B5A52" }}>
            {migraceVysledek.presunuto === 0
              ? "Nic k přesunutí — všechno je už v nákladech."
              : `Přesunuto ${migraceVysledek.presunuto} účtenek u ${migraceVysledek.zakazek} zakázek.`}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose} type="button">
          Zrušit
        </Button>
        <Button variant="primary" type="button" onClick={() => onSave(f)}>
          Uložit nastavení
        </Button>
      </div>

      {showUzivatele && (
        <Modal title="Uživatelé" onClose={() => setShowUzivatele(false)} width={460} zIndex={60}>
          <UzivateleForm onClose={() => setShowUzivatele(false)} />
        </Modal>
      )}
    </div>
  );
}
