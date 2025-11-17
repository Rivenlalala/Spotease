import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotease - Spotify to Netease Sync",
  description: "Sync your Spotify playlists with Netease Music",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <main className="min-h-screen bg-background">{children}</main>
          <Toaster
            position="top-right"
            toastOptions={{
              className: "bg-background text-foreground border",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
