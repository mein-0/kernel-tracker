import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Kernel Tracker",
  description: "Windows Kernel Driver Research Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-mono)]">
        {children}
      </body>
    </html>
  );
}
