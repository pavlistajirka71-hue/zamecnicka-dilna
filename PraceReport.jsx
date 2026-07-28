"use client";
import { useEffect, useState } from "react";
import { Copy, Check, Printer, CheckCircle2 } from "lucide-react";
import { nahratFotku } from "@/lib/uploadClient";
import { C, FONTS, novyProtokol, fmtDate } from "@/lib/theme";
import { Field, TextInput, TextArea, Button, SectionLabel } from "./ui";
import ProtokolContent from "./ProtokolContent";
import SignaturePad from "./SignaturePad";
import { useSignedUrl } from "./PhotoThumbnail";

export default function ProtokolView({ order, nastaveni, onSave, onClose, onPrint }) {
  const [protokol, setProtokol] = useState(order.protokol || novyProtokol(order, nastaveni));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [signatureBlob, setSignatureBlob] = useState(null);
  const signatureUrl = useSignedUrl("protokoly", protokol.podpisPath);

  // Persist a fresh protocol right away so a share link/token exists in the database.
  useEffect(() => {
    if (!order.protokol) {
      onSave(order, protokol).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the customer signs remotely (via the public link) while this modal is open,
  // pick up the signed state live instead of silently staying on the old unsigned view.
  useEffect(() => {
    if (order.protokol?.stav === "podepsano" && protokol.stav !== "podepsano") {
      setProtokol(order.protokol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.protokol?.stav]);

  const set = (k, v) => setProtokol((prev) => ({ ...prev, [k]: v }));

  const saveDetails = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(order, protokol);
    } catch (e) {
      setError("Uložení se nepovedlo, zkus to znovu.");
    }
    setSaving(false);
  };

  const podepsatNaMiste = async () => {
    if (!signatureBlob) return;
    setSaving(true);
    setError("");
    try {
      const path = await nahratFotku(signatureBlob, `podpis-${order.cislo}-${Date.now()}.png`, "protokoly");
      const next = { ...protokol, podpisPath: path, podpisDatum: new Date().toISOString().slice(0, 10), stav: "podepsano" };
      await onSave(order, next);
      setProtokol(next);
    } catch (e) {
      setError("Uložení podpisu se nepovedlo. Zkontroluj připojení a zkus to znovu.");
    }
    setSaving(false);
  };

  const kopirovatOdkaz = async () => {
    const link = `${window.location.origin}/protokol/${order.id}?token=${protokol.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const jePodepsano = protokol.stav === "podepsano";

  return (
    <div>
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <ProtokolContent protokol={protokol} />
      </div>

      {!jePodepsano && (
        <>
          <SectionLabel>Údaje protokolu</SectionLabel>
          <div className="field-row">
            <Field label="Datum předání">
              <TextInput type="date" value={protokol.datumPredani} onChange={(e) => set("datumPredani", e.target.value)} />
            </Field>
          </div>
          <Field label="Výhrady / poznámky (nepovinné — necháš prázdné, pokud je dílo bez vad)">
            <TextArea value={protokol.vyhrady} onChange={(e) => set("vyhrady", e.target.value)} placeholder="Popis výhrad zákazníka, pokud nějaké jsou…" />
          </Field>
          <Button variant="ghost" onClick={saveDetails} disabled={saving} style={{ marginBottom: 20 }}>
            {saving ? "Ukládám…" : "Uložit údaje protokolu"}
          </Button>

          <SectionLabel>Podpis objednatele</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>Na místě — zákazník podepíše přímo na tomto zařízení</div>
              <SignaturePad onChange={setSignatureBlob} />
              <Button variant="primary" style={{ marginTop: 10 }} disabled={!signatureBlob || saving} onClick={podepsatNaMiste}>
                {saving ? "Ukládám…" : "Potvrdit podpis na místě"}
              </Button>
            </div>

            <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>
                Na dálku — zákazník otevře odkaz, uvidí celý protokol a podepíše sám odkudkoliv
              </div>
              <Button variant="ghost" onClick={kopirovatOdkaz}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Odkaz zkopírován" : "Kopírovat odkaz pro zákazníka"}
              </Button>
            </div>
          </div>
        </>
      )}

      {jePodepsano && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.moss, marginBottom: 10, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13 }}>
            <CheckCircle2 size={16} /> Podepsáno {fmtDate(protokol.podpisDatum)}
          </div>
          {signatureUrl && <img src={signatureUrl} alt="Podpis zákazníka" style={{ maxWidth: 280, border: `1px solid ${C.line}`, borderRadius: 6, background: "#fff" }} />}
        </div>
      )}

      {error && <div style={{ color: C.rust, fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <Button variant="ghost" onClick={() => onPrint(protokol, signatureUrl)}>
          <Printer size={14} /> Tisk protokolu
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
