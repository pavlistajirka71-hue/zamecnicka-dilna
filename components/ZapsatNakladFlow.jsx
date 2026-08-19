"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, Search } from "lucide-react";
import { C, FONTS, uid, todayISO, resizeImageFile, rozpocitatNaklad } from "@/lib/theme";
import { nahratFotku } from "@/lib/uploadClient";
import { Field, TextInput, Button } from "./ui";

// Nahrazuje starší "Vyfotit účtenku" — místo samostatné galerie účtenek aplikace náklad
// (s volitelnou přiloženou fotkou) zapíše rovnou do Sledování nákladů dané zakázky.
// Jde vybrat i víc zakázek najednou — částka se pak rozpočítá poměrově podle jejich ceny.
export default function ZapsatNakladFlow({ orders, onSubmit, onClose }) {
  const rozpracovane = useMemo(() => orders.filter((o) => o.stav === "probiha"), [orders]);
  const [hledat, setHledat] = useState("");
  const [vybrane, setVybrane] = useState([]);
  const [popis, setPopis] = useState("");
  const [castka, setCastka] = useState("");
  const [datum, setDatum] = useState(todayISO());
  const [jeJizda, setJeJizda] = useState(false);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const filtrovane = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    if (!q) return rozpracovane;
    return rozpracovane.filter((o) => o.zakaznik.toLowerCase().includes(q) || o.cislo.toLowerCase().includes(q));
  }, [rozpracovane, hledat]);

  const prepnout = (order) => {
    setVybrane((prev) => (prev.some((o) => o.id === order.id) ? prev.filter((o) => o.id !== order.id) : [...prev, order]));
  };

  const nahled = useMemo(() => {
    if (!castka || vybrane.length === 0) return [];
    return rozpocitatNaklad(vybrane, Number(castka) || 0);
  }, [vybrane, castka]);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      const blob = await resizeImageFile(file);
      setPhotoBlob(blob);
      setPhotoPreview(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError("Fotku se nepodařilo zpracovat, zkus to znovu.");
    }
    setProcessing(false);
  };

  const save = async () => {
    if (vybrane.length === 0 || !castka) return;
    setSaving(true);
    setError("");
    try {
      let fotoPath = null;
      if (photoBlob) {
        // Jedna fotka (jedna účtenka) se může vztahovat k víc zakázkám najednou —
        // nahraje se jednou a odkaz se použije u všech vybraných zakázek.
        fotoPath = await nahratFotku(photoBlob, `naklad-${uid()}.jpg`, "uctenky", vybrane[0]);
      }
      const rozpocet = rozpocitatNaklad(vybrane, Number(castka));
      await onSubmit(
        rozpocet.map(({ order, castka: dil }) => ({
          order,
          naklad: { id: uid(), popis: popis.trim() || "Náklad", castka: dil, fotoPath, datum: datum || null, jeJizda },
        }))
      );
    } catch (err) {
      console.error(err);
      setError("Uložení se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: C.inkSoft }} />
        <TextInput value={hledat} onChange={(e) => setHledat(e.target.value)} style={{ paddingLeft: 32 }} />
      </div>

      {rozpracovane.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>Žádná rozpracovaná zakázka — náklad jde zapsat jen k zakázkám ve stavu Rozpracováno.</div>
      ) : (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, maxHeight: 200, overflowY: "auto", marginBottom: 14 }}>
          {filtrovane.map((o, i) => {
            const zaskrtnuto = vybrane.some((v) => v.id === o.id);
            return (
              <label
                key={o.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                  cursor: "pointer",
                  background: zaskrtnuto ? C.paper : "transparent",
                  fontSize: 13,
                }}
              >
                <input type="checkbox" checked={zaskrtnuto} onChange={() => prepnout(o)} />
                <div>
                  <div style={{ fontWeight: 600 }}>{o.zakaznik}</div>
                  <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono }}>{o.cislo}</div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <Field label="Popis nákladu (nepovinné)">
        <TextInput value={popis} onChange={(e) => setPopis(e.target.value)} />
      </Field>
      <div className="field-row">
        <Field label="Cena celkem (Kč, bez DPH — povinné)">
          <TextInput type="number" value={castka} onChange={(e) => setCastka(e.target.value)} />
        </Field>
        <Field label="Datum">
          <TextInput type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={jeJizda} onChange={(e) => setJeJizda(e.target.checked)} />
        Jízda (zobrazí se v kalendáři)
      </label>

      {nahled.length > 1 && (
        <div style={{ background: C.paper, borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontSize: 12 }}>
          <div style={{ color: C.inkSoft, marginBottom: 4 }}>Rozúčtováno poměrově podle ceny zakázky:</div>
          {nahled.map(({ order, castka: dil }) => (
            <div key={order.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{order.cislo}</span>
              <span style={{ fontFamily: FONTS.mono }}>{dil.toFixed(2)} Kč</span>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      {!photoPreview ? (
        <Button variant="ghost" type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={processing}>
          <Camera size={14} /> {processing ? "Zpracovávám…" : "Přiložit fotku účtenky (nepovinné)"}
        </Button>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <img src={photoPreview} alt="Náhled účtenky" style={{ width: "100%", maxWidth: 200, borderRadius: 8, border: `1px solid ${C.line}`, marginBottom: 6 }} />
          <Button variant="ghost" type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            <Camera size={14} /> Vyfotit znovu
          </Button>
        </div>
      )}

      {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Button variant="ghost" onClick={onClose} type="button">
          Zrušit
        </Button>
        <Button variant="primary" type="button" onClick={save} disabled={saving || vybrane.length === 0 || !popis.trim() || !castka}>
          {saving ? "Ukládám…" : `Zapsat náklad${vybrane.length > 1 ? ` (${vybrane.length} zakázek)` : ""}`}
        </Button>
      </div>
    </div>
  );
}
