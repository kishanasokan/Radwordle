import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_HOURS = 24

const VALID_CATEGORIES = ['bug', 'suggestion', 'content', 'other']

function hashFingerprint(ip: string): string {
  return crypto.createHash('sha256').update(ip + 'radiordle-salt').digest('hex').slice(0, 16)
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, message, pageContext } = body

    // Validate required fields
    if (!category || !message) {
      return NextResponse.json(
        { error: 'Category and message are required' },
        { status: 400 }
      )
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message too short (min 10 characters)' },
        { status: 400 }
      )
    }

    // Get fingerprint for rate limiting
    const ip = getClientIP(request)
    const fingerprint = hashFingerprint(ip)

    // Check rate limit
    const windowStart = new Date()
    windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS)

    const { count, error: countError } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('fingerprint', fingerprint)
      .gte('created_at', windowStart.toISOString())

    if (countError) {
      console.error('Rate limit check error:', countError)
      return NextResponse.json(
        { error: 'Failed to check rate limit' },
        { status: 500 }
      )
    }

    if (count !== null && count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Insert feedback
    const { error: insertError } = await supabase
      .from('feedback')
      .insert({
        category,
        message: message.trim(),
        page_context: pageContext || null,
        fingerprint,
      })

    if (insertError) {
      console.error('Feedback insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
