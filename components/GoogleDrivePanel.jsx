"use client";
import { useEffect, useState } from "react";
import { Cloud, CheckCircle2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { C, FONTS } from "@/lib/theme";
import { Button } from "./ui";

export default function GoogleDrivePanel({ onClose }) {
  const [stav, setStav] = useState(null); // { pripojeno, email } | null (načítá se)
  const [loading, setLoading] = useState(true);
  const [odpojovani, setOdpojovani] = useState(false);
  const [error, setError] = useState("");

  const nacistStav = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/google-auth/status", { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Nepodařilo se zjistit stav.");
      setStav(data);
    } catch (e) {
      setError("Stav připojení se nepodařilo zjistit.");
    }
    setLoading(false);
  };

  useEffect(() => {
    nacistStav();
  }, []);

  const pripojit = () => {
    window.location.href = "/api/google-auth/start";
  };

  const odpojit = async () => {
    setOdpojovani(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/google-auth/disconnect", { method: "POST", headers: { Authorization: token ? `Bearer ${token}` : "" } });
      if (!res.ok) throw new Error();
      await nacistStav();
    } catch (e) {
      setError("Odpojení se nepovedlo, zkus to znovu.");
    }
    setOdpojovani(false);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
        Fotky (účtenky, fotodokumentace, podpisy) a PDF archivy zakázek se ukládají na tenhle Google účet, do sdílené složky nastavené v proměnné
        prostředí <span style={{ fontFamily: FONTS.mono }}>GOOGLE_DRIVE_FOLDER_ID</span>.
      </div>

      {loading ? (
        <div style={{ color: C.inkSoft, fontSize: 13 }}>Zjišťuji stav…</div>
      ) : stav?.pripojeno ? (
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.moss, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13, marginBottom: 8 }}>
            <CheckCircle2 size={16} /> Připojeno
          </div>
          {stav.email && <div style={{ fontSize: 14, marginBottom: 12 }}>{stav.email}</div>}
          <Button variant="danger" onClick={odpojit} disabled={odpojovani}>
            <LogOut size={14} /> {odpojovani ? "Odpojuji…" : "Odpojit"}
          </Button>
        </div>
      ) : (
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>
            Zatím nepřipojeno — fotky se zatím ukládají do Supabase Storage (appka funguje normálně dál).
          </div>
          <Button variant="primary" onClick={pripojit}>
            <Cloud size={14} /> Připojit Google Drive
          </Button>
        </div>
      )}

      {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
