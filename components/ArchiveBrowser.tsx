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
  const days = useMemo(() => {
    const today = getDayNumber();
    const archiveDays: ArchiveDay[] = [];

    // Generate list of all days from 0 to today
    for (let i = today; i >= 0; i--) {
      const date = dayNumberToDate(i);
      archiveDays.push({
        dayNumber: i,
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: getDayStatus(i),
      });
    }

    return archiveDays;
  }, []);

  const getStatusBadge = (status: 'won' | 'lost' | 'not_played') => {
    switch (status) {
      case 'won':
        return (
          <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
            WON
          </span>
        );
      case 'lost':
        return (
          <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
            LOST
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded">
            PLAY
          </span>
        );
    }
  };

  const today = getDayNumber();

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-2">
        {days.map((day) => (
          <Link
            key={day.dayNumber}
            href={day.dayNumber === today ? '/' : `/archive/${day.dayNumber}`}
            className="flex items-center justify-between p-4 bg-[#3d4d68] hover:bg-[#4a5b7a] rounded-lg transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-white">
                <span className="font-bold text-lg">Day {day.dayNumber + 1}</span>
                {day.dayNumber === today && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
                    TODAY
                  </span>
                )}
              </div>
              <div className="text-gray-300 text-sm">{day.date}</div>
            </div>
            {getStatusBadge(day.status)}
          </Link>
        ))}
      </div>

      {days.length === 0 && (
        <div className="text-center text-gray-300 py-8">
          No archive days available yet.
        </div>
      )}
    </div>
  );
}
