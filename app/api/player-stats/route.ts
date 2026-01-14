import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window per IP

// Simple in-memory rate limiting (resets on server restart)
// For production, consider using Redis or a database
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + 'radiordle-stats-salt').digest('hex').slice(0, 16);
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const hashedIP = hashIP(ip);
  const now = Date.now();
  const entry = rateLimitMap.get(hashedIP);

  // Clean up expired entries periodically (simple garbage collection)
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    // Start new window
    rateLimitMap.set(hashedIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

interface GameResult {
  puzzle_number: number;
  won: boolean;
  guess_count: number;
  played_at: string;
}

interface RecoveredStats {
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
 * GET /api/player-stats?hash=xxx
 *
 * Retrieves a player's statistics calculated from their game_results history.
 * Used to recover stats when localStorage has been cleared but player_hash
 * was preserved in cookie/IndexedDB.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const playerHash = searchParams.get('hash');

    if (!playerHash) {
      return NextResponse.json(
        { error: 'Player hash is required' },
        { status: 400 }
      );
    }

    // Validate hash format (basic check to prevent injection)
    if (!/^[a-z0-9-]+$/i.test(playerHash) || playerHash.length > 50) {
      return NextResponse.json(
        { error: 'Invalid player hash format' },
        { status: 400 }
      );
    }

    // Fetch all game results for this player, ordered by played_at
    const { data: results, error } = await supabase
      .from('game_results')
      .select('puzzle_number, won, guess_count, played_at')
      .eq('player_hash', playerHash)
      .order('played_at', { ascending: true });

    if (error) {
      console.error('Error fetching player stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch player stats' },
        { status: 500 }
      );
    }

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: 'No game history found for this player' },
        { status: 404 }
      );
    }

    // We need to map puzzle_number to day_number via puzzle_schedule
    // Fetch all schedule entries
    const { data: schedules, error: scheduleError } = await supabase
      .from('puzzle_schedule')
      .select('day_number, puzzle_id');

    if (scheduleError) {
      console.error('Error fetching puzzle schedule:', scheduleError);
    }

    // Fetch puzzles to map puzzle_id to puzzle_number
    const { data: puzzles, error: puzzleError } = await supabase
      .from('puzzles')
      .select('id, puzzle_number');

    if (puzzleError) {
      console.error('Error fetching puzzles:', puzzleError);
    }

    // Build puzzle_number -> day_number mapping
    const puzzleNumToDayNum: { [key: number]: number } = {};
    if (schedules && puzzles) {
      const puzzleIdToNum: { [key: string]: number } = {};
      for (const p of puzzles) {
        puzzleIdToNum[p.id] = p.puzzle_number;
      }
      for (const s of schedules) {
        if (s.puzzle_id && puzzleIdToNum[s.puzzle_id] !== undefined) {
          puzzleNumToDayNum[puzzleIdToNum[s.puzzle_id]] = s.day_number;
        }
      }
    }

    // Calculate statistics from game results
    const stats = calculateStatsFromResults(results as GameResult[], puzzleNumToDayNum);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Player stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculates player statistics from their game history.
 * Attempts to calculate streaks based on consecutive days played.
 */
function calculateStatsFromResults(
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
