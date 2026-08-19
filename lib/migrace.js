// Server-only: jednorázově přesune soubory, které aplikace mezitím (kvůli výpadku/
// vypršení Google Drive) uložila záložně do Supabase Storage, na Google Drive —
// a v příslušné zakázce přepíše odkaz na nové místo. Spouští se ručně tlačítkem
// v aplikaci (Google Drive → Přesunout starší soubory), ne automaticky.
import { getSupabaseAdmin } from "./supabaseAdmin";
import { nahratNaGoogleDrive } from "./googleDrive";
import { nazevSlozkyZakazky } from "./theme";

const MIME_PODLE_BUCKETU = {
  uctenky: "image/jpeg",
  fotky: "image/jpeg",
  protokoly: "image/png",
  archivy: "application/pdf",
};

function jeSupabasePath(hodnota) {
  return typeof hodnota === "string" && hodnota && !hodnota.startsWith("http");
}

async function presunoutSoubor(supabaseAdmin, bucket, path, slozkaZakazky) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Stažení ${bucket}/${path} ze Supabase se nepovedlo.`);
  const bytes = Buffer.from(await data.arrayBuffer());
  const mimeType = MIME_PODLE_BUCKETU[bucket] || "application/octet-stream";
  const filename = path.split("/").pop();
  const result = await nahratNaGoogleDrive(bytes, filename, mimeType, slozkaZakazky);
  return mimeType.startsWith("image/") ? result.previewUrl : result.viewUrl;
}

export async function presunoutNaDrive() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: orders, error } = await supabaseAdmin.from("orders").select("*");
  if (error) throw new Error("Načtení zakázek se nepovedlo.");

  let presunuto = 0;
  let chyby = 0;
  const chybyDetail = [];

  for (const order of orders) {
    let zmeneno = false;
    const slozka = nazevSlozkyZakazky(order);

    const noveUctenky = await Promise.all(
      (order.uctenky || []).map(async (u) => {
        if (!jeSupabasePath(u.path)) return u;
        try {
          const novaPath = await presunoutSoubor(supabaseAdmin, "uctenky", u.path, slozka);
          presunuto++;
          zmeneno = true;
          return { ...u, path: novaPath };
        } catch (e) {
          chyby++;
          chybyDetail.push(`${order.cislo} — účtenka: ${e.message}`);
          return u;
        }
      })
    );

    const noveFotky = await Promise.all(
      (order.fotky || []).map(async (f) => {
        if (!jeSupabasePath(f.path)) return f;
        try {
          const novaPath = await presunoutSoubor(supabaseAdmin, "fotky", f.path, slozka);
          presunuto++;
          zmeneno = true;
          return { ...f, path: novaPath };
        } catch (e) {
          chyby++;
          chybyDetail.push(`${order.cislo} — fotka: ${e.message}`);
          return f;
        }
      })
    );

    let novyProtokol = order.protokol;
    if (order.protokol && jeSupabasePath(order.protokol.podpisPath)) {
      try {
        const novaPath = await presunoutSoubor(supabaseAdmin, "protokoly", order.protokol.podpisPath, slozka);
        presunuto++;
        zmeneno = true;
        novyProtokol = { ...order.protokol, podpisPath: novaPath };
      } catch (e) {
        chyby++;
        chybyDetail.push(`${order.cislo} — podpis: ${e.message}`);
      }
    }

    const noveArchivy = await Promise.all(
      (order.archivy || []).map(async (a) => {
        if (!jeSupabasePath(a.url)) return a;
        try {
          const novaUrl = await presunoutSoubor(supabaseAdmin, "archivy", a.url, slozka);
          presunuto++;
          zmeneno = true;
          return { ...a, url: novaUrl };
        } catch (e) {
          chyby++;
          chybyDetail.push(`${order.cislo} — PDF archiv: ${e.message}`);
          return a;
        }
      })
    );

    if (zmeneno) {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ uctenky: noveUctenky, fotky: noveFotky, protokol: novyProtokol, archivy: noveArchivy })
        .eq("id", order.id);
      if (updateError) {
        chyby++;
        chybyDetail.push(`${order.cislo} — uložení nových odkazů se nepovedlo: ${updateError.message}`);
      }
    }
  }

  return { presunuto, chyby, chybyDetail: chybyDetail.slice(0, 20) };
}
