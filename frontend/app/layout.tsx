import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "@/lib/app-context";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "KnowFlow",
  description: "AI knowledge and research platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <AppProvider>
            <Navbar />
            {children}
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}