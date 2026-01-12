import type { Metadata } from "next";
import { Geist, Geist_Mono, Fredoka, Baloo_2, Poppins } from "next/font/google";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["700"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: {
    default: "Radiordle - Daily Radiology Puzzle Game",
    template: "%s | Radiordle",
  },
  description: "Can you guess the radiology puzzle of the day? Test your medical imaging knowledge in this daily radiology puzzle game!",
  keywords: ["radiology", "puzzle game", "medical imaging", "wordle", "radiology education", "medical quiz", "daily puzzle", "medical education", "radiology training", "diagnostic imaging"],
  authors: [{ name: "Radiordle", url: "https://radiordle.org" }],
  creator: "Radiordle",
  publisher: "Radiordle",
  category: "Education",
  classification: "Medical Education",
  metadataBase: new URL("https://radiordle.org"),
  alternates: {
    canonical: "/",
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: "your-google-verification-code",
  },
  other: {
    "theme-color": "#1a2e5a",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
  openGraph: {
    title: "Radiordle - Daily Radiology Puzzle Game",
    description: "Can you guess the radiology puzzle of the day? Test your medical imaging knowledge in this daily radiology puzzle game!",
    url: "https://radiordle.org",
    siteName: "Radiordle",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Radiordle - Daily Radiology Puzzle Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Radiordle - Daily Radiology Puzzle Game",
    description: "Can you guess the radiology puzzle of the day? Test your medical imaging knowledge in this daily radiology puzzle game!",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/radle_icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} ${baloo2.variable} ${poppins.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
