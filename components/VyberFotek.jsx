"use client";
import { useRef, useState } from "react";
import { Camera, Images } from "lucide-react";
import { C, resizeImageFile } from "@/lib/theme";
import { Button } from "./ui";

// Dvě tlačítka: "Vyfotit" (rovnou foťák na mobilu) a "Z galerie" (víc fotek najednou).
// Fotky zmenší (delší strana 1600 px — u poptávek je potřeba vidět detaily na místě,
// proto o něco víc než u fotek z práce) a předá je jako pole blobů přes onVybrano.
export default function VyberFotek({ onVybrano, disabled }) {
  const fotakRef = useRef(null);
  const galerieRef = useRef(null);
  const [zpracovavam, setZpracovavam] = useState(false);
  const [chyba, setChyba] = useState("");

  const zpracovat = async (e) => {
    const soubory = Array.from(e.target.files || []);
    e.target.value = "";
    if (!soubory.length) return;
    setZpracovavam(true);
    setChyba("");
    const bloby = [];
    for (const soubor of soubory) {
      try {
        bloby.push(await resizeImageFile(soubor, 1600, 0.72));
      } catch (err) {
        console.error(err);
        setChyba("Některou fotku se nepodařilo zpracovat (podporované jsou běžné obrázky JPG/PNG).");
      }
    }
    setZpracovavam(false);
    if (bloby.length) onVybrano(bloby);
  };

  return (
    <div>
      <input ref={fotakRef} type="file" accept="image/*" capture="environment" onChange={zpracovat} style={{ display: "none" }} />
      <input ref={galerieRef} type="file" accept="image/*" multiple onChange={zpracovat} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="ghost" type="button" disabled={disabled || zpracovavam} onClick={() => fotakRef.current && fotakRef.current.click()}>
          <Camera size={14} /> Vyfotit
        </Button>
        <Button variant="ghost" type="button" disabled={disabled || zpracovavam} onClick={() => galerieRef.current && galerieRef.current.click()}>
          <Images size={14} /> {zpracovavam ? "Zpracovávám…" : "Z galerie"}
        </Button>
      </div>
      {chyba && <div style={{ color: C.danger, fontSize: 12, marginTop: 6 }}>{chyba}</div>}
    </div>
  );
}
