// Sestaví e-mail jako soubor .eml s přílohou (např. PDF nabídky). Hlavička
// "X-Unsent: 1" říká Outlooku, že jde o ROZEPSANOU zprávu — po otevření souboru se
// zobrazí jako nový e-mail připravený k odeslání (adresát, předmět, text i příloha),
// který jde ještě upravit. Vše se děje v prohlížeči, nic se nikam neposílá.

const b64Utf8 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

// Base64 zalomené po 76 znacích (požadavek formátu e-mailu)
const zalomit = (b64) => b64.replace(/.{1,76}/g, "$&\r\n").trimEnd();

// Hlavička s diakritikou (RFC 2047)
const hlavicka = (text) => (/^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${b64Utf8(text)}?=`);

async function blobNaBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function vytvoritEmlKoncept({ komu, predmet, text, priloha, nazevPrilohy, typPrilohy = "application/pdf" }) {
  const hranice = `----=_Dilna_${Math.random().toString(36).slice(2)}`;
  const radky = [
    "X-Unsent: 1",
    ...(komu ? [`To: ${komu}`] : []),
    `Subject: ${hlavicka(predmet || "")}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${hranice}"`,
    "",
    "This is a multi-part message in MIME format.",
    "",
    `--${hranice}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    zalomit(b64Utf8((text || "").replace(/\r?\n/g, "\r\n"))),
    "",
  ];
  if (priloha) {
    const jmeno = nazevPrilohy || "priloha.pdf";
    radky.push(
      `--${hranice}`,
      `Content-Type: ${typPrilohy}; name="${jmeno}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${jmeno}"`,
      "",
      zalomit(await blobNaBase64(priloha)),
      ""
    );
  }
  radky.push(`--${hranice}--`, "");
  return new Blob([radky.join("\r\n")], { type: "message/rfc822" });
}

export function stahnoutSoubor(blob, nazev) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazev;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
