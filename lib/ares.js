// Server-only pomocník pro vyhledání firmy v ARES (Administrativní registr ekonomických
// subjektů, Ministerstvo financí ČR) podle IČO. Veřejné, zdarma, bez registrace/klíče.
export async function vyhledatVAres(ico) {
  const cisteIco = String(ico).replace(/\s/g, "");
  if (!/^\d{8}$/.test(cisteIco)) {
    throw new Error("IČO musí mít přesně 8 číslic.");
  }

  const res = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${cisteIco}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Subjekt s tímto IČO nebyl v ARES nalezen.");
    throw new Error("Vyhledávání v ARES se nepovedlo, zkus to prosím znovu.");
  }
  const data = await res.json();

  return {
    ico: data.ico || cisteIco,
    nazev: data.obchodniJmeno || "",
    adresa: data.sidlo?.textovaAdresa || "",
    dic: data.dic || "",
  };
}
