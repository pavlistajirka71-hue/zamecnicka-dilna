// Standardní vestavěné fonty v PDF (Helvetica apod.) neumí české znaky s háčky/čárkami —
// je to omezení formátu/knihovny, ne appky. Dokud appka nemá k dispozici font s podporou
// češtiny (viz lib/orderPdf.js), text pro PDF touhle funkcí zbavíme diakritiky, ať je
// alespoň čitelný a bez rozbitých/prázdných znaků.
const MAPA = {
  á: "a", č: "c", ď: "d", é: "e", ě: "e", í: "i", ň: "n", ó: "o", ř: "r", š: "s",
  ť: "t", ú: "u", ů: "u", ý: "y", ž: "z",
  Á: "A", Č: "C", Ď: "D", É: "E", Ě: "E", Í: "I", Ň: "N", Ó: "O", Ř: "R", Š: "S",
  Ť: "T", Ú: "U", Ů: "U", Ý: "Y", Ž: "Z",
};

export function odstranitDiakritiku(text) {
  if (text === null || text === undefined) return "";
  return String(text).replace(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, (ch) => MAPA[ch] || ch);
}
