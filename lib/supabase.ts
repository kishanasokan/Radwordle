import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. Please create a .env.local file with your Supabase credentials. See README.md for instructions.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Please create a .env.local file with your Supabase credentials. See README.md for instructions.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Puzzle {
  id: string;
  puzzle_number: number;
  image_url: string;
  answer: string;
  difficulty: string;
  is_active: boolean;
  status: 'active' | 'retired' | 'draft';
  last_shown_day: number;
  hint_1: string | null;
  hint_2: string | null;
  hint_3: string | null;
  hint_4: string | null;
  citation?: string | null;
  learn_link?: string | null;
  annotated_image_url?: string | null;
  created_at?: string;
}

export interface PuzzleSchedule {
  id: string;
  day_number: number;
  puzzle_id: string | null;
  is_manual: boolean;
  created_at?: string;
}

export interface Hint {
  id: string;
  puzzle_id: string;
  hint_order: number;
  content_type: string;
  hint_text: string | null;
  image_url: string | null;
  image_caption: string | null;
  created_at?: string;
}

export interface Condition {
  id: string;
  name: string;
  category: string;
  aliases: string[] | null;
  created_at?: string;
}

export async function getTotalPuzzleCount(): Promise<number> {
  const { count, error } = await supabase
    .from('puzzles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error getting puzzle count:', error);
    throw error;
  }

  return count || 0;
}

export async function getPuzzleByNumber(puzzleNumber: number): Promise<Puzzle> {
  const { data, error } = await supabase
    .from('puzzles')
    .select('*')
    .eq('puzzle_number', puzzleNumber)
    .single();

  if (error) {
    console.error('Error getting puzzle:', error);
    throw error;
  }

  return data;
}

export function getHintsFromPuzzle(puzzle: Puzzle): Hint[] {
  const hints: Hint[] = [];

  if (puzzle.hint_1) {
    hints.push({
      id: `${puzzle.id}-hint-1`,
      puzzle_id: puzzle.id,
      hint_order: 1,
      content_type: 'text',
      hint_text: puzzle.hint_1,
      image_url: null,
      image_caption: null,
    });
  }
  if (puzzle.hint_2) {
    hints.push({
      id: `${puzzle.id}-hint-2`,
      puzzle_id: puzzle.id,
      hint_order: 2,
      content_type: 'text',
      hint_text: puzzle.hint_2,
      image_url: null,
      image_caption: null,
    });
  }
  if (puzzle.hint_3) {
    hints.push({
      id: `${puzzle.id}-hint-3`,
      puzzle_id: puzzle.id,
      hint_order: 3,
      content_type: 'text',
      hint_text: puzzle.hint_3,
      image_url: null,
      image_caption: null,
    });
  }
  if (puzzle.hint_4) {
    hints.push({
      id: `${puzzle.id}-hint-4`,
      puzzle_id: puzzle.id,
      hint_order: 4,
      content_type: 'text',
      hint_text: puzzle.hint_4,
      image_url: null,
      image_caption: null,
    });
  }

  return hints;
}

export async function getAllConditions(): Promise<Condition[]> {
  const { data, error } = await supabase
    .from('conditions')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error getting conditions:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// Puzzle Scheduling Functions
// ============================================

import { getDayNumber } from './gameLogic';

/**
 * Fetches the scheduled puzzle for a specific day number.
 * Returns null if no schedule entry exists for that day.
 */
export async function getScheduledPuzzle(dayNumber: number): Promise<Puzzle | null> {
  const { data, error } = await supabase
    .from('puzzle_schedule')
    .select('puzzle_id')
    .eq('day_number', dayNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - schedule doesn't exist for this day
      return null;
    }
    console.error('Error getting scheduled puzzle:', error);
    throw error;
  }

  if (!data?.puzzle_id) {
    return null;
  }

  // Fetch the actual puzzle
  const { data: puzzle, error: puzzleError } = await supabase
    .from('puzzles')
    .select('*')
    .eq('id', data.puzzle_id)
    .single();

  if (puzzleError) {
    console.error('Error getting puzzle by id:', puzzleError);
    throw puzzleError;
  }

  return puzzle;
}

/**
 * Picks the next puzzle to schedule using the selection algorithm:
 * 1. Never-shown puzzles first (last_shown_day = -1), sorted by puzzle_number
 * 2. Then previously-shown puzzles, sorted by last_shown_day ASC (least recent first)
 * 3. Only considers puzzles with status = 'active'
 */
