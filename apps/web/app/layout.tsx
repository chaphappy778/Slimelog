// apps/web/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import CookieBanner from "@/components/CookieBanner";
// [Change 2 — T31 v2] Mount the navigation history tracker once globally
// so every in-app pathname change gets pushed onto the back-button stack.
import NavigationHistoryTracker from "@/components/NavigationHistoryTracker";

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
        {/* T104 (2026-07-10): AuthProvider caches user + profile once
            so client components can call useAuth() instead of firing
            their own auth.getUser + profile queries. Nested inside
            ToastProvider so auth-triggered side effects can still
            surface toasts. */}
        <ToastProvider>
          <AuthProvider>
            {/* [Change 2 — T31 v2] Renders null — pushes pathname changes
                onto sessionStorage stack for the back button to consume. */}
            <NavigationHistoryTracker />
            <main className="page-enter">{children}</main>
            <BottomNavWrapper />
            <CookieBanner />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
