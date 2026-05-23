import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "KOL Manager",
  description: "Quản lý KOL/KOC và doanh thu TikTok Shop",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={cn("font-sans", inter.variable)}>
      <body className="antialiased bg-gray-50">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
