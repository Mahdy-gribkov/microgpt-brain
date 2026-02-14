import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TrainingBridgeProvider } from "../contexts/TrainingContext";
import { GrainOverlay } from "../components/GrainOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "microGPT Playground — Train a GPT in Your Browser",
  description: "Train a character-level GPT model entirely in your browser. Zero servers, zero API calls, 100% client-side. Built with TypeScript, WebGPU, and Transformers from scratch.",
  openGraph: {
    title: "microGPT Playground — Train a GPT in Your Browser",
    description: "Train a character-level GPT model entirely in your browser. Pure TypeScript transformer architecture with WebGPU acceleration.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "microGPT Playground",
    description: "Train a character-level GPT model in your browser. Zero servers. Pure TypeScript.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TrainingBridgeProvider>
          <GrainOverlay />
          {children}
        </TrainingBridgeProvider>
      </body>
    </html>
  );
}
