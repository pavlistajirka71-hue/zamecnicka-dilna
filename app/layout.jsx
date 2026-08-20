import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  title: "Dílna — Zakázky",
  description: "Evidence zakázek, práce, kalkulací a účtenek pro zámečnickou dílnu",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dílna",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

// viewport-fit: cover je nutné, aby aplikace na iPhonu šla přes celou obrazovku
// (i pod výřez/dynamic island) a fungovaly proměnné env(safe-area-inset-*).
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
