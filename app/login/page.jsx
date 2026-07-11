"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS } from "@/lib/theme";
import { Field, TextInput, Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: heslo });
      if (error) {
        setError("Přihlášení se nepovedlo — zkontroluj e-mail a heslo.");
      } else {
        router.replace("/");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: heslo });
      if (error) {
        setError("Registrace se nepovedla: " + error.message);
      } else if (data.session) {
        // E-mail potvrzení je vypnuté — Supabase rovnou vrátila platnou session, netřeba se přihlašovat znovu.
        router.replace("/");
        return;
      } else {
        setInfo("Účet vytvořen. Zkontroluj e-mail a potvrď registraci, pak se přihlas.");
        setMode("signin");
      }
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
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jmeno@dilna.cz" />
          </Field>
          <Field label="Heslo">
            <TextInput type="password" required minLength={6} value={heslo} onChange={(e) => setHeslo(e.target.value)} placeholder="••••••••" />
          </Field>

          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          {info && <div style={{ color: C.moss, fontSize: 13, marginBottom: 10 }}>{info}</div>}

          <Button variant="primary" type="submit" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
            {loading ? "Chvilku…" : mode === "signin" ? "Přihlásit se" : "Vytvořit účet"}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setInfo("");
          }}
          style={{ background: "none", border: "none", color: C.steel, cursor: "pointer", fontSize: 13, marginTop: 14, width: "100%", textAlign: "center" }}
        >
          {mode === "signin" ? "Nemáš účet? Vytvoř si ho" : "Už máš účet? Přihlas se"}
        </button>
      </div>
    </div>
  );
}
