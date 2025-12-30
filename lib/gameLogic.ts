export const MAX_GUESSES = 5;

// Epoch: December 29, 2025 - Day 0 is the first puzzle
// Uses EST timezone (America/New_York) for consistency
const EPOCH = new Date('2025-12-29T00:00:00-05:00'); // Midnight EST

/**
 * Returns the current day number based on EST timezone.
 * Day 0 = Dec 29, 2025, Day 1 = Dec 30, 2025, etc.
 */
export function getDayNumber(): number {
  const now = new Date();

  // Get current date in EST
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const estMidnight = new Date(estDate.getFullYear(), estDate.getMonth(), estDate.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((estMidnight.getTime() - EPOCH.getTime()) / msPerDay);
}

/**
 * Converts a day number back to its corresponding date.
 */
export function dayNumberToDate(dayNumber: number): Date {
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(EPOCH.getTime() + dayNumber * msPerDay);
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
