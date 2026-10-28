import crypto from "crypto";

// Ochrana přihlášení ke Google Drive (parametr "state" v OAuth).
//
// Bez toho mohl kdokoli z internetu otevřít /api/google-auth/start, přihlásit se SVÝM
// Google účtem a aplikace by pak ukládala fotky a PDF zakázek na jeho Drive.
// Teď si přihlášení smí spustit jen přihlášený uživatel aplikace: server mu vydá
// podepsaný "lístek" (state) platný 10 minut a callback přijme jen přihlášení,
// které tenhle lístek vrátí nezměněný.
//
// Podepisuje se tajemstvím GOOGLE_OAUTH_CLIENT_SECRET, které už v aplikaci je,
// takže není potřeba přidávat žádnou novou proměnnou prostředí.

const PLATNOST_MS = 10 * 60 * 1000;

function tajemstvi() {
  const s = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!s) throw new Error("Chybí GOOGLE_OAUTH_CLIENT_SECRET v nastavení aplikace.");
  return s;
}

function podpis(data) {
  return crypto.createHmac("sha256", tajemstvi()).update(data).digest("base64url");
}

export function vytvoritState(userId) {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, e: Date.now() + PLATNOST_MS, n: crypto.randomBytes(8).toString("hex") })
  ).toString("base64url");
  return `${payload}.${podpis(payload)}`;
}

// Vrátí userId z platného lístku, jinak null.
export function overitState(state) {
  if (!state || typeof state !== "string") return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;

  const ocekavany = Buffer.from(podpis(payload));
  const prijaty = Buffer.from(sig);
  if (ocekavany.length !== prijaty.length || !crypto.timingSafeEqual(ocekavany, prijaty)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.u || typeof data.e !== "number" || Date.now() > data.e) return null;
    return data.u;
  } catch {
    return null;
  }
}
