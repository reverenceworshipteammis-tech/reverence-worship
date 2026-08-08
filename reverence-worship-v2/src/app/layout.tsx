import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Reverence Worship",
  description: "Ministry management for Reverence Worship.",
  verification: {
    google: "Wjwy81ZQznEuL3ziUJAh81WVE8eUa4Z4rM9VFNxWWOA",
  },
  icons: {
    icon: [
      { url: "/logo_title_icon.png", type: "image/png" },
      { url: "/logo_title.jpeg", type: "image/jpeg" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/logo_title_icon.png",
    apple: "/logo_title_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
