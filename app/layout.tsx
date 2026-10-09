import "./globals.css";
import type { Metadata } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";

// Nunito's rounded letterforms give the friendly, game-show feel for all UI text.
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Code Tug of War",
  description: "Learn what happens beneath every line of code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
