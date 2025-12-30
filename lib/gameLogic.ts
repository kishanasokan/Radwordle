export const MAX_GUESSES = 5;

// Epoch: December 29, 2025 - Day 0 is the first puzzle
// Uses EST timezone (America/New_York) for consistency
const EPOCH = new Date('2025-12-29T00:00:00-05:00'); // Midnight EST

/**
 * Returns the current day number based on America/New_York timezone.
 * Day 0 = Dec 29, 2025, Day 1 = Dec 30, 2025, etc.
 * Handles both EST (UTC-5) and EDT (UTC-4) automatically.
 */
export function getDayNumber(): number {
  const now = new Date();

  // Get current date in America/New_York timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Returns YYYY-MM-DD format
  const [year, month, day] = formatter.format(now).split('-').map(Number);

  const msPerDay = 24 * 60 * 60 * 1000;

  // Calculate day difference using UTC dates (avoids timezone issues)
  const todayDays = Math.floor(Date.UTC(year, month - 1, day) / msPerDay);
  const epochDays = Math.floor(Date.UTC(2025, 11, 29) / msPerDay); // Dec 29, 2025

  return todayDays - epochDays;
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

const MIN_PREFIX_LENGTH = 5;

/**
 * Checks if two words share a common prefix of at least MIN_PREFIX_LENGTH characters.
 * Used to match related medical terms like "esophagus" and "esophageal".
 */
function sharesPrefix(word1: string, word2: string): boolean {
  if (word1.length < MIN_PREFIX_LENGTH || word2.length < MIN_PREFIX_LENGTH) {
    return false;
  }
  return word1.slice(0, MIN_PREFIX_LENGTH) === word2.slice(0, MIN_PREFIX_LENGTH);
}

/**
 * Checks if any word from the guess shares a prefix with any word from the answer.
 */
function hasPrefixMatch(guessWords: string[], answerWords: string[]): boolean {
  for (const guessWord of guessWords) {
    for (const answerWord of answerWords) {
      if (sharesPrefix(guessWord, answerWord)) {
        return true;
      }
    }
  }
  return false;
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

  // Find common words between guess and answer (exact word match)
  const commonWords = guessWords.filter(word => answerWords.includes(word));

  // Partial match if they share at least one significant word
  if (commonWords.length > 0) {
    return 'partial';
  }

  // Check for prefix match (e.g., "esophagus" matches "esophageal")
  if (hasPrefixMatch(guessWords, answerWords)) {
    return 'partial';
  }

  return 'incorrect';
}
