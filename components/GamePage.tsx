'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Puzzle, Hint, Condition } from '@/lib/supabase';
import GameClient from './GameClient';
import StatsModal from './StatsModal';
import FeedbackModal from './FeedbackModal';
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [stats, setStats] = useState<Statistics>({
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: {},
  });

  // Load stats on mount and when game state changes
  useEffect(() => {
    // Wrap in Promise to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      setStats(getStatistics());
    });
  }, [gameState?.isComplete]);

  // Track initial hint count so only newly revealed hints animate (not restored from save)
  const initialHintCount = useRef<number | null>(null);

  const handleGameStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  // Capture the hint count on first game state load
  useEffect(() => {
    if (gameState && initialHintCount.current === null) {
      initialHintCount.current = gameState.revealedHints;
    }
  }, [gameState]);

  // Track whether the image border has appeared (for pulse animation)
  const hasImageBorder = !!(gameState?.guessResults[0]);
  const prevHadBorder = useRef(false);
  const showImagePulse = hasImageBorder && !prevHadBorder.current;
  useEffect(() => {
    if (hasImageBorder) {
      prevHadBorder.current = true;
    }
  }, [hasImageBorder]);

  // Determine which hints to show based on game state
  // Show all hints when game is complete, otherwise only show revealed hints
  const visibleHints = gameState
    ? (gameState.isComplete ? hints : hints.slice(0, gameState.revealedHints))
    : [];

  // Determine image border color based on first guess result
  // The first guess is made with only the image, so it reflects how helpful the image was
  const firstGuessResult = gameState?.guessResults[0];
  let imageBorderStyle = '';
  if (firstGuessResult === 'correct') {
    imageBorderStyle = 'ring-4 ring-success shadow-[0_0_20px_rgba(64,119,99,0.6)]';
  } else if (firstGuessResult === 'partial') {
    imageBorderStyle = 'ring-4 ring-warning shadow-[0_0_20px_rgba(246,214,86,0.6)]';
  } else if (firstGuessResult === 'incorrect') {
    imageBorderStyle = 'ring-4 ring-error shadow-[0_0_20px_rgba(158,74,74,0.6)]';
  }

  // Annotated image: show after first guess if a valid URL is provided
  const annotatedImageUrl = puzzle.annotated_image_url?.startsWith('http')
    ? puzzle.annotated_image_url
    : null;
  const showAnnotated = !!annotatedImageUrl && (gameState?.guesses.length ?? 0) >= 1;

  return (
    <div className="min-h-screen-safe relative overflow-y-auto overflow-x-hidden" style={{ minHeight: 'var(--full-vh)' }}>
      {/* Gradient Background - fixed on desktop so it doesn't scroll with content */}
      <div className="absolute sm:fixed inset-0 bg-gradient-to-br from-page-bg via-page-bg-mid to-page-bg pointer-events-none">
        {/* Background decorative medical images - horizontal on desktop, vertical on mobile */}
        {/* Desktop layout - horizontal */}
        <div className="hidden sm:flex absolute inset-0 opacity-20 items-end justify-center pb-8">
          <div className="relative w-[900px] h-[500px]">
            <div className="absolute left-0 top-1/2 w-96 h-96 bg-[url('/placeholder-xray.png')] bg-contain bg-no-repeat opacity-40" style={{ transform: 'translateY(-50%) rotate(-8deg)' }}></div>
            <div className="absolute left-1/2 top-1/2 w-80 h-80 bg-[url('/placeholder-scan.png')] bg-contain bg-no-repeat opacity-35" style={{ transform: 'translate(-50%, -50%) rotate(5deg)' }}></div>
            <div className="absolute right-0 top-1/2 w-72 h-72 bg-[url('/placeholder-ct.png')] bg-contain bg-no-repeat opacity-30 rounded-full" style={{ transform: 'translateY(-50%) rotate(-12deg)' }}></div>
          </div>
        </div>
        {/* Mobile layout - triangle arrangement behind hint/guess area (bottom half of screen) */}
        <div className="flex sm:hidden absolute inset-0 opacity-20">
          <div className="absolute bottom-0 left-0 right-0 h-[55%]">
            {/* Top center image */}
            <div className="absolute left-1/2 top-[0%] w-72 h-72 bg-[url('/placeholder-xray.png')] bg-contain bg-no-repeat opacity-40" style={{ transform: 'translateX(-50%) rotate(-8deg)' }}></div>
            {/* Bottom left image */}
            <div className="absolute left-[5%] bottom-[5%] w-64 h-64 bg-[url('/placeholder-scan.png')] bg-contain bg-no-repeat opacity-35" style={{ transform: 'rotate(5deg)' }}></div>
            {/* Bottom right image */}
            <div className="absolute right-[5%] bottom-[5%] w-64 h-64 bg-[url('/placeholder-ct.png')] bg-contain bg-no-repeat opacity-30 rounded-full" style={{ transform: 'rotate(-12deg)' }}></div>
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
      <div className="relative z-10 min-h-screen-safe flex flex-col" style={{ minHeight: 'var(--full-vh)' }}>
        {/* Header with Logo and Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-6 gap-0 sm:gap-0">
          {/* Top row on mobile: Archives and Stats buttons */}
          <div className="flex justify-between items-center sm:contents">
            {/* Archives Button - Left side container with fixed width on desktop */}
            <div className="sm:flex-1 sm:flex sm:justify-start">
              <Link
                href="/archive"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors"
              >
                <span className="text-base sm:text-xl">📁</span>
                <span className="font-bold font-baloo-2 text-xs sm:text-base">Archives</span>
              </Link>
            </div>

            {/* Logo and Title - Hidden on mobile, shown inline on larger screens */}
            <div className="hidden sm:flex items-center gap-1 drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
              <div className="relative w-16 h-16">
                <Image
                  src="/radle_icon.svg"
                  alt="Radiordle Icon"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <h1 className="text-3xl md:text-[3.375rem] text-white font-baloo-2 font-extrabold tracking-tight">
                Radiordle
              </h1>
            </div>

            {/* Stats and Feedback Buttons - Right side container with fixed width on desktop */}
            <div className="sm:flex-1 sm:flex sm:justify-end">
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/about"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors"
                  title="Learn More"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline font-bold font-baloo-2 text-xs sm:text-base">About</span>
                </Link>
                <button
                  onClick={() => setShowFeedback(true)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors"
                  title="Send Feedback"
                >
                  <span className="text-base sm:text-xl">💬</span>
                  <span className="hidden sm:inline font-bold font-baloo-2 text-xs sm:text-base">Feedback</span>
                </button>
                <button
                  onClick={() => setShowStats(true)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors"
                >
                  <span className="text-base sm:text-xl">📊</span>
                  <span className="font-bold font-baloo-2 text-xs sm:text-base">Stats</span>
                </button>
              </div>
            </div>
          </div>

          {/* Logo and Title - Second row on mobile only */}
          <div className="flex sm:hidden items-center justify-center gap-1 drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)] -mb-1">
            <div className="relative w-[72px] h-[72px]">
              <Image
                src="/radle_icon.svg"
                alt="Radiordle Icon"
                width={72}
                height={72}
                className="object-contain"
              />
            </div>
            <h1 className="text-[3.25rem] text-white font-baloo-2 font-extrabold tracking-tight">
              Radiordle
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-start sm:justify-start px-4 pb-4 sm:pb-4 sm:pt-10">

          {/* Medical Image Display */}
          <div className="w-full max-w-3xl lg:max-w-4xl mb-3 sm:mb-6">
            <div className={`relative w-full aspect-[16/9] bg-black rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${imageBorderStyle}${showImagePulse ? ' animate-image-pulse' : ''}`}>
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
              {/* Annotated image overlay — fades in after first guess */}
              {annotatedImageUrl && (
                <div className={`absolute inset-0 transition-opacity duration-300 ${showAnnotated ? 'opacity-100' : 'opacity-0'}`}>
                  <Image
                    src={annotatedImageUrl}
                    alt={`Puzzle ${puzzle.puzzle_number} annotated`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Question */}
          <h2 className="text-2xl sm:text-3xl md:text-[2.025rem] text-white font-bold font-baloo-2 mb-1 sm:mb-3 sm:mt-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
            What&apos;s the Diagnosis?
          </h2>

          {/* Hints Display - only show revealed hints */}
          {visibleHints.length > 0 && (
            <div className="w-full max-w-xl mx-auto space-y-3 mb-4 sm:mb-6">
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
                  hintStyle = 'bg-success';
                  textColor = 'text-white';
                } else if (nextGuessResult === 'partial') {
                  // Yellow for partial match
                  hintStyle = 'bg-warning';
                  textColor = 'text-black';
                } else if (nextGuessResult === 'incorrect') {
                  // Red for incorrect guess
                  hintStyle = 'bg-error';
                  textColor = 'text-white';
                } else {
                  // Default blue if no next guess yet
                  hintStyle = 'bg-hint-default bg-opacity-60';
                  textColor = 'text-white';
                }

                // Only animate hints that were revealed after the initial load
                const isNewHint = initialHintCount.current !== null && index >= initialHintCount.current;

                return (
                  <div
                    key={hint.id}
                    className={`${hintStyle} ${textColor} backdrop-blur-sm rounded-lg px-6 py-4 transition-all duration-300${isNewHint ? ' animate-hint-reveal' : ''}`}
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
            citation={puzzle.citation}
            learnLink={puzzle.learn_link}
            isArchive={isArchive}
            onGameStateChange={handleGameStateChange}
          />
        </div>
      </div>


      {/* Stats Modal - Rendered outside z-10 content container to ensure it overlays everything */}
      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        pageContext={isArchive ? `archive/day-${dayNumber}` : `day-${dayNumber}`}
      />
    </div>
  );
}
