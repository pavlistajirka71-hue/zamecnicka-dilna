/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pozn.: dřív tu bylo images.remotePatterns pro Supabase a Google Drive. Aplikace
  // ale komponentu next/image nikde nepoužívá (fotky jsou obyčejné <img>), takže to
  // jen zbytečně zapínalo optimalizátor obrázků Next.js, ve kterém jsou u verze 14
  // známé bezpečnostní chyby. Fotky se zobrazují úplně stejně jako předtím.
  experimental: {
    // pdfkit se na serveru načítá přímo z node_modules, ne přes webpack. Odstraní to
    // varování "Can't resolve 'iconv-lite'" při buildu a pdfkit má k dispozici
    // všechny své soubory přesně tak, jak je jeho autoři zamýšleli.
    serverComponentsExternalPackages: ["pdfkit"],
    // Aplikace si nese vlastní font (fonts/*.ttf, plná podpora češtiny) a nikdy nesahá na
    // vestavěné fonty pdfkitu — to je hlavní oprava. Tohle je jen dodatečná pojistka, ať
    // Next.js při nasazení na Vercel určitě zabalí i tenhle vlastní font soubor.
    outputFileTracingIncludes: {
      "/api/export-pdf/[id]": ["./fonts/**/*"],
      "/api/**/*": ["./fonts/**/*"],
      "/api/nabidka-pdf/[id]": ["./fonts/**/*", "./public/logo-mysteel.jpg"],
    },
  },
};

module.exports = nextConfig;
