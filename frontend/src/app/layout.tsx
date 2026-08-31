import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Sahayak AI Teacher — Human-Like Adaptive AI Educator",
  description: "AI Innovation Hackathon 2026. A state-machine powered AI educator delivering personalized lessons with interactive avatar video, synced visuals, and adaptive misconception reteaching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="sahayakDark" className="dark">
      <body className="min-h-screen flex flex-col bg-base-100 text-slate-100 antialiased selection:bg-primary selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
