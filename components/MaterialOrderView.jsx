"use client";
import { useMemo, useState } from "react";
import { X, Printer, Copy, Check, Mail, Save, CheckCircle2 } from "lucide-react";
import { C, FONTS, normalizovatKalkulaci, fmtDate, fmtCislo, todayISO, klicMaterialu } from "@/lib/theme";
import { Button, TextInput, TextArea, Select } from "./ui";

const BEZ_DODAVATELE = "Bez uvedeného dodavatele";

// Sebere materiál ze všech položek kalkulace, seskupí podle dodavatele a stejné
// materiály (stejný název + jednotka) napříč položkami sečte do jednoho řádku.
function sestavitPoptavku(polozky) {
  const bySupplier = new Map();
  polozky.forEach((p) => {
    const pocetKs = Math.max(1, Number(p.pocetKs) || 1);
    (p.materialy || []).forEach((m) => {
      if (!m.nazev || !m.nazev.trim()) return;
      const dodavatel = m.dodavatel && m.dodavatel.trim() ? m.dodavatel.trim() : BEZ_DODAVATELE;
      const key = `${m.nazev.trim().toLowerCase()}|${m.jednotka || ""}`;
      if (!bySupplier.has(dodavatel)) bySupplier.set(dodavatel, new Map());
      const items = bySupplier.get(dodavatel);
      const mnozstvi = (Number(m.mnozstvi) || 0) * pocetKs;
      if (!items.has(key)) {
        items.set(key, {
          key,
          nazev: m.nazev.trim(),
          jednotka: m.jednotka || "",
          mnozstvi: 0,
          zPolozek: [],
          // klíč řádku v checklistu objednání (stejný výpočet jako v checklistu)
          klicChecklistu: klicMaterialu({ nazev: m.nazev, dodavatel: m.dodavatel, jednotka: m.jednotka }),
        });
      }
      const entry = items.get(key);
      entry.mnozstvi += mnozstvi;
      entry.zPolozek.push({ nazev: p.nazev || "Položka", mnozstvi });
    });
  });
  return Array.from(bySupplier.entries()).map(([dodavatel, items]) => ({ dodavatel, items: Array.from(items.values()) }));
}

