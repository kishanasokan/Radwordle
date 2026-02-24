'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { getDayNumber, dayNumberToDate } from '@/lib/gameLogic';
import { getDayStatus } from '@/lib/localStorage';

interface ArchiveDay {
  dayNumber: number;
  date: string;
  status: 'won' | 'lost' | 'not_played';
}

export default function ArchiveBrowser() {
  const today = getDayNumber();

  const days = useMemo(() => {
    const archiveDays: ArchiveDay[] = [];

    for (let i = today; i >= 0; i--) {
      const date = dayNumberToDate(i);
      archiveDays.push({
        dayNumber: i,
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        status: getDayStatus(i),
      });
    }

    return archiveDays;
  }, [today]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
        {days.map((day) => {
          const isToday = day.dayNumber === today;
          const isWon = day.status === 'won';
          const isLost = day.status === 'lost';

          return (
            <Link
              key={day.dayNumber}
              href={isToday ? '/' : `/archive/${day.dayNumber}`}
              className={`relative flex flex-col items-center justify-center rounded-lg p-2.5 sm:p-3 transition-all duration-150 ${
                isWon
                  ? 'bg-success/80 hover:bg-success ring-1 ring-success/50'
                  : isLost
                    ? 'bg-error/60 hover:bg-error/80 ring-1 ring-error/40'
                    : 'bg-surface hover:bg-surface-hover ring-1 ring-white/5'
              }`}
            >
              {isToday && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-warning text-black text-[9px] font-bold font-baloo-2 rounded leading-none">
                  TODAY
                </span>
              )}
              <span className="text-white font-bold font-baloo-2 text-sm sm:text-base leading-tight inline-flex items-center gap-1">
                Day {day.dayNumber + 1}
                {isWon && (
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isLost && (
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </span>
              <span className="text-white/50 text-[10px] sm:text-xs leading-tight mt-0.5">
                {day.date}
              </span>
            </Link>
          );
        })}
      </div>

      {days.length === 0 && (
        <div className="text-center text-gray-300 py-8">
          No archive days available yet.
        </div>
      )}
    </div>
  );
}
