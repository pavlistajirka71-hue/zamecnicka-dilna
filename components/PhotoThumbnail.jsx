"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { C } from "@/lib/theme";

export function useSignedUrl(bucket, path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    if (!path) return;
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (active && !error && data) setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [bucket, path]);
  return url;
}

export default function PhotoThumbnail({ bucket, path, alt, caption, onOpen }) {
  const url = useSignedUrl(bucket, path);
  return (
    <button
      onClick={() => url && onOpen(url)}
      style={{
        border: `1px solid ${C.line}`,
        borderRadius: 6,
        padding: 0,
        cursor: url ? "pointer" : "default",
        background: C.paper,
        overflow: "hidden",
        width: 74,
      }}
    >
      {url ? (
        <img src={url} alt={alt || "Fotka"} style={{ width: 74, height: 74, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: 74, height: 74, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.inkSoft }}>
          načítám…
        </div>
      )}
      {caption ? <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 0", background: C.paper }}>{caption}</div> : null}
    </button>
  );
}