export default function MaterialOrderView({ order, nastaveni, dodavatele, onUlozitDodavatele, onZmenaChecklistu, mujEmail, onClose }) {
  const n = nastaveni || {};
  const polozky = normalizovatKalkulaci(order.kalkulace);
  const skupiny = useMemo(() => sestavitPoptavku(polozky), [order.kalkulace]); // eslint-disable-line react-hooks/exhaustive-deps
  const stav = order.materialChecklist?.stav || {};
  const poptano = order.materialChecklist?.poptano || [];

  // Společné údaje pro všechny e-maily
  const [termin, setTermin] = useState("");
  // Doručit do dílny / osobní odběr — appka si pamatuje poslední volbu na tomhle zařízení
  const [dodani, setDodaniStav] = useState(() => {
    try {
      return localStorage.getItem("poptavka-dodani") || "odber";
    } catch (e) {
      return "odber";
    }
  });
  const setDodani = (v) => {
    setDodaniStav(v);
    try {
      localStorage.setItem("poptavka-dodani", v);
    } catch (e) {
      // úložiště nedostupné — volba platí jen teď
    }
  };
  const adresaDodani = (n.adresaDilny || n.firmaAdresa || "").replace(/\n/g, ", ");
  const [poznamka, setPoznamka] = useState("");
  // Nastavení jednotlivých skupin: { [dodavatel]: { email, vybrane: {key: bool}, mnozstvi: {key: hodnota}, prirazenyDodavatel } }
  const [nast, setNast] = useState({});
  const [zprava, setZprava] = useState("");

  const kontakt = (nazev) => (dodavatele || []).find((d) => d.nazev.toLowerCase() === (nazev || "").toLowerCase());
  const g = (dod) => nast[dod] || {};
  const setG = (dod, zmena) => setNast((prev) => ({ ...prev, [dod]: { ...(prev[dod] || {}), ...zmena } }));

  const skutecnyDodavatel = (sk) => (sk.dodavatel === BEZ_DODAVATELE ? g(sk.dodavatel).prirazenyDodavatel || "" : sk.dodavatel);
  const emailSkupiny = (sk) => (g(sk.dodavatel).email !== undefined ? g(sk.dodavatel).email : kontakt(skutecnyDodavatel(sk))?.email || "");
  const jeVybrano = (sk, it) => g(sk.dodavatel).vybrane?.[it.key] !== false; // výchozí: vše vybráno
  const mnozstviPolozky = (sk, it) => (g(sk.dodavatel).mnozstvi?.[it.key] !== undefined ? g(sk.dodavatel).mnozstvi[it.key] : fmtCislo(it.mnozstvi).replace(/\s/g, ""));
  const vybranePolozky = (sk) => sk.items.filter((it) => jeVybrano(sk, it));

  const predmet = () => `Poptávka materiálu – ${order.cislo}${n.firmaNazev ? ` (${n.firmaNazev})` : ""}`;
  const textEmailu = (sk) => {
    const radky = vybranePolozky(sk).map((it, i) => `${i + 1}) ${it.nazev} — ${mnozstviPolozky(sk, it)} ${it.jednotka}`.trim());
    const casti = [
      "Dobrý den,",
      "",
      "prosíme o cenovou nabídku a termín dodání na tento materiál:",
      "",
      ...radky,
      "",
    ];
    if (termin) casti.push(`Požadovaný termín dodání: ${fmtDate(termin)}`);
    if (dodani === "doruceni") casti.push(`Dodání: prosíme o doručení${adresaDodani ? ` do naší dílny: ${adresaDodani}` : ""}`);
    if (dodani === "odber") casti.push("Dodání: materiál si vyzvedneme osobně — prosíme o informaci, kdy bude připravený k odběru.");
    if (poznamka.trim()) casti.push("", poznamka.trim());
    casti.push("", `Reference: ${order.cislo}`, "", "Děkujeme a s pozdravem", n.firmaNazev || "", n.firmaEmail || mujEmail || "");
    return casti.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  // Poznamená do zakázky, že se u dodavatele poptávalo (zobrazí se "Poptáno …").
  const zaznamenatPoptavku = (sk) => {
    if (!onZmenaChecklistu) return;
    const zaznam = {
      dodavatel: skutecnyDodavatel(sk) || "(bez dodavatele)",
      email: emailSkupiny(sk),
      datum: todayISO(),
      kdo: mujEmail || "",
      polozky: vybranePolozky(sk).map((it) => `${it.nazev} — ${mnozstviPolozky(sk, it)} ${it.jednotka}`.trim()),
    };
    onZmenaChecklistu(order, (ch) => ({ ...ch, poptano: [...(ch.poptano || []), zaznam] })).catch(() => {});
  };

  const otevritEmail = (sk) => {
    const komu = emailSkupiny(sk).trim();
    const url = `mailto:${encodeURIComponent(komu).replace(/%40/g, "@")}?subject=${encodeURIComponent(predmet())}&body=${encodeURIComponent(
      textEmailu(sk).replace(/\n/g, "\r\n")
    )}`;
    window.location.href = url;
    zaznamenatPoptavku(sk);
    setZprava(`E-mail pro ${skutecnyDodavatel(sk) || "dodavatele"} se otevírá v poštovním programu. Zkontroluj ho a odešli.`);
  };

  const kopirovat = async (sk) => {
    try {
      await navigator.clipboard.writeText(`Předmět: ${predmet()}\n\n${textEmailu(sk)}`);
      setZprava("Text e-mailu je zkopírovaný — vlož ho do nové zprávy (Ctrl+V).");
    } catch (e) {
      setZprava("Kopírování se nepovedlo — označ text v náhledu a zkopíruj ručně.");
    }
  };

  const ulozitEmail = async (sk) => {
    const nazev = skutecnyDodavatel(sk);
    if (!nazev || !onUlozitDodavatele) return;
    try {
      await onUlozitDodavatele({ ...(kontakt(nazev) || {}), nazev, email: emailSkupiny(sk).trim() }, kontakt(nazev)?.nazev || null);
      setG(sk.dodavatel, { email: undefined });
      setZprava(`E-mail dodavatele ${nazev} je uložený v adresáři dodavatelů.`);
    } catch (e) {
      setZprava(e.message || "Uložení dodavatele se nepovedlo.");
    }
  };

  const oznacitObjednane = (sk) => {
    if (!onZmenaChecklistu) return;
    const vybrane = vybranePolozky(sk);
    onZmenaChecklistu(order, (ch) => {
      const s = { ...(ch.stav || {}) };
      vybrane.forEach((it) => {
        s[it.klicChecklistu] = { objednano: true, datum: todayISO(), kdo: mujEmail || "", nazev: it.nazev, popisMnozstvi: `${mnozstviPolozky(sk, it)} ${it.jednotka}`.trim() };
      });
      return { ...ch, stav: s };
    })
      .then(() => setZprava(`Položky od ${skutecnyDodavatel(sk) || "dodavatele"} jsou v checklistu označené jako objednané.`))
      .catch(() => setZprava("Označení se nepovedlo uložit."));
  };

  const prepnoutVyber = (sk, it) => setG(sk.dodavatel, { vybrane: { ...(g(sk.dodavatel).vybrane || {}), [it.key]: !jeVybrano(sk, it) } });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 16, borderBottom: `1px solid ${C.line}` }}>
        <Button variant="ghost" onClick={onClose}>
          <X size={14} /> Zavřít
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          <Printer size={14} /> Tisk
        </Button>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 40px", color: C.ink, fontFamily: FONTS.body }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 26, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Poptávka materiálu</div>
        <div style={{ color: C.inkSoft, marginBottom: 20, fontFamily: FONTS.mono, fontSize: 13 }}>
          Reference: {order.cislo} · {order.zakaznik} · {fmtDate(todayISO())}
        </div>

        {skupiny.length === 0 ? (
          <div style={{ color: C.inkSoft }}>Kalkulace zatím neobsahuje žádný materiál.</div>
        ) : (
          <>
            <div className="jen-obrazovka" style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Společné údaje pro všechny e-maily:</div>
              <div className="field-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Požadovaný termín dodání (nepovinné)</div>
                  <TextInput type="date" value={termin} onChange={(e) => setTermin(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Dodání</div>
                  <Select value={dodani} onChange={(e) => setDodani(e.target.value)}>
                    <option value="odber">Vyzvedneme osobně</option>
                    <option value="doruceni">Doručit do dílny</option>
                    <option value="">Neuvádět</option>
                  </Select>
                </div>
              </div>
              {dodani === "doruceni" && (
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>
                  Doručit na: <strong style={{ color: C.ink }}>{adresaDodani || "— doplň adresu dílny v Nastavení —"}</strong>
                </div>
              )}
              <div style={{ fontSize: 12, margin: "8px 0 4px" }}>Poznámka do e-mailu (nepovinné)</div>
              <TextArea value={poznamka} onChange={(e) => setPoznamka(e.target.value)} placeholder="Např. prosíme o atest, dělení na 6 m…" style={{ minHeight: 44 }} />
            </div>

            {zprava && (
              <div className="jen-obrazovka" style={{ background: "#E6F0E8", border: `1px solid ${C.moss}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                {zprava}
              </div>
            )}

            {skupiny.map((sk) => {
              const nazevDod = skutecnyDodavatel(sk);
              const email = emailSkupiny(sk);
              const ulozenyEmail = kontakt(nazevDod)?.email || "";
              const drivePoptano = poptano.filter((x) => (x.dodavatel || "").toLowerCase() === (nazevDod || "(bez dodavatele)").toLowerCase());
              const pocetVybranych = vybranePolozky(sk).length;
              return (
                <div key={sk.dodavatel} style={{ marginBottom: 22, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ background: C.steelDark, color: "#fff", padding: "10px 14px", fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 14 }}>
                    {sk.dodavatel === BEZ_DODAVATELE ? nazevDod || BEZ_DODAVATELE : sk.dodavatel}
                  </div>

                  {sk.items.map((it, i) => {
                    const objednano = stav[it.klicChecklistu]?.objednano;
                    return (
                      <div key={it.key} style={{ padding: "9px 14px", borderTop: i > 0 ? `1px solid ${C.line}` : "none", fontSize: 14, display: "flex", alignItems: "center", gap: 10, opacity: jeVybrano(sk, it) ? 1 : 0.45 }}>
                        <input className="jen-obrazovka" type="checkbox" checked={jeVybrano(sk, it)} onChange={() => prepnoutVyber(sk, it)} title="Zahrnout do poptávky" style={{ width: 18, height: 18 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {it.nazev}
                          {objednano && (
                            <span style={{ fontSize: 11, color: C.moss, marginLeft: 6 }}>
                              <CheckCircle2 size={11} style={{ verticalAlign: "-1px" }} /> objednáno
                            </span>
                          )}
                          {it.zPolozek.length > 1 && (
                            <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{it.zPolozek.map((z) => `${z.nazev}: ${fmtCislo(z.mnozstvi)} ${it.jednotka}`).join(" · ")}</div>
                          )}
                        </div>
                        <TextInput
                          className="jen-obrazovka"
                          value={mnozstviPolozky(sk, it)}
                          onChange={(e) => setG(sk.dodavatel, { mnozstvi: { ...(g(sk.dodavatel).mnozstvi || {}), [it.key]: e.target.value } })}
                          style={{ width: 76, textAlign: "right", fontFamily: FONTS.mono, padding: "6px 8px" }}
                          title="Množství do poptávky (můžeš zaokrouhlit nahoru)"
                        />
                        <span className="jen-tisk" style={{ fontFamily: FONTS.mono, fontSize: 13 }}>{mnozstviPolozky(sk, it)}</span>
                        <span style={{ fontFamily: FONTS.mono, fontSize: 13, width: 34 }}>{it.jednotka}</span>
                      </div>
                    );
                  })}

                  <div className="jen-obrazovka" style={{ padding: "12px 14px", background: C.paper, borderTop: `1px solid ${C.line}` }}>
                    {sk.dodavatel === BEZ_DODAVATELE && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>Komu poslat (dodavatel z adresáře)</div>
                        <Select value={nazevDod} onChange={(e) => setG(sk.dodavatel, { prirazenyDodavatel: e.target.value, email: undefined })}>
                          <option value="">— vyber dodavatele nebo napiš e-mail níže —</option>
                          {(dodavatele || []).map((d) => (
                            <option key={d.nazev} value={d.nazev}>
                              {d.nazev}
                              {d.email ? ` (${d.email})` : ""}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <div style={{ fontSize: 12, marginBottom: 4 }}>E-mail dodavatele</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <TextInput type="email" value={email} onChange={(e) => setG(sk.dodavatel, { email: e.target.value })} placeholder="obchod@dodavatel.cz" style={{ flex: "1 1 200px" }} />
                      {nazevDod && email.trim() && email.trim() !== ulozenyEmail && onUlozitDodavatele && (
                        <Button variant="ghost" type="button" onClick={() => ulozitEmail(sk)} title="Uložit e-mail do adresáře dodavatelů">
                          <Save size={14} /> Zapamatovat
                        </Button>
                      )}
                    </div>

                    <details style={{ marginTop: 10 }}>
                      <summary style={{ fontSize: 12, color: C.steel, cursor: "pointer" }}>Náhled e-mailu</summary>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>Předmět: {predmet()}</div>
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: FONTS.body, fontSize: 13, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: 10, marginTop: 4 }}>{textEmailu(sk)}</pre>
                    </details>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <Button variant="primary" type="button" onClick={() => otevritEmail(sk)} disabled={pocetVybranych === 0}>
                        <Mail size={14} /> Otevřít e-mail v Outlooku
                      </Button>
                      <Button variant="ghost" type="button" onClick={() => kopirovat(sk)} disabled={pocetVybranych === 0}>
                        <Copy size={14} /> Kopírovat text
                      </Button>
                      {onZmenaChecklistu && (
                        <Button variant="ghost" type="button" onClick={() => oznacitObjednane(sk)} disabled={pocetVybranych === 0}>
                          <Check size={14} /> Označit jako objednané
                        </Button>
                      )}
                    </div>
                    {!email.trim() && <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 6 }}>Bez e-mailu se otevře prázdná zpráva — adresu doplníš v Outlooku.</div>}
                    {drivePoptano.length > 0 && (
                      <div style={{ fontSize: 11, color: C.moss, marginTop: 8 }}>
                        Poptáno: {drivePoptano.map((x) => `${fmtDate(x.datum)}${x.kdo ? ` (${x.kdo})` : ""}`).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
