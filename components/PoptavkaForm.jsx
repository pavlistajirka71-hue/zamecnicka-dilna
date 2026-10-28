"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, uid, todayISO } from "@/lib/theme";
import { nahratFotku } from "@/lib/uploadClient";
import { ZDROJE_POPTAVKY, slozkaPoptavky, zalohoveCisloPoptavky } from "@/lib/poptavky";
import { Field, TextInput, TextArea, Select, Button, SectionLabel } from "./ui";
import VyberFotek from "./VyberFotek";

// Založení nové poptávky (i s fotkami najednou) nebo úprava údajů existující.
// Fotky a poznámky u existující poptávky se přidávají v jejím detailu.
export default function PoptavkaForm({ initial, poptavky, onSave, onClose }) {
  const jeNova = !initial;
  const [f, setF] = useState(
    () =>
      initial || {
        zakaznik: "",
        telefon: "",
        email: "",
        ico: "",
        zakaznikIdentifikace: "",
        zdroj: "Telefon",
        text: "",
        pozadovanyTermin: "",
      }
  );
  const [bloby, setBloby] = useState([]); // fotky čekající na nahrání (jen u nové poptávky)
  const [nahledy, setNahledy] = useState([]);
  const [ukladam, setUkladam] = useState(false);
  const [stavNahravani, setStavNahravani] = useState("");
  const [chyba, setChyba] = useState("");

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    const urls = bloby.map((b) => URL.createObjectURL(b));
    setNahledy(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [bloby]);

  const ziskatCislo = async () => {
    const rok = new Date().getFullYear();
    try {
      const { data, error } = await supabase.rpc("ziskat_dalsi_cislo_poptavky", { p_rok: rok });
      if (error) throw error;
      return `P-${rok}-${String(data).padStart(4, "0")}`;
    } catch (e) {
      console.error("Serverové přidělení čísla poptávky se nepovedlo, používám záložní výpočet:", e);
      return zalohoveCisloPoptavky(poptavky);
    }
  };

  const ulozit = async () => {
    if (!f.zakaznik.trim()) return;
    setUkladam(true);
    setChyba("");
    try {
      const zaznam = {
        ...f,
        zakaznik: f.zakaznik.trim(),
        pozadovanyTermin: f.pozadovanyTermin || null,
      };
      if (jeNova) {
        zaznam.cislo = await ziskatCislo();
        zaznam.stav = "nova";
        zaznam.vytvoreno = todayISO();
        const fotky = [];
        for (let i = 0; i < bloby.length; i++) {
          setStavNahravani(`Nahrávám fotku ${i + 1} z ${bloby.length}…`);
          const path = await nahratFotku(bloby[i], `poptavka-${zaznam.cislo}-${uid()}.jpg`, "fotky", slozkaPoptavky(zaznam));
          fotky.push({ id: uid(), datum: todayISO(), path, popis: "" });
        }
        zaznam.fotky = fotky;
        zaznam.poznamky = [];
      }
      setStavNahravani("Ukládám…");
      await onSave(zaznam);
    } catch (e) {
      console.error(e);
      setChyba("Uložení se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      setUkladam(false);
      setStavNahravani("");
    }
  };

  return (
    <div>
      {!jeNova && (
        <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>Poptávka {initial.cislo}</div>
      )}
      <Field label="Zákazník (jméno nebo firma)">
        <TextInput value={f.zakaznik} onChange={(e) => set("zakaznik", e.target.value)} autoFocus={jeNova} />
      </Field>
      <div className="field-row">
        <Field label="Telefon">
          <TextInput type="tel" value={f.telefon || ""} onChange={(e) => set("telefon", e.target.value)} />
        </Field>
        <Field label="E-mail">
          <TextInput type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Odkud poptávka přišla">
          <Select value={f.zdroj || ""} onChange={(e) => set("zdroj", e.target.value)}>
            {ZDROJE_POPTAVKY.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kdy to zákazník potřebuje (nepovinné)">
          <TextInput type="date" value={f.pozadovanyTermin || ""} onChange={(e) => set("pozadovanyTermin", e.target.value)} />
        </Field>
      </div>
      <Field label="Adresa / místo realizace (nepovinné)">
        <TextArea value={f.zakaznikIdentifikace || ""} onChange={(e) => set("zakaznikIdentifikace", e.target.value)} style={{ minHeight: 44 }} />
      </Field>
      <Field label="IČO (nepovinné — u firem; ARES jde doplnit při zakládání zakázky)">
        <TextInput value={f.ico || ""} onChange={(e) => set("ico", e.target.value.replace(/\D/g, "").slice(0, 8))} />
      </Field>
      <Field label="Co zákazník poptává">
        <TextArea value={f.text || ""} onChange={(e) => set("text", e.target.value)} style={{ minHeight: 110 }} />
      </Field>

      {jeNova && (
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Fotky {bloby.length ? `(${bloby.length})` : ""}</SectionLabel>
          {nahledy.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {nahledy.map((url, i) => (
                <div key={url} style={{ position: "relative" }}>
                  <img src={url} alt="" style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.line}`, display: "block" }} />
                  <button
                    type="button"
                    onClick={() => setBloby((prev) => prev.filter((_, j) => j !== i))}
                    disabled={ukladam}
                    title="Odebrat"
                    style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 10, width: 20, height: 20, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <VyberFotek disabled={ukladam} onVybrano={(nove) => setBloby((prev) => [...prev, ...nove])} />
        </div>
      )}

      {!f.zakaznik.trim() && <div style={{ fontSize: 12, color: C.rust, textAlign: "right" }}>Vyplň zákazníka, ať jde poptávku uložit.</div>}
      {chyba && <div style={{ fontSize: 13, color: C.danger, marginTop: 4, textAlign: "right" }}>{chyba}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 8 }}>
        {stavNahravani && <span style={{ fontSize: 12, color: C.inkSoft }}>{stavNahravani}</span>}
        <Button variant="ghost" type="button" onClick={onClose} disabled={ukladam}>
          Zrušit
        </Button>
        <Button variant="primary" type="button" onClick={ulozit} disabled={ukladam || !f.zakaznik.trim()}>
          {ukladam ? "Ukládám…" : jeNova ? "Uložit poptávku" : "Uložit změny"}
        </Button>
      </div>
    </div>
  );
}
