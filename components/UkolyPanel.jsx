"use client";
import { useMemo, useState } from "react";
import { Plus, Check, Trash2, X } from "lucide-react";
import { C, FONTS, fmtDate, todayISO } from "@/lib/theme";
import { Field, TextInput, TextArea, Select, Button } from "./ui";
import OrderPicker from "./OrderPicker";

export default function UkolyPanel({ ukoly, orders, uzivatele, mujEmail, onCreate, onToggleHotovo, onDelete, onOpenOrder }) {
  const [zobrazeni, setZobrazeni] = useState("moje"); // moje | zadane | vse
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [prirazenoKomu, setPrirazenoKomu] = useState("");
  const [termin, setTermin] = useState("");
  const [vybranaZakazka, setVybranaZakazka] = useState(null);
  const [showZakazkaPicker, setShowZakazkaPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtrovane = useMemo(() => {
    let vysledek = ukoly;
    if (zobrazeni === "moje") vysledek = ukoly.filter((u) => u.prirazenoKomu === mujEmail);
    else if (zobrazeni === "zadane") vysledek = ukoly.filter((u) => u.zadalKdo === mujEmail);
    // Nehotové první, mezi nimi nejdřív ty s nejbližším (nebo žádným) termínem; hotové úplně dole.
    return [...vysledek].sort((a, b) => {
      if (a.hotovo !== b.hotovo) return a.hotovo ? 1 : -1;
      if (!a.termin && !b.termin) return 0;
      if (!a.termin) return 1;
      if (!b.termin) return -1;
      return a.termin.localeCompare(b.termin);
    });
  }, [ukoly, zobrazeni, mujEmail]);

  const pocetNehotovychMoje = ukoly.filter((u) => u.prirazenoKomu === mujEmail && !u.hotovo).length;

  const zalozit = async () => {
    if (!text.trim() || !prirazenoKomu) return;
    setSaving(true);
    try {
      await onCreate({
        text: text.trim(),
        prirazenoKomu,
        zakazkaId: vybranaZakazka?.id || null,
        zakazkaCislo: vybranaZakazka?.cislo || null,
        termin: termin || null,
      });
      setText("");
      setPrirazenoKomu("");
      setTermin("");
      setVybranaZakazka(null);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  if (showZakazkaPicker) {
    return (
      <div>
        <button
          onClick={() => setShowZakazkaPicker(false)}
          style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, fontSize: 13, padding: 4, marginLeft: -4 }}
        >
          <X size={14} /> Zrušit výběr zakázky
        </button>
        <OrderPicker
          orders={orders}
          onPick={(o) => {
            setVybranaZakazka(o);
            setShowZakazkaPicker(false);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "moje", label: `Zadané mně${pocetNehotovychMoje > 0 ? ` (${pocetNehotovychMoje})` : ""}` },
            { key: "zadane", label: "Zadané mnou" },
            { key: "vse", label: "Vše" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setZobrazeni(f.key)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: `1px solid ${zobrazeni === f.key ? C.ink : C.line}`,
                background: zobrazeni === f.key ? C.ink : "transparent",
                color: zobrazeni === f.key ? "#fff" : C.ink,
                fontSize: 12,
                fontFamily: FONTS.display,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant={showForm ? "ghost" : "primary"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Zrušit" : (
            <>
              <Plus size={14} /> Nový úkol
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <Field label="Co je potřeba udělat">
            <TextArea value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          </Field>
          <div className="field-row">
            <Field label="Komu">
              <Select value={prirazenoKomu} onChange={(e) => setPrirazenoKomu(e.target.value)}>
                <option value="">Vyber…</option>
                {uzivatele.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Termín (nepovinné)">
              <TextInput type="date" value={termin} onChange={(e) => setTermin(e.target.value)} />
            </Field>
          </div>
          <Field label="Zakázka (nepovinné)">
            {vybranaZakazka ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 13, background: C.paper, borderRadius: 6, padding: "6px 10px", flex: 1 }}>
                  {vybranaZakazka.cislo} — {vybranaZakazka.zakaznik}
                </div>
                <button onClick={() => setVybranaZakazka(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <Button variant="ghost" type="button" onClick={() => setShowZakazkaPicker(true)}>
                Vybrat zakázku
              </Button>
            )}
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <Button variant="primary" onClick={zalozit} disabled={saving || !text.trim() || !prirazenoKomu}>
              {saving ? "Ukládám…" : "Zadat úkol"}
            </Button>
          </div>
        </div>
      )}

      {filtrovane.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkSoft, textAlign: "center", padding: 30 }}>
          {zobrazeni === "moje" ? "Nic ti tu zatím nikdo nezadal." : zobrazeni === "zadane" ? "Zatím jsi nikomu nic nezadal/a." : "Zatím žádné úkoly."}
        </div>
      ) : (
        <div>
          {filtrovane.map((u) => {
            const jePoTerminu = u.termin && !u.hotovo && u.termin < todayISO();
            return (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  border: `1px solid ${C.line}`,
                  borderRadius: 8,
                  marginBottom: 6,
                  opacity: u.hotovo ? 0.55 : 1,
                }}
              >
                <button
                  onClick={() => onToggleHotovo(u)}
                  title={u.hotovo ? "Označit jako nehotové" : "Označit jako hotové"}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `1.5px solid ${u.hotovo ? C.ink : C.line}`,
                    background: u.hotovo ? C.ink : "transparent",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {u.hotovo && <Check size={13} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, textDecoration: u.hotovo ? "line-through" : "none" }}>{u.text}</div>
                  <div style={{ fontSize: 11, color: jePoTerminu ? C.danger : C.inkSoft, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>
                      {u.zadalKdo === mujEmail ? `Zadáno pro ${u.prirazenoKomu}` : `Zadal ${u.zadalKdo}`}
                    </span>
                    {u.termin && <span>· {jePoTerminu ? "po termínu " : "do "}{fmtDate(u.termin)}</span>}
                    {u.zakazkaCislo && (
                      <button
                        onClick={() => {
                          const order = orders.find((o) => o.id === u.zakazkaId);
                          if (order) onOpenOrder(order);
                        }}
                        style={{ background: "none", border: "none", color: C.ink, textDecoration: "underline", cursor: "pointer", fontSize: 11, padding: 0 }}
                      >
                        · {u.zakazkaCislo}
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => onDelete(u)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
