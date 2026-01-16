import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'radiordle_pid';
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

/**
 * POST /api/set-player-id
 *
 * Sets the player ID cookie via HTTP header (not JavaScript).
 * This is important for Safari's ITP which treats JS-set cookies
 * as ephemeral and may delete them after 7 days.
 *
 * HTTP-set cookies are treated as "server-side" and persist longer.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId } = body;

    if (!playerId || typeof playerId !== 'string') {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    // Validate format
    if (!/^[a-z0-9-]+$/i.test(playerId) || playerId.length > 50) {
      return NextResponse.json(
        { error: 'Invalid playerId format' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Set cookie via HTTP header - this survives Safari ITP better
    response.cookies.set({
      name: COOKIE_NAME,
      value: playerId,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Must be false so JS can read it for recovery
    });

    return response;
  } catch (error) {
    console.error('Error setting player ID cookie:', error);
    return NextResponse.json(
      { error: 'Failed to set cookie' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/set-player-id
 *
 * Returns the current player ID from the cookie (if any).
 * Useful for debugging.
 */
export async function GET(request: NextRequest) {
  const playerId = request.cookies.get(COOKIE_NAME)?.value;

  return NextResponse.json({
    playerId: playerId || null,
    hasCookie: !!playerId,
  });
}
