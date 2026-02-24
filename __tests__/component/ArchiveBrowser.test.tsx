// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArchiveBrowser from '@/components/ArchiveBrowser'

// Mock gameLogic - getDayNumber returns a small number for testing
vi.mock('@/lib/gameLogic', () => ({
  getDayNumber: vi.fn(() => 2),
  dayNumberToDate: vi.fn((dayNumber: number) => {
    const epoch = new Date('2025-12-29T05:00:00Z')
    return new Date(epoch.getTime() + dayNumber * 24 * 60 * 60 * 1000)
  }),
}))

// Mock localStorage - getDayStatus
const mockGetDayStatus = vi.fn()
vi.mock('@/lib/localStorage', () => ({
  getDayStatus: (...args: unknown[]) => mockGetDayStatus(...args),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetDayStatus.mockImplementation((day: number) => {
    if (day === 0) return 'won'
    if (day === 1) return 'lost'
    return 'not_played'
  })
})

describe('ArchiveBrowser', () => {
  it('renders day list in reverse order (newest first)', () => {
    render(<ArchiveBrowser />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3) // Days 2, 1, 0

    // First link is today (day 2)
    expect(links[0]).toHaveTextContent('Day 3')
    // Last link is day 0
    expect(links[2]).toHaveTextContent('Day 1')
  })

  it('shows TODAY badge for current day', () => {
    render(<ArchiveBrowser />)

    expect(screen.getByText('TODAY')).toBeInTheDocument()
  })

  it('links today to home page (/)', () => {
    render(<ArchiveBrowser />)

    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/')
  })

  it('links past days to /archive/[day]', () => {
    render(<ArchiveBrowser />)

    const links = screen.getAllByRole('link')
    expect(links[1]).toHaveAttribute('href', '/archive/1')
    expect(links[2]).toHaveAttribute('href', '/archive/0')
  })

  it('shows success styling for won games', () => {
    render(<ArchiveBrowser />)

    // Won games (day 0) have bg-success color and a checkmark SVG
    const links = screen.getAllByRole('link')
    const wonLink = links[2] // Day 0 is last (reverse order)
    expect(wonLink.className).toContain('bg-success')
    expect(wonLink.querySelector('svg')).toBeInTheDocument()
  })

  it('shows error styling for lost games', () => {
    render(<ArchiveBrowser />)

    // Lost games (day 1) have bg-error color and an X SVG
    const links = screen.getAllByRole('link')
    const lostLink = links[1] // Day 1 is middle
    expect(lostLink.className).toContain('bg-error')
    expect(lostLink.querySelector('svg')).toBeInTheDocument()
  })

  it('shows default styling for unplayed games', () => {
    render(<ArchiveBrowser />)

    // Unplayed games (day 2, today) have bg-surface color and no SVG icon
    const links = screen.getAllByRole('link')
    const unplayedLink = links[0] // Day 2 (today) is first
    expect(unplayedLink.className).toContain('bg-surface')
    expect(unplayedLink.querySelector('svg')).not.toBeInTheDocument()
  })

  it('displays day numbers starting from 1 (not 0)', () => {
    render(<ArchiveBrowser />)

    expect(screen.getByText('Day 3')).toBeInTheDocument()
    expect(screen.getByText('Day 2')).toBeInTheDocument()
    expect(screen.getByText('Day 1')).toBeInTheDocument()
  })
})