export async function getNextPuzzleToSchedule(): Promise<Puzzle> {
  // First, try to get a never-shown puzzle
  const { data: neverShown, error: neverShownError } = await supabase
    .from('puzzles')
    .select('*')
    .eq('status', 'active')
    .eq('last_shown_day', -1)
    .order('puzzle_number', { ascending: true })
    .limit(1)
    .single();

  if (neverShown && !neverShownError) {
    return neverShown;
  }

  // If no never-shown puzzles, get the least recently shown
  const { data: leastRecent, error: leastRecentError } = await supabase
    .from('puzzles')
    .select('*')
    .eq('status', 'active')
    .order('last_shown_day', { ascending: true })
    .limit(1)
    .single();

  if (leastRecentError) {
    console.error('Error getting next puzzle to schedule:', leastRecentError);
    throw leastRecentError;
  }

  return leastRecent;
}

/**
 * Creates a schedule entry for a specific day.
 */
export async function createScheduleEntry(
  dayNumber: number,
  puzzleId: string,
  isManual: boolean = false
): Promise<void> {
  const { error } = await supabase.from('puzzle_schedule').insert({
    day_number: dayNumber,
    puzzle_id: puzzleId,
    is_manual: isManual,
  });

  if (error) {
    console.error('Error creating schedule entry:', error);
    throw error;
  }
}

/**
 * Updates the last_shown_day for a puzzle after scheduling.
 */
export async function updatePuzzleLastShown(puzzleId: string, dayNumber: number): Promise<void> {
  const { error } = await supabase
    .from('puzzles')
    .update({ last_shown_day: dayNumber })
    .eq('id', puzzleId);

  if (error) {
    console.error('Error updating puzzle last_shown_day:', error);
    throw error;
  }
}

/**
 * Main entry point: Gets the puzzle for a specific day.
 * - If schedule exists, returns that puzzle
 * - If no schedule, generates one (only saves to DB if dayNumber <= today)
 */
export async function getPuzzleForDay(dayNumber: number): Promise<Puzzle> {
  // 1. Check if schedule exists
  const scheduled = await getScheduledPuzzle(dayNumber);
  if (scheduled) {
    return scheduled;
  }

  // 2. Pick next puzzle using selection algorithm
  const puzzle = await getNextPuzzleToSchedule();

  // 3. Only save to database if today or past (not future dev testing)
  const realToday = getDayNumber();
  if (dayNumber <= realToday) {
    await createScheduleEntry(dayNumber, puzzle.id);
    await updatePuzzleLastShown(puzzle.id, dayNumber);
  }

  return puzzle;
}

/**
 * Convenience function: Gets today's puzzle.
 */
export async function getTodaysPuzzle(): Promise<Puzzle> {
  const dayNumber = getDayNumber();
  return getPuzzleForDay(dayNumber);
}

// ============================================
// Game Results Functions
// ============================================

export interface GameResultInput {
  puzzle_number: number;
  won: boolean;
  guess_count: number;
  hints_used: number;
  guesses: string[];
  player_hash?: string | null;
  solve_time_seconds?: number;
}

export interface GameResultOutput {
  isFirstSolver: boolean;
}

/**
 * Submits a game result to the database.
 * Called when a game ends (win or loss).
 * Returns whether this is the first person to solve this puzzle.
 */
export async function submitGameResult(result: GameResultInput): Promise<GameResultOutput> {
  // Check if anyone has already solved this puzzle (won = true)
  const { count, error: countError } = await supabase
    .from('game_results')
    .select('*', { count: 'exact', head: true })
    .eq('puzzle_number', result.puzzle_number)
    .eq('won', true);

  const isFirstSolver = result.won && !countError && count === 0;

  // Insert the new game result
  const { error } = await supabase
    .from('game_results')
    .insert({
      puzzle_number: result.puzzle_number,
      won: result.won,
      guess_count: result.guess_count,
      hints_used: result.hints_used,
      guesses: result.guesses,
      player_hash: result.player_hash,
      is_first_solver: isFirstSolver,
      time_to_complete_seconds: result.solve_time_seconds ? Math.round(result.solve_time_seconds) : null,
    });

  if (error) {
    console.error('Error submitting game result:', JSON.stringify(error, null, 2));
    console.error('Insert payload was:', {
      puzzle_number: result.puzzle_number,
      won: result.won,
      guess_count: result.guess_count,
      hints_used: result.hints_used,
      guesses: result.guesses,
      player_hash: result.player_hash,
      is_first_solver: isFirstSolver,
      time_to_complete_seconds: result.solve_time_seconds,
    });
    // Don't throw - we don't want to break the game if analytics fail
  }

  return {
    isFirstSolver,
  };
}

export interface GlobalStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  avgGuesses: number;
  guessDistribution: { [key: number]: number };
}

