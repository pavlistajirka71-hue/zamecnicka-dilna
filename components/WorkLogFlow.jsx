"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { C, FONTS, uid, todayISO, UZAVRENE_STAVY } from "@/lib/theme";
import { supabase } from "@/lib/supabaseClient";
import { Field, TextInput, TextArea, Button } from "./ui";
import OrderPicker from "./OrderPicker";

export default function WorkLogFlow({ orders, onSubmit, onClose }) {
  const [order, setOrder] = useState(null);
  const [datum, setDatum] = useState(todayISO());
  const [typ, setTyp] = useState("dilna");
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

  if (!order) {
    return (
      <OrderPicker
        orders={orders}
        onPick={setOrder}
        excludeStavy={[...UZAVRENE_STAVY, "nova"]}
        excludeNote="Nabídnuté, hotové a fakturované zakázky se tu nenabízí — práce se zapisuje jen u přijatých zakázek."
      />
    );
  }

  return (
    <div>
      <button
        onClick={() => setOrder(null)}
        style={{ background: "none", border: "none", color: C.steel, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, fontSize: 13, padding: 4, marginLeft: -4 }}
      >
        <ArrowLeft size={14} /> Jiná zakázka
      </button>
      <div style={{ background: C.paper, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{order.cislo}</div>
        <div style={{ fontWeight: 600 }}>{order.zakaznik}</div>
        <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4, fontFamily: FONTS.mono }}>
          plán dílna {order.planCasDilna || 0} h · plán montáž {order.planCasMontaz || 0} h
        </div>
      </div>

      <Field label="Kde se pracovalo">
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "dilna", label: "Dílna" },
            { key: "montaz", label: "Montáž" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTyp(t.key)}
              style={{
                flex: 1,
                padding: "9px 10px",
                borderRadius: 6,
                border: `1.5px solid ${C.steel}`,
                background: typ === t.key ? C.steel : "transparent",
                color: typ === t.key ? "#fff" : C.steel,
                fontFamily: FONTS.display,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="field-row">
        <Field label="Datum">
          <TextInput type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </Field>
        <Field label="Odpracované hodiny">
          <TextInput type="number" step="0.5" value={hodiny} onChange={(e) => setHodiny(e.target.value)} />
        </Field>
      </div>
      <Field label="Kdo pracoval">
        <TextInput value={pracovnik} onChange={(e) => setPracovnik(e.target.value)} />
      </Field>
      <Field label="Co se dělalo">
        <TextArea value={popis} onChange={(e) => setPopis(e.target.value)} />
      </Field>

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
