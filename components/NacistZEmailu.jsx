"use client";
import { useRef, useState } from "react";
import { Mail, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { C, FONTS, resizeImageFile } from "@/lib/theme";
import { rozebratEmail } from "@/lib/emailRozbor";
import { nacistSouborEmailu } from "@/lib/emailSoubor";
import { Button, TextArea } from "./ui";

// Načtení poptávky z e-mailu — vše se zpracuje přímo v prohlížeči, zdarma,
// e-mail se nikam neposílá. Výsledek jen předvyplní formulář ke kontrole.
export default function NacistZEmailu({ vlastni, onNacteno }) {
  const [otevreno, setOtevreno] = useState(true);
  const [vlozenyText, setVlozenyText] = useState("");
  const [pracuji, setPracuji] = useState(false);
  const [chyba, setChyba] = useState("");
  const [tahne, setTahne] = useState(false);
  const souborRef = useRef(null);

  const zpracovat = async (email) => {
    const udaje = rozebratEmail(email, vlastni);
    const fotky = [];
    let preskoceneFotky = 0;
    for (const blob of email.fotky || []) {
      try {
        // Malé obrázky (obě strany pod 500 px) jsou loga a ikonky z podpisů — třeba
        // naše logo MySteel v citované odpovědi. Skutečné fotky jsou větší.
        if (typeof createImageBitmap === "function") {
          const bmp = await createImageBitmap(blob);
          const jeLogo = bmp.width < 500 && bmp.height < 500;
          bmp.close && bmp.close();
          if (jeLogo) continue;
        }
        fotky.push(await resizeImageFile(blob, 1600, 0.72));
      } catch (e) {
        preskoceneFotky++; // formát, který prohlížeč neumí zobrazit (např. HEIC)
      }
    }
    onNacteno({ udaje, fotky, ostatniPrilohy: (email.ostatniPrilohy || 0) + preskoceneFotky });
    setOtevreno(false);
  };

  const nacistSoubor = async (soubor) => {
    if (!soubor) return;
    setPracuji(true);
    setChyba("");
    try {
      const email = await nacistSouborEmailu(soubor);
      if (!(email.text || "").trim() && !email.odEmail) throw new Error("prazdny");
      await zpracovat(email);
    } catch (e) {
      console.error(e);
      setChyba("Tenhle soubor se nepodařilo přečíst. Podporované jsou e-maily .msg (Outlook) a .eml. Případně vlož text e-mailu do pole níže.");
    }
    setPracuji(false);
  };

  const nacistText = async () => {
    if (!vlozenyText.trim()) return;
    setChyba("");
    await zpracovat({ text: vlozenyText });
    setVlozenyText("");
  };

  if (!otevreno) {
    return (
      <button
        type="button"
        onClick={() => setOtevreno(true)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.inkSoft, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}
      >
        <Mail size={14} /> Načíst z jiného e-mailu <ChevronDown size={14} />
      </button>
    );
  }

  return (
    <div style={{ background: C.paper, border: `1px dashed ${C.line}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <Mail size={15} /> Načíst z e-mailu
        </div>
        <button type="button" onClick={() => setOtevreno(false)} title="Skrýt" style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}>
          <ChevronUp size={16} />
        </button>
      </div>

      <input
        ref={souborRef}
        type="file"
        accept=".msg,.eml,message/rfc822,application/vnd.ms-outlook"
        style={{ display: "none" }}
        onChange={(e) => {
          const s = e.target.files && e.target.files[0];
          e.target.value = "";
          nacistSoubor(s);
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setTahne(true);
        }}
        onDragLeave={() => setTahne(false)}
        onDrop={(e) => {
          e.preventDefault();
          setTahne(false);
          nacistSoubor(e.dataTransfer.files && e.dataTransfer.files[0]);
        }}
        onClick={() => !pracuji && souborRef.current && souborRef.current.click()}
        style={{
          border: `2px dashed ${tahne ? C.steel : C.line}`,
          background: tahne ? "#fff" : "transparent",
          borderRadius: 8,
          padding: "16px 12px",
          textAlign: "center",
          cursor: pracuji ? "wait" : "pointer",
          color: C.steel,
          marginBottom: 10,
        }}
      >
        <Upload size={20} />
        <div style={{ fontSize: 13, marginTop: 4 }}>{pracuji ? "Čtu e-mail…" : "Přetáhni sem e-mail z Outlooku nebo klikni a vyber soubor (.msg / .eml)"}</div>
        <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>Fotky z příloh se přidají automaticky</div>
      </div>

      <TextArea
        value={vlozenyText}
        onChange={(e) => setVlozenyText(e.target.value)}
        placeholder="…nebo sem vlož text e-mailu (v Outlooku klikni do zprávy, Ctrl+A, Ctrl+C a tady Ctrl+V)"
        style={{ minHeight: 60 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: C.inkSoft }}>Zpracuje se jen tady v prohlížeči, nikam se neodesílá.</span>
        <Button variant="ghost" type="button" onClick={nacistText} disabled={!vlozenyText.trim() || pracuji}>
          Načíst text
        </Button>
      </div>
      {chyba && <div style={{ color: C.danger, fontSize: 12, marginTop: 6 }}>{chyba}</div>}
    </div>
  );
}
