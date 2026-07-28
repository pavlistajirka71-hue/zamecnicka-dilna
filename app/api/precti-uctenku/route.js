import { NextResponse } from "next/server";

// Čte účtenku pomocí Claude API (Haiku — rychlý a levný model, na tenhle typ úkolu stačí).
// Klíč se používá jen tady na serveru, nikdy se neposílá do prohlížeče.
export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Čtení účtenek není nastavené (chybí ANTHROPIC_API_KEY na serveru)." }, { status: 500 });
  }

  const body = await request.json();
  const { image } = body; // base64 data URL, např. "data:image/jpeg;base64,...."
  if (!image) return NextResponse.json({ error: "Chybí fotka." }, { status: 400 });

  const match = /^data:(image\/\w+);base64,(.+)$/.exec(image);
  if (!match) return NextResponse.json({ error: "Neplatný formát fotky." }, { status: 400 });
  const [, mediaType, base64Data] = match;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
              {
                type: "text",
                text:
                  "Tohle je fotka účtenky nebo faktury z českého obchodu. Najdi celkovou částku k úhradě v Kč. " +
                  'Odpověz POUZE JSON objektem bez jakéhokoliv dalšího textu, přesně v tomto tvaru: {"castka": <číslo nebo null>}. ' +
                  "Částka musí být čisté číslo bez měny a mezer (např. 349.5, ne \"349,50 Kč\"). Pokud si nejsi jistý/á nebo částku nevidíš, dej castka: null.",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return NextResponse.json({ error: "Čtení účtenky se nepovedlo (chyba API)." }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.content || []).map((b) => b.text || "").join("").trim();

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Claude se občas obalí do markdown bloku i přes instrukci — zkusíme vytáhnout JSON ručně.
      const m = text.match(/\{[^}]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch (e2) {
          parsed = null;
        }
      }
    }

    if (!parsed) return NextResponse.json({ castka: null });

    const castka = typeof parsed.castka === "number" && isFinite(parsed.castka) ? parsed.castka : null;

    return NextResponse.json({ castka });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Čtení účtenky se nepovedlo." }, { status: 500 });
  }
}
