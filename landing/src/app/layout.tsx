import type { Metadata } from "next";
import { Poppins, Inter, Lora, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const lora = Lora({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Audistill — Distill knowledge from every conversation",
  description:
    "Turn podcasts, meetings, and lectures into searchable knowledge — privately on your Mac. Local transcription at 30-50x realtime on Apple Silicon.",
  openGraph: {
    title: "Audistill — Distill knowledge from every conversation",
    description:
      "Local-first macOS app: transcribe audio at 30-50x realtime, distill into structured knowledge with any LLM.",
    url: "https://audistill.com",
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
      className={`${poppins.variable} ${inter.variable} ${lora.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="grain min-h-screen bg-bg text-text">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
