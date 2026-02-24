import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2 } from "next/font/google";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";
import StatsRecoveryProvider from "@/components/StatsRecoveryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["800"],
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Radiordle - Daily Radiology Puzzle Game",
    description: "Can you guess the radiology puzzle of the day? Test your medical imaging knowledge in this daily radiology puzzle game!",
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

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://radiordle.org/#application",
      "name": "Radiordle",
      "url": "https://radiordle.org",
      "description": "A daily radiology puzzle game where players guess diagnoses from medical imaging cases. Educational and entertaining for medical students, radiology residents, and healthcare professionals.",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Any",
      "browserRequirements": "Requires JavaScript. Requires HTML5.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@type": "Organization",
        "@id": "https://radiordle.org/#organization"
      },
      "screenshot": "https://radiordle.org/radle_icon.svg"
    },
    {
      "@type": "Organization",
      "@id": "https://radiordle.org/#organization",
      "name": "Radiordle",
      "url": "https://radiordle.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://radiordle.org/radle_icon.svg"
      },
      "sameAs": [
        "https://github.com/kganiga/radiordle"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://radiordle.org/#website",
      "url": "https://radiordle.org",
      "name": "Radiordle",
      "description": "Daily Radiology Puzzle Game",
      "publisher": {
        "@type": "Organization",
        "@id": "https://radiordle.org/#organization"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://radiordle.org/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Radiordle?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Radiordle is a daily radiology puzzle game inspired by Wordle. Each day, players are presented with a medical imaging case and must guess the correct diagnosis within 5 attempts."
          }
        },
        {
          "@type": "Question",
          "name": "Who is Radiordle for?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Radiordle is designed for medical students learning radiology fundamentals, radiology residents preparing for board exams, healthcare professionals maintaining diagnostic skills, and anyone interested in medical imaging education."
          }
        },
        {
          "@type": "Question",
          "name": "How do I play Radiordle?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "View the medical image and make your best diagnosis guess. After each incorrect guess, a new hint is revealed. You have 5 attempts to guess the correct diagnosis. New puzzles are released daily at midnight EST."
          }
        },
        {
          "@type": "Question",
          "name": "Is Radiordle free to play?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Radiordle is completely free to play. No registration or payment is required."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${baloo2.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <StatsRecoveryProvider />
        <CookieConsent />
      </body>
    </html>
  );
}
