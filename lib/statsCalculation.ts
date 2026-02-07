export interface GameResult {
  puzzle_number: number;
  won: boolean;
  guess_count: number;
  played_at: string;
}

export interface RecoveredStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: { [key: number]: number };
  lastPlayedDay: number | null;
  gameStates: Array<{
    dayNumber: number;
    puzzleNumber: number;
    won: boolean;
    guessCount: number;
  }>;
}

/**
 * Calculates player statistics from their game history.
 * Attempts to calculate streaks based on consecutive days played.
 */
export function calculateStatsFromResults(
  results: GameResult[],
  puzzleNumToDayNum: { [key: number]: number }
): RecoveredStats {
  const stats: RecoveredStats = {
    gamesPlayed: results.length,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: {},
    lastPlayedDay: null,
    gameStates: [],
  };

  // Track days played for streak calculation
  const daysPlayed: Set<number> = new Set();
  const dayResults: { [day: number]: { won: boolean; guessCount: number; puzzleNumber: number } } = {};

  for (const result of results) {
    if (result.won) {
      stats.gamesWon++;
      stats.guessDistribution[result.guess_count] =
        (stats.guessDistribution[result.guess_count] || 0) + 1;
    }

    // Map to day number if possible
    const dayNumber = puzzleNumToDayNum[result.puzzle_number];
    if (dayNumber !== undefined) {
      daysPlayed.add(dayNumber);
      dayResults[dayNumber] = {
        won: result.won,
        guessCount: result.guess_count,
        puzzleNumber: result.puzzle_number,
      };

      if (stats.lastPlayedDay === null || dayNumber > stats.lastPlayedDay) {
        stats.lastPlayedDay = dayNumber;
      }
    }

    // Store game state info for potential restoration
    stats.gameStates.push({
      dayNumber: dayNumber ?? -1,
      puzzleNumber: result.puzzle_number,
      won: result.won,
      guessCount: result.guess_count,
    });
  }

  // Calculate streaks from day results
  if (daysPlayed.size > 0) {
    const sortedDays = Array.from(daysPlayed).sort((a, b) => a - b);

    let currentStreak = 0;
    let maxStreak = 0;
    let lastDay = -2; // Ensure first day starts a new streak

    for (const day of sortedDays) {
      const result = dayResults[day];

      if (day === lastDay + 1 && result.won) {
        // Consecutive day with a win - extend streak
        currentStreak++;
      } else if (result.won) {
        // Non-consecutive or first win - start new streak
        currentStreak = 1;
      } else {
        // Loss breaks the streak
        currentStreak = 0;
      }

      maxStreak = Math.max(maxStreak, currentStreak);
      lastDay = day;
    }

    // Check if the last played day was won to determine current streak
    if (stats.lastPlayedDay !== null) {
      const lastResult = dayResults[stats.lastPlayedDay];
      if (!lastResult?.won) {
        currentStreak = 0;
      }
    }

    stats.currentStreak = currentStreak;
    stats.maxStreak = maxStreak;
  }

  return stats;
}
