import { describe, it, expect } from 'vitest'
import { calculateStatsFromResults } from '@/lib/statsCalculation'
import type { GameResult } from '@/lib/statsCalculation'

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    puzzle_number: 1,
    won: true,
    guess_count: 3,
    played_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calculateStatsFromResults', () => {
  it('returns zero stats for empty results', () => {
    const stats = calculateStatsFromResults([], {})
    expect(stats.gamesPlayed).toBe(0)
    expect(stats.gamesWon).toBe(0)
    expect(stats.currentStreak).toBe(0)
    expect(stats.maxStreak).toBe(0)
    expect(stats.guessDistribution).toEqual({})
    expect(stats.lastPlayedDay).toBeNull()
    expect(stats.gameStates).toEqual([])
  })

  it('counts games played and won', () => {
    const results = [
      makeResult({ puzzle_number: 1, won: true }),
      makeResult({ puzzle_number: 2, won: false }),
      makeResult({ puzzle_number: 3, won: true }),
    ]
    const mapping = { 1: 0, 2: 1, 3: 2 }
    const stats = calculateStatsFromResults(results, mapping)

    expect(stats.gamesPlayed).toBe(3)
    expect(stats.gamesWon).toBe(2)
  })

  it('builds guess distribution from wins only', () => {
    const results = [
      makeResult({ puzzle_number: 1, won: true, guess_count: 2 }),
      makeResult({ puzzle_number: 2, won: true, guess_count: 2 }),
      makeResult({ puzzle_number: 3, won: true, guess_count: 4 }),
      makeResult({ puzzle_number: 4, won: false, guess_count: 5 }),
    ]
    const mapping = { 1: 0, 2: 1, 3: 2, 4: 3 }
    const stats = calculateStatsFromResults(results, mapping)

    expect(stats.guessDistribution).toEqual({ 2: 2, 4: 1 })
  })

  describe('streak calculation', () => {
    it('calculates streak for 3 consecutive wins', () => {
      const results = [
        makeResult({ puzzle_number: 1, won: true }),
        makeResult({ puzzle_number: 2, won: true }),
        makeResult({ puzzle_number: 3, won: true }),
      ]
      const mapping = { 1: 0, 2: 1, 3: 2 }
      const stats = calculateStatsFromResults(results, mapping)

      expect(stats.currentStreak).toBe(3)
      expect(stats.maxStreak).toBe(3)
    })

    it('resets current streak on loss', () => {
      const results = [
        makeResult({ puzzle_number: 1, won: true }),
        makeResult({ puzzle_number: 2, won: true }),
        makeResult({ puzzle_number: 3, won: false }),
      ]
      const mapping = { 1: 0, 2: 1, 3: 2 }
      const stats = calculateStatsFromResults(results, mapping)

      expect(stats.currentStreak).toBe(0)
      expect(stats.maxStreak).toBe(2)
    })

    it('starts new streak after a loss', () => {
      const results = [
        makeResult({ puzzle_number: 1, won: true }),
        makeResult({ puzzle_number: 2, won: false }),
        makeResult({ puzzle_number: 3, won: true }),
      ]
      const mapping = { 1: 0, 2: 1, 3: 2 }
      const stats = calculateStatsFromResults(results, mapping)

      expect(stats.currentStreak).toBe(1)
      expect(stats.maxStreak).toBe(1)
    })

    it('handles non-consecutive days (gap breaks streak)', () => {
      const results = [
        makeResult({ puzzle_number: 1, won: true }),
        makeResult({ puzzle_number: 3, won: true }), // day 2 skipped
      ]
      const mapping = { 1: 0, 3: 5 }
      const stats = calculateStatsFromResults(results, mapping)

      // Days 0 and 5 are not consecutive
      expect(stats.currentStreak).toBe(1)
      expect(stats.maxStreak).toBe(1)
    })

    it('preserves maxStreak even after current resets', () => {
      const results = [
        makeResult({ puzzle_number: 1, won: true }),
        makeResult({ puzzle_number: 2, won: true }),
        makeResult({ puzzle_number: 3, won: true }),
        makeResult({ puzzle_number: 4, won: false }),
        makeResult({ puzzle_number: 5, won: true }),
      ]
      const mapping = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 }
      const stats = calculateStatsFromResults(results, mapping)

      expect(stats.currentStreak).toBe(1)
      expect(stats.maxStreak).toBe(3)
    })

    it('handles loss on the only day played', () => {
      const results = [makeResult({ puzzle_number: 1, won: false })]
      const mapping = { 1: 0 }
      const stats = calculateStatsFromResults(results, mapping)

      expect(stats.currentStreak).toBe(0)
      expect(stats.maxStreak).toBe(0)
    })

    it('handles win on the only day played', () => {
      const results = [makeResult({ puzzle_number: 1, won: true })]
      const mapping = { 1: 0 }
      const stats = calculateStatsFromResults(results, mapping)

      expect(stats.currentStreak).toBe(1)
      expect(stats.maxStreak).toBe(1)
    })
  })

  it('tracks lastPlayedDay as highest day number', () => {
    const results = [
      makeResult({ puzzle_number: 3, won: true }),
      makeResult({ puzzle_number: 1, won: true }),
      makeResult({ puzzle_number: 5, won: false }),
    ]
    const mapping = { 1: 0, 3: 2, 5: 10 }
    const stats = calculateStatsFromResults(results, mapping)

    expect(stats.lastPlayedDay).toBe(10)
  })

  it('sets dayNumber to -1 for results without day mapping', () => {
    const results = [makeResult({ puzzle_number: 99, won: true })]
    const stats = calculateStatsFromResults(results, {})

    expect(stats.gameStates[0].dayNumber).toBe(-1)
    expect(stats.lastPlayedDay).toBeNull()
  })

  it('builds gameStates array for all results', () => {
    const results = [
      makeResult({ puzzle_number: 1, won: true, guess_count: 2 }),
      makeResult({ puzzle_number: 2, won: false, guess_count: 5 }),
    ]
    const mapping = { 1: 0, 2: 1 }
    const stats = calculateStatsFromResults(results, mapping)

    expect(stats.gameStates).toHaveLength(2)
    expect(stats.gameStates[0]).toEqual({
      dayNumber: 0,
      puzzleNumber: 1,
      won: true,
      guessCount: 2,
    })
    expect(stats.gameStates[1]).toEqual({
      dayNumber: 1,
      puzzleNumber: 2,
      won: false,
      guessCount: 5,
    })
  })
})
