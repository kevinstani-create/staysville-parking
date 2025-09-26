import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Staysville Parking - Premium Parking in Oslo",
  description: "Book secure parking spots at prime locations throughout Oslo. Easy online booking with instant confirmation. 150 NOK per night.",
  keywords: "parking, Oslo, booking, secure parking, Jens Zetlitz gate, Saudagata, Torbjørn Hornkløves gate",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
