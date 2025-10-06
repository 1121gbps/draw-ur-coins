import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Nunito } from 'next/font/google';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito', // Set a CSS variable
});

export const metadata: Metadata = {
  title: "draw-ur-coins",
  description: "it's just about drawing a coin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Apply the font variable to the body */}
      <body className={nunito.variable}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