/**
 * Fetches global statistics from all players.
 * Used to compare individual performance against the community.
 */
export async function getGlobalStats(): Promise<GlobalStats | null> {
  try {
    // Get overall stats
    const { data: overall, error: overallError } = await supabase
      .from('game_stats_overall')
      .select('*')
      .single();

    if (overallError) {
      console.error('Error fetching global stats:', overallError);
      return null;
    }

    // Get guess distribution
    const { data: distribution, error: distError } = await supabase
      .from('game_stats_guess_distribution')
      .select('*');

    if (distError) {
      console.error('Error fetching guess distribution:', distError);
      return null;
    }

    // Convert distribution array to object
    const guessDistribution: { [key: number]: number } = {};
    distribution?.forEach((row: { guess_count: number; wins: number }) => {
      guessDistribution[row.guess_count] = row.wins;
    });

    return {
      totalGames: overall?.total_games || 0,
      totalWins: overall?.total_wins || 0,
      winRate: Number(overall?.win_rate) || 0,
      avgGuesses: Number(overall?.avg_guesses) || 0,
      guessDistribution,
    };
  } catch (error) {
    console.error('Error fetching global stats:', error);
    return null;
  }
}

/**
 * Calculates what percentage of players you beat based on your average guess count.
 * If you win in fewer guesses, you beat more players.
 */
export function calculatePercentileBeat(
  userGuessDistribution: { [key: number]: number },
  globalGuessDistribution: { [key: number]: number }
): number | null {
  // Calculate user's total wins and weighted average
  let userTotalWins = 0;
  let userWeightedSum = 0;
  for (const [guess, count] of Object.entries(userGuessDistribution)) {
    userTotalWins += count;
    userWeightedSum += Number(guess) * count;
  }

  if (userTotalWins === 0) return null;

  const userAvgGuesses = userWeightedSum / userTotalWins;

  // Calculate global total wins
  let globalTotalWins = 0;
  for (const count of Object.values(globalGuessDistribution)) {
    globalTotalWins += count;
  }

  if (globalTotalWins === 0) return null;

  // Count how many global wins took MORE guesses than user's average
  let worseThanUser = 0;
  for (const [guess, count] of Object.entries(globalGuessDistribution)) {
    if (Number(guess) > userAvgGuesses) {
      worseThanUser += count;
    }
  }

  // Percentage of players the user beat
  return Math.round((worseThanUser / globalTotalWins) * 100);
}

/**
 * Fetches the guess distribution for a specific puzzle from the database,
 * along with the total number of attempts (including losses).
 */
export async function getPuzzleGuessDistribution(
  puzzleNumber: number
): Promise<{ distribution: { [key: number]: number }; totalAttempts: number } | null> {
  try {
    const [distResult, statsResult] = await Promise.all([
      supabase
        .from('game_stats_guess_distribution_by_puzzle')
        .select('guess_count, wins')
        .eq('puzzle_number', puzzleNumber),
      supabase
        .from('game_stats_by_puzzle')
        .select('times_played')
        .eq('puzzle_number', puzzleNumber)
        .single(),
    ]);

    if (distResult.error) {
      console.error('Error fetching puzzle guess distribution:', distResult.error);
      return null;
    }

    const distribution: { [key: number]: number } = {};
    distResult.data?.forEach((row: { guess_count: number; wins: number }) => {
      distribution[row.guess_count] = row.wins;
    });

    const totalAttempts = Number(statsResult.data?.times_played) || 0;

    return { distribution, totalAttempts };
  } catch (error) {
    console.error('Error fetching puzzle guess distribution:', error);
    return null;
  }
}

/**
 * Calculates what percentage of players you beat on a specific puzzle,
 * based on your actual guess count vs the puzzle's global distribution.
 * Includes players who lost (failed to solve) as "worse than user".
 */
export function calculatePuzzlePercentile(
  userGuessCount: number,
  puzzleGuessDistribution: { [key: number]: number },
  totalAttempts?: number
): number | null {
  let totalWins = 0;
  for (const count of Object.values(puzzleGuessDistribution)) {
    totalWins += count;
  }

  if (totalWins === 0) return null;

  const totalPlayers = totalAttempts && totalAttempts > totalWins ? totalAttempts : totalWins;
  const losers = totalPlayers - totalWins;

  // Count winners who took MORE guesses + all players who lost
  let worseThanUser = losers;
  for (const [guess, count] of Object.entries(puzzleGuessDistribution)) {
    if (Number(guess) > userGuessCount) {
      worseThanUser += count;
    }
  }

  return Math.round((worseThanUser / totalPlayers) * 100);
}
