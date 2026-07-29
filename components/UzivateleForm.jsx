"use client";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS, fmtDate } from "@/lib/theme";
import { Field, TextInput, Select, Button } from "./ui";

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
  const [mojeRole, setMojeRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [novyEmail, setNovyEmail] = useState("");
  const [noveHeslo, setNoveHeslo] = useState(nahodneHeslo());
  const [novaRole, setNovaRole] = useState("user");
  const [vytvareni, setVytvareni] = useState(false);
  const [posledniVytvoreny, setPosledniVytvoreny] = useState(null);
  const [zmenaRole, setZmenaRole] = useState(null); // id uživatele, u kterého právě probíhá změna role

  const nacistVse = async () => {
    setLoading(true);
    setError("");
    try {
      const [seznamRes, meRes] = await Promise.all([autorizovanyFetch("/api/users/list"), autorizovanyFetch("/api/users/me")]);
      const seznamData = await seznamRes.json();
      const meData = await meRes.json();
      if (!seznamRes.ok || seznamData.error) throw new Error(seznamData.error || "Načtení se nepovedlo.");
      setUzivatele(seznamData.uzivatele);
      setMojeRole(meRes.ok ? meData.role : "user");
    } catch (e) {
      setError("Seznam uživatelů se nepodařilo načíst.");
    }
    setLoading(false);
  };

  useEffect(() => {
    nacistVse();
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
        body: JSON.stringify({ email: novyEmail.trim(), heslo: noveHeslo, role: novaRole }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Založení se nepovedlo.");
      setPosledniVytvoreny({ email: novyEmail.trim(), heslo: noveHeslo });
      setNovyEmail("");
      setNoveHeslo(nahodneHeslo());
      setNovaRole("user");
      await nacistVse();
    } catch (e) {
      setError(e.message || "Založení uživatele se nepovedlo.");
    }
    setVytvareni(false);
  };

  const zmenitRoli = async (userId, role) => {
    setZmenaRole(userId);
    setError("");
    try {
      const res = await autorizovanyFetch("/api/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Změna role se nepovedla.");
      await nacistVse();
    } catch (e) {
      setError(e.message || "Změna role se nepovedla.");
    }
    setZmenaRole(null);
  };

  const jsemSA = mojeRole === "sa";

  return (
    <div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
        Noví uživatelé se do appky nemůžou zaregistrovat sami — přidat je (a nastavit jim roli) může jen správce (role <strong>sa</strong>). Role{" "}
        <strong>user</strong> nesmí mazat zakázky ani upravovat kalkulace — appka to vynucuje přímo v databázi, ne jen schovaným tlačítkem.
      </div>

      {!loading && !jsemSA && (
        <div style={{ background: "#F5EBD8", border: "1px solid #C99A3D", borderRadius: 6, padding: 10, fontSize: 13, marginBottom: 16 }}>
          Tvůj účet nemá roli správce — seznam uživatelů vidíš, ale přidávat nové ani měnit role nemůžeš.
        </div>
      )}

      {jsemSA && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13, letterSpacing: "0.04em", marginBottom: 8, color: C.steel }}>
            Přidat uživatele
          </div>
          <Field label="E-mail">
            <TextInput type="email" value={novyEmail} onChange={(e) => setNovyEmail(e.target.value)} />
          </Field>
          <Field label="Heslo (vygenerováno, klidně uprav)">
            <TextInput value={noveHeslo} onChange={(e) => setNoveHeslo(e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={novaRole} onChange={(e) => setNovaRole(e.target.value)}>
              <option value="user">Uživatel — bez mazání zakázek a úprav kalkulace</option>
              <option value="sa">Správce (SA) — plný přístup</option>
            </Select>
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
        </div>
      )}

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
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <div>{u.email}</div>
                  <div style={{ color: C.inkSoft, fontFamily: FONTS.mono, fontSize: 11 }}>od {fmtDate(u.created_at?.slice(0, 10))}</div>
                </div>
                {jsemSA ? (
                  <Select
                    value={u.role}
                    onChange={(e) => zmenitRoli(u.id, e.target.value)}
                    disabled={zmenaRole === u.id}
                    style={{ width: 110, fontSize: 12, padding: "4px 6px" }}
                  >
                    <option value="user">Uživatel</option>
                    <option value="sa">Správce</option>
                  </Select>
                ) : (
                  <span style={{ fontSize: 12, color: C.inkSoft, textTransform: "uppercase", fontFamily: FONTS.display }}>
                    {u.role === "sa" ? "Správce" : "Uživatel"}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.inkSoft }}>Zatím žádní uživatelé.</div>
        )}
      </div>

      {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
