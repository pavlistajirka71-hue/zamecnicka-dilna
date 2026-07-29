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
  // pdfkit čte svoje datové soubory s metrikami fontů (.afm) za běhu přes fs.readFileSync,
  // ne přes import — Next.js je proto při nasazení na Vercel automaticky nezabalí. Tohle mu
  // řekne, ať je pro tuhle routu (generování PDF archivu zakázky) zabalí ručně.
  experimental: {
    outputFileTracingIncludes: {
      "/api/export-pdf/[id]": ["./node_modules/pdfkit/js/data/**/*"],
      "/api/**/*": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
};

module.exports = nextConfig;
