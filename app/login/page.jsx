"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
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
        background: C.paper,
        fontFamily: FONTS.body,
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 10, border: `1px solid ${C.line}`, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, justifyContent: "center" }}>
          <Wrench size={22} color={C.rust} />
          <span style={{ fontFamily: FONTS.display, fontSize: 20, letterSpacing: "0.04em", textTransform: "uppercase" }}>Dílna — Zakázky</span>
        </div>

        <form onSubmit={submit}>
          <Field label="E-mail">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Heslo">
            <TextInput type="password" required minLength={6} value={heslo} onChange={(e) => setHeslo(e.target.value)} />
          </Field>

          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}

          <Button variant="primary" type="submit" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
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
