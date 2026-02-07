import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key'
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

import { getHintsFromPuzzle, calculatePercentileBeat } from '@/lib/supabase'
import type { Puzzle } from '@/lib/supabase'

function makePuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: 'puzzle-123',
    puzzle_number: 1,
    image_url: 'https://example.com/img.png',
    answer: 'Pneumothorax',
    difficulty: 'medium',
    is_active: true,
    status: 'active',
    last_shown_day: -1,
    hint_1: null,
    hint_2: null,
    hint_3: null,
    hint_4: null,
    ...overrides,
  }
}

describe('getHintsFromPuzzle', () => {
  it('returns all 4 hints when all are present', () => {
    const puzzle = makePuzzle({
      hint_1: 'First hint',
      hint_2: 'Second hint',
      hint_3: 'Third hint',
      hint_4: 'Fourth hint',
    })
    const hints = getHintsFromPuzzle(puzzle)

    expect(hints).toHaveLength(4)
    expect(hints[0]).toEqual({
      id: 'puzzle-123-hint-1',
      puzzle_id: 'puzzle-123',
      hint_order: 1,
      content_type: 'text',
      hint_text: 'First hint',
      image_url: null,
      image_caption: null,
    })
    expect(hints[1].hint_order).toBe(2)
    expect(hints[1].hint_text).toBe('Second hint')
    expect(hints[2].hint_order).toBe(3)
    expect(hints[3].hint_order).toBe(4)
  })

  it('returns empty array when no hints are set', () => {
    const puzzle = makePuzzle()
    const hints = getHintsFromPuzzle(puzzle)
    expect(hints).toHaveLength(0)
  })

  it('skips null hints in the middle', () => {
    const puzzle = makePuzzle({
      hint_1: 'First hint',
      hint_3: 'Third hint',
    })
    const hints = getHintsFromPuzzle(puzzle)

    expect(hints).toHaveLength(2)
    expect(hints[0].hint_order).toBe(1)
    expect(hints[0].hint_text).toBe('First hint')
    expect(hints[1].hint_order).toBe(3)
    expect(hints[1].hint_text).toBe('Third hint')
  })

  it('returns only hint_4 when others are null', () => {
    const puzzle = makePuzzle({ hint_4: 'Only last hint' })
    const hints = getHintsFromPuzzle(puzzle)

    expect(hints).toHaveLength(1)
    expect(hints[0].hint_order).toBe(4)
    expect(hints[0].hint_text).toBe('Only last hint')
  })

  it('uses puzzle id in hint id format', () => {
    const puzzle = makePuzzle({ id: 'abc-def', hint_1: 'A hint' })
    const hints = getHintsFromPuzzle(puzzle)

    expect(hints[0].id).toBe('abc-def-hint-1')
    expect(hints[0].puzzle_id).toBe('abc-def')
  })

  it('sets image_url and image_caption to null (text-only hints)', () => {
    const puzzle = makePuzzle({ hint_1: 'Text hint' })
    const hints = getHintsFromPuzzle(puzzle)

    expect(hints[0].image_url).toBeNull()
    expect(hints[0].image_caption).toBeNull()
    expect(hints[0].content_type).toBe('text')
  })
})

describe('calculatePercentileBeat', () => {
  it('returns high percentile for user who wins in 1 guess', () => {
    const userDist = { 1: 10 }
    const globalDist = { 1: 5, 2: 20, 3: 30, 4: 25, 5: 20 }
    const result = calculatePercentileBeat(userDist, globalDist)

    // User avg = 1, players with > 1 guess: 20+30+25+20 = 95 out of 100
    expect(result).toBe(95)
  })

  it('returns 0 for user with worst possible average', () => {
    const userDist = { 5: 10 }
    const globalDist = { 1: 10, 2: 20, 3: 30, 4: 25, 5: 15 }
    const result = calculatePercentileBeat(userDist, globalDist)

    // User avg = 5, no global players with > 5 guesses
    expect(result).toBe(0)
  })

  it('returns null when user has no wins', () => {
    const userDist = {}
    const globalDist = { 1: 10, 2: 20 }
    expect(calculatePercentileBeat(userDist, globalDist)).toBeNull()
  })

  it('returns null when global has no wins', () => {
    const userDist = { 1: 5 }
    const globalDist = {}
    expect(calculatePercentileBeat(userDist, globalDist)).toBeNull()
  })

  it('handles average user correctly', () => {
    const userDist = { 3: 10 }
    const globalDist = { 1: 10, 2: 20, 3: 30, 4: 25, 5: 15 }
    const result = calculatePercentileBeat(userDist, globalDist)

    // User avg = 3, players with > 3 guesses: 25+15 = 40 out of 100
    expect(result).toBe(40)
  })

  it('handles mixed user distribution', () => {
    const userDist = { 2: 5, 4: 5 }
    const globalDist = { 1: 10, 2: 20, 3: 30, 4: 25, 5: 15 }
    const result = calculatePercentileBeat(userDist, globalDist)

    // User avg = (2*5 + 4*5)/10 = 30/10 = 3.0
    // Players with > 3 guesses: 25+15 = 40 out of 100
    expect(result).toBe(40)
  })

  it('returns rounded integer', () => {
    const userDist = { 2: 1 }
    const globalDist = { 1: 1, 2: 1, 3: 1 }
    const result = calculatePercentileBeat(userDist, globalDist)

    // User avg = 2, players with > 2: 1 out of 3 = 33.33...
    expect(result).toBe(33)
  })
})
