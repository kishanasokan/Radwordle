// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CookieConsent from '@/components/CookieConsent'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CookieConsent', () => {
  it('shows banner when consent not yet given', async () => {
    render(<CookieConsent />)

    // Advance past the 100ms delay
    await act(async () => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByText('Data Storage Notice')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('does not show banner when consent previously accepted', async () => {
    localStorage.setItem('radiordle_cookie_consent', 'accepted')

    render(<CookieConsent />)

    await act(async () => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.queryByText('Data Storage Notice')).not.toBeInTheDocument()
  })

  it('hides banner and saves consent when Continue is clicked', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()

    render(<CookieConsent />)

    // Wait for the 100ms timer to fire
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(screen.getByText('Data Storage Notice')).toBeInTheDocument()

    await user.click(screen.getByText('Continue'))

    expect(screen.queryByText('Data Storage Notice')).not.toBeInTheDocument()
    expect(localStorage.getItem('radiordle_cookie_consent')).toBe('accepted')
  })

  it('calls onConsentChange callback when accepted', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const onConsentChange = vi.fn()

    render(<CookieConsent onConsentChange={onConsentChange} />)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    await user.click(screen.getByText('Continue'))

    expect(onConsentChange).toHaveBeenCalledWith(true)
  })

  it('is not visible initially (before timer fires)', () => {
    render(<CookieConsent />)

    // Before the 100ms delay fires
    expect(screen.queryByText('Data Storage Notice')).not.toBeInTheDocument()
  })
})
