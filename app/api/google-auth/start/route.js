import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { overitPrihlaseni } from "@/lib/role";
import { vytvoritState } from "@/lib/googleOAuthState";

// Připojení Google Drive smí spustit jen přihlášený uživatel aplikace.
// Klient (GoogleDrivePanel) sem pošle POST se svým přihlašovacím tokenem,
// dostane zpět adresu Google přihlášení s podepsaným parametrem "state"
// a teprve na ni přesměruje prohlížeč. Callback pak "state" ověří.
export async function POST(request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Chybí GOOGLE_OAUTH_CLIENT_ID nebo GOOGLE_OAUTH_CLIENT_SECRET v nastavení aplikace (Environment Variables)." },
      { status: 500 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const user = await overitPrihlaseni(supabaseAdmin, request);
  if (!user) return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });

  const redirectUri = `${request.nextUrl.origin}/api/google-auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive",
    access_type: "offline",
    prompt: "consent",
    state: vytvoritState(user.id),
  });
  return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}

// Dřívější přímé otevření adresy v prohlížeči už nefunguje (nešlo ověřit, kdo to je).
export async function GET(request) {
  return NextResponse.redirect(`${request.nextUrl.origin}/?google=error`);
}
