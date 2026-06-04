import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DataMind - AI-Powered Business Intelligence",
  description: "Upload databases, ask questions in natural language, and get instant AI-powered insights with visualizations.",
  keywords: ["BI", "Business Intelligence", "AI", "SQL", "Data Analysis", "Visualization"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "DataMind BI - AI-Powered Business Intelligence",
    description: "Upload databases, ask questions in natural language, and get instant AI-powered insights with visualizations.",
    url: "https://datamind.mooo.com",
    siteName: "DataMind BI",
    images: [
      {
        url: "https://datamind.mooo.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "DataMind BI - AI-Powered Business Intelligence Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataMind BI - AI-Powered Business Intelligence",
    description: "Upload databases, ask questions in natural language, and get instant AI-powered insights with visualizations.",
    images: ["https://datamind.mooo.com/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${cormorantGaramond.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <AuthModal />
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
