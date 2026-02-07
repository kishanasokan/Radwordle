// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameClient from '@/components/GameClient'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key'
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

const mockGetGameState = vi.fn()
const mockSaveGameState = vi.fn()
const mockUpdateStatistics = vi.fn()
const mockUpdateArchiveStatistics = vi.fn()
const mockUpdateGuessTimeStatistics = vi.fn()
const mockGetStatistics = vi.fn()

vi.mock('@/lib/localStorage', () => ({
  getGameState: (...args: unknown[]) => mockGetGameState(...args),
  saveGameState: (...args: unknown[]) => mockSaveGameState(...args),
  updateStatistics: (...args: unknown[]) => mockUpdateStatistics(...args),
  updateArchiveStatistics: (...args: unknown[]) => mockUpdateArchiveStatistics(...args),
  updateGuessTimeStatistics: (...args: unknown[]) => mockUpdateGuessTimeStatistics(...args),
  getStatistics: () => mockGetStatistics(),
}))

const mockSubmitGameResult = vi.fn()
const mockGetGlobalStats = vi.fn()

vi.mock('@/lib/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/supabase')>()
  return {
    ...original,
    submitGameResult: (...args: unknown[]) => mockSubmitGameResult(...args),
    getGlobalStats: () => mockGetGlobalStats(),
  }
})

vi.mock('@/lib/playerIdentity', () => ({
  getOrCreatePlayerHash: vi.fn().mockResolvedValue('test-hash-123'),
}))

const conditions = [
  { id: '1', name: 'Pneumothorax', category: 'Chest', aliases: null },
  { id: '2', name: 'Pneumonia', category: 'Chest', aliases: null },
  { id: '3', name: 'Fracture', category: 'Bone', aliases: null },
]

const defaultProps = {
  conditions,
  dayNumber: 5,
  puzzleNumber: 10,
  correctAnswer: 'Pneumothorax',
  isArchive: false,
  onGameStateChange: vi.fn(),
}

// Helper: get the first input (desktop) since component renders desktop + mobile
function getInput() {
  return screen.getAllByPlaceholderText('Diagnosis...')[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockGetGameState.mockReturnValue(null)
  mockGetStatistics.mockReturnValue({
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: {},
  })
  mockSubmitGameResult.mockResolvedValue({ isFirstSolver: false })
  mockGetGlobalStats.mockResolvedValue(null)
})

