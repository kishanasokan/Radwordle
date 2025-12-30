'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Puzzle, Hint, Condition } from '@/lib/supabase';
import GameClient from './GameClient';
import StatsModal from './StatsModal';
import { GameState, getStatistics, Statistics } from '@/lib/localStorage';

interface GamePageProps {
  puzzle: Puzzle;
  hints: Hint[];
  conditions: Condition[];
  dayNumber: number;
  isArchive: boolean;
}

export default function GamePage({ puzzle, hints, conditions, dayNumber, isArchive }: GamePageProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Statistics>({
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: {},
  });

  // Load stats on mount and when game state changes
  useEffect(() => {
    setStats(getStatistics());
  }, [gameState?.isComplete]);

  const handleGameStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  // Determine which hints to show based on game state
  const visibleHints = gameState ? hints.slice(0, gameState.revealedHints) : [];

  return (
    <div className="min-h-screen relative overflow-y-auto overflow-x-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2e5a] via-[#233b6e] to-[#1a2e5a]">
        {/* Background decorative medical images - mildly overlapped behind content */}
        <div className="absolute inset-0 opacity-20 flex items-end justify-center pb-8">
          <div className="relative w-[900px] h-[500px]">
            <div className="absolute left-0 top-1/2 w-96 h-96 bg-[url('/placeholder-xray.png')] bg-contain bg-no-repeat opacity-40" style={{ transform: 'translateY(-50%) rotate(-8deg)' }}></div>
            <div className="absolute left-1/2 top-1/2 w-80 h-80 bg-[url('/placeholder-scan.png')] bg-contain bg-no-repeat opacity-35" style={{ transform: 'translate(-50%, -50%) rotate(5deg)' }}></div>
            <div className="absolute right-0 top-1/2 w-72 h-72 bg-[url('/placeholder-ct.png')] bg-contain bg-no-repeat opacity-30 rounded-full" style={{ transform: 'translateY(-50%) rotate(-12deg)' }}></div>
          </div>
        </div>

        {/* Radial Vignette - Static, Performance Optimized */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.75) 88%, rgba(0, 0, 0, 0.9) 100%)'
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with Logo and Buttons */}
        <div className="flex justify-between items-center p-3 sm:p-6">
          {/* Archives Button */}
          <Link
            href="/archive"
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-[#3d4d68] hover:bg-[#4a5b7a] text-white rounded-lg transition-colors"
          >
            <span className="text-base sm:text-xl">📁</span>
            <span className="font-bold font-baloo-2 text-xs sm:text-base">Archives</span>
          </Link>

          {/* Logo and Title - Centered */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <div className="relative w-8 h-8 sm:w-16 sm:h-16">
              <Image
                src="/radle_icon.svg"
                alt="Radiordle Icon"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-3xl md:text-[3.375rem] text-white font-baloo-2 font-extrabold tracking-tight">
              Radiordle
            </h1>
          </div>

          {/* Stats Button */}
          <button
            onClick={() => setShowStats(true)}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-[#3d4d68] hover:bg-[#4a5b7a] text-white rounded-lg transition-colors"
          >
            <span className="text-base sm:text-xl">📊</span>
            <span className="font-bold font-baloo-2 text-xs sm:text-base">Stats</span>
          </button>
        </div>

        {/* Stats Modal */}
        <StatsModal
          isOpen={showStats}
          onClose={() => setShowStats(false)}
          stats={stats}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">

          {/* Medical Image Display */}
          <div className="w-full max-w-3xl mb-8">
            <div className="relative w-full aspect-[16/9] bg-black rounded-lg overflow-hidden shadow-2xl">
              {puzzle.image_url ? (
                <Image
                  src={puzzle.image_url}
                  alt={`Puzzle ${puzzle.puzzle_number}`}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <p>No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* Question */}
          <h2 className="text-xl sm:text-2xl md:text-[2.025rem] text-white font-bold font-baloo-2 mb-1">
            What&apos;s the Diagnosis?
          </h2>

          {/* Hints Display - only show revealed hints */}
          {visibleHints.length > 0 && (
            <div className="w-full max-w-2xl space-y-3 mb-6">
              {visibleHints.map((hint, index) => {
                // Hints are revealed after a guess. The guess that revealed this hint is at index.
                // To color the hint based on the NEXT guess after it was revealed, we look at index + 1.
                // If there's no next guess yet, the hint stays blue.
                const nextGuessResult = gameState?.guessResults[index + 1];

                // Determine the color and text color based on the next guess result
                let hintStyle = '';
                let textColor = 'text-white';

                if (nextGuessResult === 'correct') {
                  // Green for correct guess
                  hintStyle = 'bg-[#407763]';
                  textColor = 'text-white';
                } else if (nextGuessResult === 'partial') {
                  // Yellow for partial match
                  hintStyle = 'bg-[#f6d656]';
                  textColor = 'text-black';
                } else if (nextGuessResult === 'incorrect') {
                  // Red for incorrect guess
                  hintStyle = 'bg-[#9e4a4a]';
                  textColor = 'text-white';
                } else {
                  // Default blue if no next guess yet
                  hintStyle = 'bg-[#6b89b8] bg-opacity-60';
                  textColor = 'text-white';
                }

                return (
                  <div
                    key={hint.id}
                    className={`${hintStyle} ${textColor} backdrop-blur-sm rounded-lg px-6 py-4 transition-all duration-300`}
                  >
                    {hint.hint_text ? (
                      <p className="text-lg">{hint.hint_text}</p>
                    ) : hint.image_caption ? (
                      <p className="text-lg">{hint.image_caption}</p>
                    ) : (
                      <p className="text-lg opacity-50">Hint {index + 1}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Input and Submit */}
          <GameClient
            conditions={conditions}
            dayNumber={dayNumber}
            puzzleNumber={puzzle.puzzle_number}
            correctAnswer={puzzle.answer}
            isArchive={isArchive}
            onGameStateChange={handleGameStateChange}
          />
        </div>
      </div>

      {/* Footer - Only visible when scrolling */}
      <footer className="relative z-10 bg-gradient-to-r from-[#0f1c2e] via-[#1a2744] to-[#0f1c2e] border-t border-white border-opacity-5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <p className="text-white text-center text-sm font-baloo-2 opacity-70">
            Radiordle is for entertainment and educational use only and does not provide medical advice. Always consult a qualified healthcare professional for medical concerns.
          </p>
        </div>
      </footer>
    </div>
  );
}
