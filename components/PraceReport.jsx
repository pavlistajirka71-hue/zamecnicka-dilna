"use client";
import { useMemo, useState } from "react";
import { FileDown, FileText, Camera } from "lucide-react";
import { C, FONTS, downloadTextFile, fmtCislo, fmtMoney, fmtDate } from "@/lib/theme";
import { supabase } from "@/lib/supabaseClient";
import { mesicniPrace, mesicniJizdy, mesicniUctenky, popisZakazek } from "@/lib/reporty";
import { Button, Field, TextInput, Select, Modal } from "./ui";
import { useSignedUrl } from "./PhotoThumbnail";

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const ZALOZKY = [
  { key: "prace", label: "Práce" },
  { key: "jizdy", label: "Jízdy" },
  { key: "uctenky", label: "Účtenky" },
];

const csvRadek = (r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";");
const castkaCsv = (n) => String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ",");

function FotkaUctenky({ path }) {
  const url = useSignedUrl("uctenky", path);
  if (!url) return <span style={{ color: C.inkSoft, fontSize: 12 }}>…</span>;
  return <img src={url} alt="Účtenka" referrerPolicy="no-referrer" style={{ width: "100%", borderRadius: 6, display: "block" }} />;
}

export default function PraceReport({ orders, onClose }) {
  const [mesic, setMesic] = useState(currentMonthValue());
  const [zalozka, setZalozka] = useState("prace");
  const [filtrUctenek, setFiltrUctenek] = useState("vse"); // vse | sFotkou | bezFotky
  const [pdfStav, setPdfStav] = useState(""); // "" | "pripravuji" | chybová hláška
  const [nahled, setNahled] = useState(null); // fotoPath účtenky k zobrazení

  const prace = useMemo(() => mesicniPrace(orders, mesic), [orders, mesic]);
  const jizdy = useMemo(() => mesicniJizdy(orders, mesic), [orders, mesic]);
  const uctenkyVse = useMemo(() => mesicniUctenky(orders, mesic), [orders, mesic]);
  const bezFotky = (r) => !r.fotoPath && r.zdroj !== "faktura";
  const uctenky = useMemo(
    () => uctenkyVse.filter((r) => (filtrUctenek === "sFotkou" ? !!r.fotoPath : filtrUctenek === "bezFotky" ? bezFotky(r) : true)),
    [uctenkyVse, filtrUctenek]
  );

  const totalPrace = useMemo(
    () => prace.reduce((acc, r) => ({ dilna: acc.dilna + r.dilna, montaz: acc.montaz + r.montaz, celkem: acc.celkem + r.celkem }), { dilna: 0, montaz: 0, celkem: 0 }),
    [prace]
  );
  const naklady = zalozka === "jizdy" ? jizdy : uctenky;
  const totalNaklady = naklady.reduce((s, r) => s + r.castka, 0);
  const prazdne = zalozka === "prace" ? prace.length === 0 : naklady.length === 0;

  const exportPDF = async () => {
    setPdfStav("pripravuji");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/report-prace-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ typ: zalozka, mesic, filtr: filtrUctenek, sFotkami: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "PDF se nepodařilo vytvořit.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${zalozka === "prace" ? "report-prace" : zalozka}-${mesic}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setPdfStav("");
    } catch (e) {
      setPdfStav(e.message || "PDF se nepodařilo vytvořit.");
    }
  };

  const exportCSV = () => {
    if (zalozka === "prace") {
      const rows = [["Cislo", "Zakaznik", "HodinyDilna", "HodinyMontaz", "HodinyCelkem"], ...prace.map((r) => [r.cislo, r.zakaznik, r.dilna, r.montaz, r.celkem])];
      rows.push(["", "CELKEM", totalPrace.dilna, totalPrace.montaz, totalPrace.celkem]);
      downloadTextFile(`report-prace-${mesic}.csv`, rows.map(csvRadek).join("\r\n"));
      return;
    }
    const rows = [["Datum", "Zakazky", "Popis", zalozka === "jizdy" ? "Castka" : "CastkaBezDPH", ...(zalozka === "uctenky" ? ["Doklad"] : [])]];
    naklady.forEach((r) =>
      rows.push([r.datum, popisZakazek(r.zakazky), r.popis, castkaCsv(r.castka), ...(zalozka === "uctenky" ? [r.fotoPath ? "foto" : r.zdroj === "faktura" ? "faktura" : "chybí"] : [])])
    );
    rows.push(["", "", "CELKEM", castkaCsv(totalNaklady)]);
    downloadTextFile(`${zalozka}-${mesic}.csv`, rows.map(csvRadek).join("\r\n"));
  };

  const hlavickaStyl = { display: "grid", padding: "10px 12px", background: C.paper, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 11, color: C.inkSoft, letterSpacing: "0.05em" };
  const gridNaklady = zalozka === "uctenky" ? "80px 1.4fr 1.4fr 100px 36px" : "80px 1.4fr 1.4fr 100px";

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 14 }}>
        {ZALOZKY.map((z, i) => (
          <button
            key={z.key}
            type="button"
            onClick={() => setZalozka(z.key)}
            style={{
              flex: 1,
              padding: "8px 10px",
              border: `1px solid ${C.line}`,
              borderRadius: i === 0 ? "6px 0 0 6px" : i === ZALOZKY.length - 1 ? "0 6px 6px 0" : 0,
              background: zalozka === z.key ? C.ink : C.surface,
              color: zalozka === z.key ? "#fff" : C.ink,
              fontFamily: FONTS.display,
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
        <Field label="Měsíc">
          <TextInput type="month" value={mesic} onChange={(e) => setMesic(e.target.value)} style={{ width: 160 }} />
        </Field>
        {zalozka === "uctenky" && (
          <Field label="Zobrazit">
            <Select value={filtrUctenek} onChange={(e) => setFiltrUctenek(e.target.value)} style={{ width: 160 }}>
              <option value="vse">Vše</option>
              <option value="sFotkou">Jen s fotkou</option>
              <option value="bezFotky">Bez fotky účtenky</option>
            </Select>
          </Field>
        )}
        <Button variant="ghost" onClick={exportCSV} disabled={prazdne} style={{ marginBottom: 12 }}>
          <FileDown size={14} /> Export CSV
        </Button>
        <Button variant="ghost" onClick={exportPDF} disabled={prazdne || pdfStav === "pripravuji"} style={{ marginBottom: 12 }}>
          <FileText size={14} /> {pdfStav === "pripravuji" ? "Připravuji PDF…" : zalozka === "uctenky" ? "Export PDF (s fotkami)" : "Export PDF"}
        </Button>
      </div>
      {pdfStav && pdfStav !== "pripravuji" && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{pdfStav}</div>}

      {zalozka === "prace" &&
        (prace.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: C.inkSoft }}>V tomto měsíci nejsou zapsané žádné hodiny.</div>
        ) : (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ ...hlavickaStyl, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
              <div>Zakázka</div>
              <div style={{ textAlign: "right" }}>Dílna</div>
              <div style={{ textAlign: "right" }}>Montáž</div>
              <div style={{ textAlign: "right" }}>Celkem</div>
            </div>
            {prace.map((r, i) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 12px", borderTop: i > 0 ? `1px solid ${C.line}` : "none", fontSize: 13, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.zakaznik}</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.inkSoft }}>{r.cislo}</div>
                </div>
                <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{fmtCislo(r.dilna)} h</div>
                <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{fmtCislo(r.montaz)} h</div>
                <div style={{ textAlign: "right", fontFamily: FONTS.mono, fontWeight: 600 }}>{fmtCislo(r.celkem)} h</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: 12, borderTop: `2px dashed ${C.line}`, fontSize: 14, fontWeight: 700, background: C.paper }}>
              <div>Celkem za měsíc</div>
              <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{fmtCislo(totalPrace.dilna)} h</div>
              <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{fmtCislo(totalPrace.montaz)} h</div>
              <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{fmtCislo(totalPrace.celkem)} h</div>
            </div>
          </div>
        ))}

      {zalozka !== "prace" &&
        (naklady.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: C.inkSoft }}>
            {zalozka === "jizdy"
              ? "V tomto měsíci nejsou zapsané žádné jízdy (náklady označené „Jízda“)."
              : filtrUctenek === "bezFotky"
                ? "Všechny účtenky v tomto měsíci mají fotku."
                : "V tomto měsíci nejsou zapsané žádné účtenky."}
          </div>
        ) : (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ ...hlavickaStyl, gridTemplateColumns: gridNaklady, gap: 8 }}>
              <div>Datum</div>
              <div>Zakázka</div>
              <div>Popis</div>
              <div style={{ textAlign: "right" }}>{zalozka === "jizdy" ? "Částka" : "Bez DPH"}</div>
              {zalozka === "uctenky" && <div />}
            </div>
            {naklady.map((r, i) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: gridNaklady, gap: 8, padding: "10px 12px", borderTop: i > 0 ? `1px solid ${C.line}` : "none", fontSize: 13, alignItems: "center" }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12 }}>{fmtDate(r.datum)}</div>
                <div style={{ minWidth: 0 }}>
                  {r.zakazky.map((z) => (
                    <div key={z.id} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 600 }}>{z.zakaznik}</span> <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.inkSoft }}>{z.cislo}</span>
                    </div>
                  ))}
                </div>
                <div style={{ minWidth: 0 }}>
                  {r.popis}
                  {zalozka === "uctenky" && r.zdroj === "faktura" && <span style={{ fontSize: 11, color: C.inkSoft }}> (faktura)</span>}
                  {zalozka === "uctenky" && bezFotky(r) && <div style={{ fontSize: 11, color: C.rust }}>bez fotky účtenky</div>}
                </div>
                <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{fmtMoney(r.castka)}</div>
                {zalozka === "uctenky" && (
                  <div style={{ textAlign: "center" }}>
                    {r.fotoPath && (
                      <button type="button" title="Zobrazit účtenku" onClick={() => setNahled(r.fotoPath)} style={{ background: "none", border: "none", cursor: "pointer", color: C.steel, padding: 2 }}>
                        <Camera size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: gridNaklady, gap: 8, padding: 12, borderTop: `2px dashed ${C.line}`, fontSize: 14, fontWeight: 700, background: C.paper }}>
              <div style={{ gridColumn: "1 / 4" }}>
                Celkem ({naklady.length} {zalozka === "jizdy" ? (naklady.length === 1 ? "jízda" : naklady.length < 5 ? "jízdy" : "jízd") : naklady.length === 1 ? "doklad" : naklady.length < 5 ? "doklady" : "dokladů"})
              </div>
              <div style={{ textAlign: "right", fontFamily: FONTS.mono }}>{fmtMoney(totalNaklady)}</div>
            </div>
          </div>
        ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>

      {nahled && (
        <Modal title="Účtenka" onClose={() => setNahled(null)} width={700} zIndex={70}>
          <FotkaUctenky path={nahled} />
        </Modal>
      )}
    </div>
  );
}
