"use client";
import { useRef, useState } from "react";
import { Camera, ArrowLeft } from "lucide-react";
import { C, FONTS, uid, todayISO, resizeImageFile, UZAVRENE_STAVY } from "@/lib/theme";
import { nahratFotku } from "@/lib/uploadClient";
import { Field, TextInput, Button } from "./ui";
import OrderPicker from "./OrderPicker";

export default function ReceiptFlow({ orders, onSubmit, onClose }) {
  const [order, setOrder] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [castka, setCastka] = useState("");
  const [poznamka, setPoznamka] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  if (!order) {
    return (
      <OrderPicker
        orders={orders}
        onPick={setOrder}
        excludeStavy={UZAVRENE_STAVY}
        excludeNote="Hotové a fakturované zakázky se tu nenabízí — už se u nich nezapisuje práce ani účtenky."
      />
    );
  }

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
      const path = await nahratFotku(photoBlob, `uctenka-${order.cislo}-${uid()}.jpg`, "uctenky", order);
      await onSubmit(order, {
        id: uid(),
        datum: todayISO(),
        path,
        castka: castka ? Number(castka) : null,
        poznamka,
      });
      // On success the parent closes this modal (unmounting this component),
      // so we intentionally don't touch state here afterwards.
    } catch (err) {
      console.error(err);
      setError("Uložení účtenky se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      setUploading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => {
          setOrder(null);
          setPhotoBlob(null);
          setPhotoPreview(null);
        }}
        style={{ background: "none", border: "none", color: C.steel, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, fontSize: 13, padding: 4, marginLeft: -4 }}
      >
        <ArrowLeft size={14} /> Jiná zakázka
      </button>
      <div style={{ background: C.paper, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{order.cislo}</div>
        <div style={{ fontWeight: 600 }}>{order.zakaznik}</div>
      </div>

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
            {processing ? "Zpracovávám…" : "Vyfotit účtenku"}
          </span>
        </button>
      ) : (
        <div>
          <img src={photoPreview} alt="Náhled účtenky" style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, marginBottom: 8 }} />
          <Button variant="ghost" onClick={() => fileInputRef.current && fileInputRef.current.click()} type="button">
            <Camera size={14} /> Vyfotit znovu
          </Button>
        </div>
      )}

      {photoPreview && (
        <>
          <div style={{ marginTop: 14 }}>
            <Field label="Částka (Kč, nepovinné)">
              <TextInput type="number" value={castka} onChange={(e) => setCastka(e.target.value)} />
            </Field>
            <Field label="Poznámka (nepovinné)">
              <TextInput value={poznamka} onChange={(e) => setPoznamka(e.target.value)} />
            </Field>
          </div>
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={onClose} type="button">
              Zrušit
            </Button>
            <Button variant="primary" type="button" onClick={save} disabled={uploading}>
              {uploading ? "Nahrávám…" : "Uložit účtenku"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
