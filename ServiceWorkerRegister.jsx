"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { C, FONTS } from "@/lib/theme";
import { Button } from "./ui";

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const empty = useRef(true);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // Crisp lines on high-DPI phone screens
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = C.ink;
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (empty.current) {
      empty.current = false;
      setIsEmpty(false);
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    canvasRef.current.toBlob((blob) => onChange(blob), "image/png");
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    empty.current = true;
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <div style={{ position: "relative", border: `1.5px dashed ${C.line}`, borderRadius: 8, background: "#fff" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: 160, display: "block", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {isEmpty && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.inkSoft,
              fontFamily: FONTS.body,
              fontSize: 13,
              pointerEvents: "none",
            }}
          >
            Podepište prstem nebo myší sem
          </div>
        )}
      </div>
      <Button variant="ghost" type="button" onClick={clear} style={{ marginTop: 8 }}>
        <Eraser size={14} /> Vymazat podpis
      </Button>
    </div>
  );
}
