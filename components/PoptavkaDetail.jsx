"use client";
import { useState } from "react";
import { Pencil, Phone, Mail, MapPin, FileText, ArrowRight, Trash2, X, Send } from "lucide-react";
import { C, FONTS, uid, todayISO, fmtDate, fmtMoney } from "@/lib/theme";
import { nahratFotku } from "@/lib/uploadClient";
import { STAVY_POPTAVKY, slozkaPoptavky } from "@/lib/poptavky";
import { Button, SectionLabel, TextArea, Modal } from "./ui";
import PhotoThumbnail from "./PhotoThumbnail";
import VyberFotek from "./VyberFotek";
import { StavPoptavkyBadge } from "./PoptavkyPanel";

export default function PoptavkaDetail({
  poptavka: p,
  jeSpravce,
  onEdit,
  onPridatFotky,
  onOdebratFotku,
  onPridatPoznamku,
  onZmenitStav,
  onVytvoritZakazku,
  onOtevritZakazku,
  onDelete,
}) {
  const [nahravam, setNahravam] = useState("");
  const [chyba, setChyba] = useState("");
  const [novaPoznamka, setNovaPoznamka] = useState("");
  const [ukladamPoznamku, setUkladamPoznamku] = useState(false);
  const [zobrazitFotku, setZobrazitFotku] = useState(null);

  const nahratFotky = async (bloby) => {
    setChyba("");
    const nove = [];
    try {
      for (let i = 0; i < bloby.length; i++) {
        setNahravam(`Nahrávám fotku ${i + 1} z ${bloby.length}…`);
        const path = await nahratFotku(bloby[i], `poptavka-${p.cislo}-${uid()}.jpg`, "fotky", slozkaPoptavky(p));
        nove.push({ id: uid(), datum: todayISO(), path, popis: "" });
      }
    } catch (e) {
      console.error(e);
      setChyba("Některou fotku se nepodařilo nahrát. Zkontroluj připojení a zkus to znovu.");
    }
    // Uloží i ty, které se nahrát povedlo, než nastala chyba.
    if (nove.length) {
      try {
        await onPridatFotky(p, nove);
      } catch (e) {
        setChyba("Fotky se nahrály, ale nepodařilo se je přiřadit k poptávce. Zkus to znovu.");
      }
    }
    setNahravam("");
  };

  const ulozitPoznamku = async () => {
    const text = novaPoznamka.trim();
    if (!text) return;
    setUkladamPoznamku(true);
    setChyba("");
    try {
      await onPridatPoznamku(p, text);
      setNovaPoznamka("");
    } catch (e) {
      setChyba("Poznámku se nepodařilo uložit. Zkus to znovu.");
    }
    setUkladamPoznamku(false);
  };

  const radek = (Icon, obsah) =>
    obsah ? (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, marginBottom: 6 }}>
        <Icon size={15} color={C.inkSoft} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ whiteSpace: "pre-wrap", minWidth: 0, overflowWrap: "anywhere" }}>{obsah}</div>
      </div>
    ) : null;

  const fotky = p.fotky || [];
  const poznamky = p.poznamky || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.inkSoft }}>{p.cislo}</span>
        <StavPoptavkyBadge stav={p.stav} />
        <span style={{ fontSize: 12, color: C.inkSoft }}>
          přijato {fmtDate(p.vytvoreno)}
          {p.zdroj ? ` · ${p.zdroj}` : ""}
          {p.vytvoril ? ` · zapsal/a ${p.vytvoril}` : ""}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{p.zakaznik}</div>
        <Button variant="ghost" onClick={onEdit} style={{ padding: "6px 10px" }}>
          <Pencil size={13} /> Upravit
        </Button>
      </div>

      <div style={{ marginBottom: 14 }}>
        {radek(Phone, p.telefon && <a href={`tel:${p.telefon}`} style={{ color: C.ink }}>{p.telefon}</a>)}
        {radek(Mail, p.email && <a href={`mailto:${p.email}`} style={{ color: C.ink }}>{p.email}</a>)}
        {radek(MapPin, p.zakaznikIdentifikace)}
        {p.ico && radek(FileText, `IČO ${p.ico}`)}
        {Number(p.odhadCena) > 0 && (
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
            Odhad ceny <strong style={{ color: C.ink, fontFamily: FONTS.mono }}>{fmtMoney(p.odhadCena)}</strong> bez DPH
          </div>
        )}
        {p.pozadovanyTermin && (
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
            Zákazník to potřebuje do <strong style={{ color: C.ink }}>{fmtDate(p.pozadovanyTermin)}</strong>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel>Co zákazník poptává</SectionLabel>
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, fontSize: 14, whiteSpace: "pre-wrap", minHeight: 40 }}>
          {p.text || <span style={{ color: C.inkSoft }}>Bez popisu — doplň přes Upravit nebo jako poznámku níže.</span>}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel>Fotky {fotky.length ? `(${fotky.length})` : ""}</SectionLabel>
        {fotky.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {fotky.map((f) => (
              <div key={f.id} style={{ position: "relative" }}>
                <PhotoThumbnail bucket="fotky" path={f.path} alt={f.popis || "Fotka"} caption={fmtDate(f.datum)} onOpen={setZobrazitFotku} />
                <button
                  type="button"
                  title="Odebrat fotku z poptávky"
                  onClick={() => {
                    if (window.confirm("Odebrat tuhle fotku z poptávky?")) onOdebratFotku(p, f.id).catch(() => setChyba("Odebrání se nepovedlo."));
                  }}
                  style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 10, width: 20, height: 20, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <VyberFotek disabled={!!nahravam} onVybrano={nahratFotky} />
        {nahravam && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>{nahravam}</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel>Poznámky a průběh {poznamky.length ? `(${poznamky.length})` : ""}</SectionLabel>
        {poznamky.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {poznamky.map((n) => (
              <div key={n.id} style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono, marginBottom: 2 }}>
                  {fmtDate(n.datum)}
                  {n.autor ? ` · ${n.autor}` : ""}
                </div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{n.text}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <TextArea
            value={novaPoznamka}
            onChange={(e) => setNovaPoznamka(e.target.value)}
            placeholder="Např. volal znovu, chce i branku; domluveno zaměření na čtvrtek…"
            style={{ minHeight: 44, flex: 1 }}
          />
          <Button variant="primary" onClick={ulozitPoznamku} disabled={ukladamPoznamku || !novaPoznamka.trim()} style={{ padding: "10px 12px" }} title="Přidat poznámku">
            <Send size={14} />
          </Button>
        </div>
      </div>

      {chyba && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{chyba}</div>}

      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
        {p.zakazkaId ? (
          <div style={{ background: "#E6F0E8", border: `1px solid ${C.moss}`, borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14 }}>
              Z poptávky je zakázka <strong style={{ fontFamily: FONTS.mono }}>{p.zakazkaCislo}</strong>
            </span>
            <Button variant="moss" onClick={() => onOtevritZakazku(p)}>
              Otevřít zakázku <ArrowRight size={14} />
            </Button>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <Button variant="rust" onClick={() => onVytvoritZakazku(p)} disabled={p.stav === "odmitnuta"} style={{ width: "100%", justifyContent: "center", padding: "12px 16px" }}>
              <FileText size={15} /> Vytvořit nabídku a zakázku
            </Button>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>
              Založí zakázku ve stavu Nabídnuto s údaji, popisem, poznámkami a fotkami z poptávky. V jejím detailu pak uděláš kalkulaci a nabídku.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.inkSoft, marginRight: 4 }}>Stav:</span>
          {STAVY_POPTAVKY.filter((s) => s.key !== "nabidka" || p.zakazkaId).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => s.key !== p.stav && onZmenitStav(p, s.key).catch(() => setChyba("Změnu stavu se nepovedlo uložit."))}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: `1.5px solid ${s.color}`,
                background: p.stav === s.key ? s.color : "transparent",
                color: p.stav === s.key ? "#fff" : s.color,
                fontFamily: FONTS.display,
                textTransform: "uppercase",
                fontSize: 11,
                letterSpacing: "0.03em",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
          {jeSpravce && (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm(`Opravdu smazat poptávku ${p.cislo}? Zakázky založené z ní zůstanou beze změny.`)) onDelete(p);
              }}
              style={{ marginLeft: "auto", padding: "6px 10px" }}
            >
              <Trash2 size={13} /> Smazat
            </Button>
          )}
        </div>
      </div>

      {zobrazitFotku && (
        <Modal title="Fotka" onClose={() => setZobrazitFotku(null)} width={900} zIndex={70}>
          <img src={zobrazitFotku} alt="" referrerPolicy="no-referrer" style={{ width: "100%", borderRadius: 6, display: "block" }} />
        </Modal>
      )}
    </div>
  );
}
