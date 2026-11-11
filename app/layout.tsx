import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

// Three weights cover regular text, labels and headings.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "JARAK CONNECT - Desa Jarak",
    template: "%s | JARAK CONNECT",
  },
  description:
    "Menghubungkan Potensi Desa Jarak dengan Pasar, Mitra, dan Pelaku Usaha.",
};

export const viewport: Viewport = {
  themeColor: "#0f2d1f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
