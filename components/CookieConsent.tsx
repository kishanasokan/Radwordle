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
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-3 sm:p-4 animate-slide-up">
        <div className="max-w-xl mx-auto bg-surface/95 backdrop-blur-md rounded-lg shadow-2xl border border-white/10">
          <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <p className="flex-1 text-white/80 text-xs sm:text-sm leading-snug text-center sm:text-left">
              Radiordle uses local storage to save your game progress and statistics on this device.
              No personal data is collected or shared with third parties. By continuing, you consent to this local data storage.
            </p>
            <button
              onClick={handleAccept}
              className="px-5 py-2 bg-gradient-to-r from-[#0891b2] to-[#0e7490] hover:from-[#0e7490] hover:to-[#0e7490] text-white font-bold font-baloo-2 rounded-lg transition-all whitespace-nowrap text-sm sm:text-base flex-shrink-0"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
  );
}
