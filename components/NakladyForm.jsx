"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { C, FONTS, uid, seedNakladyZKalkulace, computeNakladyZakazky, normalizovatKalkulaci, fmtMoney } from "@/lib/theme";
import { TextInput, Button, SectionLabel, MiniLabel, iconBtnStyle, Modal } from "./ui";
import PhotoThumbnail from "./PhotoThumbnail";

export default function NakladyForm({ order, nastaveni, onSave, onDirtyChange, onClose }) {
  const [radky, setRadky] = useState(() => {
    if (order.naklady && order.naklady.length > 0) return order.naklady;
    const polozky = normalizovatKalkulaci(order.kalkulace);
    return seedNakladyZKalkulace(polozky, nastaveni);
  });
  const puvodniRadky = useRef(radky);
  const [novyPopis, setNovyPopis] = useState("");
  const [novaCastka, setNovaCastka] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);

  // Appka rodiči hlásí, jestli jsou v okně neuložené změny — appka to totiž dřív
  // uměla tiše zahodit (přidáš náklad tlačítkem "+", ale to ho jen připraví do
  // rozjeté obrazovky, skutečně to uloží až "Uložit náklady" dole). Rodič podle
  // týhle informace appku před zavřením appky varuje.
  useEffect(() => {
    if (onDirtyChange) onDirtyChange(JSON.stringify(radky) !== JSON.stringify(puvodniRadky.current));
  }, [radky, onDirtyChange]);

  useEffect(() => {
    return () => {
      if (onDirtyChange) onDirtyChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vysledek = computeNakladyZakazky({ ...order, naklady: radky }, nastaveni);

  const updateRadek = (id, patch) => setRadky((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRadek = (id) => setRadky((prev) => prev.filter((r) => r.id !== id));

  const pridatNaklad = () => {
    if (!novyPopis.trim() || !novaCastka) return;
    setRadky((prev) => [...prev, { id: uid(), popis: novyPopis.trim(), castka: Number(novaCastka) }]);
    setNovyPopis("");
    setNovaCastka("");
  };

  return (
    <div>
      <SectionLabel>Náklady (materiál, kooperace, ostatní)</SectionLabel>
      {radky.length > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 3 }}>
            <MiniLabel>Popis nákladu</MiniLabel>
          </div>
          <div style={{ flex: 1 }}>
            <MiniLabel>Kč bez DPH</MiniLabel>
          </div>
          <div style={{ width: 32 }} />
        </div>
      )}
      {radky.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>Zatím žádné náklady.</div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {radky.map((r) => (
            <div key={r.id} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <TextInput value={r.popis} onChange={(e) => updateRadek(r.id, { popis: e.target.value })} style={{ flex: 3 }} />
                <TextInput type="number" value={r.castka} onChange={(e) => updateRadek(r.id, { castka: e.target.value })} style={{ flex: 1 }} />
                <button onClick={() => removeRadek(r.id)} style={{ ...iconBtnStyle, color: C.danger }}>
                  <Trash2 size={16} />
                </button>
              </div>
              {r.fotoPath && (
                <div style={{ marginTop: 4 }}>
                  <PhotoThumbnail bucket="uctenky" path={r.fotoPath} alt="Účtenka" onOpen={setViewPhoto} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 3 }}>
          <MiniLabel>Přidat další náklad — popis</MiniLabel>
        </div>
        <div style={{ flex: 1 }}>
          <MiniLabel>Kč bez DPH</MiniLabel>
        </div>
        <div style={{ width: 32 }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TextInput value={novyPopis} onChange={(e) => setNovyPopis(e.target.value)} style={{ flex: 3 }} />
        <TextInput type="number" value={novaCastka} onChange={(e) => setNovaCastka(e.target.value)} style={{ flex: 1 }} />
        <Button variant="ghost" type="button" onClick={pridatNaklad}>
          <Plus size={14} />
        </Button>
      </div>

      <SectionLabel>Práce (dopočteno automaticky ze zápisů práce)</SectionLabel>
      <div style={{ background: C.paper, borderRadius: 8, padding: 12, marginBottom: 16, border: `1px solid ${C.line}`, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
          <span>Dílna</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.praceDilnaSum)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
          <span>Montáž</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.praceMontazSum)}</span>
        </div>
        <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>
          Podle skutečně odpracovaných hodin a aktuální sazby v Nastavení — mění se automaticky, jak přibývají zápisy práce.
        </div>
      </div>

      <div style={{ background: C.paper, borderRadius: 8, padding: 14, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Náklady celkem (materiál/kooperace/ostatní + práce)</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.nakladyCelkem)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span>Příjem (cena zakázky bez DPH)</span>
          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.prijem)}</span>
        </div>
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600 }}>
            <span>Zisk</span>
            <span style={{ fontFamily: FONTS.mono, color: vysledek.zisk >= 0 ? C.moss : C.danger }}>
              {fmtMoney(vysledek.zisk)} ({vysledek.marzePct.toFixed(1)} %)
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
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
              await onSave(radky);
              puvodniRadky.current = radky;
              if (onDirtyChange) onDirtyChange(false);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Ukládám…" : "Uložit náklady"}
        </Button>
      </div>

      {viewPhoto && (
        <Modal title="Účtenka" onClose={() => setViewPhoto(null)} width={520} zIndex={70}>
          <img src={viewPhoto} alt="Účtenka" referrerPolicy="no-referrer" style={{ width: "100%", borderRadius: 8 }} />
        </Modal>
      )}
    </div>
  );
}
