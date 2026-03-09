import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Print Queue — Panatickets Badges",
  description: "Cola de impresión manual para etiquetas de evento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  );
}
