// apps/web/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import { ToastProvider } from "@/components/Toast";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "SlimeLog",
  description: "Rate It. Log It. Love It.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SlimeLog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fdf4f8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* [Change 1] Wrap with ToastProvider so all consumer pages can call useToast */}
        <ToastProvider>
          <main className="page-enter">{children}</main>
          <BottomNavWrapper />
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
