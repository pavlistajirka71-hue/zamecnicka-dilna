/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
  // Appka si nese vlastní font (fonts/*.ttf, plná podpora češtiny) a nikdy nesahá na
  // vestavěné fonty pdfkitu — to je hlavní oprava. Tohle je jen dodatečná pojistka, ať
  // Next.js při nasazení na Vercel určitě zabalí i tenhle vlastní font soubor.
  experimental: {
    outputFileTracingIncludes: {
      "/api/export-pdf/[id]": ["./fonts/**/*"],
      "/api/**/*": ["./fonts/**/*"],
    },
  },
};

module.exports = nextConfig;
