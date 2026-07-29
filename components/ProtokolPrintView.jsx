"use client";
import { X, Printer } from "lucide-react";
import { C } from "@/lib/theme";
import { Button } from "./ui";
import ProtokolContent from "./ProtokolContent";

export default function ProtokolPrintView({ protokol, signatureUrl, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 16, borderBottom: `1px solid ${C.line}` }}>
        <Button variant="ghost" onClick={onClose}>
          <X size={14} /> Zavřít
        </Button>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer size={14} /> Tisk
        </Button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "30px 24px" }}>
        <ProtokolContent protokol={protokol} />

        <div style={{ marginTop: 40, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "center" }}>
            {signatureUrl ? (
              <img src={signatureUrl} alt="Podpis objednatele" referrerPolicy="no-referrer" style={{ maxWidth: 240, display: "block", marginBottom: 4 }} />
            ) : (
              <div style={{ height: 60 }} />
            )}
            <div style={{ borderTop: `1px solid ${C.ink}`, paddingTop: 4, fontSize: 12, color: C.inkSoft, width: 240 }}>Podpis objednatele</div>
          </div>
        </div>
      </div>
    </div>
  );
}
