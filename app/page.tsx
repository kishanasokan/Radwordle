import { getTodaysPuzzle, getHintsFromPuzzle, getAllConditions } from '@/lib/supabase';
import { getDayNumber } from '@/lib/gameLogic';
import GamePage from '@/components/GamePage';

// Disable caching - puzzle changes daily at midnight EST
export const dynamic = 'force-dynamic';

export default async function Home() {
  let dayNumber: number;
  let puzzle;
  let hints;
  let conditions;
  let error: Error | null = null;

  try {
    dayNumber = getDayNumber();
    puzzle = await getTodaysPuzzle();
    hints = getHintsFromPuzzle(puzzle);
    conditions = await getAllConditions();
  } catch (err) {
    error = err instanceof Error ? err : new Error('Unknown error occurred');
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-4">
              ❌ Error Connecting to Supabase
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {error.message}
            </p>
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">
              <p>Please check:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>NEXT_PUBLIC_SUPABASE_URL is set correctly</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY is set correctly</li>
                <li>Your Supabase tables are created</li>
                <li>Your database has data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GamePage
      puzzle={puzzle!}
      hints={hints!}
      conditions={conditions!}
      dayNumber={dayNumber!}
      isArchive={false}
    />
  );
}
