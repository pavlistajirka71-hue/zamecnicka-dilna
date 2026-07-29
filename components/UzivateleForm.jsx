"use client";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, fmtDate } from "@/lib/theme";
import { Field, TextInput, Button } from "./ui";

function nahodneHeslo() {
  const znaky = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let heslo = "";
  for (let i = 0; i < 10; i++) heslo += znaky[Math.floor(Math.random() * znaky.length)];
  return heslo;
}

async function autorizovanyFetch(url, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: token ? `Bearer ${token}` : "" } });
}

export default function UzivateleForm({ onClose }) {
  const [uzivatele, setUzivatele] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [novyEmail, setNovyEmail] = useState("");
  const [noveHeslo, setNoveHeslo] = useState(nahodneHeslo());
  const [vytvareni, setVytvareni] = useState(false);
  const [posledniVytvoreny, setPosledniVytvoreny] = useState(null);

  const nacistSeznam = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await autorizovanyFetch("/api/users/list");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Načtení se nepovedlo.");
      setUzivatele(data.uzivatele);
    } catch (e) {
      setError("Seznam uživatelů se nepovedlo načíst.");
    }
    setLoading(false);
  };

  useEffect(() => {
    nacistSeznam();
  }, []);

  const pridatUzivatele = async () => {
    if (!novyEmail.trim() || !noveHeslo.trim()) return;
    setVytvareni(true);
    setError("");
    setPosledniVytvoreny(null);
    try {
      const res = await autorizovanyFetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: novyEmail.trim(), heslo: noveHeslo }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Založení se nepovedlo.");
      setPosledniVytvoreny({ email: novyEmail.trim(), heslo: noveHeslo });
      setNovyEmail("");
      setNoveHeslo(nahodneHeslo());
      await nacistSeznam();
    } catch (e) {
      setError(e.message || "Založení uživatele se nepovedlo.");
    }
    setVytvareni(false);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
        Noví uživatelé se do appky nemůžou zaregistrovat sami — přidej je tady a heslo jim předej osobně. Po prvním přihlášení si ho můžou v Supabase změnit (nebo appku o tuhle možnost později doplníme).
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13, letterSpacing: "0.04em", marginBottom: 8, color: C.steel }}>
          Přidat uživatele
        </div>
        <Field label="E-mail">
          <TextInput type="email" value={novyEmail} onChange={(e) => setNovyEmail(e.target.value)} placeholder="jmeno@dilna.cz" />
        </Field>
        <Field label="Heslo (vygenerováno, klidně uprav)">
          <TextInput value={noveHeslo} onChange={(e) => setNoveHeslo(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={pridatUzivatele} disabled={vytvareni || !novyEmail.trim() || !noveHeslo.trim()}>
          <UserPlus size={14} /> {vytvareni ? "Zakládám…" : "Přidat uživatele"}
        </Button>

        {posledniVytvoreny && (
          <div style={{ background: "#E6F0E8", border: `1px solid ${C.moss}`, borderRadius: 6, padding: 10, marginTop: 10, fontSize: 13 }}>
            Účet založen. Předej kolegovi:
            <br />
            <strong>{posledniVytvoreny.email}</strong> / <span style={{ fontFamily: FONTS.mono }}>{posledniVytvoreny.heslo}</span>
          </div>
        )}
        {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>

      <div>
        <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13, letterSpacing: "0.04em", marginBottom: 8, color: C.steel }}>
          Založení uživatelé {uzivatele ? `(${uzivatele.length})` : ""}
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: C.inkSoft }}>Načítám…</div>
        ) : uzivatele && uzivatele.length > 0 ? (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
            {uzivatele.map((u, i) => (
              <div
                key={u.id}
                style={{
                  padding: "8px 12px",
                  borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>{u.email}</span>
                <span style={{ color: C.inkSoft, fontFamily: FONTS.mono, fontSize: 12 }}>od {fmtDate(u.created_at?.slice(0, 10))}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.inkSoft }}>Zatím žádní uživatelé.</div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
