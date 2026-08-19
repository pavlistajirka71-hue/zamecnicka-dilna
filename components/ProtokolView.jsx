"use client";
import { useEffect, useState } from "react";
import { Copy, Check, Printer, CheckCircle2, RefreshCw } from "lucide-react";
import { nahratFotku } from "@/lib/uploadClient";
import { C, FONTS, novyProtokol, fmtDate, todayISO } from "@/lib/theme";
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

  // Adresa/IČO/DIČ zhotovitele se do protokolu "vyfotí" v okamžiku, kdy vzniká —
  // pokud se pak v Nastavení opraví (třeba zjistíš, že tam byla špatná fakturační
  // adresa), NEPROMÍTNE se to automaticky do už rozjetého protokolu. Dokud není
  // podepsaný, aplikace nabídne ruční obnovu podle aktuálního Nastavení.
  const zNastaveniAktualni = {
    nazev: nastaveni.firmaNazev || "",
    adresa: nastaveni.firmaAdresa || "",
    ico: nastaveni.firmaIco || "",
    dic: nastaveni.firmaDic || "",
  };
  const jeZhotovitelZastaraly = JSON.stringify(protokol.zhotovitel || {}) !== JSON.stringify(zNastaveniAktualni);

  const obnovitUdajeZhotovitele = async () => {
    if (jePodepsano) {
      const potvrzeno = window.confirm(
        "Tohle je už PODEPSANÝ protokol. Oprava údajů zhotovitele se do dokumentu zapíše viditelně (s datem opravy), ať je jasné, že k ní došlo až po podpisu. Pokračovat?"
      );
      if (!potvrzeno) return;
      const next = { ...protokol, zhotovitel: zNastaveniAktualni, opravaZhotoviteleDatum: todayISO() };
      setSaving(true);
      setError("");
      try {
        await onSave(order, next);
        setProtokol(next);
      } catch (e) {
        setError("Oprava se nepovedla uložit, zkus to znovu.");
      }
      setSaving(false);
      return;
    }
    set("zhotovitel", zNastaveniAktualni);
  };

  const saveDetails = async () => {
    if (jePodepsano) {
      const potvrzeno = window.confirm(
        "Tohle je už PODEPSANÝ protokol. Úprava údajů se do dokumentu zapíše viditelně (s datem opravy), ať je jasné, že k ní došlo až po podpisu. Pokračovat?"
      );
      if (!potvrzeno) return;
    }
    setSaving(true);
    setError("");
    try {
      const next = jePodepsano ? { ...protokol, opravaUdajuDatum: todayISO() } : protokol;
      await onSave(order, next);
      if (jePodepsano) setProtokol(next);
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
      const path = await nahratFotku(signatureBlob, `podpis-${order.cislo}-${Date.now()}.png`, "protokoly", order);
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

  // Fotky označené při vyfocení tagem "Protokol" — najdou se přímo v
  // order.fotky (fotografie se ukládají u zakázky obecně, ne uvnitř samotného
  // protokolu) a filtrují se podle typu.
  const fotkyKProtokolu = (order.fotky || []).filter((f) => f.typ === "protokol");

  return (
    <div>
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <ProtokolContent protokol={protokol} fotky={fotkyKProtokolu} />
      </div>

      {jeZhotovitelZastaraly && (
        <div style={{ background: "#FBF3E0", border: `1px solid ${C.brass}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          Údaje o zhotoviteli v tomhle protokolu se liší od aktuálního Nastavení (asi se odtud vytvořil dřív, než jsi tam něco opravil).
          {jePodepsano && " Protokol je už podepsaný — oprava se do dokumentu zapíše viditelně, ne potichu."}
          <div style={{ marginTop: 8 }}>
            <Button variant="ghost" onClick={obnovitUdajeZhotovitele} disabled={saving}>
              <RefreshCw size={14} /> {saving ? "Ukládám…" : "Obnovit údaje zhotovitele z Nastavení"}
            </Button>
          </div>
        </div>
      )}

      <SectionLabel>Údaje protokolu</SectionLabel>
      {jePodepsano && (
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>
          Protokol je už podepsaný. Údaje jde pořád opravit (třeba překlep), ale oprava se do dokumentu zapíše viditelně, s datem opravy — samotný podpis
          samotný tím nezruší.
        </div>
      )}
      <Field label="Předmět díla (co se předává)">
        <TextArea value={protokol.popisDila} onChange={(e) => set("popisDila", e.target.value)} />
      </Field>
      <div className="field-row">
        <Field label="Datum předání">
          <TextInput type="date" value={protokol.datumPredani} onChange={(e) => set("datumPredani", e.target.value)} />
        </Field>
        <Field label="Místo předání (nepovinné)">
          <TextInput value={protokol.mistoPredani} onChange={(e) => set("mistoPredani", e.target.value)} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Jméno přebírající osoby">
          <TextInput value={protokol.jmenoPrebirajiciho} onChange={(e) => set("jmenoPrebirajiciho", e.target.value)} />
        </Field>
        <Field label="Záruční doba (měsíců, nepovinné)">
          <TextInput type="number" value={protokol.zarucniDobaMesicu} onChange={(e) => set("zarucniDobaMesicu", e.target.value)} />
        </Field>
      </div>
      <Field label="Výhrady / poznámky (nepovinné — necháš prázdné, pokud je dílo bez vad)">
        <TextArea value={protokol.vyhrady} onChange={(e) => set("vyhrady", e.target.value)} />
      </Field>
      <Button variant="ghost" onClick={saveDetails} disabled={saving} style={{ marginBottom: 20 }}>
        {saving ? "Ukládám…" : "Uložit údaje protokolu"}
      </Button>

      {!jePodepsano && (
        <>
          <SectionLabel>Podpis přebírajícího</SectionLabel>
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
          {signatureUrl && <img src={signatureUrl} alt="Podpis zákazníka" referrerPolicy="no-referrer" style={{ maxWidth: 280, border: `1px solid ${C.line}`, borderRadius: 6, background: "#fff" }} />}
        </div>
      )}

      {error && <div style={{ color: C.rust, fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <Button variant="ghost" onClick={() => onPrint(protokol, signatureUrl, fotkyKProtokolu)}>
          <Printer size={14} /> Tisk protokolu
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
