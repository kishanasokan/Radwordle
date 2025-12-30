# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RadWordle is a medical diagnosis guessing game where players identify radiological conditions from X-ray images. Similar to Wordle, players have 6 guesses with progressive hints revealed after each incorrect guess.

## Development Commands

```bash
cd radwordle              # Main application directory
pnpm install              # Install dependencies
pnpm dev                  # Start development server (http://localhost:3000)
pnpm build                # Production build
pnpm lint                 # Run ESLint
```

## Architecture

### Data Flow
- **Server Component** (`app/page.tsx`): Fetches today's puzzle using the scheduling system
- **Client Components** (`components/GamePage.tsx`, `GameClient.tsx`): Handle game state and user interactions
- **Local Storage** (`lib/localStorage.ts`): Persists per-day game state and statistics client-side

### Key Modules

- `lib/supabase.ts` - Supabase client, database queries, puzzle scheduling functions
- `lib/gameLogic.ts` - Day number calculation (EST-based, hardcoded epoch), answer validation
- `lib/localStorage.ts` - Per-day game state persistence, daily statistics, archive statistics
- `components/GameClient.tsx` - Core game logic, guess handling, win/loss detection, results modal
- `components/DiagnosisAutocomplete.tsx` - Searchable dropdown for condition selection with keyboard navigation
- `components/ArchiveBrowser.tsx` - Scrollable list of past puzzles with completion status

### Puzzle Scheduling System

The game uses a schedule-based puzzle selection system instead of modulo calculation:

**Day Number Calculation:**
- Epoch: December 29, 2025 (hardcoded - Day 0)
- Timezone: EST (America/New_York) - simple, no UTC conversion
- Day 0 = Dec 29, 2025, Day 1 = Dec 30, 2025, etc.
- Display: Day numbers shown to users are `dayNumber + 1` (Day 1 = first puzzle)

**Puzzle Selection Algorithm (in priority order):**
1. Never-shown puzzles first (`last_shown_day = -1`), sorted by `puzzle_number`
2. Then previously-shown puzzles, sorted by `last_shown_day` ASC (least recent first)
3. Only considers puzzles with `status = 'active'`

**Key Functions in `lib/supabase.ts`:**
- `getTodaysPuzzle()` - Main entry point for today's puzzle
- `getPuzzleForDay(dayNumber)` - Get puzzle for any specific day
- `getScheduledPuzzle(dayNumber)` - Check if schedule exists
- `getNextPuzzleToSchedule()` - Pick next puzzle using algorithm
- `createScheduleEntry()` / `updatePuzzleLastShown()` - Update database

**Schedule Generation:**
- Schedules are generated on-demand when a user loads the game
- Only saves to database for today or past days (not future dev testing)
- Manual scheduling possible via Supabase dashboard (`is_manual = true`)

### Archive Feature

- URL: `/archive` - Browse all past puzzles
- URL: `/archive/[day]` - Play specific day's puzzle
- Archive games use separate statistics (no streak tracking)
- Per-day localStorage keys: `radiordle_game_day_0`, `radiordle_game_day_1`, etc.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Note: `NEXT_PUBLIC_GAME_EPOCH` is no longer used. The epoch is hardcoded in `lib/gameLogic.ts`.

## Database Schema (Supabase)

```
conditions
├── id (uuid, PK)
├── name (text, unique)
├── category (text)
├── aliases (text[], nullable)
└── created_at (timestamptz)

puzzles
├── id (uuid, PK)
├── puzzle_number (int4)
├── image_url (text)
├── answer (text)
├── difficulty (text)
├── is_active (bool)
├── status (text) ← 'active' | 'retired' | 'draft'
├── last_shown_day (int4) ← -1 = never shown, otherwise day_number
├── hint_1 (text, nullable) ← First hint revealed after wrong guess
├── hint_2 (text, nullable) ← Second hint
├── hint_3 (text, nullable) ← Third hint
├── hint_4 (text, nullable) ← Fourth hint
└── created_at (timestamptz)

puzzle_schedule
├── id (uuid, PK)
├── day_number (int4, unique) ← days since epoch (Dec 28, 2025)
├── puzzle_id (uuid, FK → puzzles.id, nullable)
├── is_manual (bool) ← true if manually scheduled via dashboard
└── created_at (timestamptz)

game_results
├── id (uuid, PK)
├── puzzle_number (int4)
├── won (bool)
├── guess_count (int4) ← 1-5
├── hints_used (int4)
├── time_to_complete_seconds (int4, nullable) ← not currently tracked
├── player_hash (text, nullable) ← not currently tracked
├── guesses (text[], nullable)
└── played_at (timestamptz)

game_stats_overall (VIEW - computed from game_results)
├── total_games (bigint)
├── total_wins (bigint)
├── win_rate (numeric)
├── avg_guesses (numeric)
└── unique_players (bigint)

game_stats_by_puzzle (VIEW - computed from game_results)
├── puzzle_number (int4)
├── times_played (bigint)
├── wins (bigint)
├── win_rate (numeric)
└── avg_guesses (numeric)

game_stats_guess_distribution (VIEW - overall guess distribution)
├── guess_count (int4)
├── total_games (bigint)
├── wins (bigint)
└── win_percentage (numeric)

game_stats_guess_distribution_by_puzzle (VIEW - per-puzzle guess distribution)
├── puzzle_number (int4)
├── guess_count (int4)
├── total_games (bigint)
└── wins (bigint)
```

**Relationships**:
- `puzzles.answer` → `conditions.name`
- `puzzle_schedule.puzzle_id` → `puzzles.id`

**Note**: Hints are stored directly on the puzzles table (hint_1 through hint_4) for easier data entry. The `getHintsFromPuzzle()` function in `lib/supabase.ts` converts these to the Hint[] format used by components.

## Analytics & Global Stats

### Two Types of Statistics

1. **Local Statistics** (per-user, localStorage)
   - Stored in `radiordle_statistics` key
   - Tracks: gamesPlayed, gamesWon, currentStreak, maxStreak, guessDistribution
   - Updated via `updateStatistics()` in `lib/localStorage.ts`
   - Displayed in StatsModal

2. **Global Statistics** (all users, Supabase)
   - Stored in `game_results` table, computed via SQL views
   - Submitted when game ends via `submitGameResult()` in `lib/supabase.ts`
   - Used for "How You Compare" section in StatsModal

### Game Result Submission

When a game ends (win or loss), `GameClient.tsx` calls `submitGameResult()` with:
- `puzzle_number` - which puzzle was played
- `won` - true/false
- `guess_count` - number of guesses (1-5)
- `hints_used` - how many hints were revealed
- `guesses` - array of guess strings

### Global Stats Functions (`lib/supabase.ts`)

- `getGlobalStats()` - Fetches overall stats and guess distribution from views
- `calculatePercentileBeat()` - Compares user's avg guesses to global distribution, returns percentage of players beaten

### StatsModal "How You Compare" Section

Shows when user has won at least 1 game:
- **Top X%** - User's ranking based on average guess count
- **You beat X% of players** - Based on guess count comparison
- **Global vs User Win Rate** - Side by side comparison
- **Global Avg Guesses** - Community average
- **Total Players** - Total games played globally

## Dev Testing

Use URL parameter `?day=N` in development to test specific days:
- `localhost:3000?day=0` → Day 0
- `localhost:3000?day=50` → Day 50

Note: Future days in dev return puzzles but don't save to database.
