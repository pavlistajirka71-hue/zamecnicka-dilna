import { NextResponse } from "next/server";
import { ulozitPripojeni } from "@/lib/googleDrive";

export async function GET(request) {
  const code = request.nextUrl.searchParams.get("code");
  const chyba = request.nextUrl.searchParams.get("error");
  const homeUrl = request.nextUrl.origin;

  if (chyba || !code) {
    return NextResponse.redirect(`${homeUrl}/?google=error`);
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = `${homeUrl}/api/google-auth/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error(await tokenRes.text());
    const tokenData = await tokenRes.json();
    if (!tokenData.refresh_token) {
      throw new Error("Google nevrátil refresh token (zkus se odpojit a připojit znovu).");
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = userRes.ok ? await userRes.json() : {};

    await ulozitPripojeni(tokenData.refresh_token, userData.email || null);

    return NextResponse.redirect(`${homeUrl}/?google=connected`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${homeUrl}/?google=error`);
  }
}
