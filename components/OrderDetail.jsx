"use client";
import { useMemo, useState } from "react";
import { Calculator, Pencil, Trash2, Truck, CheckCircle2, FileSignature, Camera, Wallet, TrendingUp, TrendingDown, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, STATUSES, computeKalkulaceCelkem, computeNakladyZakazky, normalizovatKalkulaci, fmtMoney, fmtDate, isOverdue } from "@/lib/theme";
import { Button, SectionLabel, StampBadge, Modal, Field, TextInput, AutoCompleteTextInput, Select, iconBtnStyle } from "./ui";
import ReceiptThumbnail from "./ReceiptThumbnail";
import PhotoThumbnail from "./PhotoThumbnail";

const ZALOZKY = [
  { key: "prace", label: "Práce" },
  { key: "material", label: "Materiál" },
  { key: "dokumenty", label: "Dokumenty" },
  { key: "naklady", label: "Vyhodnocení" },
  { key: "kalkulace", label: "Kalkulace" },
];

export default function OrderDetail({ order, nastaveni, mojeRole, onSave, onDelete, onEdit, onOpenKalkulace, onOpenPoptavka, onOpenProtokol, onOpenFotka, onOpenNaklady, onEditPrace, onGeneratePdf, generatingPdf, onClose }) {
  const [viewPhoto, setViewPhoto] = useState(null);
  const [tab, setTab] = useState("prace");
  const [editujiciPrace, setEditujiciPrace] = useState(null);
  const [praceForm, setPraceForm] = useState({ datum: "", typ: "dilna", hodiny: "", pracovnik: "", popis: "" });
  const polozkyKalkulace = normalizovatKalkulaci(order.kalkulace);
  const nakladyVysledek = computeNakladyZakazky(order, nastaveni);
  const maMaterial = polozkyKalkulace.some((p) => (p.materialy || []).length > 0);
  const jsemSA = mojeRole === "sa";
  const navrhyPopisuPrace = useMemo(() => {
    const unikatni = new Set();
    (order.prace || []).forEach((p) => {
      if (p.popis && p.popis.trim()) unikatni.add(p.popis.trim());
    });
    return Array.from(unikatni);
  }, [order.prace]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{order.zakaznik}</div>
          <div style={{ color: C.inkSoft, fontSize: 14 }}>{order.popis}</div>
        </div>
        <StampBadge status={order.stav} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, fontSize: 14 }}>
        <div>
          <div style={{ color: C.inkSoft, fontSize: 12 }}>Cena</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 16 }}>{fmtMoney(order.cena)}</div>
        </div>
        <div>
          <div style={{ color: C.inkSoft, fontSize: 12 }}>Termín</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: isOverdue(order) ? C.rust : C.ink }}>{fmtDate(order.termin)}</div>
        </div>
        <div>
          <div style={{ color: C.inkSoft, fontSize: 12 }}>Vytvořeno</div>
          <div style={{ fontFamily: FONTS.mono }}>{fmtDate(order.vytvoreno)}</div>
        </div>
        {order.cisloFaktury && (
          <div>
            <div style={{ color: C.inkSoft, fontSize: 12 }}>Číslo faktury</div>
            <div style={{ fontFamily: FONTS.mono }}>{order.cisloFaktury}</div>
          </div>
        )}
      </div>

      {order.stav === "fakturovano" && (
        <div style={{ background: C.steelDark, color: "#fff", borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 12, color: "#C9CDD2", marginBottom: 8 }}>
            Uzavřeno — skutečný výsledek zakázky
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "#C9CDD2" }}>Náklady celkem</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 15 }}>{fmtMoney(nakladyVysledek.nakladyCelkem)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#C9CDD2" }}>Zisk</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: nakladyVysledek.zisk >= 0 ? "#7FBF8F" : "#E39A9A" }}>
                {fmtMoney(nakladyVysledek.zisk)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#C9CDD2" }}>Marže</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONTS.mono, fontSize: 15 }}>
                {nakladyVysledek.marzePct >= nakladyVysledek.planMarzePct ? (
                  <TrendingUp size={14} color="#7FBF8F" />
                ) : (
                  <TrendingDown size={14} color="#E39A9A" />
                )}
                {nakladyVysledek.marzePct.toFixed(1)} %
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#C9CDD2", marginTop: 8 }}>
            Plán z kalkulace: {fmtMoney(nakladyVysledek.planZisk)} zisk · {nakladyVysledek.planMarzePct.toFixed(1)} % marže
          </div>
        </div>
      )}

      {/* ---------- Záložky ---------- */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {ZALOZKY.map((z) => {
          const active = tab === z.key;
          return (
            <button
              key={z.key}
              onClick={() => setTab(z.key)}
              style={{
                flex: "1 1 62px",
                padding: "8px 4px",
                borderRadius: 6,
                border: `1px solid ${active ? C.steel : C.line}`,
                background: active ? C.steel : "transparent",
                color: active ? "#fff" : C.ink,
                fontFamily: FONTS.display,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              {z.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
        {tab === "prace" && (
          <div>
            <SectionLabel>Fond pracovní — plán / skutečnost</SectionLabel>
            {["dilna", "montaz"].map((typKey) => {
              const label = typKey === "dilna" ? "Dílna" : "Montáž";
              const plan = Number(typKey === "dilna" ? order.planCasDilna : order.planCasMontaz) || 0;
              const skut = (order.prace || []).filter((p) => (p.typ || "dilna") === typKey).reduce((s, p) => s + Number(p.hodiny || 0), 0);
              const over = skut > plan;
              return (
                <div key={typKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
                  <span>{label}</span>
                  <span style={{ fontFamily: FONTS.mono, color: over ? C.rust : C.ink }}>
                    {skut} h / plán {plan} h
                  </span>
                </div>
              );
            })}

            {order.prace && order.prace.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <SectionLabel>Záznamy práce</SectionLabel>
                {order.prace.map((p) =>
                  editujiciPrace === p.id ? (
                    <div key={p.id} style={{ background: C.paper, borderRadius: 6, padding: 10, marginBottom: 6 }}>
                      <div className="field-row">
                        <Field label="Datum">
                          <TextInput type="date" value={praceForm.datum} onChange={(e) => setPraceForm((f) => ({ ...f, datum: e.target.value }))} />
                        </Field>
                        <Field label="Typ">
                          <Select value={praceForm.typ} onChange={(e) => setPraceForm((f) => ({ ...f, typ: e.target.value }))}>
                            <option value="dilna">Dílna</option>
                            <option value="montaz">Montáž</option>
                          </Select>
                        </Field>
                      </div>
                      <div className="field-row">
                        <Field label="Hodiny">
                          <TextInput type="number" step="0.5" value={praceForm.hodiny} onChange={(e) => setPraceForm((f) => ({ ...f, hodiny: e.target.value }))} />
                        </Field>
                        <Field label="Pracovník">
                          <TextInput value={praceForm.pracovnik} onChange={(e) => setPraceForm((f) => ({ ...f, pracovnik: e.target.value }))} />
                        </Field>
                      </div>
                      <Field label="Popis">
                        <AutoCompleteTextInput
                          value={praceForm.popis}
                          onChange={(e) => setPraceForm((f) => ({ ...f, popis: e.target.value }))}
                          navrhy={navrhyPopisuPrace}
                        />
                      </Field>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                        <button
                          onClick={() => {
                            onEditPrace(order, order.prace.filter((x) => x.id !== p.id));
                            setEditujiciPrace(null);
                          }}
                          style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <Trash2 size={13} /> Smazat záznam
                        </button>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button variant="ghost" onClick={() => setEditujiciPrace(null)}>
                            Zrušit
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => {
                              onEditPrace(
                                order,
                                order.prace.map((x) => (x.id === p.id ? { ...x, ...praceForm, hodiny: Number(praceForm.hodiny) || 0 } : x))
                              );
                              setEditujiciPrace(null);
                            }}
                          >
                            Uložit opravu
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
                      <div>
                        <span style={{ fontFamily: FONTS.mono, color: C.inkSoft }}>{fmtDate(p.datum)}</span>
                        {"  ·  "}
                        <span style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 11, color: (p.typ || "dilna") === "dilna" ? C.steel : C.brass }}>
                          {(p.typ || "dilna") === "dilna" ? "Dílna" : "Montáž"}
                        </span>
                        {"  ·  "}
                        <span style={{ fontFamily: FONTS.mono }}>{p.hodiny} h</span>
                        {p.pracovnik && <span> · {p.pracovnik}</span>}
                        {p.popis && <div style={{ color: C.inkSoft }}>{p.popis}</div>}
                      </div>
                      <button
                        onClick={() => {
                          setPraceForm({ datum: p.datum, typ: p.typ || "dilna", hodiny: p.hodiny, pracovnik: p.pracovnik || "", popis: p.popis || "" });
                          setEditujiciPrace(p.id);
                        }}
                        title="Opravit záznam"
                        style={{ ...iconBtnStyle, flexShrink: 0 }}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {tab === "material" && (
          <div>
            <SectionLabel>Materiál</SectionLabel>
            {maMaterial ? (
              <>
                <div style={{ background: C.paper, borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
                  {polozkyKalkulace.map(
                    (p) =>
                      (p.materialy || []).length > 0 && (
                        <div key={p.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px dashed ${C.line}` }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.nazev || "Položka"}</div>
                          {p.materialy.map((m, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "1px 0", color: C.inkSoft }}>
                              <span style={{ fontFamily: FONTS.body }}>
                                {m.nazev || "—"}
                                {m.dodavatel ? ` (${m.dodavatel})` : ""} · {m.mnozstvi || 0} {m.jednotka || ""}
                              </span>
                              <span style={{ fontFamily: FONTS.mono }}>{fmtMoney((Number(m.cena) || 0) * (Number(m.mnozstvi) || 0))}</span>
                            </div>
                          ))}
                        </div>
                      )
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <Button variant="ghost" onClick={onOpenPoptavka}>
                    <Truck size={14} /> Poptávka materiálu
                  </Button>
                  {order.materialObjednano ? (
                    <button
                      onClick={() => onSave({ ...order, materialObjednano: false, materialObjednanoDatum: null })}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.moss, fontSize: 13 }}
                    >
                      <CheckCircle2 size={16} /> Objednáno {order.materialObjednanoDatum ? `(${fmtDate(order.materialObjednanoDatum)})` : ""} — zrušit
                    </button>
                  ) : (
                    <button
                      onClick={() => onSave({ ...order, materialObjednano: true, materialObjednanoDatum: new Date().toISOString().slice(0, 10) })}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: C.inkSoft, fontSize: 13 }}
                    >
                      Označit jako objednané u dodavatele
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.inkSoft }}>Kalkulace zatím neobsahuje žádný materiál.</div>
            )}
          </div>
        )}

        {tab === "dokumenty" && (
          <div>
            {order.uctenky && order.uctenky.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Účtenky ({order.uctenky.length})</SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {order.uctenky.map((u) => (
                    <ReceiptThumbnail key={u.id} receipt={u} onOpen={setViewPhoto} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Fotky z průběhu práce {order.fotky?.length ? `(${order.fotky.length})` : ""}</SectionLabel>
              {order.fotky && order.fotky.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {order.fotky.map((f) => (
                    <PhotoThumbnail
                      key={f.id}
                      bucket="fotky"
                      path={f.path}
                      alt={f.popis || "Fotka"}
                      caption={f.typ === "pred" ? "Před" : f.typ === "po" ? "Po" : null}
                      onOpen={setViewPhoto}
                    />
                  ))}
                </div>
              )}
              <Button variant="ghost" onClick={onOpenFotka}>
                <Camera size={14} /> Přidat fotku
              </Button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Předávací protokol</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={onOpenProtokol}>
                  <FileSignature size={14} /> {order.protokol ? "Otevřít protokol" : "Vytvořit protokol"}
                </Button>
                {order.protokol?.stav === "podepsano" ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.moss, fontSize: 13 }}>
                    <CheckCircle2 size={16} /> Podepsáno {fmtDate(order.protokol.podpisDatum)}
                  </span>
                ) : order.protokol ? (
                  <span style={{ fontSize: 13, color: C.inkSoft }}>Čeká na podpis</span>
                ) : null}
              </div>
            </div>

            {(order.stav === "hotovo" || order.stav === "fakturovano") && (
              <div>
                <SectionLabel>Archiv PDF {order.archivy?.length ? `(${order.archivy.length})` : ""}</SectionLabel>
                {order.archivy && order.archivy.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {order.archivy.map((a) => (
                      <button
                        key={a.id}
                        onClick={async () => {
                          let href = a.url;
                          if (!href.startsWith("http")) {
                            const { data } = await supabase.storage.from("archivy").createSignedUrl(href, 300);
                            href = data?.signedUrl;
                          }
                          if (href) window.open(href, "_blank", "noopener,noreferrer");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "none",
                          border: "none",
                          color: C.steel,
                          cursor: "pointer",
                          fontSize: 13,
                          padding: "4px 0",
                        }}
                      >
                        <FileDown size={14} /> Archiv z {fmtDate(a.datum)}
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="ghost" onClick={onGeneratePdf} disabled={generatingPdf}>
                  <FileDown size={14} /> {generatingPdf ? "Vytvářím PDF…" : "Vygenerovat PDF a uložit na Drive"}
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "naklady" && (
          <div>
            <SectionLabel>Vyhodnocení zakázky</SectionLabel>
            <div style={{ background: C.paper, borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>Náklady celkem (vč. práce)</span>
                <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(nakladyVysledek.nakladyCelkem)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>Zisk / Marže</span>
                <span style={{ fontFamily: FONTS.mono, color: nakladyVysledek.zisk >= 0 ? C.moss : C.danger }}>
                  {fmtMoney(nakladyVysledek.zisk)} ({nakladyVysledek.marzePct.toFixed(1)} %)
                </span>
              </div>
            </div>
            <Button variant="ghost" onClick={onOpenNaklady}>
              <Wallet size={14} /> {order.naklady && order.naklady.length > 0 ? "Upravit náklady" : "Sledovat náklady"}
            </Button>
          </div>
        )}

        {tab === "kalkulace" && (
          <div>
            <SectionLabel>Kalkulace zakázky</SectionLabel>
            {polozkyKalkulace.length > 0 ? (
              (() => {
                const celkem = computeKalkulaceCelkem(polozkyKalkulace, nastaveni);
                return (
                  <div style={{ background: C.paper, borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
                    {celkem.items.map(({ polozka, vysledek }) => (
                      <div key={polozka.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px dashed ${C.line}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 2 }}>
                          <span>{polozka.nazev || "Položka"}</span>
                          <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(vysledek.finalniCena)}</span>
                        </div>
                        {(polozka.materialy || []).map((m, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.mono, fontSize: 12, padding: "1px 0", color: C.inkSoft }}>
                            <span style={{ fontFamily: FONTS.body }}>
                              {m.nazev || "—"}
                              {m.dodavatel ? ` (${m.dodavatel})` : ""} · {m.mnozstvi || 0} {m.jednotka || ""}
                            </span>
                            <span>{fmtMoney((Number(m.cena) || 0) * (Number(m.mnozstvi) || 0))}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: 600 }}>
                      <span>Cena celkem bez DPH / s DPH</span>
                      <span style={{ fontFamily: FONTS.mono }}>
                        {fmtMoney(celkem.cenaBezDph)} / {fmtMoney(celkem.cenaSDph)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span>Plánovaná marže</span>
                      <span style={{ fontFamily: FONTS.mono, color: celkem.marzeKc >= 0 ? C.moss : C.danger }}>
                        {fmtMoney(celkem.marzeKc)} ({celkem.marzePct.toFixed(1)} %)
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 8 }}>Kalkulace zatím není vytvořená.</div>
            )}
            {jsemSA ? (
              <Button variant="ghost" style={{ marginTop: 8 }} onClick={onOpenKalkulace}>
                <Calculator size={14} /> {polozkyKalkulace.length > 0 ? "Upravit kalkulaci" : "Vytvořit kalkulaci"}
              </Button>
            ) : (
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8 }}>Úpravu kalkulace smí jen správce.</div>
            )}
          </div>
        )}
      </div>

      {order.poznamka && (
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Poznámka</SectionLabel>
          <div style={{ fontSize: 14, color: C.inkSoft }}>{order.poznamka}</div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Rychlá změna stavu</SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => onSave({ ...order, stav: s.key })}
              style={{
                fontFamily: FONTS.display,
                textTransform: "uppercase",
                fontSize: 11,
                letterSpacing: "0.03em",
                padding: "6px 10px",
                borderRadius: 5,
                border: `1.5px solid ${s.color}`,
                background: order.stav === s.key ? s.color : "transparent",
                color: order.stav === s.key ? "#fff" : s.color,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, borderTop: `2px dashed ${C.line}`, paddingTop: 16 }}>
        {jsemSA ? (
          <Button variant="danger" onClick={() => onDelete(order.id)}>
            <Trash2 size={14} /> Smazat
          </Button>
        ) : (
          <span />
        )}
        <Button variant="primary" onClick={onEdit}>
          <Pencil size={14} /> Upravit
        </Button>
      </div>

      {viewPhoto && (
        <Modal title="Účtenka" onClose={() => setViewPhoto(null)} width={520}>
          <img src={viewPhoto} alt="Účtenka" referrerPolicy="no-referrer" style={{ width: "100%", borderRadius: 8 }} />
        </Modal>
      )}
    </div>
  );
}
