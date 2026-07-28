import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  title: "Dílna — Zakázky",
  description: "Evidence zakázek, práce, kalkulací a účtenek pro zámečnickou dílnu",
  manifest: "/manifest.json",
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
