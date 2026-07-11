"use client";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { uid, todayISO, resizeImageFile } from "@/lib/theme";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS } from "@/lib/theme";
import { Field, TextInput, Button } from "./ui";

const TYPY = [
  { key: "pred", label: "Před" },
  { key: "po", label: "Po" },
  { key: "ostatni", label: "Ostatní" },
];

export default function WorkPhotoFlow({ order, onSubmit, onClose }) {
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typ, setTyp] = useState("pred");
  const [popis, setPopis] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

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
    if (!photoBlob) return;
    setUploading(true);
    setError("");
    try {
      const path = `${order.id}/${uid()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("fotky").upload(path, photoBlob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      await onSubmit(order, { id: uid(), datum: todayISO(), path, typ, popis });
    } catch (err) {
      console.error(err);
      setError("Uložení fotky se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

      {!photoPreview ? (
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={processing}
          style={{
            width: "100%",
            border: `2px dashed ${C.line}`,
            borderRadius: 10,
            background: C.paper,
            padding: "36px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            color: C.steel,
          }}
        >
          <Camera size={34} />
          <span style={{ fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 14 }}>
            {processing ? "Zpracovávám…" : "Vyfotit"}
          </span>
        </button>
      ) : (
        <div>
          <img src={photoPreview} alt="Náhled" style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, marginBottom: 8 }} />
          <Button variant="ghost" onClick={() => fileInputRef.current && fileInputRef.current.click()} type="button">
            <Camera size={14} /> Vyfotit znovu
          </Button>
        </div>
      )}

      {photoPreview && (
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
            <TextInput value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="např. stav před demontáží" />
          </Field>
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={onClose} type="button">
              Zrušit
            </Button>
            <Button variant="primary" type="button" onClick={save} disabled={uploading}>
              {uploading ? "Nahrávám…" : "Uložit fotku"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
