"use client";
import { useEffect, useRef, useState } from "react";
import { X, Download, Share2, Mail } from "lucide-react";
import { vytvoritEmlKoncept, stahnoutSoubor } from "@/lib/emlKoncept";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, fmtMoney, fmtDate, todayISO } from "@/lib/theme";
import { Button, Select, TextInput, TextArea } from "./ui";
import { useSignedUrl } from "./PhotoThumbnail";

// Nabídka se tiskne s vybranou sazbou DPH nezávisle na tom, s jakou aplikace počítá
// interně kalkulaci/marži (u stavebních prací na bydlení jde občas použít snížená
// sazba) — aplikace si to jen dopočítá pro tisk, uloženou kalkulaci to nemění.
const SAZBY_DPH = [
  { hodnota: 0.21, label: "21 %" },
  { hodnota: 0.15, label: "15 %" },
  { hodnota: 0.12, label: "12 %" },
  { hodnota: 0, label: "bez DPH" },
];

// celkem = computeKalkulaceCelkem(...) výstup, obsahuje celkem.items = [{ polozka, vysledek }, ...]
export default function QuoteView({ order, polozky, celkem, nastaveni, onClose }) {
  const [sazbaDph, setSazbaDph] = useState(order.sazbaDph ?? 0.21);
  const items = celkem.items || [];
  const cenaSDphNabidka = celkem.cenaBezDph * (1 + sazbaDph);
  const n = nastaveni || {};
  const logoUrl = useSignedUrl("logo", n.firmaLogoPath);

  // PDF se připraví na serveru hned při otevření (a znovu při změně sazby DPH), takže
  // stažení i sdílení jsou pak okamžité — a mobil (hlavně iPhone) sdílení povolí jen
  // tehdy, když proběhne hned po ťuknutí, ne až po čekání na server.
  const [pdf, setPdf] = useState(null); // { blob, nazev }
  const [pdfStav, setPdfStav] = useState("pripravuji"); // pripravuji | hotovo | chyba
  const [pdfChyba, setPdfChyba] = useState("");
  const [umiSdilet, setUmiSdilet] = useState(false);

  useEffect(() => {
    try {
      const zkusebni = new File([""], "test.pdf", { type: "application/pdf" });
      setUmiSdilet(!!(navigator.canShare && navigator.canShare({ files: [zkusebni] })));
    } catch (e) {
      setUmiSdilet(false);
    }
  }, []);

  useEffect(() => {
    let zruseno = false;
    (async () => {
      setPdfStav("pripravuji");
      setPdfChyba("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await fetch(`/api/nabidka-pdf/${encodeURIComponent(order.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
          body: JSON.stringify({ sazbaDph }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "PDF se nepodařilo vytvořit.");
        }
        const blob = await res.blob();
        const hlavicka = res.headers.get("Content-Disposition") || "";
        const nazev = (hlavicka.match(/filename="([^"]+)"/) || [])[1] || `Nabidka_${order.cislo}.pdf`;
        if (!zruseno) {
          setPdf({ blob, nazev });
          setPdfStav("hotovo");
        }
      } catch (e) {
        if (!zruseno) {
          setPdfStav("chyba");
          setPdfChyba(e.message || "PDF se nepodařilo vytvořit.");
        }
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [order.id, order.cislo, sazbaDph]);

  const stahnout = () => {
    if (!pdf) return;
    const url = URL.createObjectURL(pdf.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdf.nazev;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // ---- E-mail zákazníkovi s PDF v příloze ----
  // Výchozí text e-mailu — vstřícný, bez ceny (cena je v přiložené nabídce).
  // Výchozí text e-mailu k nabídce — vstřícný, bez ceny (ta je v přiložené nabídce).
  const vychoziText = () => {
    const predmetDila = (order.popis || "").split("\n")[0].trim().slice(0, 80);
    return [
      "Dobrý den,",
      "",
      "děkujeme za Váš zájem a za důvěru, se kterou jste se na nás obrátili.",
      `V příloze Vám posíláme cenovou nabídku č. ${order.cislo}${predmetDila ? ` – ${predmetDila}` : ""}.`,
      "",
      "Nabídku jsme připravili podle Vašich požadavků. Pokud byste chtěli cokoli upravit – rozměry, materiál, povrchovou úpravu nebo termín –, stačí odpovědět na tento e-mail nebo nám zavolat. Rádi nabídku přizpůsobíme a zodpovíme jakékoli dotazy.",
      "",
      "Budeme se těšit na spolupráci.",
      "",
      "S pozdravem",
      n.firmaNazev || "",
      n.firmaEmail || "",
    ]
      .join("\n")
      .trim();
  };
  const [emailKomu, setEmailKomu] = useState(order.email || "");
  const [emailPredmet, setEmailPredmet] = useState(`Cenová nabídka ${order.cislo}${n.firmaNazev ? ` – ${n.firmaNazev}` : ""}`);
  const [emailText, setEmailText] = useState(null); // null = výchozí text
  const [emailInfo, setEmailInfo] = useState("");
  const [emailOtevreny, setEmailOtevreny] = useState(false);
  const emailPanelRef = useRef(null);
  const otevritEmailPanel = () => {
    setEmailOtevreny((x) => !x);
    setTimeout(() => emailPanelRef.current && emailPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const textEmailu = emailText ?? vychoziText();

  const otevritVOutlooku = async () => {
    if (!pdf) return;
    const eml = await vytvoritEmlKoncept({ komu: emailKomu.trim(), predmet: emailPredmet, text: textEmailu, priloha: pdf.blob, nazevPrilohy: pdf.nazev });
    stahnoutSoubor(eml, pdf.nazev.replace(/\.pdf$/i, "") + ".eml");
    setEmailInfo("Stáhl se soubor e-mailu — otevři ho (dole v prohlížeči nebo ve Stažených souborech). V Outlooku se otevře nová zpráva s PDF v příloze, zkontroluj ji a odešli.");
  };

  const jenText = () => {
    window.location.href = `mailto:${encodeURIComponent(emailKomu.trim()).replace(/%40/g, "@")}?subject=${encodeURIComponent(emailPredmet)}&body=${encodeURIComponent(
      textEmailu.replace(/\n/g, "\r\n")
    )}`;
    setEmailInfo("Otevírá se e-mail bez přílohy — PDF k němu přilož ručně (Stáhnout PDF).");
  };

  const sdilet = async () => {
    if (!pdf) return;
    try {
      await navigator.share({
        files: [new File([pdf.blob], pdf.nazev, { type: "application/pdf" })],
        title: `Cenová nabídka ${order.cislo}`,
      });
    } catch (e) {
      if (e && e.name !== "AbortError") setPdfChyba("Sdílení se nepovedlo — použij Stáhnout PDF.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto" }}>
      <div
        className="no-print"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 16, borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSoft }}>
          Sazba DPH na nabídce:
          <Select value={sazbaDph} onChange={(e) => setSazbaDph(Number(e.target.value))} style={{ width: "auto", padding: "6px 10px" }}>
            {SAZBY_DPH.map((s) => (
              <option key={s.hodnota} value={s.hodnota}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>
            <X size={14} /> Zavřít
          </Button>
          <Button variant={emailOtevreny ? "ghost" : "rust"} onClick={otevritEmailPanel}>
            <Mail size={14} /> {emailOtevreny ? "Skrýt e-mail" : "Poslat e-mailem"}
          </Button>
          {umiSdilet && (
            <Button variant="ghost" onClick={sdilet} disabled={pdfStav !== "hotovo"}>
              <Share2 size={14} /> Sdílet
            </Button>
          )}
          <Button variant="primary" onClick={stahnout} disabled={pdfStav !== "hotovo"}>
            <Download size={14} /> {pdfStav === "pripravuji" ? "Připravuji PDF…" : "Stáhnout PDF"}
          </Button>
        </div>
        {pdfChyba && <div style={{ width: "100%", textAlign: "right", fontSize: 12, color: C.danger }}>{pdfChyba}</div>}
      </div>

      {emailOtevreny && (
      <div ref={emailPanelRef} className="jen-obrazovka" style={{ maxWidth: 700, margin: "16px auto 0", padding: "0 32px" }}>
        <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <Mail size={15} /> Poslat zákazníkovi e-mailem (PDF v příloze)
        </div>
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, marginTop: 8 }}>
          <div className="field-row">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Komu</div>
              <TextInput type="email" value={emailKomu} onChange={(e) => setEmailKomu(e.target.value)} placeholder="e-mail zákazníka" />
            </div>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Předmět</div>
              <TextInput value={emailPredmet} onChange={(e) => setEmailPredmet(e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 12, margin: "8px 0 4px" }}>Text e-mailu</div>
          <TextArea value={textEmailu} onChange={(e) => setEmailText(e.target.value)} style={{ minHeight: 190 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <Button variant="primary" type="button" onClick={otevritVOutlooku} disabled={pdfStav !== "hotovo"}>
              <Mail size={14} /> {pdfStav === "pripravuji" ? "Připravuji PDF…" : "Otevřít v Outlooku s PDF"}
            </Button>
            <Button variant="ghost" type="button" onClick={jenText}>
              Jen text (bez přílohy)
            </Button>
            {emailText !== null && (
              <Button variant="ghost" type="button" onClick={() => setEmailText(null)}>
                Obnovit výchozí text
              </Button>
            )}
          </div>
          {emailInfo && <div style={{ fontSize: 12, color: C.moss, marginTop: 8 }}>{emailInfo}</div>}
          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8 }}>
            Funguje s Outlookem v počítači: stáhne se soubor .eml, po otevření je v Outlooku hotová zpráva s PDF v příloze. Na mobilu použij tlačítko Sdílet nahoře.
          </div>
        </div>
      </div>
      )}

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 32px 28px", color: C.ink, fontFamily: FONTS.body }}>
        {/* Hlavička s názvem firmy */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderBottom: `3px solid ${C.steelDark}`,
            paddingBottom: 12,
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: 40, maxWidth: 140, objectFit: "contain" }} />}
            <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", color: C.steelDark }}>
              {n.firmaNazev || "Cenová nabídka"}
            </div>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{fmtDate(todayISO())}</div>
        </div>

        {/* Odběratel / Dodavatel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: C.rust, marginBottom: 8 }}>
              Odběratel
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{order.zakaznik}</div>
            {order.zakaznikIdentifikace && (
              <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "pre-line" }}>{order.zakaznikIdentifikace}</div>
            )}
          </div>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: C.rust, marginBottom: 8 }}>
              Dodavatel
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{n.firmaNazev || "—"}</div>
            {n.firmaAdresa && <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "pre-line" }}>{n.firmaAdresa}</div>}
            {(n.firmaIco || n.firmaDic) && (
              <div style={{ fontSize: 13, color: C.inkSoft, fontFamily: FONTS.mono, marginTop: 4 }}>
                {n.firmaIco && <div>IČO: {n.firmaIco}</div>}
                {n.firmaDic && <div>DIČ: {n.firmaDic}</div>}
              </div>
            )}
            {n.firmaEmail && <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{n.firmaEmail}</div>}
          </div>
        </div>

        {/* Nadpis nabídky */}
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderBottom: `1px solid ${C.line}`,
            paddingBottom: 8,
            marginBottom: 16,
          }}
        >
          Nabídka výroby a montáže — {order.cislo}
        </div>
        {order.popis && <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 20, whiteSpace: "pre-line" }}>{order.popis}</div>}

        {/* Tabulka položek */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.steelDark}` }}>
              <th style={{ textAlign: "left", padding: "8px 10px 8px 0", fontFamily: FONTS.display, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: C.inkSoft }}>
                Položka
              </th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontFamily: FONTS.display, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: C.inkSoft, width: 90 }}>
                MJ
              </th>
              <th style={{ textAlign: "right", padding: "8px 0 8px 10px", fontFamily: FONTS.display, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: C.inkSoft, width: 140 }}>
                Celkem
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ polozka, vysledek }, i) => (
              <tr key={polozka.id || i} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: "10px 10px 10px 0", fontSize: 14 }}>{polozka.nazev || `Položka ${i + 1}`}</td>
                <td style={{ padding: "10px", fontSize: 14, fontFamily: FONTS.mono, color: C.inkSoft }}>
                  {polozka.pocetKs || 1} {polozka.jednotka || "ks"}
                </td>
                <td style={{ padding: "10px 0 10px 10px", fontSize: 14, fontFamily: FONTS.mono, textAlign: "right" }}>{fmtMoney(vysledek.cenaBezDph)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Součty */}
        <div style={{ marginLeft: "auto", width: "62%", marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", fontSize: 14, fontWeight: 600, borderTop: `1px solid ${C.line}` }}>
            <span>Celkem bez DPH</span>
            <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(celkem.cenaBezDph)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 14px",
              fontSize: 17,
              fontWeight: 700,
              background: C.steelDark,
              color: "#fff",
              borderRadius: 6,
              marginTop: 6,
            }}
          >
            <span>Celkem s DPH {(sazbaDph * 100).toFixed(0)} %</span>
            <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(cenaSDphNabidka)}</span>
          </div>
        </div>

        {n.podminkyNabidky && (
          <div style={{ marginTop: 32, fontSize: 12, color: C.inkSoft, whiteSpace: "pre-line", borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
            {n.podminkyNabidky}
          </div>
        )}

        {/* Patička */}
        <div style={{ marginTop: 60, paddingTop: 14, borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.inkSoft }}>
          {[n.firmaNazev, n.firmaAdresa, n.firmaIco && `IČO: ${n.firmaIco}`, n.firmaEmail].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}
