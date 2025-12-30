export interface GameState {
  dayNumber: number;
  guesses: string[];
  guessResults: Array<'correct' | 'partial' | 'incorrect'>;
  revealedHints: number;
  isComplete: boolean;
  isWon: boolean;
  hasPartialMatch: boolean;
}

export interface Statistics {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: { [key: number]: number };
  lastPlayedDay?: number;
}

export interface ArchiveStatistics {
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: { [key: number]: number };
}

// Key prefixes
const GAME_STATE_PREFIX = 'radiordle_game_day_';
const STATISTICS_KEY = 'radiordle_statistics';
const ARCHIVE_STATISTICS_KEY = 'radiordle_archive_statistics';
const OLD_GAME_STATE_KEY = 'radiordle_game_state';

/**
 * Gets the localStorage key for a specific day's game state.
 */
function getGameStateKey(dayNumber: number): string {
  return `${GAME_STATE_PREFIX}${dayNumber}`;
}

/**
 * Migrates old single-key game state to new per-day format.
 * Called once on first access.
 */
function migrateOldGameState(): void {
  if (typeof window === 'undefined') return;

  try {
    const oldState = localStorage.getItem(OLD_GAME_STATE_KEY);
    if (!oldState) return;

    const parsed = JSON.parse(oldState);
    // Old format used puzzleNumber, but we need to map to dayNumber
    // Since we can't reliably map puzzleNumber to dayNumber, we'll just clear it
    // Users will lose their current game state but keep their statistics
    localStorage.removeItem(OLD_GAME_STATE_KEY);
    console.log('Migrated old game state format');
  } catch (error) {
    console.error('Error migrating old game state:', error);
    localStorage.removeItem(OLD_GAME_STATE_KEY);
  }
}

// Game State Management
export function getGameState(dayNumber: number): GameState | null {
  if (typeof window === 'undefined') return null;

  // Run migration on first access
  migrateOldGameState();

  try {
    const stored = localStorage.getItem(getGameStateKey(dayNumber));
    if (!stored) return null;

    const state = JSON.parse(stored) as GameState;

    // Ensure dayNumber matches
    if (state.dayNumber !== dayNumber) return null;

    // Migration: Add guessResults if it doesn't exist
    if (!state.guessResults) {
      state.guessResults = [];
    }

    return state;
  } catch (error) {
    console.error('Error reading game state:', error);
    return null;
  }
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(getGameStateKey(state.dayNumber), JSON.stringify(state));
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

/**
 * Gets completion status for a specific day (for archive browser).
 */
export function getDayStatus(dayNumber: number): 'won' | 'lost' | 'not_played' {
  const state = getGameState(dayNumber);
  if (!state || !state.isComplete) return 'not_played';
  return state.isWon ? 'won' : 'lost';
}

// Daily Statistics Management
export function getStatistics(): Statistics {
  if (typeof window === 'undefined') {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: {},
    };
  }

  try {
    const stored = localStorage.getItem(STATISTICS_KEY);
    if (!stored) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: {},
      };
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading statistics:', error);
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: {},
    };
  }
}

export function saveStatistics(stats: Statistics): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STATISTICS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving statistics:', error);
  }
}

export function updateStatistics(won: boolean, guessCount: number, dayNumber: number): void {
  const stats = getStatistics();

  stats.gamesPlayed += 1;
  stats.lastPlayedDay = dayNumber;

  if (won) {
    stats.gamesWon += 1;
    stats.currentStreak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.guessDistribution[guessCount] = (stats.guessDistribution[guessCount] || 0) + 1;
  } else {
    stats.currentStreak = 0;
  }

  saveStatistics(stats);
}

// Archive Statistics Management (separate from daily streaks)
export function getArchiveStatistics(): ArchiveStatistics {
  if (typeof window === 'undefined') {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      guessDistribution: {},
    };
  }

  try {
    const stored = localStorage.getItem(ARCHIVE_STATISTICS_KEY);
    if (!stored) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        guessDistribution: {},
      };
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading archive statistics:', error);
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      guessDistribution: {},
    };
  }
}

export function saveArchiveStatistics(stats: ArchiveStatistics): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ARCHIVE_STATISTICS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving archive statistics:', error);
  }
}

export function updateArchiveStatistics(won: boolean, guessCount: number): void {
  const stats = getArchiveStatistics();

  stats.gamesPlayed += 1;

  if (won) {
    stats.gamesWon += 1;
    stats.guessDistribution[guessCount] = (stats.guessDistribution[guessCount] || 0) + 1;
  }

  saveArchiveStatistics(stats);
}
