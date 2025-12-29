# RadWordle

A medical diagnosis guessing game where players identify radiological conditions from X-ray images. Built with Next.js and Supabase.

## About

RadWordle is an educational game that challenges medical professionals and students to identify diagnoses from radiological images. Each day features a new puzzle with progressive hints to help narrow down the answer.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites

- **Node.js 18+**: Download and install from [nodejs.org](https://nodejs.org/)
- **pnpm** (recommended): Install globally with `npm install -g pnpm`
  - Alternatively, you can use npm (comes with Node.js)

To verify your installations:
```bash
node --version  # Should show v18 or higher
pnpm --version  # If using pnpm
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd radwordle
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory. Contact the repository owner (Tanmay) for the required credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=<ask-owner>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask-owner>
NEXT_PUBLIC_GAME_EPOCH=2025-01-01
```

4. Run the development server:
```bash
pnpm dev
# or
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) (or the port shown in terminal) to see the application.

## Project Structure

```
radwordle/
├── app/                  # Next.js app directory
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home/test page
│   └── globals.css      # Global styles
├── lib/                 # Utility functions and configs
│   ├── supabase.ts      # Supabase client and database functions
│   ├── gameLogic.ts     # Game logic utilities
│   ├── localStorage.ts  # Local storage helpers
│   └── constants.ts     # App constants
├── components/          # React components
└── types/              # TypeScript type definitions
```

## Database Schema

The application uses three main tables in Supabase:

### `conditions`
- `id`: UUID (Primary Key)
- `name`: Text - Diagnosis name
- `category`: Text - Medical category
- `aliases`: Text[] - Alternative names

### `puzzles`
- `id`: UUID (Primary Key)
- `puzzle_number`: Integer - Sequential puzzle number
- `image_url`: Text - URL to X-ray image
- `answer`: Text - Correct diagnosis
- `difficulty`: Text - easy, medium, hard
- `is_active`: Boolean - Whether puzzle is active

### `hints`
- `id`: UUID (Primary Key)
- `puzzle_id`: UUID (Foreign Key to puzzles)
- `hint_order`: Integer - Order of hint reveal
- `content_type`: Text - text or image
- `hint_text`: Text - Hint content (nullable)
- `image_url`: Text - Hint image URL (nullable)
- `image_caption`: Text - Image caption (nullable)

## Game Logic

- **Daily Puzzles**: The game cycles through puzzles based on days since the game epoch (January 1, 2025)
- **Max Guesses**: Players get 6 attempts per puzzle
- **Progressive Hints**: Hints are revealed in order to help players

## Development

### Key Files

- [lib/supabase.ts](lib/supabase.ts) - Database queries and type definitions
- [lib/gameLogic.ts](lib/gameLogic.ts) - Core game mechanics
- [app/page.tsx](app/page.tsx) - Main test page showing database connection

### Testing the Database Connection

The homepage serves as a test page that displays:
- Connection status
- Database statistics
- Today's puzzle details
- All hints for the current puzzle
- Available conditions

If you see the green "Supabase Connected" message, everything is working correctly.

## Building for Production

```bash
pnpm build
pnpm start
```

## Contributing

Contact the repository owner for contribution guidelines and access to environment variables.

## License

Private repository - All rights reserved.

## Stuff to do 
- Checkdown list should not allow prior guesses
- Share button 