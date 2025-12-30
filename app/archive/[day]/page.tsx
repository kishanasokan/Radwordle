import { redirect } from 'next/navigation';
import { getPuzzleForDay, getHintsForPuzzle, getAllConditions } from '@/lib/supabase';
import { getDayNumber } from '@/lib/gameLogic';
import GamePage from '@/components/GamePage';

interface ArchiveDayPageProps {
  params: Promise<{ day: string }>;
}

export default async function ArchiveDayPage({ params }: ArchiveDayPageProps) {
  const { day } = await params;
  const dayNumber = parseInt(day, 10);
  const today = getDayNumber();

  // Validate day number
  if (isNaN(dayNumber) || dayNumber < 0) {
    redirect('/archive');
  }

  // Prevent accessing future days
  if (dayNumber > today) {
    redirect('/');
  }

  // If it's today's puzzle, redirect to home
  if (dayNumber === today) {
    redirect('/');
  }

  try {
    const puzzle = await getPuzzleForDay(dayNumber);
    const hints = await getHintsForPuzzle(puzzle.id);
    const conditions = await getAllConditions();

    return (
      <GamePage
        puzzle={puzzle}
        hints={hints}
        conditions={conditions}
        dayNumber={dayNumber}
        isArchive={true}
      />
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-4">
              Error Loading Archive Puzzle
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }
}
