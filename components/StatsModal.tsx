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

        {/* Global Comparison */}
        {stats.gamesWon > 0 && (
          <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-bold text-center text-gray-800 mb-3">
              How You Compare
            </h3>
            {percentileBeat !== null ? (
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  Top {100 - percentileBeat}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  You beat <span className="font-semibold">{percentileBeat}%</span> of players based on guess count
                </p>
              </div>
            ) : globalStats === null ? (
              <p className="text-center text-gray-500 text-sm">Loading global stats...</p>
            ) : (
              <p className="text-center text-gray-500 text-sm">Not enough data yet</p>
            )}
            {globalStats && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
                <div>
                  <p className="text-gray-500">Global Win Rate</p>
                  <p className="font-bold text-gray-700">{globalStats.winRate}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Your Win Rate</p>
                  <p className="font-bold text-gray-700">{winRate}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Global Avg Guesses</p>
                  <p className="font-bold text-gray-700">{globalStats.avgGuesses.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Players</p>
                  <p className="font-bold text-gray-700">{globalStats.totalGames.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
