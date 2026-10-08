// @ts-expect-error - CSS imports are handled by Next.js at build time.
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code Tug of War",
  description: "Learn what happens beneath every line of code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
