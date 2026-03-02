import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "银龄相馆 - Silver Portrait Studio",
  description: "为老年人打造的 AI 形象照应用 - AI portrait app designed for seniors",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="zh">
        <body
          className={`${geistSans.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
