'use client';

import { useState, useEffect } from 'react';
import { Statistics } from '@/lib/localStorage';
import { MAX_GUESSES } from '@/lib/gameLogic';
import { getGlobalStats, calculatePercentileBeat, GlobalStats } from '@/lib/supabase';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Statistics;
}

export default function StatsModal({ isOpen, onClose, stats }: StatsModalProps) {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [percentileBeat, setPercentileBeat] = useState<number | null>(null);

  // Lock background scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Fetch global stats when modal opens
  useEffect(() => {
    if (isOpen) {
      getGlobalStats().then((global) => {
        setGlobalStats(global);
        if (global && stats.guessDistribution) {
          const percentile = calculatePercentileBeat(
            stats.guessDistribution,
            global.guessDistribution
          );
          setPercentileBeat(percentile);
        }
      });
    }
  }, [isOpen, stats.guessDistribution]);

  if (!isOpen) return null;

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  // Find the max value in guess distribution for scaling bars
  const maxDistribution = Math.max(
    ...Object.values(stats.guessDistribution),
    1 // Prevent division by zero
  );

  // Calculate user's average guesses (only counting wins)
  const userAvgGuesses = (() => {
    let totalGuesses = 0;
    let totalWins = 0;
    for (const [guessNum, count] of Object.entries(stats.guessDistribution)) {
      totalGuesses += parseInt(guessNum) * count;
      totalWins += count;
    }
    return totalWins > 0 ? totalGuesses / totalWins : 0;
  })();

  // Calculate average guess time
  const avgGuessTime = stats.totalGuessCount && stats.totalGuessCount > 0
    ? (stats.totalGuessTime || 0) / stats.totalGuessCount
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50  flex items-center justify-center z-[100] p-4 animate-backdrop-fade"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-modal-bg to-page-bg-dark rounded-lg p-4 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] sm:max-h-none overflow-y-auto font-baloo-2 animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6">
          Your Statistics
        </h2>

        {/* Statistics */}
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-black text-center mb-2">Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">{stats.gamesPlayed}</p>
              <p className="text-xs text-gray-600">Played</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">{winRate}</p>
              <p className="text-xs text-gray-600">Win %</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">{stats.currentStreak}</p>
              <p className="text-xs text-gray-600">Current Streak</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">{stats.maxStreak}</p>
              <p className="text-xs text-gray-600">Max Streak</p>
            </div>
          </div>
        </div>

        {/* Guess Distribution */}
        <div className="bg-white rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-black text-center mb-4">
            Guess Distribution
          </h3>
          <div className="space-y-2">
            {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map((guessNum) => {
              const count = stats.guessDistribution[guessNum] || 0;
              const percentage = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
              const barColor = count > 0 ? 'bg-gray-400' : 'bg-gray-100';

              return (
                <div key={guessNum} className="flex items-center gap-2">
                  <span className="w-4 text-sm font-medium text-gray-600">{guessNum}</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded flex items-center justify-end px-2 animate-bar-fill`}
                      style={{ width: `${Math.max(percentage, count > 0 ? 8 : 0)}%`, animationDelay: `${(guessNum - 1) * 0.08}s` }}
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

        {/* How You Compare */}
        {stats.gamesWon > 0 && (
          <div className="bg-surface rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-3">
              How You Compare
            </h3>
            {percentileBeat !== null ? (
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">
                  Top {100 - percentileBeat}%
                </p>
                <p className="text-sm text-gray-200 mt-1">
                  You beat <span className="font-semibold">{percentileBeat}%</span> of players based on guess count
                </p>
              </div>
            ) : globalStats === null ? (
              <p className="text-center text-gray-300 text-sm">Loading global stats...</p>
            ) : (
              <p className="text-center text-gray-300 text-sm">Not enough data yet</p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-gray-300">Win Rate</p>
                <p className="font-bold text-white">{winRate}%</p>
              </div>
              <div>
                <p className="text-gray-300">Avg Guess #</p>
                <p className="font-bold text-white">{userAvgGuesses > 0 ? userAvgGuesses.toFixed(1) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-300">Avg Guess Time</p>
                <p className="font-bold text-white">{avgGuessTime > 0 ? `${avgGuessTime.toFixed(1)}s` : '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
