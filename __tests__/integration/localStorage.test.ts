// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getGameState,
  saveGameState,
  getDayStatus,
  getStatistics,
  saveStatistics,
  updateStatistics,
  updateGuessTimeStatistics,
  getAvgGuessTime,
  getArchiveStatistics,
  updateArchiveStatistics,
} from '@/lib/localStorage'
import type { GameState, Statistics } from '@/lib/localStorage'

beforeEach(() => {
  localStorage.clear()
})

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    dayNumber: 0,
    guesses: ['Pneumothorax'],
    guessResults: ['correct'],
    revealedHints: 0,
    isComplete: true,
    isWon: true,
    hasPartialMatch: false,
    ...overrides,
  }
}

describe('saveGameState / getGameState', () => {
  it('round-trips a game state', () => {
    const state = makeGameState({ dayNumber: 5 })
    saveGameState(state)
    const loaded = getGameState(5)

    expect(loaded).toEqual(state)
  })

  it('returns null for non-existent day', () => {
    expect(getGameState(99)).toBeNull()
  })

  it('returns null if stored dayNumber does not match', () => {
    const state = makeGameState({ dayNumber: 5 })
    saveGameState(state)
    // Try to load with different day number by manually writing wrong key
    localStorage.setItem('radiordle_game_day_10', JSON.stringify({ ...state, dayNumber: 5 }))
    expect(getGameState(10)).toBeNull()
  })

  it('adds empty guessResults array if missing (migration)', () => {
    const stateWithoutResults = {
      dayNumber: 3,
      guesses: ['Test'],
      revealedHints: 0,
      isComplete: false,
      isWon: false,
      hasPartialMatch: false,
    }
    localStorage.setItem('radiordle_game_day_3', JSON.stringify(stateWithoutResults))
    const loaded = getGameState(3)

    expect(loaded).not.toBeNull()
    expect(loaded!.guessResults).toEqual([])
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('radiordle_game_day_0', 'not-json')
    expect(getGameState(0)).toBeNull()
  })

  it('stores separate states per day', () => {
    const state0 = makeGameState({ dayNumber: 0, guesses: ['A'] })
    const state1 = makeGameState({ dayNumber: 1, guesses: ['B'] })
    saveGameState(state0)
    saveGameState(state1)

    expect(getGameState(0)!.guesses).toEqual(['A'])
    expect(getGameState(1)!.guesses).toEqual(['B'])
  })
})

describe('getDayStatus', () => {
  it('returns not_played for day with no state', () => {
    expect(getDayStatus(0)).toBe('not_played')
  })

  it('returns not_played for incomplete game', () => {
    saveGameState(makeGameState({ dayNumber: 0, isComplete: false }))
    expect(getDayStatus(0)).toBe('not_played')
  })

  it('returns won for completed winning game', () => {
    saveGameState(makeGameState({ dayNumber: 0, isComplete: true, isWon: true }))
    expect(getDayStatus(0)).toBe('won')
  })

  it('returns lost for completed losing game', () => {
    saveGameState(makeGameState({ dayNumber: 0, isComplete: true, isWon: false }))
    expect(getDayStatus(0)).toBe('lost')
  })
})

describe('getStatistics / saveStatistics', () => {
  it('returns default stats when nothing stored', () => {
    const stats = getStatistics()
    expect(stats).toEqual({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: {},
    })
  })

  it('round-trips statistics', () => {
    const stats: Statistics = {
      gamesPlayed: 10,
      gamesWon: 7,
      currentStreak: 3,
      maxStreak: 5,
      guessDistribution: { 1: 2, 2: 3, 3: 2 },
      lastPlayedDay: 9,
    }
    saveStatistics(stats)
    expect(getStatistics()).toEqual(stats)
  })
})

describe('updateStatistics', () => {
  it('increments gamesPlayed on every call', () => {
    updateStatistics(true, 3, 0)
    updateStatistics(false, 5, 1)
    const stats = getStatistics()
    expect(stats.gamesPlayed).toBe(2)
  })

  it('increments gamesWon and streak on win', () => {
    updateStatistics(true, 2, 0)
    const stats = getStatistics()
    expect(stats.gamesWon).toBe(1)
    expect(stats.currentStreak).toBe(1)
    expect(stats.maxStreak).toBe(1)
  })

  it('resets currentStreak to 0 on loss', () => {
    updateStatistics(true, 2, 0)
    updateStatistics(true, 3, 1)
    updateStatistics(false, 5, 2)
    const stats = getStatistics()
    expect(stats.currentStreak).toBe(0)
    expect(stats.maxStreak).toBe(2)
  })

  it('updates guessDistribution on win', () => {
    updateStatistics(true, 2, 0)
    updateStatistics(true, 2, 1)
    updateStatistics(true, 4, 2)
    const stats = getStatistics()
    expect(stats.guessDistribution).toEqual({ 2: 2, 4: 1 })
  })

  it('does not add to guessDistribution on loss', () => {
    updateStatistics(false, 5, 0)
    const stats = getStatistics()
    expect(stats.guessDistribution).toEqual({})
  })

  it('sets lastPlayedDay', () => {
    updateStatistics(true, 2, 42)
    const stats = getStatistics()
    expect(stats.lastPlayedDay).toBe(42)
  })

  it('updates maxStreak when currentStreak exceeds it', () => {
    updateStatistics(true, 2, 0)
    updateStatistics(true, 2, 1)
    updateStatistics(true, 2, 2)
    const stats = getStatistics()
    expect(stats.maxStreak).toBe(3)
    expect(stats.currentStreak).toBe(3)
  })
})

describe('updateGuessTimeStatistics / getAvgGuessTime', () => {
  it('tracks total guess time and count', () => {
    updateGuessTimeStatistics(10)
    updateGuessTimeStatistics(20)
    const stats = getStatistics()
    expect(stats.totalGuessTime).toBe(30)
    expect(stats.totalGuessCount).toBe(2)
  })

  it('calculates average correctly', () => {
    updateGuessTimeStatistics(10)
    updateGuessTimeStatistics(20)
    expect(getAvgGuessTime()).toBe(15)
  })

  it('returns 0 when no time recorded', () => {
    expect(getAvgGuessTime()).toBe(0)
  })
})

describe('archive statistics', () => {
  it('returns default archive stats when nothing stored', () => {
    const stats = getArchiveStatistics()
    expect(stats).toEqual({
      gamesPlayed: 0,
      gamesWon: 0,
      guessDistribution: {},
    })
  })

  it('tracks archive stats separately from daily', () => {
    updateStatistics(true, 2, 0)
    updateArchiveStatistics(true, 3)

    const dailyStats = getStatistics()
    const archiveStats = getArchiveStatistics()

    expect(dailyStats.gamesPlayed).toBe(1)
    expect(archiveStats.gamesPlayed).toBe(1)
    expect(dailyStats.guessDistribution).toEqual({ 2: 1 })
    expect(archiveStats.guessDistribution).toEqual({ 3: 1 })
  })

  it('does not track streaks for archive', () => {
    updateArchiveStatistics(true, 2)
    updateArchiveStatistics(true, 3)
    const stats = getArchiveStatistics()
    // Archive stats don't have streak fields
    expect(stats).toEqual({
      gamesPlayed: 2,
      gamesWon: 2,
      guessDistribution: { 2: 1, 3: 1 },
    })
  })

  it('does not add to distribution on archive loss', () => {
    updateArchiveStatistics(false, 5)
    const stats = getArchiveStatistics()
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(0)
    expect(stats.guessDistribution).toEqual({})
  })
})
