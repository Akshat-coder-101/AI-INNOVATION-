import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";

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
    <html lang="en" data-theme="courseraLight">
      <body className="min-h-screen flex flex-col bg-white text-ink-primary antialiased selection:bg-primary-soft selection:text-primary">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
