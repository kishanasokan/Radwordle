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
pnpm test                 # Run all tests (vitest)
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage report
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
- `lib/playerIdentity.ts` - Player hash management with 3-way redundant storage (localStorage/cookie/IndexedDB)
- `lib/statsCalculation.ts` - Stats calculation from game results (streaks, distribution) — extracted from player-stats API route
- `lib/statsRecovery.ts` - Stats recovery from server when localStorage cleared
- `components/GameClient.tsx` - Core game logic, guess handling, win/loss detection, results modal
- `components/DiagnosisAutocomplete.tsx` - Searchable dropdown for condition selection with keyboard navigation
- `components/ArchiveBrowser.tsx` - Scrollable list of past puzzles with completion status
- `components/StatsRecoveryProvider.tsx` - Auto-recovery on page load, shows toast on success
- `components/CookieConsent.tsx` - Mandatory data storage consent banner

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
├── time_to_complete_seconds (int4, nullable)
├── player_hash (text, nullable) ← anonymous player ID for stats recovery
├── guesses (text[], nullable)
├── is_first_solver (bool) ← was this the first solve for this puzzle
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

## Game Mechanics

### Guess Evaluation System (`lib/gameLogic.ts`)

Each guess is evaluated and returns one of three results:

1. **`correct`** - Exact match (normalized comparison, case-insensitive, punctuation removed)
2. **`partial`** - Related match via:
   - Shared significant word (e.g., "septal" appears in both guess and answer)
   - 5+ character prefix match (e.g., "esoph" matches "esophagus" to "esophageal")
   - Common medical terms filtered out: of, the, a, an, with, disease, syndrome, disorder, condition, injury
3. **`incorrect`** - No match

### Color Feedback System (`components/GamePage.tsx`)

**Hint Colors** - Each hint is colored based on the *next* guess after it was revealed:
- Green (`#407763`) - Next guess was correct
- Yellow (`#f6d656`) - Next guess was partial match
- Red (`#9e4a4a`) - Next guess was incorrect
- Blue (`#6b89b8`) - No next guess yet (default)

**Image Border** - The image gets a colored border/glow based on the *first* guess:
- The first guess is made with only the image as context (no hints yet)
- Border reflects how helpful the image alone was for diagnosis
- Same color scheme: green (correct), yellow (partial), red (incorrect)
- No border until first guess is made

### Game Flow

1. Player sees image only, makes first guess
2. If wrong, first hint reveals → hint stays blue until next guess
3. Each subsequent wrong guess reveals another hint
4. Previous hint gets colored based on the guess that followed it
5. Maximum 5 guesses, 4 hints total
6. Game ends on correct guess or after 5 attempts

## Testing

### Stack

- **Vitest** — test runner (ESM-native, TS-native, supports `@/*` alias)
- **@testing-library/react** + **@testing-library/user-event** — component tests
- **@testing-library/jest-dom** — DOM assertion matchers
- **jsdom** — browser environment for component/integration tests
- **fake-indexeddb** — IndexedDB polyfill for playerIdentity tests

### Test Structure

```
__tests__/
  setup.ts                              # Global setup (jest-dom matchers, scrollIntoView polyfill)
  unit/
    gameLogic.test.ts                   # checkAnswer, getDayNumber, dayNumberToDate
    supabase.pure.test.ts              # getHintsFromPuzzle, calculatePercentileBeat
    statsCalculation.test.ts           # calculateStatsFromResults (extracted from API route)
  integration/
    localStorage.test.ts              # All localStorage functions
    api/
      feedback.test.ts                 # POST /api/feedback
      player-stats.test.ts             # GET /api/player-stats
      set-player-id.test.ts            # POST/GET /api/set-player-id
  component/
    DiagnosisAutocomplete.test.tsx     # Filtering, keyboard nav, validation
    GameClient.test.tsx                # Guess flow, win/loss, persistence
    ArchiveBrowser.test.tsx            # Day list, status badges
    CookieConsent.test.tsx             # Consent flow
```

### Config

- `vitest.config.ts` — central config with `@/*` alias, `node` default environment
- Per-file jsdom override via `// @vitest-environment jsdom` comment at top of file
- `__tests__/setup.ts` — global setup loaded for all tests

### Mocking Patterns

| Dependency | Mock approach |
|---|---|
| **Supabase** | `vi.mock('@supabase/supabase-js')` with chainable `.from().select()` |
| **localStorage** | jsdom's built-in `localStorage` with `clear()` in `beforeEach` |
| **Environment vars** | `vi.hoisted()` to set `process.env` before module-level Supabase client init |
| **Next.js Image/Link** | Simple HTML element mocks |
| **Next.js navigation** | `vi.mock('next/navigation')` with stub router |

### Key Testing Notes

- **`vi.hoisted()`** is required for setting env vars and declaring mock variables — `vi.mock()` factories are hoisted above `const` declarations
- **GameClient renders dual layouts** (desktop + mobile) — use `getAllBy*` queries and index `[0]` for the desktop input
- **jsdom lacks `scrollIntoView`** — polyfilled as a no-op in `setup.ts`
- **`lib/statsCalculation.ts`** was extracted from `app/api/player-stats/route.ts` to enable unit testing of streak/distribution calculation

### CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and every PR:
- **Lint & Type Check** — `pnpm lint` + `pnpm tsc --noEmit`
- **Tests** — `pnpm test` (154 tests across 11 files)
- **Production Build** — `pnpm build`

All three jobs run in parallel. Fake Supabase env vars are set at the workflow level.

### E2E Tests (Playwright)

```bash
pnpm e2e                  # Run all E2E tests (headless)
pnpm e2e:headed           # Run E2E tests with browser visible
pnpm e2e:ui               # Open Playwright's interactive UI
```

**Stack**: Playwright with Chromium, tests against running dev server.

**Config**: `playwright.config.ts` — auto-starts `pnpm dev`, runs on `http://localhost:3000`.

**Test Structure** (55 tests across 10 files):
```
e2e/
  fixtures/
    helpers.ts                        # Shared utilities, selectors, mocks
  tests/
    first-time-user.spec.ts          # Cookie consent, full game flow, persistence
    losing-game.spec.ts              # 5 incorrect guesses, hints, game over
    archive-mode.spec.ts             # Archive browsing, separate stats, WON badge
    autocomplete.spec.ts             # Dropdown, keyboard nav, validation
    toast-notifications.spec.ts      # Correct/incorrect/partial toasts
    mobile-responsive.spec.ts        # iPhone 12 viewport (390x844), fixed input
    stats-recovery.spec.ts           # localStorage recovery from cookie/IndexedDB
    network-failure.spec.ts          # Supabase down, graceful degradation
    multi-day-progression.spec.ts    # Per-day state, streaks, guess distribution
    guess-time-tracking.spec.ts      # Time tracking in localStorage
```

**Key Patterns**:
- **Dual layout handling**: App renders desktop + mobile layouts simultaneously. Helpers use Playwright's `:visible` pseudo-class (e.g., `page.locator('input[placeholder="Diagnosis..."]:visible')`) to automatically select the correct layout for the active viewport.
- **Answer extraction**: `extractCorrectAnswer()` parses the RSC flight data from `document.documentElement.innerHTML`. RSC uses escaped quotes (`\"answer\":\"...\"`) on initial page load.
- **Archive page navigation**: Use `page.goto(href)` (full page load) instead of clicking archive links (client-side navigation) to ensure answer data is embedded in HTML.
- **Supabase mocking**: `mockSupabaseClientCalls()` intercepts client-side REST calls to prevent real DB writes during tests.
- **CI Workflow**: `.github/workflows/e2e.yml` — requires Supabase secrets, installs Chromium, uploads HTML report artifacts on failure.

## Dev Testing

Use URL parameter `?day=N` in development to test specific days:
- `localhost:3000?day=0` → Day 0
- `localhost:3000?day=50` → Day 50

Note: Future days in dev return puzzles but don't save to database.

## Player Identity & Data Protection

### Player Hash System (`lib/playerIdentity.ts`)

Anonymous player identification for stats recovery. Hash stored in 3 locations for redundancy:

1. **localStorage** - Primary, fast access
2. **Cookie** (`radiordle_pid`) - Survives localStorage clears, 1-year expiry
3. **IndexedDB** (`radiordle_identity`) - Separate storage, often survives when localStorage cleared

**Key Functions:**
- `getOrCreatePlayerHash()` - Main entry point, async, uses singleton pattern to prevent race conditions
- `checkBackupStorageOnly()` - Check backup locations WITHOUT restoring (used before recovery)
- `syncExistingHashToBackups()` - Ensures existing users get their hash backed up
- `storePlayerHash()` - Saves to all 3 locations

### Stats Recovery System (`lib/statsRecovery.ts`)

Recovers player statistics from server when localStorage is cleared but cookie/IndexedDB preserved.

**Flow:**
1. `StatsRecoveryProvider` runs on every page load (in `layout.tsx`)
2. Checks if stats empty but backup hash exists
3. Fetches stats from `/api/player-stats?hash=xxx`
4. Restores to localStorage, shows success toast

**Key Functions:**
- `attemptStatsRecovery()` - Auto-runs on load, session-limited
- `forceStatsRecovery()` - Manual trigger (for future "Recover Stats" button)

### Recovery API (`/api/player-stats`)

- Calculates stats from `game_results` table by `player_hash`
- Maps puzzle_number → day_number via `puzzle_schedule` for streak calculation
- Rate limited: 10 requests/minute per IP
- Returns: gamesPlayed, gamesWon, streaks, guessDistribution

### Cookie Consent (`components/CookieConsent.tsx`)

- Mandatory acceptance (no decline option)
- Uses localStorage, not actual HTTP cookies for game data
- Consent stored in `radiordle_cookie_consent` key

### Data Storage Keys (localStorage)

| Key | Purpose |
|-----|---------|
| `radiordle_player_hash` | Anonymous player ID |
| `radiordle_statistics` | Daily stats (games, streaks, distribution) |
| `radiordle_archive_statistics` | Archive-only stats |
| `radiordle_game_day_[N]` | Per-day game state |
| `radiordle_cookie_consent` | Consent status |
| `radiordle_feedback_cooldown` | Feedback rate limiting |

### Known Limitations

1. **Streaks not perfectly recoverable** - Server has game results but not original streak state
2. **Archive stats not recovered** - Only daily statistics restored
3. **`totalGuessTime` not recovered** - Server doesn't store per-guess timing
