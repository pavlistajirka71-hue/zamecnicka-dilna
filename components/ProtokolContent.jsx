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
      <div style={{ color: C.inkSoft, marginBottom: 4, fontFamily: FONTS.mono, fontSize: 13 }}>
        Zakázka {protokol.cislo}
      </div>
      <div style={{ color: C.inkSoft, marginBottom: 24, fontSize: 13 }}>
        Datum předání: {fmtDate(protokol.datumPredani)}
        {protokol.mistoPredani && ` · Místo předání: ${protokol.mistoPredani}`}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Zhotovitel (předávající)
          </div>
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
          {protokol.jmenoPrebirajiciho && protokol.jmenoPrebirajiciho !== protokol.zakaznik && (
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>Za objednatele přebírá: {protokol.jmenoPrebirajiciho}</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Předmět díla</div>
        <div style={{ fontSize: 14, whiteSpace: "pre-line" }}>{protokol.popisDila || "—"}</div>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
        Zhotovitel tímto předává výše uvedené dílo a přebírající svým podpisem potvrzuje jeho převzetí.
        {maVyhrady ? " Dílo bylo předáno s těmito výhradami:" : " Dílo bylo předáno řádně, bez vad a nedodělků."}
      </div>

      {maVyhrady && (
        <div style={{ marginBottom: 20, background: "#FBF3E0", border: `1px solid ${C.brass}`, borderRadius: 8, padding: 12, fontSize: 14, whiteSpace: "pre-line" }}>
          {protokol.vyhrady}
        </div>
      )}

      {protokol.zarucniDobaMesicu && (
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20 }}>
          Záruční doba na provedené dílo činí {protokol.zarucniDobaMesicu} měsíců a počíná běžet dnem předání uvedeným výše.
        </div>
      )}

      {protokol.opravaZhotoviteleDatum && (
        <div style={{ fontSize: 11, color: C.inkSoft, fontStyle: "italic", marginBottom: 8 }}>
          Údaje o zhotoviteli byly opraveny dne {fmtDate(protokol.opravaZhotoviteleDatum)} — po datu podpisu.
        </div>
      )}
      {protokol.opravaUdajuDatum && (
        <div style={{ fontSize: 11, color: C.inkSoft, fontStyle: "italic", marginBottom: 20 }}>
          Údaje protokolu byly opraveny dne {fmtDate(protokol.opravaUdajuDatum)} — po datu podpisu.
        </div>
      )}
    </div>
  );
}
