import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  style: ["normal", "italic"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phorma — Gestione Eventi",
  description: "La piattaforma italiana per la gestione professionale degli eventi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${bricolage.variable} ${instrumentSerif.variable}`}>
      <body className={bricolage.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
