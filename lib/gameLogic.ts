export const MAX_GUESSES = 6;

// Hardcoded epoch: January 1, 2025
const EPOCH_YEAR = 2025;
const EPOCH_MONTH = 0; // January (0-indexed)
const EPOCH_DAY = 1;
const RESET_HOUR_UTC = 5; // 5 AM UTC = midnight EST

/**
 * Returns the current day number based on UTC time with a fixed epoch.
 * - Epoch: January 1, 2025
 * - Reset time: 5 AM UTC (midnight EST)
 * - Day 0 = Jan 1, 2025
 */
export function getDayNumber(): number {
  const now = new Date();

  // Shift time back by reset hour to determine which "game day" we're in
  const adjustedTime = new Date(now.getTime() - RESET_HOUR_UTC * 60 * 60 * 1000);

  const epochDate = Date.UTC(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY);
  const todayDate = Date.UTC(
    adjustedTime.getUTCFullYear(),
    adjustedTime.getUTCMonth(),
    adjustedTime.getUTCDate()
  );

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((todayDate - epochDate) / msPerDay);
}

/**
 * Converts a day number back to its corresponding date.
 * Useful for displaying dates in the archive.
 */
export function dayNumberToDate(dayNumber: number): Date {
  const epochDate = Date.UTC(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY);
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(epochDate + dayNumber * msPerDay);
}

/**
 * Normalizes a diagnosis string for comparison by:
 * - Converting to lowercase
 * - Removing punctuation and special characters
 * - Trimming whitespace
 */
function normalizeDiagnosis(diagnosis: string): string {
  return diagnosis
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Extracts significant words from a diagnosis (excludes common medical terms)
 */
function getSignificantWords(diagnosis: string): string[] {
  const normalized = normalizeDiagnosis(diagnosis);
  const words = normalized.split(/\s+/);

  // Filter out common medical terms that shouldn't count for partial matches
  const commonTerms = new Set([
    'of', 'the', 'a', 'an', 'with', 'without', 'and', 'or',
    'disease', 'syndrome', 'disorder', 'condition', 'injury'
  ]);

  return words.filter(word => word.length > 0 && !commonTerms.has(word));
}

/**
 * Checks if a guess matches the correct answer
 * Returns: 'correct', 'partial', or 'incorrect'
 */
export function checkAnswer(guess: string, correctAnswer: string): 'correct' | 'partial' | 'incorrect' {
  const normalizedGuess = normalizeDiagnosis(guess);
  const normalizedAnswer = normalizeDiagnosis(correctAnswer);

  // Exact match
  if (normalizedGuess === normalizedAnswer) {
    return 'correct';
  }

  // Check for partial match (common significant words)
  const guessWords = getSignificantWords(guess);
  const answerWords = getSignificantWords(correctAnswer);

  // Find common words between guess and answer
  const commonWords = guessWords.filter(word => answerWords.includes(word));

  // Partial match if they share at least one significant word
  if (commonWords.length > 0) {
    return 'partial';
  }

  return 'incorrect';
}
