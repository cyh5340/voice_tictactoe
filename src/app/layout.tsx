import type { Metadata } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import "./globals.css";

// Chunky rounded display face for titles, numbers and buttons
const display = Lilita_One({
  variable: "--font-lilita",
  weight: "400",
  subsets: ["latin"],
});

// Rounded, readable body face for speech and rules
const body = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teach to Learn",
  description: "Explain tic-tac-toe to an AI that takes everything literally.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
