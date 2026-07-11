"use client";
import { useRef, useState } from "react";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, todayISO } from "@/lib/theme";
import { Button } from "./ui";

export default function ZalohaPanel({ orders, nastaveni, materialHistory, onRestored, onClose }) {
  const fileRef = useRef(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [confirmFile, setConfirmFile] = useState(null);

  const stahnoutZalohu = () => {
    const payload = {
      typ: "zamecnictvi-app-zaloha",
      verze: 1,
      vytvoreno: new Date().toISOString(),
      orders,
      nastaveni,
      materialHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zaloha-dilna-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const vybratSoubor = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.typ !== "zamecnictvi-app-zaloha" || !Array.isArray(data.orders)) {
        throw new Error("Soubor nevypadá jako platná záloha appky.");
      }
      setConfirmFile(data);
    } catch (err) {
      setError("Soubor se nepodařilo přečíst — zkontroluj, že jde o zálohu z téhle appky.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const obnovitZalohu = async () => {
    if (!confirmFile) return;
    setRestoring(true);
    setError("");
    try {
      if (confirmFile.orders?.length) {
        const { error: e1 } = await supabase.from("orders").upsert(confirmFile.orders);
        if (e1) throw e1;
      }
      if (confirmFile.nastaveni) {
        const { error: e2 } = await supabase.from("nastaveni").upsert({ id: 1, ...confirmFile.nastaveni });
        if (e2) throw e2;
      }
      if (confirmFile.materialHistory?.length) {
        const { error: e3 } = await supabase.from("material_history").upsert(confirmFile.materialHistory);
        if (e3) throw e3;
      }
      await onRestored();
      setConfirmFile(null);
    } catch (err) {
      console.error(err);
      setError("Obnovení se nepovedlo. Zkontroluj připojení a zkus to znovu.");
    }
    setRestoring(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>
          Stáhne kompletní zálohu — zakázky, nastavení i katalog materiálů — do jednoho souboru. Ulož si ho někam mimo appku (Google Drive,
          e-mail…). Fotky (účtenky, podpisy) v záloze nejsou, ty zůstávají bezpečně v Supabase Storage.
        </div>
        <Button variant="primary" onClick={stahnoutZalohu}>
          <Download size={14} /> Stáhnout zálohu ({orders.length} zakázek)
        </Button>
      </div>

      <div style={{ borderTop: `2px dashed ${C.line}`, paddingTop: 20 }}>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>
          Obnovení ze zálohy přepíše aktuální data uloženými v souboru (podle stejného ID). Použij jen v nouzi.
        </div>
        <input ref={fileRef} type="file" accept="application/json" onChange={vybratSoubor} style={{ display: "none" }} />
        <Button variant="ghost" onClick={() => fileRef.current && fileRef.current.click()}>
          <Upload size={14} /> Nahrát a obnovit ze zálohy
        </Button>
      </div>

      {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 12 }}>{error}</div>}

      {confirmFile && (
        <div style={{ marginTop: 16, background: "#FBEAE3", border: `1px solid ${C.rust}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.rust, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13, marginBottom: 8 }}>
            <AlertTriangle size={16} /> Opravdu obnovit tuhle zálohu?
          </div>
          <div style={{ fontSize: 13, color: C.ink, marginBottom: 10 }}>
            Záloha z {confirmFile.vytvoreno ? new Date(confirmFile.vytvoreno).toLocaleString("cs-CZ") : "neznámého data"} —{" "}
            {confirmFile.orders?.length || 0} zakázek. Přepíše se aktuální stav dat se stejným ID.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={() => setConfirmFile(null)} disabled={restoring}>
              Zrušit
            </Button>
            <Button variant="danger" onClick={obnovitZalohu} disabled={restoring}>
              {restoring ? "Obnovuji…" : "Ano, obnovit"}
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
