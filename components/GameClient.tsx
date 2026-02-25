'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Condition, getGlobalStats, calculatePercentileBeat, getPuzzleGuessDistribution, calculatePuzzlePercentile, GlobalStats } from '@/lib/supabase';
import { getCookieConsent } from './CookieConsent';
import DiagnosisAutocomplete from './DiagnosisAutocomplete';
import { checkAnswer } from '@/lib/gameLogic';
import { MAX_GUESSES } from '@/lib/gameLogic';
import {
  getGameState,
  saveGameState,
  updateStatistics,
  updateArchiveStatistics,
  getStatistics,
  updateGuessTimeStatistics,
  type GameState,
} from '@/lib/localStorage';
import { getOrCreatePlayerHash } from '@/lib/playerIdentity';
import { submitGameResult } from '@/lib/supabase';

// Toast feedback types
type ToastType = 'correct' | 'partial' | 'incorrect' | 'copied' | null;

interface ToastConfig {
  message: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

interface GameClientProps {
  conditions: Condition[];
  dayNumber: number;
  puzzleNumber: number;
  correctAnswer: string;
  citation?: string | null;
  learnLink?: string | null;
  isArchive: boolean;
  onGameStateChange: (state: GameState) => void;
  onTypingStateChange?: (isTyping: boolean) => void;
}

// Toast configuration for different result types
const TOAST_CONFIG: Record<Exclude<ToastType, null>, ToastConfig> = {
  correct: {
    message: 'Correct!',
    bgColor: 'bg-success',
    textColor: 'text-white',
    icon: '✓',
  },
  partial: {
    message: "Close! You're on the right track",
    bgColor: 'bg-warning',
    textColor: 'text-black',
    icon: '◐',
  },
  incorrect: {
    message: 'Not quite - try again',
    bgColor: 'bg-error',
    textColor: 'text-white',
    icon: '✗',
  },
  copied: {
    message: 'Results copied to clipboard!',
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    icon: '📋',
  },
};

export default function GameClient({
  conditions,
  dayNumber,
  puzzleNumber,
  correctAnswer,
  citation,
  learnLink,
  isArchive,
  onGameStateChange,
  onTypingStateChange,
}: GameClientProps) {
  // Lazy initialize game state from localStorage
  const [gameState, setGameState] = useState<GameState | null>(() => {
    const savedState = getGameState(dayNumber);
    if (savedState) {
      return savedState;
    }
    // Initialize new game state
    return {
      dayNumber,
      guesses: [],
      guessResults: [],
      revealedHints: 0,
      isComplete: false,
      isWon: false,
      hasPartialMatch: false,
    };
  });
  const [showModal, setShowModal] = useState(() => gameState?.isComplete || false);
  const [toast, setToast] = useState<ToastType>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Always start false to avoid SSR/client hydration mismatch, then check localStorage after mount
  const [consentGiven, setConsentGiven] = useState(false);
  const consentFallbackFired = useRef(false);

  // Check consent after hydration, then poll for changes
  useEffect(() => {
    // Immediate check after mount (avoids hydration mismatch since useState always starts false)
    if (getCookieConsent() === 'accepted') {
      setConsentGiven(true);
      return;
    }
    // Poll for consent changes (banner dismissal)
    const interval = setInterval(() => {
      if (getCookieConsent() === 'accepted') {
        setConsentGiven(true);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [consentGiven]);

  // Separate one-shot fallback that survives effect re-runs (strict mode, hydration)
  useEffect(() => {
    if (consentGiven || consentFallbackFired.current) return;
    const fallbackTimeout = setTimeout(() => {
      consentFallbackFired.current = true;
      setConsentGiven(true);
    }, 5000);
    return () => clearTimeout(fallbackTimeout);
  }, [consentGiven]);
  const guessStartTime = useRef<number>(0);
  const gameStartTime = useRef<number>(0);
  const playerHashRef = useRef<string | null>(null);

  // Initialize timing refs and player hash on mount
  useEffect(() => {
    const now = Date.now();
    guessStartTime.current = now;
    gameStartTime.current = now;

    getOrCreatePlayerHash().then((hash) => {
      playerHashRef.current = hash;
    });
  }, []);

  // Notify parent of initial game state
  useEffect(() => {
    Promise.resolve().then(() => {
      if (gameState) {
        onGameStateChange(gameState);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount, intentionally excluding gameState/onGameStateChange

  // Clear toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Show toast notification
  const showToast = useCallback((type: ToastType) => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast(type);

    // Auto-dismiss after 2 seconds (longer for correct to let celebration sink in)
    const duration = type === 'correct' ? 2500 : 2000;
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  const handleSubmit = useCallback(
    (diagnosis: string) => {
      if (!gameState || gameState.isComplete) return;

      // Track guess time (time since last guess or game start)
      const guessTimeSeconds = (Date.now() - guessStartTime.current) / 1000;
      updateGuessTimeStatistics(guessTimeSeconds);
      // Reset timer for next guess
      guessStartTime.current = Date.now();

      const result = checkAnswer(diagnosis, correctAnswer);
      const newGuesses = [...gameState.guesses, diagnosis];
      const newGuessResults = [...gameState.guessResults, result];

      // Show toast feedback for the guess result
      showToast(result);

      let newState: GameState;

      if (result === 'correct') {
        // Win condition
        newState = {
          ...gameState,
          guesses: newGuesses,
          guessResults: newGuessResults,
          isComplete: true,
          isWon: true,
        };
        if (isArchive) {
          updateArchiveStatistics(true, newGuesses.length);
        } else {
          updateStatistics(true, newGuesses.length, dayNumber);
        }
        // Submit to global analytics
        const totalSolveTime = (Date.now() - gameStartTime.current) / 1000;
        submitGameResult({
          puzzle_number: puzzleNumber,
          won: true,
          guess_count: newGuesses.length,
          hints_used: gameState.revealedHints,
          guesses: newGuesses,
          player_hash: playerHashRef.current,
          solve_time_seconds: totalSolveTime,
        }).then((submitResult) => {
          // Save the first solver status to localStorage (data still tracked, UI hidden)
          const updatedState: GameState = {
            ...newState,
            isFirstSolver: submitResult.isFirstSolver,
          };
          saveGameState(updatedState);
          setGameState(updatedState);
        });
        setShowModal(true);
      } else if (newGuesses.length >= MAX_GUESSES) {
        // Loss condition
        newState = {
          ...gameState,
          guesses: newGuesses,
          guessResults: newGuessResults,
          isComplete: true,
          isWon: false,
        };
        if (isArchive) {
          updateArchiveStatistics(false, newGuesses.length);
        } else {
          updateStatistics(false, newGuesses.length, dayNumber);
        }
        // Submit to global analytics
        submitGameResult({
          puzzle_number: puzzleNumber,
          won: false,
          guess_count: newGuesses.length,
          hints_used: gameState.revealedHints,
          guesses: newGuesses,
          player_hash: playerHashRef.current,
        });
        setShowModal(true);
      } else {
        // Incorrect or partial - reveal next hint
        const isPartial = result === 'partial';
        newState = {
          ...gameState,
          guesses: newGuesses,
          guessResults: newGuessResults,
          revealedHints: gameState.revealedHints + 1,
          hasPartialMatch: gameState.hasPartialMatch || isPartial,
        };
      }

      setGameState(newState);
      saveGameState(newState);
      onGameStateChange(newState);
    },
    [gameState, correctAnswer, onGameStateChange, isArchive, dayNumber, puzzleNumber, showToast]
  );

  const handleDropdownStateChange = useCallback((isOpen: boolean) => {
    onTypingStateChange?.(isOpen);
  }, [onTypingStateChange]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  if (!gameState) return null;

  return (
    <>
      {/* Toast notification for guess feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 left-1/2 z-[200] px-6 py-3 rounded-lg shadow-lg
            ${TOAST_CONFIG[toast].bgColor} ${TOAST_CONFIG[toast].textColor}
            animate-toast-in
            font-baloo-2 font-semibold text-lg flex items-center gap-2`}
        >
          <span className="text-xl">{TOAST_CONFIG[toast].icon}</span>
          {TOAST_CONFIG[toast].message}
        </div>
      )}

      {/* Desktop layout - normal flow */}
      <div className="hidden sm:block w-full pb-[220px]">
        {gameState.isComplete ? (
          <div className="text-center text-white text-xl font-baloo-2">
            {gameState.isWon ? (
              <>
                <p>Congratulations! The answer was:</p>
                <p className="text-2xl mt-1">{correctAnswer}</p>
              </>
            ) : (
              <>
                <p>Game Over. The answer was:</p>
                <p className="text-2xl mt-1">{correctAnswer}</p>
              </>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-accent to-accent-light hover:from-accent hover:to-accent text-black font-bold font-baloo-2 rounded-lg transition-all shadow-lg"
            >
              View Results
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 text-white/80 text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              <p className="text-lg tracking-wide font-baloo-2">
                Guess {gameState.guesses.length + 1} / {MAX_GUESSES}
              </p>
            </div>
            <DiagnosisAutocomplete
              conditions={conditions}
              onSubmit={handleSubmit}
              onDropdownStateChange={handleDropdownStateChange}
              previousGuesses={gameState.guesses}
              disabled={!consentGiven}
            />
          </>
        )}
      </div>

      {/* Mobile layout - input in natural flow */}
      <div className="sm:hidden w-full">
        {gameState.isComplete ? (
          <div className="text-center text-white text-xl font-baloo-2">
            {gameState.isWon ? (
              <>
                <p>Congratulations! The answer was:</p>
                <p className="text-2xl mt-1">{correctAnswer}</p>
              </>
            ) : (
              <>
                <p>Game Over. The answer was:</p>
                <p className="text-2xl mt-1">{correctAnswer}</p>
              </>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-accent to-accent-light hover:from-accent hover:to-accent text-black font-bold font-baloo-2 rounded-lg transition-all shadow-lg"
            >
              View Results
            </button>
          </div>
        ) : (
          <>
            {/* Guesses counter - in flow */}
            <div className="mb-3 text-white/80 text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              <p className="text-lg tracking-wide font-baloo-2">
                Guess {gameState.guesses.length + 1} / {MAX_GUESSES}
              </p>
            </div>
            {/* Input sticky at bottom on mobile - positions directly above keyboard */}
            <div className="fixed bottom-0 left-0 right-0 px-4 pb-[env(safe-area-inset-bottom,0px)] bg-gradient-to-t from-page-bg-dark via-page-bg-dark/80 to-transparent pt-4 z-40">
              <DiagnosisAutocomplete
                conditions={conditions}
                onSubmit={handleSubmit}
                onDropdownStateChange={handleDropdownStateChange}
                previousGuesses={gameState.guesses}
                isMobile={true}
                disabled={!consentGiven}
              />
            </div>
            {/* Spacer to prevent content from being hidden behind fixed input */}
            <div className="h-20"></div>
          </>
        )}
      </div>

      {showModal && (
        <ResultsModal
          isWon={gameState.isWon}
          guessCount={gameState.guesses.length}
          guesses={gameState.guesses}
          correctAnswer={correctAnswer}
          citation={citation}
          learnLink={learnLink}
          dayNumber={dayNumber}
          puzzleNumber={puzzleNumber}
          isArchive={isArchive}
          onClose={handleCloseModal}
          onCopied={() => showToast('copied')}
        />
      )}
    </>
  );
}

interface ResultsModalProps {
  isWon: boolean;
  guessCount: number;
  guesses: string[];
  correctAnswer: string;
  citation?: string | null;
  learnLink?: string | null;
  dayNumber: number;
  puzzleNumber: number;
  isArchive: boolean;
  onClose: () => void;
  onCopied: () => void;
}

function ResultsModal({
  isWon,
  guessCount,
  guesses,
  correctAnswer,
  citation,
  learnLink,
  dayNumber,
  puzzleNumber,
  isArchive,
  onClose,
  onCopied,
}: ResultsModalProps) {
  // Lock background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const stats = getStatistics();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [percentileBeat, setPercentileBeat] = useState<number | null>(null);

  // Fetch puzzle-specific guess distribution and calculate percentile for this puzzle
  useEffect(() => {
    // Fetch global stats for the summary row (win rate, avg guess, avg time)
    getGlobalStats().then((global) => {
      setGlobalStats(global);
    });

    // Percentile: compare user's guess count on THIS puzzle vs this puzzle's distribution
    if (isWon) {
      getPuzzleGuessDistribution(puzzleNumber).then((result) => {
        if (result) {
          const percentile = calculatePuzzlePercentile(guessCount, result.distribution, result.totalAttempts);
          setPercentileBeat(percentile);
        }
      });
    }
  }, [puzzleNumber, guessCount, isWon]);

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

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const handleShare = useCallback(() => {
    // Generate emoji grid with all 6 boxes
    const emojiGrid = guesses
      .map((guess) => {
        const result = checkAnswer(guess, correctAnswer);
        if (result === 'correct') return '🟩';
        if (result === 'partial') return '🟨';
        return '🟥'; // Red for incorrect guesses
      })
      .join('');

    // Fill remaining boxes with black (unused clues)
    const unusedBoxes = '⬛'.repeat(MAX_GUESSES - guesses.length);
    const fullGrid = emojiGrid + unusedBoxes;

    const displayDay = dayNumber + 1;
    const prefix = isArchive ? '🩻 Radiordle Archive Day' : '🩻 Radiordle Day';
    const shareText = `${prefix} ${displayDay} ${isWon ? guessCount : 'X'}/${MAX_GUESSES}\n${fullGrid}\nhttps://radiordle.org`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareText).then(
        () => { onCopied(); },
        () => { onCopied(); }
      );
    } else {
      // Fallback for iOS Safari and browsers without Clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        onCopied();
      } catch {
        // Silent fail
      }
    }
  }, [guesses, correctAnswer, dayNumber, isWon, guessCount, isArchive, onCopied]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-backdrop-fade"
      data-testid="results-modal"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-modal-bg to-page-bg-dark rounded-lg p-4 sm:p-8 max-w-md sm:max-w-2xl w-full shadow-2xl max-h-[90vh] sm:max-h-none overflow-y-auto font-baloo-2 animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2 sm:mb-4">
          {isWon ? '🎉 Congratulations!' : '😔 Game Over'}
        </h2>

{/* First solver banner - hidden for now but data still tracked */}


        <div className="text-white text-center mb-3 sm:mb-6">
          {isWon ? (
            <>
              <p className="text-base sm:text-lg">
                You solved {isArchive ? 'Archive ' : ''}Day {dayNumber + 1} in {guessCount}{' '}
                {guessCount === 1 ? 'guess' : 'guesses'}!
              </p>
              <p className="text-base sm:text-lg mt-1 font-light">
                The correct answer was:
              </p>
              <p className="text-lg sm:text-xl font-bold text-accent">{correctAnswer}</p>
            </>
          ) : (
            <>
              <p className="text-base sm:text-lg font-light">
                The correct answer was:
              </p>
              <p className="text-lg sm:text-xl font-bold text-accent">{correctAnswer}</p>
            </>
          )}
          {citation && (
            <p className="text-xs mt-2 italic text-white/70">
              {citation}
            </p>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-2 sm:mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-black text-center mb-1">Statistics</h3>
          {isArchive && (
            <p className="text-xs italic text-gray-500 text-center mb-2">Archive puzzles are not included in your statistics.</p>
          )}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">{stats.gamesPlayed}</p>
              <p className="text-xs text-gray-600">Played</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">
                {stats.gamesPlayed > 0
                  ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                  : 0}
              </p>
              <p className="text-xs text-gray-600">Win %</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">{stats.currentStreak}</p>
              <p className="text-xs text-gray-600">Streak</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-success leading-tight">{stats.maxStreak}</p>
              <p className="text-xs text-gray-600">Max Streak</p>
            </div>
          </div>
        </div>

        {/* Guess Distribution + How You Compare: stacked on mobile, side-by-side on desktop */}
        <div className={`mb-3 sm:mb-4${stats.gamesWon > 0 ? ' sm:grid sm:grid-cols-2 sm:gap-4' : ''}`}>
          {/* Guess Distribution */}
          <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-0">
            <h3 className="text-lg sm:text-xl font-bold text-black text-center mb-2 sm:mb-3">
              Guess Distribution
            </h3>
            <div className="space-y-1 sm:space-y-2">
              {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map((guessNum) => {
                const count = stats.guessDistribution[guessNum] || 0;
                const percentage = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
                const isCurrentGuess = isWon && guessNum === guessCount;
                const barColor = count > 0 ? (isCurrentGuess ? 'bg-success' : 'bg-gray-400') : 'bg-gray-100';

                return (
                  <div key={guessNum} className="flex items-center gap-2">
                    <span className="w-4 text-sm font-medium text-gray-600">{guessNum}</span>
                    <div className="flex-1 h-5 sm:h-6 bg-gray-200 rounded overflow-hidden">
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

          {/* How You Compare — desktop only (hidden on mobile, shown after buttons there) */}
          {isWon && (
            <div className="hidden sm:block bg-surface rounded-lg p-4">
              <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-3">
                How You Compare
              </h3>
              {percentileBeat !== null ? (
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    Top {100 - percentileBeat}%
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    You beat <span className="font-semibold">{percentileBeat}%</span> of players on this puzzle
                  </p>
                </div>
              ) : globalStats === null ? (
                <p className="text-center text-gray-300 text-sm">Loading stats...</p>
              ) : (
                <p className="text-center text-gray-300 text-sm">Not enough data yet</p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-gray-300">Win Rate</p>
                  <p className="font-bold text-white">{winRate}%</p>
                </div>
                <div>
                  <p className="text-gray-300">Avg Guess #</p>
                  <p className="font-bold text-white">{userAvgGuesses > 0 ? userAvgGuesses.toFixed(1) : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-300">Avg Time</p>
                  <p className="font-bold text-white">{avgGuessTime > 0 ? `${avgGuessTime.toFixed(1)}s` : '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={`w-full px-6 py-3 bg-gradient-to-r from-accent to-accent-light hover:from-accent hover:to-accent text-black font-bold text-lg rounded-lg transition-all shadow-lg ${learnLink ? 'mb-3' : 'mb-4'}`}
        >
          Share Results
        </button>

        {/* Learn More Button */}
        {learnLink?.startsWith('http') && (
          <a
            href={learnLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-6 py-3 bg-gradient-to-r from-[#0891b2] to-[#0e7490] hover:from-[#0e7490] hover:to-[#0e7490] text-white font-bold text-lg rounded-lg transition-all shadow-lg mb-4 text-center"
          >
            Learn More
          </a>
        )}

        {/* How You Compare — mobile only (hidden on desktop, shown above in grid there) */}
        {isWon && (
          <div className="sm:hidden bg-surface rounded-lg p-3 mb-4">
            <h3 className="text-lg font-bold text-white text-center mb-3">
              How You Compare
            </h3>
            {percentileBeat !== null ? (
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">
                  Top {100 - percentileBeat}%
                </p>
                <p className="text-sm text-gray-200 mt-1">
                  You beat <span className="font-semibold">{percentileBeat}%</span> of players on this puzzle
                </p>
              </div>
            ) : globalStats === null ? (
              <p className="text-center text-gray-300 text-sm">Loading stats...</p>
            ) : (
              <p className="text-center text-gray-300 text-sm">Not enough data yet</p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-gray-300">Win Rate</p>
                <p className="font-bold text-white">{winRate}%</p>
              </div>
              <div>
                <p className="text-gray-300">Avg Guess #</p>
                <p className="font-bold text-white">{userAvgGuesses > 0 ? userAvgGuesses.toFixed(1) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-300">Avg Time</p>
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
