"use client";
import { useId, useRef } from "react";
import { X } from "lucide-react";
import { C, FONTS, statusInfo } from "@/lib/theme";

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  padding: "10px 10px",
  fontFamily: FONTS.body,
  fontSize: 16, // 16px avoids iOS Safari auto-zoom on focus
  background: C.surface,
  color: C.ink,
  outline: "none",
};

export const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 10,
  margin: -10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  WebkitTapHighlightColor: "transparent",
};

export function StampBadge({ status, small }) {
  const s = statusInfo(status);
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: FONTS.display,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontSize: small ? 10 : 12,
        color: s.color,
        border: `2px solid ${s.color}`,
        borderRadius: 3,
        padding: small ? "1px 6px" : "2px 9px",
        transform: "rotate(-2deg)",
        background: "rgba(255,255,255,0.6)",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: FONTS.display,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontSize: 12,
        color: C.inkSoft,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

// Drobný trvalý popisek nad políčkem — pro místa, kde se pole vejdou vedle sebe
// v úzké mřížce a plnohodnotný <Field label="..."> by se tam nevešel.
export function MiniLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: C.inkSoft,
        marginBottom: 3,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 4, fontFamily: FONTS.body }}>{label}</div>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 70, resize: "vertical", ...(props.style || {}) }} />;
}

// TextArea s "excelovým" doplňováním — když napsané písmena odpovídají začátku
// nějakého dřívějšího záznamu, zbytek se rovnou doplní a označí (vybere), takže
// další psaní ho přepíše. Backspace/Delete doplňování na tenhle stisk vypne, ať
// jde normálně mazat.
export function AutoCompleteTextArea({ value, onChange, navrhy, ...rest }) {
  const ref = useRef(null);
  const mazani = useRef(false);

  const handleKeyDown = (e) => {
    mazani.current = e.key === "Backspace" || e.key === "Delete";
    if (rest.onKeyDown) rest.onKeyDown(e);
  };

  const handleChange = (e) => {
    const zadano = e.target.value;
    if (mazani.current || !zadano || !navrhy || navrhy.length === 0) {
      onChange(e);
      return;
    }
    const shoda = navrhy.find((n) => n.toLowerCase().startsWith(zadano.toLowerCase()) && n.length > zadano.length);
    if (!shoda) {
      onChange(e);
      return;
    }
    onChange({ target: { value: shoda } });
    requestAnimationFrame(() => {
      if (ref.current) ref.current.setSelectionRange(zadano.length, shoda.length);
    });
  };

  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{ ...inputStyle, minHeight: 70, resize: "vertical", ...(rest.style || {}) }}
    />
  );
}
// Jednořádková varianta stejného doplňování — pro místa, kde se hodí spíš input než textarea.
export function AutoCompleteTextInput({ value, onChange, navrhy, ...rest }) {
  const ref = useRef(null);
  const mazani = useRef(false);

  const handleKeyDown = (e) => {
    mazani.current = e.key === "Backspace" || e.key === "Delete";
    if (rest.onKeyDown) rest.onKeyDown(e);
  };

  const handleChange = (e) => {
    const zadano = e.target.value;
    if (mazani.current || !zadano || !navrhy || navrhy.length === 0) {
      onChange(e);
      return;
    }
    const shoda = navrhy.find((n) => n.toLowerCase().startsWith(zadano.toLowerCase()) && n.length > zadano.length);
    if (!shoda) {
      onChange(e);
      return;
    }
    onChange({ target: { value: shoda } });
    requestAnimationFrame(() => {
      if (ref.current) ref.current.setSelectionRange(zadano.length, shoda.length);
    });
  };

  return <input {...rest} ref={ref} value={value} onChange={handleChange} onKeyDown={handleKeyDown} style={{ ...inputStyle, ...(rest.style || {}) }} />;
}

// Textové pole s "nabídkou" — nativní rozbalovací seznam možností (na mobilu se
// zobrazí jako obyčejná nabídka k výběru), ale pořád jde napsat cokoliv jiného,
// není to uzamčené jen na položky ze seznamu. Když je "navrhy" prázdné, chová se
// jako běžné textové pole bez nabídky.
export function TextInputSNabidkou({ value, onChange, navrhy, ...rest }) {
  const id = useId();
  const maNabidku = navrhy && navrhy.length > 0;
  return (
    <>
      <input {...rest} value={value} onChange={onChange} list={maNabidku ? id : undefined} style={{ ...inputStyle, ...(rest.style || {}) }} />
      {maNabidku && (
        <datalist id={id}>
          {navrhy.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      )}
    </>
  );
}

export function Select(props) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

export function Button({ variant = "primary", children, style, disabled, ...rest }) {
  const base = {
    fontFamily: FONTS.display,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontSize: 13,
    borderRadius: 6,
    padding: "9px 16px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "opacity 0.15s ease",
    opacity: disabled ? 0.45 : 1,
  };
  const variants = {
    primary: { background: C.steel, color: "#fff" },
    rust: { background: C.rust, color: "#fff" },
    moss: { background: C.moss, color: "#fff" },
    ghost: { background: "transparent", color: C.steel, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: C.danger, border: `1px solid ${C.danger}` },
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, width = 560, zIndex = 50 }) {
  const mouseDownOnBackdrop = useRef(false);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(33,35,31,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 16px",
        paddingTop: "calc(5vh + env(safe-area-inset-top))",
        paddingBottom: "calc(5vh + env(safe-area-inset-bottom))",
        zIndex,
        overflowY: "auto",
      }}
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Only close if BOTH the press and the release happened directly on the backdrop.
        // Without this check, selecting text (or dragging a bit) inside the modal and
        // releasing the mouse/finger just outside the content box would also fire a
        // "click" on the backdrop and close the modal — which is what was happening.
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose();
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          borderRadius: 10,
          width: "100%",
          maxWidth: width,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          border: `1px solid ${C.line}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: `2px dashed ${C.line}`,
          }}
        >
          <div style={{ fontFamily: FONTS.display, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.05em", color: C.ink }}>
            {title}
          </div>
          <button onClick={onClose} style={{ ...iconBtnStyle, color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
