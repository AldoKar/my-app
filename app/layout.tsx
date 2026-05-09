import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EmotiBot — El Robot que Siente el Ritmo",
  description:
    "Un cerebro robótico emocional impulsado por ESP32 y pantalla OLED que escucha la música del entorno, identifica la canción y muestra expresiones faciales en tiempo real vía Web Serial API.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased dark font-serif`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
