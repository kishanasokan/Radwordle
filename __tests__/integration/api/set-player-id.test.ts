import { describe, it, expect } from 'vitest'
import { POST, GET } from '@/app/api/set-player-id/route'
import { NextRequest } from 'next/server'

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/set-player-id'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createGetRequest(cookies: Record<string, string> = {}): NextRequest {
  const headers = new Headers()
  if (Object.keys(cookies).length > 0) {
    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
    headers.set('cookie', cookieStr)
  }
  return new NextRequest(new URL('http://localhost:3000/api/set-player-id'), {
    method: 'GET',
    headers,
  })
}

describe('POST /api/set-player-id', () => {
  it('sets cookie and returns success for valid playerId', async () => {
    const req = createPostRequest({ playerId: 'abc-123-def' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // Check cookie was set in response
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('radiordle_pid=abc-123-def')
    expect(setCookie).toContain('Path=/')
    // Next.js lowercases samesite value
    expect(setCookie!.toLowerCase()).toContain('samesite=lax')
  })

  it('returns 400 when playerId is missing', async () => {
    const req = createPostRequest({})
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('required')
  })

  it('returns 400 when playerId is not a string', async () => {
    const req = createPostRequest({ playerId: 123 })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid playerId format (special chars)', async () => {
    const req = createPostRequest({ playerId: 'abc!@#$%' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid')
  })

  it('returns 400 for playerId longer than 50 characters', async () => {
    const req = createPostRequest({ playerId: 'a'.repeat(51) })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('accepts playerId at max length (50 chars)', async () => {
    const req = createPostRequest({ playerId: 'a'.repeat(50) })
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('sets maxAge to 1 year', async () => {
    const req = createPostRequest({ playerId: 'test-id' })
    const res = await POST(req)

    const setCookie = res.headers.get('set-cookie')
    const oneYear = 365 * 24 * 60 * 60
    expect(setCookie).toContain(`Max-Age=${oneYear}`)
  })
})

describe('GET /api/set-player-id', () => {
  it('returns playerId from cookie when present', async () => {
    const req = createGetRequest({ radiordle_pid: 'my-player-id' })
    const res = await GET(req)
    const json = await res.json()

    expect(json.playerId).toBe('my-player-id')
    expect(json.hasCookie).toBe(true)
  })

  it('returns null when no cookie present', async () => {
    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(json.playerId).toBeNull()
    expect(json.hasCookie).toBe(false)
  })
})
