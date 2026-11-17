"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Images, X } from "lucide-react";
import { uid, todayISO, resizeImageFile } from "@/lib/theme";
import { nahratFotku } from "@/lib/uploadClient";
import { C, FONTS } from "@/lib/theme";
import { Field, TextInput, Button } from "./ui";

const TYPY = [
  { key: "pred", label: "Před" },
  { key: "po", label: "Po" },
  { key: "protokol", label: "Protokol" },
];

export default function WorkPhotoFlow({ order, onSubmit, onClose }) {
  // Víc fotek najednou — z foťáku (po jedné) nebo z galerie (klidně několik naráz)
  const [fotky, setFotky] = useState([]); // [{ blob, nahled }]
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stavNahravani, setStavNahravani] = useState("");
  const [typ, setTyp] = useState("pred");
  const [popis, setPopis] = useState("");
  const [error, setError] = useState("");
  const fotakRef = useRef(null);
  const galerieRef = useRef(null);

  useEffect(() => () => fotky.forEach((f) => URL.revokeObjectURL(f.nahled)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = async (e) => {
    const soubory = Array.from(e.target.files || []);
    e.target.value = "";
    if (!soubory.length) return;
    setProcessing(true);
    setError("");
    const nove = [];
    for (const soubor of soubory) {
      try {
        const blob = await resizeImageFile(soubor);
        nove.push({ blob, nahled: URL.createObjectURL(blob) });
      } catch (err) {
        console.error(err);
        setError("Některou fotku se nepodařilo zpracovat (podporované jsou běžné obrázky JPG/PNG).");
      }
    }
    setFotky((prev) => [...prev, ...nove]);
    setProcessing(false);
  };

  const odebrat = (i) =>
    setFotky((prev) => {
      URL.revokeObjectURL(prev[i].nahled);
      return prev.filter((_, j) => j !== i);
    });

  const save = async () => {
    if (!fotky.length) return;
    setUploading(true);
    setError("");
    const zaznamy = [];
    try {
      for (let i = 0; i < fotky.length; i++) {
        setStavNahravani(fotky.length > 1 ? `Nahrávám ${i + 1} z ${fotky.length}…` : "Nahrávám…");
        const path = await nahratFotku(fotky[i].blob, `fotka-${order.cislo}-${typ}-${uid()}.jpg`, "fotky", order);
        zaznamy.push({ id: uid(), datum: todayISO(), path, typ, popis });
      }
      await onSubmit(order, zaznamy);
    } catch (err) {
      console.error(err);
      // Co se nahrát stihlo, se uloží, ať se nic neztratí
      if (zaznamy.length) {
        try {
          await onSubmit(order, zaznamy);
          return;
        } catch (e2) {
          // pokračuje se hláškou níže
        }
      }
      setError("Uložení fotky se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      setUploading(false);
      setStavNahravani("");
    }
  };

  const velkeTlacitko = {
    flex: 1,
    border: `2px dashed ${C.line}`,
    borderRadius: 10,
    background: C.paper,
    padding: "28px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    color: C.steel,
  };
  const popisekTlacitka = { fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 14 };

  return (
    <div>
      <input ref={fotakRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} style={{ display: "none" }} />
      <input ref={galerieRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
      {!fotky.length ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => fotakRef.current && fotakRef.current.click()} disabled={processing} style={velkeTlacitko}>
            <Camera size={34} />
            <span style={popisekTlacitka}>{processing ? "Zpracovávám…" : "Vyfotit"}</span>
          </button>
          <button type="button" onClick={() => galerieRef.current && galerieRef.current.click()} disabled={processing} style={velkeTlacitko}>
            <Images size={34} />
            <span style={popisekTlacitka}>{processing ? "Zpracovávám…" : "Z galerie"}</span>
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: fotky.length === 1 ? "1fr" : "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 8 }}>
            {fotky.map((f, i) => (
              <div key={f.nahled} style={{ position: "relative" }}>
                <img
                  src={f.nahled}
                  alt="Náhled"
                  style={{ width: "100%", height: fotky.length === 1 ? "auto" : 110, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }}
                />
                <button
                  type="button"
                  onClick={() => odebrat(i)}
                  disabled={uploading}
                  aria-label="Odebrat fotku"
                  title="Odebrat"
                  style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, border: "none", background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <Button variant="ghost" onClick={() => fotakRef.current && fotakRef.current.click()} type="button" disabled={uploading || processing}>
              <Camera size={14} /> Vyfotit další
            </Button>
            <Button variant="ghost" onClick={() => galerieRef.current && galerieRef.current.click()} type="button" disabled={uploading || processing}>
              <Images size={14} /> {processing ? "Zpracovávám…" : "Přidat z galerie"}
            </Button>
          </div>
        </div>
      )}
      {fotky.length > 0 && (
        <>
          <Field label="Typ fotky">
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {TYPY.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTyp(t.key)}
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    borderRadius: 6,
                    border: `1.5px solid ${C.steel}`,
                    background: typ === t.key ? C.steel : "transparent",
                    color: typ === t.key ? "#fff" : C.steel,
                    fontFamily: FONTS.display,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Popis (nepovinné)">
            <TextInput value={popis} onChange={(e) => setPopis(e.target.value)} />
          </Field>
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
          {fotky.length > 1 && <div style={{ fontSize: 12, color: C.inkSoft }}>Typ a popis se použijí pro všechny vybrané fotky.</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={onClose} type="button">
              Zrušit
            </Button>
            <Button variant="primary" type="button" onClick={save} disabled={uploading}>
              {uploading ? stavNahravani || "Nahrávám…" : fotky.length > 1 ? `Uložit fotky (${fotky.length})` : "Uložit fotku"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
