import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { DM_Sans, DM_Serif_Display, DM_Mono } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  style: ["normal", "italic"],
  weight: "400",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phorma — La segreteria eventi è diventata intelligente.",
  description: "La prima piattaforma agentica per la segreteria organizzativa eventi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${dmSans.variable} ${dmSerifDisplay.variable} ${dmMono.variable}`}
    >
      <body className={dmSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