describe('GameClient', () => {
  describe('initialization', () => {
    it('creates new game state when no saved state', () => {
      render(<GameClient {...defaultProps} />)

      expect(defaultProps.onGameStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dayNumber: 5,
          guesses: [],
          guessResults: [],
          isComplete: false,
          isWon: false,
        })
      )
    })

    it('loads saved game state from localStorage', () => {
      const savedState = {
        dayNumber: 5,
        guesses: ['Pneumonia'],
        guessResults: ['incorrect' as const],
        revealedHints: 1,
        isComplete: false,
        isWon: false,
        hasPartialMatch: false,
      }
      mockGetGameState.mockReturnValue(savedState)

      render(<GameClient {...defaultProps} />)

      expect(defaultProps.onGameStateChange).toHaveBeenCalledWith(savedState)
    })

    it('shows modal immediately if game was already complete', () => {
      const completedState = {
        dayNumber: 5,
        guesses: ['Pneumothorax'],
        guessResults: ['correct' as const],
        revealedHints: 0,
        isComplete: true,
        isWon: true,
        hasPartialMatch: false,
      }
      mockGetGameState.mockReturnValue(completedState)

      render(<GameClient {...defaultProps} />)

      // Modal heading + desktop/mobile all show "Congratulations"
      const congratsElements = screen.getAllByText(/Congratulations/)
      expect(congratsElements.length).toBeGreaterThan(0)
    })

    it('shows guess counter when game is in progress', () => {
      render(<GameClient {...defaultProps} />)

      // Desktop + mobile both render counter
      const counters = screen.getAllByText(/Guesses: 0 \/ 5/)
      expect(counters.length).toBeGreaterThan(0)
    })
  })

  describe('game completion display', () => {
    it('shows correct answer on win', () => {
      const wonState = {
        dayNumber: 5,
        guesses: ['Pneumothorax'],
        guessResults: ['correct' as const],
        revealedHints: 0,
        isComplete: true,
        isWon: true,
        hasPartialMatch: false,
      }
      mockGetGameState.mockReturnValue(wonState)

      render(<GameClient {...defaultProps} />)

      expect(screen.getAllByText('Pneumothorax').length).toBeGreaterThan(0)
    })

    it('shows "Game Over" on loss', () => {
      const lostState = {
        dayNumber: 5,
        guesses: ['A', 'B', 'C', 'D', 'E'],
        guessResults: ['incorrect' as const, 'incorrect', 'incorrect', 'incorrect', 'incorrect'] as const,
        revealedHints: 4,
        isComplete: true,
        isWon: false,
        hasPartialMatch: false,
      }
      mockGetGameState.mockReturnValue(lostState)

      render(<GameClient {...defaultProps} />)

      const gameOverElements = screen.getAllByText(/Game Over/)
      expect(gameOverElements.length).toBeGreaterThan(0)
    })

    it('shows "View Results" button when game is complete', () => {
      const completedState = {
        dayNumber: 5,
        guesses: ['Pneumothorax'],
        guessResults: ['correct' as const],
        revealedHints: 0,
        isComplete: true,
        isWon: true,
        hasPartialMatch: false,
      }
      mockGetGameState.mockReturnValue(completedState)

      render(<GameClient {...defaultProps} />)

      const viewResultsButtons = screen.getAllByText('View Results')
      expect(viewResultsButtons.length).toBeGreaterThan(0)
    })
  })

  describe('guess submission flow', () => {
    it('saves game state after a guess', async () => {
      const user = userEvent.setup()
      render(<GameClient {...defaultProps} />)

      const input = getInput()
      await user.type(input, 'Fracture')
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(mockSaveGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          guesses: ['Fracture'],
          guessResults: ['incorrect'],
        })
      )
    })

    it('increments revealedHints on incorrect guess', async () => {
      const user = userEvent.setup()
      render(<GameClient {...defaultProps} />)

      const input = getInput()
      await user.type(input, 'Fracture')
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(mockSaveGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          revealedHints: 1,
        })
      )
    })

    it('calls updateStatistics on correct guess', async () => {
      const user = userEvent.setup()
      render(<GameClient {...defaultProps} />)

      const input = getInput()
      await user.type(input, 'pneumothorax')
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(mockUpdateStatistics).toHaveBeenCalledWith(true, 1, 5)
    })

    it('calls submitGameResult on correct guess', async () => {
      const user = userEvent.setup()
      render(<GameClient {...defaultProps} />)

      const input = getInput()
      await user.type(input, 'pneumothorax')
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(mockSubmitGameResult).toHaveBeenCalledWith(
        expect.objectContaining({
          puzzle_number: 10,
          won: true,
          guess_count: 1,
          hints_used: 0,
          guesses: ['Pneumothorax'],
        })
      )
    })

    it('tracks guess time statistics', async () => {
      const user = userEvent.setup()
      render(<GameClient {...defaultProps} />)

      const input = getInput()
      await user.type(input, 'Fracture')
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(mockUpdateGuessTimeStatistics).toHaveBeenCalledWith(expect.any(Number))
    })
  })

  describe('archive mode', () => {
    it('calls updateArchiveStatistics instead of updateStatistics', async () => {
      const user = userEvent.setup()
      render(<GameClient {...defaultProps} isArchive={true} />)

      const input = getInput()
      await user.type(input, 'pneumothorax')
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(mockUpdateArchiveStatistics).toHaveBeenCalledWith(true, 1)
      expect(mockUpdateStatistics).not.toHaveBeenCalled()
    })
  })

  describe('toast notifications', () => {
    it('shows toast after guess', async () => {
      const user = userEvent.setup()
      render(<GameClient {...defaultProps} />)

      const input = getInput()
      await user.type(input, 'Fracture')
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
