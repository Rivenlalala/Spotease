import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotease - Spotify to Netease Sync",
  description: "Sync your Spotify playlists with Netease Music",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-100">{children}</main>
      </body>
    </html>
  );
}
