'use client';

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'radiordle_cookie_consent';

export type ConsentStatus = 'pending' | 'accepted';

export function getCookieConsent(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';

  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      return 'accepted';
    }
    return 'pending';
  } catch {
    return 'pending';
  }
}

export function setCookieConsent(status: 'accepted'): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, status);
  } catch (error) {
    console.error('Error saving cookie consent:', error);
  }
}

interface CookieConsentProps {
  onConsentChange?: (accepted: boolean) => void;
}

export default function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to prevent flash on page load
    const timer = setTimeout(() => {
      const status = getCookieConsent();
      setIsVisible(status === 'pending');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setCookieConsent('accepted');
    setIsVisible(false);
    onConsentChange?.(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 animate-slide-up">
      <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#1e3a5f] to-[#0f1c2e] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-baloo-2 mb-2">
                Data Storage Notice
              </h3>
              <p className="text-white/80 text-sm sm:text-base">
                Radiordle stores your game progress and statistics locally on your device to save your progress.
                This data never leaves your device and is not shared with third parties.
                By continuing, you agree to this local data storage.
              </p>
            </div>
            <button
              onClick={handleAccept}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all whitespace-nowrap text-base sm:text-lg min-w-[160px]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
