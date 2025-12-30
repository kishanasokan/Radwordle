'use client';

import { useState, useCallback, useEffect } from 'react';
import { Condition, getGlobalStats, calculatePercentileBeat, GlobalStats } from '@/lib/supabase';
import DiagnosisAutocomplete from './DiagnosisAutocomplete';
import { checkAnswer } from '@/lib/gameLogic';
import { MAX_GUESSES } from '@/lib/gameLogic';
import {
  getGameState,
  saveGameState,
  updateStatistics,
  updateArchiveStatistics,
  getStatistics,
  type GameState,
} from '@/lib/localStorage';
import { submitGameResult } from '@/lib/supabase';

interface GameClientProps {
  conditions: Condition[];
  dayNumber: number;
  puzzleNumber: number;
  correctAnswer: string;
  isArchive: boolean;
  onGameStateChange: (state: GameState) => void;
  onTypingStateChange?: (isTyping: boolean) => void;
}

export default function GameClient({
  conditions,
  dayNumber,
  puzzleNumber,
  correctAnswer,
  isArchive,
  onGameStateChange,
  onTypingStateChange,
}: GameClientProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Initialize game state from localStorage
  useEffect(() => {
    const savedState = getGameState(dayNumber);

    if (savedState) {
      setGameState(savedState);
      onGameStateChange(savedState);

      // Show modal if game is already complete
      if (savedState.isComplete) {
        setShowModal(true);
      }
    } else {
      // Initialize new game state
      const newState: GameState = {
        dayNumber,
        guesses: [],
        guessResults: [],
        revealedHints: 0,
        isComplete: false,
        isWon: false,
        hasPartialMatch: false,
      };
      setGameState(newState);
      onGameStateChange(newState);
    }
  }, [dayNumber, onGameStateChange]);

  const handleSubmit = useCallback(
    (diagnosis: string) => {
      if (!gameState || gameState.isComplete) return;

      const result = checkAnswer(diagnosis, correctAnswer);
      const newGuesses = [...gameState.guesses, diagnosis];
      const newGuessResults = [...gameState.guessResults, result];

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
        submitGameResult({
          puzzle_number: puzzleNumber,
          won: true,
          guess_count: newGuesses.length,
          hints_used: gameState.revealedHints,
          guesses: newGuesses,
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
    [gameState, correctAnswer, onGameStateChange, isArchive, dayNumber, puzzleNumber]
  );

  const handleDropdownStateChange = useCallback((isOpen: boolean) => {
    setIsDropdownOpen(isOpen);
    onTypingStateChange?.(isOpen);
  }, [onTypingStateChange]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  if (!gameState) return null;

  return (
    <>
      {/* Desktop layout - normal flow */}
      <div className={`hidden sm:block w-full transition-all duration-300 ${isDropdownOpen ? 'pb-[200px]' : ''}`}>
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
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:from-[#f59e0b] hover:to-[#f59e0b] text-black font-bold font-baloo-2 rounded-lg transition-all shadow-lg"
            >
              View Results
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-white text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              <p className="text-[1.237rem] font-baloo-2">
                Guesses: {gameState.guesses.length} / {MAX_GUESSES}
              </p>
            </div>
            <DiagnosisAutocomplete
              conditions={conditions}
              onSubmit={handleSubmit}
              onDropdownStateChange={handleDropdownStateChange}
              previousGuesses={gameState.guesses}
            />
          </>
        )}
      </div>

      {/* Mobile layout - fixed input at bottom */}
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
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:from-[#f59e0b] hover:to-[#f59e0b] text-black font-bold font-baloo-2 rounded-lg transition-all shadow-lg"
            >
              View Results
            </button>
          </div>
        ) : (
          <>
            {/* Guesses counter - in flow */}
            <div className="mb-4 text-white text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              <p className="text-[1.237rem] font-baloo-2">
                Guesses: {gameState.guesses.length} / {MAX_GUESSES}
              </p>
            </div>
            {/* Spacer for fixed input area */}
            <div className="h-[140px]"></div>
            {/* Fixed input area at bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f1c2e] via-[#1a2e5a] to-transparent pt-6 pb-4 px-4 z-40">
              <DiagnosisAutocomplete
                conditions={conditions}
                onSubmit={handleSubmit}
                onDropdownStateChange={handleDropdownStateChange}
                previousGuesses={gameState.guesses}
                isMobile={true}
              />
            </div>
          </>
        )}
      </div>

      {showModal && (
        <ResultsModal
          isWon={gameState.isWon}
          guessCount={gameState.guesses.length}
          guesses={gameState.guesses}
          correctAnswer={correctAnswer}
          dayNumber={dayNumber}
          isArchive={isArchive}
          onClose={handleCloseModal}
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
  dayNumber: number;
  isArchive: boolean;
  onClose: () => void;
}

function ResultsModal({
  isWon,
  guessCount,
  guesses,
  correctAnswer,
  dayNumber,
  isArchive,
  onClose,
}: ResultsModalProps) {
  const stats = getStatistics();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [percentileBeat, setPercentileBeat] = useState<number | null>(null);

  // Fetch global stats when modal opens
  useEffect(() => {
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
  }, [stats.guessDistribution]);

  // Find the max value in guess distribution for scaling bars
  const maxDistribution = Math.max(
    ...Object.values(stats.guessDistribution),
    1 // Prevent division by zero
  );

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
    const shareText = `${prefix} ${displayDay} ${isWon ? guessCount : 'X'}/${MAX_GUESSES}\n\n${fullGrid}\n\nhttps://radiordle.org`;

    navigator.clipboard.writeText(shareText).then(
      () => {
        alert('Results copied to clipboard!');
      },
      () => {
        alert('Failed to copy results.');
      }
    );
  }, [guesses, correctAnswer, dayNumber, isWon, guessCount, isArchive]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-[#1e3a5f] to-[#0f1c2e] rounded-lg p-4 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto font-baloo-2"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4">
          {isWon ? '🎉 Congratulations!' : '😔 Game Over'}
        </h2>

        <div className="text-white text-center mb-6">
          {isWon ? (
            <>
              <p className="text-base sm:text-lg">
                You solved {isArchive ? 'Archive ' : ''}Day {dayNumber + 1} in {guessCount}{' '}
                {guessCount === 1 ? 'guess' : 'guesses'}!
              </p>
              <p className="text-base sm:text-lg mt-1 font-light">
                The correct answer was: {correctAnswer}
              </p>
            </>
          ) : (
            <p className="text-base sm:text-lg font-light">
              The correct answer was: {correctAnswer}
            </p>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-black text-center mb-2">Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#407763] leading-tight">{stats.gamesPlayed}</p>
              <p className="text-xs text-gray-600">Played</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#407763] leading-tight">
                {stats.gamesPlayed > 0
                  ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                  : 0}
              </p>
              <p className="text-xs text-gray-600">Win %</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#407763] leading-tight">{stats.currentStreak}</p>
              <p className="text-xs text-gray-600">Current Streak</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#407763] leading-tight">{stats.maxStreak}</p>
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
              const isCurrentGuess = isWon && guessNum === guessCount;
              const barColor = count > 0 ? (isCurrentGuess ? 'bg-[#407763]' : 'bg-gray-400') : 'bg-gray-100';

              return (
                <div key={guessNum} className="flex items-center gap-2">
                  <span className="w-4 text-sm font-medium text-gray-600">{guessNum}</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded flex items-center justify-end px-2 transition-all duration-300`}
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

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:from-[#f59e0b] hover:to-[#f59e0b] text-black font-bold text-lg rounded-lg transition-all shadow-lg mb-6"
        >
          Share Results
        </button>

        {/* Global Comparison */}
        {stats.gamesWon > 0 && (
          <div className="bg-gradient-to-r from-blue-500 from-10% to-indigo-600 to-90% bg-opacity-20 rounded-lg p-4 sm:p-6 mb-6">
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
