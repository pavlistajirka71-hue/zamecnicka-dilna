"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, FONTS, STATUSES, fmtMoney, fmtDate, isOverdue } from "@/lib/theme";

export default function Nastenka({ orders, onOpen, onChangeStatus }) {
  const [dragOverKey, setDragOverKey] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const handleDrop = (e, statusKey) => {
    e.preventDefault();
    setDragOverKey(null);
    const id = e.dataTransfer.getData("text/plain");
    const order = orders.find((o) => o.id === id);
    if (order && order.stav !== statusKey) onChangeStatus(order, statusKey);
    setDraggingId(null);
  };

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch" }}>
      {STATUSES.map((s, colIdx) => {
        const zakazky = orders.filter((o) => o.stav === s.key);
        return (
          <div
            key={s.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey(s.key);
            }}
            onDragLeave={() => setDragOverKey((cur) => (cur === s.key ? null : cur))}
            onDrop={(e) => handleDrop(e, s.key)}
            style={{
              flex: "0 0 260px",
              width: 260,
              background: dragOverKey === s.key ? "#EAE6DB" : C.paper,
              border: `1px solid ${dragOverKey === s.key ? s.color : C.line}`,
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              maxHeight: "72vh",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderBottom: `3px solid ${s.color}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: FONTS.display,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontSize: 13,
                color: C.ink,
                flexShrink: 0,
              }}
            >
              <span>{s.label}</span>
              <span style={{ fontFamily: FONTS.mono, color: C.inkSoft, fontSize: 12 }}>{zakazky.length}</span>
            </div>

            <div style={{ padding: 8, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {zakazky.length === 0 ? (
                <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: "16px 4px" }}>Prázdno</div>
              ) : (
                zakazky.map((o) => {
                  const overdueCard = isOverdue(o);
                  return (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", o.id);
                        setDraggingId(o.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => onOpen(o)}
                      style={{
                        background: C.surface,
                        border: `1px solid ${C.line}`,
                        borderLeft: overdueCard ? `4px solid ${C.rust}` : `4px solid transparent`,
                        borderRadius: 8,
                        padding: "10px 10px",
                        cursor: "pointer",
                        opacity: draggingId === o.id ? 0.4 : 1,
                      }}
                    >
                      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.inkSoft, marginBottom: 2 }}>{o.cislo}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.zakaznik}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                        <span style={{ fontFamily: FONTS.mono }}>{fmtMoney(o.cena)}</span>
                        <span style={{ color: overdueCard ? C.rust : C.inkSoft, fontFamily: FONTS.mono }}>{fmtDate(o.termin)}</span>
                      </div>

                      <div
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, borderTop: `1px dashed ${C.line}`, paddingTop: 4 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={colIdx === 0}
                          onClick={() => onChangeStatus(o, STATUSES[colIdx - 1].key)}
                          title={colIdx > 0 ? `Přesunout do: ${STATUSES[colIdx - 1].label}` : ""}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: colIdx === 0 ? "default" : "pointer",
                            color: colIdx === 0 ? C.line : C.steel,
                            padding: 10,
                            display: "inline-flex",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          disabled={colIdx === STATUSES.length - 1}
                          onClick={() => onChangeStatus(o, STATUSES[colIdx + 1].key)}
                          title={colIdx < STATUSES.length - 1 ? `Přesunout do: ${STATUSES[colIdx + 1].label}` : ""}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: colIdx === STATUSES.length - 1 ? "default" : "pointer",
                            color: colIdx === STATUSES.length - 1 ? C.line : C.steel,
                            padding: 10,
                            display: "inline-flex",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
