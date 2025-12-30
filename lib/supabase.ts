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

export async function getHintsForPuzzle(puzzleId: string): Promise<Hint[]> {
  const { data, error } = await supabase
    .from('hints')
    .select('*')
    .eq('puzzle_id', puzzleId)
    .order('hint_order', { ascending: true });

  if (error) {
    console.error('Error getting hints:', error);
    throw error;
  }

  return data || [];
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
