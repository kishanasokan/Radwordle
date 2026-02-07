import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelect, mockInsert, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockFrom = vi.fn()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key'
  return { mockSelect, mockInsert, mockFrom }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { POST } from '@/app/api/feedback/route'
import { NextRequest } from 'next/server'

function createRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/feedback'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default mock: rate limit check returns 0 count, insert succeeds
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
  }
  mockSelect.mockReturnValue(selectChain)

  mockInsert.mockResolvedValue({ error: null })

  mockFrom.mockImplementation(() => {
    return {
      select: mockSelect,
      insert: mockInsert,
    }
  })
})

describe('POST /api/feedback', () => {
  it('returns success for valid submission', async () => {
    const req = createRequest({
      category: 'bug',
      message: 'This is a valid bug report with enough length',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 400 when category is missing', async () => {
    const req = createRequest({ message: 'Some message here enough chars' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('required')
  })

  it('returns 400 when message is missing', async () => {
    const req = createRequest({ category: 'bug' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('required')
  })

  it('returns 400 for invalid category', async () => {
    const req = createRequest({
      category: 'invalid-category',
      message: 'Some message here enough chars',
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid category')
  })

  it('returns 400 when message too short', async () => {
    const req = createRequest({
      category: 'bug',
      message: 'short',
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('too short')
  })

  it('returns 400 when message too long', async () => {
    const req = createRequest({
      category: 'bug',
      message: 'a'.repeat(1001),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('too long')
  })

  it('returns 429 when rate limited', async () => {
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 3, error: null }),
    }
    mockSelect.mockReturnValue(selectChain)

    const req = createRequest({
      category: 'bug',
      message: 'Valid message here with enough characters',
    })
    const res = await POST(req)

    expect(res.status).toBe(429)
  })

  it('returns 500 when supabase insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { code: 'ERR', message: 'DB error' } })

    const req = createRequest({
      category: 'suggestion',
      message: 'A valid suggestion message here',
    })
    const res = await POST(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Failed to submit')
  })

  it('accepts all valid categories', async () => {
    for (const category of ['bug', 'suggestion', 'content', 'other']) {
      vi.clearAllMocks()
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }
      mockSelect.mockReturnValue(selectChain)
      mockInsert.mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })

      const req = createRequest({
        category,
        message: 'Valid message with enough characters here',
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
    }
  })

  it('extracts client IP from x-forwarded-for header', async () => {
    const req = createRequest(
      {
        category: 'bug',
        message: 'Valid message with enough characters here',
      },
      { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
    )
    await POST(req)

    // Verify insert was called (we can't easily check the fingerprint hash,
    // but we verify it doesn't crash with the header)
    expect(mockInsert).toHaveBeenCalled()
  })
})
