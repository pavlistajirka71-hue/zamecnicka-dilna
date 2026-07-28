"use client";
import { C, FONTS, fmtDate } from "@/lib/theme";

export default function ProtokolContent({ protokol }) {
  const z = protokol.zhotovitel || {};
  const maVyhrady = protokol.vyhrady && protokol.vyhrady.trim().length > 0;

  return (
    <div style={{ color: C.ink, fontFamily: FONTS.body }}>
      <div style={{ fontFamily: FONTS.display, fontSize: 24, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>
        Protokol o předání a převzetí díla
      </div>
      <div style={{ color: C.inkSoft, marginBottom: 24, fontFamily: FONTS.mono, fontSize: 13 }}>
        Zakázka {protokol.cislo} · {fmtDate(protokol.datumPredani)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Zhotovitel</div>
          <div style={{ fontWeight: 600 }}>{z.nazev || "—"}</div>
          {z.adresa && <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "pre-line" }}>{z.adresa}</div>}
          {z.ico && <div style={{ fontSize: 12, color: C.inkSoft, fontFamily: FONTS.mono }}>IČO: {z.ico}</div>}
          {z.dic && <div style={{ fontSize: 12, color: C.inkSoft, fontFamily: FONTS.mono }}>DIČ: {z.dic}</div>}
        </div>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Objednatel</div>
          <div style={{ fontWeight: 600 }}>{protokol.zakaznik || "—"}</div>
          {protokol.zakaznikIdentifikace && (
            <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "pre-line" }}>{protokol.zakaznikIdentifikace}</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Předmět díla</div>
        <div style={{ fontSize: 14, whiteSpace: "pre-line" }}>{protokol.popisDila || "—"}</div>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
        Zhotovitel tímto předává a objednatel svým podpisem potvrzuje převzetí výše uvedeného díla.
        {maVyhrady ? " Dílo bylo předáno s těmito výhradami:" : " Dílo bylo předáno řádně, bez vad a nedodělků."}
      </div>

      {maVyhrady && (
        <div style={{ marginBottom: 20, background: "#FBF3E0", border: `1px solid ${C.brass}`, borderRadius: 8, padding: 12, fontSize: 14, whiteSpace: "pre-line" }}>
          {protokol.vyhrady}
        </div>
      )}
    </div>
  );
}
