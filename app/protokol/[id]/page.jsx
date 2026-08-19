"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Wrench, CheckCircle2 } from "lucide-react";
import { C, FONTS } from "@/lib/theme";
import { Button } from "@/components/ui";
import ProtokolContent from "@/components/ProtokolContent";
import SignaturePad from "@/components/SignaturePad";

export default function PublicProtokolPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5B5A52", fontFamily: FONTS.body }}>
          Načítám…
        </div>
      }
    >
      <PublicProtokolPageInner />
    </Suspense>
  );
}

function PublicProtokolPageInner() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [protokol, setProtokol] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [signatureBlob, setSignatureBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Odkaz je neplatný — chybí ověřovací kód.");
      return;
    }
    fetch(`/api/protokol/${id}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setLoadError(data.error);
        else setProtokol(data.protokol);
      })
      .catch(() => setLoadError("Protokol se nepodařilo načíst. Zkontroluj připojení k internetu."));
  }, [id, token]);

  const submit = async () => {
    if (!signatureBlob) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(signatureBlob);
      });
      const res = await fetch(`/api/protokol/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signature: dataUrl }),
      });
      const data = await res.json();
      if (data.error) {
        if (res.status === 409) {
          // Already signed elsewhere in the meantime — refresh to show the signed state instead of a dead end.
          const refreshed = await fetch(`/api/protokol/${id}?token=${encodeURIComponent(token)}`).then((r) => r.json());
          if (refreshed.protokol) setProtokol(refreshed.protokol);
          setSubmitError("Tento protokol už mezitím někdo podepsal.");
        } else {
          setSubmitError(data.error);
        }
      } else {
        setProtokol(data.protokol);
        setDone(true);
      }
    } catch (e) {
      setSubmitError("Podpis se nepodařilo odeslat. Zkontroluj připojení a zkus to znovu.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONTS.body }}>
      <div style={{ background: C.steelDark, color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <Wrench size={20} color={C.rust} />
        <span style={{ fontFamily: FONTS.display, fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Předávací protokol
        </span>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 16px" }}>
        {loadError && (
          <div style={{ background: "#FBEAE3", border: `1px solid ${C.rust}`, color: C.rust, borderRadius: 8, padding: 16 }}>{loadError}</div>
        )}

        {!loadError && !protokol && <div style={{ color: C.inkSoft, textAlign: "center", padding: 40 }}>Načítám protokol…</div>}

        {protokol && (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20 }}>
            <ProtokolContent protokol={protokol} fotky={protokol.fotky} />

            {protokol.stav === "podepsano" || done ? (
              <div style={{ marginTop: 16, borderTop: `2px dashed ${C.line}`, paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.moss, marginBottom: 10, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13 }}>
                  <CheckCircle2 size={16} /> Podepsáno {protokol.podpisDatum ? `(${protokol.podpisDatum})` : ""}
                </div>
                {protokol.signatureUrl && (
                  <img src={protokol.signatureUrl} alt="Podpis" referrerPolicy="no-referrer" style={{ maxWidth: 280, border: `1px solid ${C.line}`, borderRadius: 6, background: "#fff" }} />
                )}
                <div style={{ marginTop: 12, fontSize: 13, color: C.inkSoft }}>Děkujeme, protokol je uzavřený. Tuto stránku už můžete zavřít.</div>
              </div>
            ) : (
              <div style={{ marginTop: 16, borderTop: `2px dashed ${C.line}`, paddingTop: 16 }}>
                <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 13, color: C.inkSoft, marginBottom: 8 }}>
                  Podpis přebírajícího{protokol.jmenoPrebirajiciho ? ` — ${protokol.jmenoPrebirajiciho}` : ""}
                </div>
                <SignaturePad onChange={setSignatureBlob} />
                {submitError && <div style={{ color: C.rust, fontSize: 13, marginTop: 8 }}>{submitError}</div>}
                <Button variant="primary" style={{ marginTop: 12, width: "100%", justifyContent: "center" }} disabled={!signatureBlob || submitting} onClick={submit}>
                  {submitting ? "Odesílám…" : "Potvrdit a podepsat"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
