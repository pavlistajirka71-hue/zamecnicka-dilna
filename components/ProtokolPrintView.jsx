"use client";
import { X, Printer } from "lucide-react";
import { C } from "@/lib/theme";
import { Button } from "./ui";
import ProtokolContent from "./ProtokolContent";

export default function ProtokolPrintView({ protokol, signatureUrl, fotky, onClose }) {
  const zhotovitel = protokol.zhotovitel || {};
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
        <ProtokolContent protokol={protokol} fotky={fotky} />

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 60 }} />
            <div style={{ borderTop: `1px solid ${C.ink}`, paddingTop: 4, fontSize: 12, color: C.inkSoft, width: 220 }}>
              Předal — {zhotovitel.nazev || "zhotovitel"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            {signatureUrl ? (
              <img src={signatureUrl} alt="Podpis přebírajícího" referrerPolicy="no-referrer" style={{ maxWidth: 220, display: "block", marginBottom: 4 }} />
            ) : (
              <div style={{ height: 60 }} />
            )}
            <div style={{ borderTop: `1px solid ${C.ink}`, paddingTop: 4, fontSize: 12, color: C.inkSoft, width: 220 }}>
              Převzal — {protokol.jmenoPrebirajiciho || "přebírající"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
