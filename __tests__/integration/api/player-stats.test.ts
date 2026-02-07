import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key'
  return { mockFrom }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { GET } from '@/app/api/player-stats/route'
import { NextRequest } from 'next/server'

function createRequest(hash?: string, headers: Record<string, string> = {}): NextRequest {
  const url = hash
    ? `http://localhost:3000/api/player-stats?hash=${hash}`
    : 'http://localhost:3000/api/player-stats'
  return new NextRequest(new URL(url), {
    method: 'GET',
    headers: {
      'x-forwarded-for': '1.2.3.4',
      ...headers,
    },
  })
}

function setupMockQueries(config: {
  results?: unknown[] | null;
  resultsError?: unknown;
  schedules?: unknown[] | null;
  puzzles?: unknown[] | null;
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'game_results') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: config.results ?? null,
              error: config.resultsError ?? null,
            }),
          }),
        }),
      }
    }
    if (table === 'puzzle_schedule') {
      return {
        select: vi.fn().mockResolvedValue({
          data: config.schedules ?? [],
          error: null,
        }),
      }
    }
    if (table === 'puzzles') {
      return {
        select: vi.fn().mockResolvedValue({
          data: config.puzzles ?? [],
          error: null,
        }),
      }
    }
    return { select: vi.fn() }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/player-stats', () => {
  it('returns 400 when hash parameter is missing', async () => {
    const req = createRequest()
    const res = await GET(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('required')
  })

  it('returns 400 for invalid hash format (special chars)', async () => {
    const req = createRequest('abc!@#$%')
    const res = await GET(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid')
  })

  it('returns 400 for hash longer than 50 characters', async () => {
    const req = createRequest('a'.repeat(51))
    const res = await GET(req)

    expect(res.status).toBe(400)
  })

  it('returns 404 when no game history found', async () => {
    setupMockQueries({ results: [] })

    const req = createRequest('valid-hash-123')
    const res = await GET(req)

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain('No game history')
  })

  it('returns calculated stats for valid hash with results', async () => {
    setupMockQueries({
      results: [
        { puzzle_number: 1, won: true, guess_count: 2, played_at: '2026-01-01T00:00:00Z' },
        { puzzle_number: 2, won: true, guess_count: 3, played_at: '2026-01-02T00:00:00Z' },
        { puzzle_number: 3, won: false, guess_count: 5, played_at: '2026-01-03T00:00:00Z' },
      ],
      schedules: [
        { day_number: 0, puzzle_id: 'p1' },
        { day_number: 1, puzzle_id: 'p2' },
        { day_number: 2, puzzle_id: 'p3' },
      ],
      puzzles: [
        { id: 'p1', puzzle_number: 1 },
        { id: 'p2', puzzle_number: 2 },
        { id: 'p3', puzzle_number: 3 },
      ],
    })

    const req = createRequest('valid-hash-123')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.gamesPlayed).toBe(3)
    expect(json.gamesWon).toBe(2)
    expect(json.guessDistribution).toEqual({ 2: 1, 3: 1 })
    expect(json.lastPlayedDay).toBe(2)
  })

  it('returns 500 when database query fails', async () => {
    setupMockQueries({
      resultsError: { code: 'ERR', message: 'DB error' },
    })

    const req = createRequest('valid-hash-123')
    const res = await GET(req)

    expect(res.status).toBe(500)
  })
})
