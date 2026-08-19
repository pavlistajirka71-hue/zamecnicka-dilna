import { NextResponse } from "next/server";

export async function GET(request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return new NextResponse("Chybí GOOGLE_OAUTH_CLIENT_ID v nastavení aplikace (Environment Variables).", { status: 500 });
  }
  const redirectUri = `${request.nextUrl.origin}/api/google-auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive",
    access_type: "offline",
    prompt: "consent",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
