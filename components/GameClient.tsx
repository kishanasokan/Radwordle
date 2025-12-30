'use client';

import { useState, useCallback, useEffect } from 'react';
import { Condition } from '@/lib/supabase';
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

interface GameClientProps {
  conditions: Condition[];
  dayNumber: number;
  correctAnswer: string;
  isArchive: boolean;
  onGameStateChange: (state: GameState) => void;
}

export default function GameClient({
  conditions,
  dayNumber,
  correctAnswer,
  isArchive,
  onGameStateChange,
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
    [gameState, correctAnswer, onGameStateChange, isArchive, dayNumber]
  );

  const handleDropdownStateChange = useCallback((isOpen: boolean) => {
    setIsDropdownOpen(isOpen);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  if (!gameState) return null;

  return (
    <>
      <div className={`transition-all duration-300 ${isDropdownOpen ? 'pb-[450px]' : ''}`}>
        {gameState.isComplete ? (
          <div className="text-center text-white text-xl">
            {gameState.isWon ? (
              <p>Congratulations! You solved it!</p>
            ) : (
              <p>Game Over. The answer was: {correctAnswer}</p>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:from-[#f59e0b] hover:to-[#f59e0b] text-black font-bold rounded-lg transition-all shadow-lg"
            >
              View Results
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-white text-center">
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
    const shareText = `${prefix} ${displayDay} ${isWon ? guessCount : 'X'}/${MAX_GUESSES}\n\n${fullGrid}\n\nhttps://radiordle.com`;

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
        className="bg-gradient-to-b from-[#1e3a5f] to-[#0f1c2e] rounded-lg p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          {isWon ? '🎉 Congratulations!' : '😔 Game Over'}
        </h2>

        <div className="text-white text-center mb-6">
          {isWon ? (
            <p className="text-lg">
              You solved {isArchive ? 'Archive ' : ''}Day {dayNumber + 1} in {guessCount}{' '}
              {guessCount === 1 ? 'guess' : 'guesses'}!
            </p>
          ) : (
            <p className="text-lg">
              The correct answer was: <strong>{correctAnswer}</strong>
            </p>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-white bg-opacity-10 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-white text-center mb-4">Statistics</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-yellow-400">{stats.gamesPlayed}</p>
              <p className="text-sm text-gray-300">Played</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-400">
                {stats.gamesPlayed > 0
                  ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                  : 0}
              </p>
              <p className="text-sm text-gray-300">Win %</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-400">{stats.currentStreak}</p>
              <p className="text-sm text-gray-300">Current Streak</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-400">{stats.maxStreak}</p>
              <p className="text-sm text-gray-300">Max Streak</p>
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:from-[#f59e0b] hover:to-[#f59e0b] text-black font-bold text-lg rounded-lg transition-all shadow-lg mb-4"
        >
          📋 Share Results
        </button>

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
