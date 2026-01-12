'use client';

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'radiordle_cookie_consent';

export type ConsentStatus = 'pending' | 'accepted' | 'declined';

export function getCookieConsent(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';

  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted' || consent === 'declined') {
      return consent;
    }
    return 'pending';
  } catch {
    return 'pending';
  }
}

export function setCookieConsent(status: 'accepted' | 'declined'): void {
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
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('pending');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to prevent flash on page load
    const timer = setTimeout(() => {
      const status = getCookieConsent();
      setConsentStatus(status);
      setIsVisible(status === 'pending' || status === 'declined');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setCookieConsent('accepted');
    setConsentStatus('accepted');
    setIsVisible(false);
    onConsentChange?.(true);
  };

  const handleDecline = () => {
    setCookieConsent('declined');
    setConsentStatus('declined');
    // Keep visible to show the "required" message
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 animate-slide-up">
      <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#1e3a5f] to-[#0f1c2e] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
        {consentStatus === 'declined' ? (
          // Declined state - show requirement message
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-white font-baloo-2 mb-2">
                  Cookies Required to Play
                </h3>
                <p className="text-white/80 text-sm sm:text-base">
                  Radiordle uses cookies to save your game progress and statistics. Without cookies, your progress cannot be saved and the game will not function properly.
                </p>
              </div>
              <button
                onClick={handleAccept}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all whitespace-nowrap text-base sm:text-lg min-w-[160px]"
              >
                Accept Cookies
              </button>
            </div>
          </div>
        ) : (
          // Initial consent state
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-white font-baloo-2 mb-2">
                  Cookie Notice
                </h3>
                <p className="text-white/80 text-sm sm:text-base">
                  We use cookies to save your game progress, statistics, and preferences locally on your device. We do not share this data with third parties.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  className="px-6 py-3 sm:px-8 sm:py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all text-base sm:text-lg min-w-[100px] sm:min-w-[120px]"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="px-6 py-3 sm:px-8 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all text-base sm:text-lg min-w-[100px] sm:min-w-[120px]"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
