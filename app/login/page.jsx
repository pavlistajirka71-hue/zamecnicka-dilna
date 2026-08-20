"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS } from "@/lib/theme";
import { Field, TextInput, Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: heslo });
    if (error) {
      setError("Přihlášení se nepovedlo — zkontroluj e-mail a heslo.");
    } else {
      router.replace("/");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0D0D0D",
        fontFamily: FONTS.body,
        padding: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        src="/logo-mysteel.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(140vw, 1400px)",
          opacity: 0.06,
          filter: "invert(1)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 10, border: "1px solid #2A2A2A", padding: 28, position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <img src="/logo-mysteel.jpg" alt="MySteel" style={{ width: 64, height: 64, borderRadius: "50%" }} />
          <span style={{ fontFamily: FONTS.display, fontSize: 18, letterSpacing: "0.06em", textTransform: "uppercase", color: "#111" }}>Dílna — Zakázky</span>
        </div>

        <form onSubmit={submit}>
          <Field label="E-mail">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Heslo">
            <TextInput type="password" required minLength={6} value={heslo} onChange={(e) => setHeslo(e.target.value)} />
          </Field>

          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}

          <Button
            variant="primary"
            type="submit"
            style={{ width: "100%", justifyContent: "center", background: "#111", borderColor: "#111" }}
            disabled={loading}
          >
            {loading ? "Chvilku…" : "Přihlásit se"}
          </Button>
        </form>

        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 14, textAlign: "center" }}>
          Nemáš účet? Požádej administrátora aplikace, ať tě přidá v Nastavení → Uživatelé.
        </div>
      </div>
    </div>
  );
}
