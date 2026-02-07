'use client';

import { useEffect, useState } from 'react';
import { attemptStatsRecovery } from '@/lib/statsRecovery';

/**
 * Client component that attempts to recover player statistics on app load.
 * Shows a brief notification if stats were recovered.
 */
export default function StatsRecoveryProvider() {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    attemptStatsRecovery().then((wasRecovered) => {
      if (wasRecovered) {
        setShowNotification(true);
        // Hide notification after 4 seconds
        setTimeout(() => setShowNotification(false), 4000);
      }
    });
  }, []);

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] animate-slide-down">
      <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 font-baloo-2">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Your statistics have been restored!</span>
      </div>
    </div>
  );
}
