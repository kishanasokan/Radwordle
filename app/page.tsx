import { getTotalPuzzleCount, getPuzzleByNumber, getHintsForPuzzle, getAllConditions } from '@/lib/supabase';
import { getTodaysPuzzleNumber } from '@/lib/gameLogic';
import Image from 'next/image';
import GameClient from '@/components/GameClient';

export default async function Home() {
  try {
    const totalPuzzles = await getTotalPuzzleCount();
    const todaysPuzzleNumber = getTodaysPuzzleNumber(totalPuzzles);
    const puzzle = await getPuzzleByNumber(todaysPuzzleNumber);
    const hints = await getHintsForPuzzle(puzzle.id);
    const conditions = await getAllConditions();

    return (
      <div className="min-h-screen relative overflow-y-auto overflow-x-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2744] via-[#2d3e5f] to-[#1a2744]">
          {/* Background decorative medical images */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-[url('/placeholder-xray.png')] bg-contain bg-no-repeat opacity-30"></div>
            <div className="absolute right-0 top-1/3 w-64 h-64 bg-[url('/placeholder-scan.png')] bg-contain bg-no-repeat opacity-30"></div>
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-[url('/placeholder-ct.png')] bg-contain bg-no-repeat opacity-30 rounded-full"></div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header with buttons */}
          <div className="flex justify-between items-start p-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#3d4d68] hover:bg-[#4a5b7a] text-white rounded-lg transition-colors">
              <span className="text-xl">📁</span>
              <span className="font-medium">Archives</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#3d4d68] hover:bg-[#4a5b7a] text-white rounded-lg transition-colors">
              <span className="text-xl">📊</span>
              <span className="font-medium">Stats</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative w-16 h-16">
                <Image
                  src="/radle_icon.svg"
                  alt="Radiordle Icon"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <h1 className="text-6xl text-white font-fredoka font-bold tracking-tight">
                Radiordle
              </h1>
            </div>

            {/* Medical Image Display */}
            <div className="w-full max-w-3xl mb-8">
              <div className="relative w-full aspect-[16/9] bg-black rounded-lg overflow-hidden shadow-2xl">
                {puzzle.image_url && (
                  <Image
                    src={puzzle.image_url}
                    alt={`Puzzle ${puzzle.puzzle_number}`}
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                  />
                )}
              </div>
            </div>

            {/* Question */}
            <h2 className="text-4xl text-white font-bold mb-6">
              What&apos;s the Diagnosis?
            </h2>

            {/* Hints Display */}
            <div className="w-full max-w-2xl space-y-3 mb-6">
              {hints.slice(0, 5).map((hint, index) => (
                <div
                  key={hint.id}
                  className="bg-[#6b89b8] bg-opacity-60 backdrop-blur-sm rounded-lg px-6 py-4 text-white"
                >
                  {hint.hint_text ? (
                    <p className="text-lg">{hint.hint_text}</p>
                  ) : hint.image_caption ? (
                    <p className="text-lg">{hint.image_caption}</p>
                  ) : (
                    <p className="text-lg opacity-50">Hint {index + 1}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Input and Submit */}
            <GameClient conditions={conditions} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-4">
              ❌ Error Connecting to Supabase
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
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
}
