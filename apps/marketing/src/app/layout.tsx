import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Vestra — Controle financeiro pessoal e compartilhado",
  description:
    "Acompanhe receitas, despesas e recorrências. Compartilhe workspaces com sua família. Mobile-first, instalável como app.",
  metadataBase: new URL("https://vestra-financas.com.br"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Vestra",
    description: "Controle financeiro pessoal e compartilhado.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#22c55e" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
