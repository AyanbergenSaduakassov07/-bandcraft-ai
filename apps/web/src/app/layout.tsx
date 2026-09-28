import type { Metadata } from "next";
import { Nunito, Onest } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BandCraft AI · IELTS Writing band scores",
  description: "IELTS Writing scoring and feedback",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${onest.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
