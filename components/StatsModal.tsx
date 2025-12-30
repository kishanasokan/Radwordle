'use client';

import { Statistics } from '@/lib/localStorage';
import { MAX_GUESSES } from '@/lib/gameLogic';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Statistics;
}

export default function StatsModal({ isOpen, onClose, stats }: StatsModalProps) {
  if (!isOpen) return null;

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  // Find the max value in guess distribution for scaling bars
  const maxDistribution = Math.max(
    ...Object.values(stats.guessDistribution),
    1 // Prevent division by zero
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            X
          </button>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Your Statistics
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
          <div className="text-center p-2 border border-gray-200 rounded-lg">
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.gamesPlayed}</p>
            <p className="text-xs text-gray-500 uppercase">Games Played</p>
          </div>
          <div className="text-center p-2 border border-gray-200 rounded-lg">
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">{winRate}%</p>
            <p className="text-xs text-gray-500 uppercase">Win Rate</p>
          </div>
          <div className="text-center p-2 border border-gray-200 rounded-lg">
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.currentStreak}</p>
            <p className="text-xs text-gray-500 uppercase">Current Streak</p>
          </div>
          <div className="text-center p-2 border border-gray-200 rounded-lg">
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.maxStreak}</p>
            <p className="text-xs text-gray-500 uppercase">Longest Streak</p>
          </div>
        </div>

        {/* Guess Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-center text-gray-800 mb-4">
            Guess Distribution
          </h3>
          <div className="space-y-2">
            {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map((guessNum) => {
              const count = stats.guessDistribution[guessNum] || 0;
              const percentage = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;

              return (
                <div key={guessNum} className="flex items-center gap-2">
                  <span className="w-4 text-sm font-medium text-gray-600">{guessNum}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${count > 0 ? 'bg-green-600' : 'bg-gray-200'} rounded flex items-center justify-end px-2 transition-all duration-300`}
                      style={{ width: `${Math.max(percentage, count > 0 ? 8 : 0)}%` }}
                    >
                      {count > 0 && (
                        <span className="text-white text-sm font-bold">{count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
