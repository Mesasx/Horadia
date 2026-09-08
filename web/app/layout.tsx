import type { Metadata, Viewport } from "next";
import "./globals.css";
import { paletteCSS } from "@/lib/palette";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Horadia",
  description:
    "Planificador semanal de Alba — mantén pulsado, arrastra y suelta.",
  applicationName: "Horadia",
  appleWebApp: {
    capable: true,
    title: "Horadia",
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        {/* Single source of truth for the pastel palette, shared with iOS. */}
        <style
          id="horadia-palette"
          dangerouslySetInnerHTML={{ __html: paletteCSS() }}
        />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
