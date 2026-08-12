"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Wrench, Truck, Plus } from "lucide-react";
import { C, FONTS, uid, todayISO, UZAVRENE_STAVY, nabidkaPracovniku } from "@/lib/theme";
import { supabase } from "@/lib/supabaseClient";
import { Field, TextInput, TextArea, AutoCompleteTextArea, TextInputSNabidkou, Button } from "./ui";
import OrderPicker from "./OrderPicker";

const CINNOSTI = [
  { key: "dilna", label: "Dílna", icon: Wrench },
  { key: "montaz", label: "Montáž", icon: Truck },
];

export default function WorkLogFlow({ orders, nastaveni, uzivatele, onSubmit, onCreateOrder, onClose }) {
  const [order, setOrder] = useState(null);
  // Kroky appky: "vyberZakazky" (appka umí i zakázku rovnou rychle založit), "cinnost"
  // (dílna/montáž — vybere se jako první a samo posune dál), "detaily" (zbytek
  // formuláře). Ať appka po výběru zakázky nezahltí uživatele všemi poli najednou.
  const [krok, setKrok] = useState("vyberZakazky");
  const [novyZakaznik, setNovyZakaznik] = useState("");
  const [novyPopis, setNovyPopis] = useState("");
  const [zakladamZakazku, setZakladamZakazku] = useState(false);
  const [chybaZalozeni, setChybaZalozeni] = useState("");
  const [datum, setDatum] = useState(todayISO());
  const [typ, setTyp] = useState(null);
  const [pracovnik, setPracovnik] = useState("");
  const [hodiny, setHodiny] = useState("");
  const [popis, setPopis] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.email) setPracovnik((prev) => prev || data.session.user.email);
    });
  }, []);

  // Návrhy pro "Co se dělalo" — jen z historie TÉHLE zakázky (činnosti se v rámci
  // jedné zakázky často opakují), ne napříč celou appkou.
  const navrhyPopisu = useMemo(() => {
    if (!order) return [];
    const unikatni = new Set();
    (order.prace || []).forEach((p) => {
      if (p.popis && p.popis.trim()) unikatni.add(p.popis.trim());
    });
    return Array.from(unikatni);
  }, [order]);

  const vybratCinnost = (klic) => {
    setTyp(klic);
    setKrok("detaily");
  };

  const zalozitZakazkuAPokracovat = async () => {
    if (!novyZakaznik.trim()) return;
    setZakladamZakazku(true);
    setChybaZalozeni("");
    try {
      const rok = new Date().getFullYear();
      let cislo;
      try {
        const { data, error } = await supabase.rpc("ziskat_dalsi_cislo_zakazky", { p_rok: rok });
        if (error) throw error;
        cislo = `Z-${rok}-${String(data).padStart(4, "0")}`;
      } catch (e) {
        // Záložní řešení offline/při chybě RPC — appka radši založí zakázku s
        // provizorním označením, než aby appka o odpracovanou práci přišla.
        cislo = `Z-${rok}-DOPLNIT-${uid().slice(-4)}`;
      }
      const novaZakazka = {
        id: uid(),
        cislo,
        zakaznik: novyZakaznik.trim(),
        popis: novyPopis.trim(),
        stav: "probiha",
        cena: "",
        termin: "",
        vytvoreno: todayISO(),
        poznamka: "Založeno rychle při zápisu práce — doplň prosím zbylé údaje.",
        cisloFaktury: "",
        prace: [],
        uctenky: [],
        naklady: [],
        fotky: [],
        archivy: [],
        planCasDilna: "",
        planCasMontaz: "",
        nadrazenaZakazkaId: null,
      };
      await onCreateOrder(novaZakazka);
      setOrder(novaZakazka);
      setKrok("cinnost");
      setTyp(null);
    } catch (e) {
      console.error(e);
      setChybaZalozeni("Založení se nepovedlo, zkus to prosím znovu.");
    }
    setZakladamZakazku(false);
  };

  if (!order && krok === "novaZakazka") {
    return (
      <div>
        <button
          onClick={() => setKrok("vyberZakazky")}
          style={{ background: "none", border: "none", color: C.steel, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, fontSize: 13, padding: 4, marginLeft: -4 }}
        >
          <ArrowLeft size={14} /> Vybrat existující zakázku
        </button>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>
          Appka založí minimální zakázku hned teď, ať se odpracovaná práce nikde neztratí — zbylé údaje (cenu, termín, kalkulaci…) doplníš později v detailu
          zakázky.
        </div>
        <Field label="Zákazník">
          <TextInput value={novyZakaznik} onChange={(e) => setNovyZakaznik(e.target.value)} autoFocus />
        </Field>
        <Field label="Popis (nepovinné)">
          <TextArea value={novyPopis} onChange={(e) => setNovyPopis(e.target.value)} />
        </Field>
        {chybaZalozeni && <div style={{ fontSize: 13, color: C.rust, marginBottom: 8 }}>{chybaZalozeni}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Zrušit
          </Button>
          <Button variant="primary" type="button" disabled={zakladamZakazku || !novyZakaznik.trim()} onClick={zalozitZakazkuAPokracovat}>
            {zakladamZakazku ? "Zakládám…" : "Založit a pokračovat"}
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <OrderPicker
          orders={orders}
          onPick={(o) => {
            setOrder(o);
            setKrok("cinnost");
            setTyp(null);
          }}
          excludeStavy={[...UZAVRENE_STAVY, "nova"]}
          excludeNote="Nabídnuté, hotové a fakturované zakázky se tu nenabízí — práce se zapisuje jen u přijatých zakázek."
        />
        <Button variant="ghost" type="button" onClick={() => setKrok("novaZakazka")} style={{ marginTop: 10, width: "100%" }}>
          <Plus size={14} /> Zakázka ještě není založená
        </Button>
      </div>
    );
  }

  const orderKarta = (
    <div style={{ background: C.paper, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{order.cislo}</div>
      <div style={{ fontWeight: 600 }}>{order.zakaznik}</div>
      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4, fontFamily: FONTS.mono }}>
        plán dílna {order.planCasDilna || 0} h · plán montáž {order.planCasMontaz || 0} h
      </div>
    </div>
  );

  if (krok === "cinnost") {
    return (
      <div>
        <button
          onClick={() => setOrder(null)}
          style={{ background: "none", border: "none", color: C.steel, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, fontSize: 13, padding: 4, marginLeft: -4 }}
        >
          <ArrowLeft size={14} /> Jiná zakázka
        </button>
        {orderKarta}

        <Field label="Kde se pracovalo">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CINNOSTI.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => vybratCinnost(t.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "22px 16px",
                  borderRadius: 8,
                  border: `1.5px solid ${C.steel}`,
                  background: "transparent",
                  color: C.steel,
                  fontFamily: FONTS.display,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                <t.icon size={22} /> {t.label}
              </button>
            ))}
          </div>
        </Field>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setKrok("cinnost")}
        style={{ background: "none", border: "none", color: C.steel, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, fontSize: 13, padding: 4, marginLeft: -4 }}
      >
        <ArrowLeft size={14} /> {CINNOSTI.find((t) => t.key === typ)?.label}
      </button>
      {orderKarta}

      <div className="field-row">
        <Field label="Datum">
          <TextInput type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </Field>
        <Field label="Odpracované hodiny">
          <TextInput type="number" step="0.5" value={hodiny} onChange={(e) => setHodiny(e.target.value)} />
        </Field>
      </div>
      <Field label="Kdo pracoval">
        <TextInputSNabidkou value={pracovnik} onChange={(e) => setPracovnik(e.target.value)} navrhy={nabidkaPracovniku(nastaveni, uzivatele)} />
      </Field>
      {nastaveni?.nabizetPracovniky && nabidkaPracovniku(nastaveni, uzivatele).length === 0 && (
        <div style={{ fontSize: 11, color: C.inkSoft, marginTop: -8, marginBottom: 12 }}>
          Zatím tu nejsou žádní pracovníci k výběru — přidej je v Nastavení → Pracovníci.
        </div>
      )}
      <Field label="Co se dělalo">
        <AutoCompleteTextArea value={popis} onChange={(e) => setPopis(e.target.value)} navrhy={navrhyPopisu} />
      </Field>
      {navrhyPopisu.length > 0 && (
        <div style={{ fontSize: 11, color: C.inkSoft, marginTop: -8, marginBottom: 12 }}>
          Našeptává z dřívějších zápisů u téhle zakázky — piš dál, ať doplněný text přepíšeš, nebo ho nech tak.
        </div>
      )}

      {error && <div style={{ fontSize: 13, color: C.rust, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose} type="button">
          Zrušit
        </Button>
        <Button
          variant="primary"
          type="button"
          disabled={saving}
          onClick={async () => {
            if (!hodiny) return;
            setSaving(true);
            setError("");
            try {
              await onSubmit(order, { id: uid(), datum, typ, pracovnik, hodiny: Number(hodiny), popis });
            } catch (e) {
              setError("Uložení se nepovedlo, zkus to prosím znovu.");
              setSaving(false);
            }
          }}
        >
          {saving ? "Ukládám…" : "Uložit záznam práce"}
        </Button>
      </div>
    </div>
  );
}
