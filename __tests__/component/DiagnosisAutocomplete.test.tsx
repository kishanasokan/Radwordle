// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiagnosisAutocomplete from '@/components/DiagnosisAutocomplete'
import type { Condition } from '@/lib/supabase'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key'
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

const mockConditions: Condition[] = [
  { id: '1', name: 'Pneumothorax', category: 'Chest', aliases: null },
  { id: '2', name: 'Pneumonia', category: 'Chest', aliases: null },
  { id: '3', name: 'Pleural Effusion', category: 'Chest', aliases: null },
  { id: '4', name: 'Pulmonary Embolism', category: 'Chest', aliases: null },
  { id: '5', name: 'Fracture', category: 'Bone', aliases: null },
  { id: '6', name: 'Atrial Septal Defect', category: 'Heart', aliases: null },
]

const defaultProps = {
  conditions: mockConditions,
  onSubmit: vi.fn(),
  onDropdownStateChange: vi.fn(),
  previousGuesses: [] as string[],
  isMobile: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DiagnosisAutocomplete', () => {
  describe('filtering', () => {
    it('shows no dropdown when input is empty', () => {
      render(<DiagnosisAutocomplete {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /Pneumothorax/i })).not.toBeInTheDocument()
    })

    it('filters conditions by input text', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('Diagnosis...'), 'pneu')
      expect(screen.getByText('Pneumothorax')).toBeInTheDocument()
      expect(screen.getByText('Pneumonia')).toBeInTheDocument()
      expect(screen.queryByText('Fracture')).not.toBeInTheDocument()
    })

    it('filters case-insensitively', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('Diagnosis...'), 'PNEU')
      expect(screen.getByText('Pneumothorax')).toBeInTheDocument()
    })

    it('limits results to 40 items', async () => {
      const manyConditions: Condition[] = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        name: `Test Condition ${i}`,
        category: 'Test',
        aliases: null,
      }))

      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} conditions={manyConditions} />)

      await user.type(screen.getByPlaceholderText('Diagnosis...'), 'Test')

      const buttons = screen.getAllByRole('button', { name: /Test Condition/ })
      expect(buttons.length).toBe(40)
      expect(screen.getByText(/Showing first 40 results/)).toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('arrow down moves selection through list', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'Pneu')
      await user.keyboard('{ArrowDown}')

      // First item selected (Pneumonia or Pneumothorax)
      const buttons = screen.getAllByRole('button', { name: /Pneum/ })
      expect(buttons[0]).toHaveClass('bg-blue-100')
    })

    it('escape closes dropdown', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'Pneu')
      expect(screen.getByText('Pneumothorax')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByText('Pneumothorax')).not.toBeInTheDocument()
    })

    it('enter on selected item fills the input', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'Pneu')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      // Input should now contain the selected condition name
      expect((input as HTMLInputElement).value).toMatch(/Pneum/)
    })

    it('skips previously guessed items when navigating', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisAutocomplete
          {...defaultProps}
          previousGuesses={['Pneumothorax']}
        />
      )

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'Pneu')
      await user.keyboard('{ArrowDown}')

      // Should skip Pneumothorax and select Pneumonia
      const buttons = screen.getAllByRole('button', { name: /Pneum/ })
      const nonDisabledSelected = buttons.find(
        btn => btn.classList.contains('bg-blue-100') && !btn.hasAttribute('disabled')
      )
      expect(nonDisabledSelected).toBeDefined()
    })
  })

  describe('validation', () => {
    it('shows error for text not matching any condition', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'NotARealCondition')
      await user.click(screen.getByText('Submit'))

      expect(screen.getByText('Please select a diagnosis from the list')).toBeInTheDocument()
    })

    it('shows error for previously guessed condition', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisAutocomplete
          {...defaultProps}
          previousGuesses={['Pneumothorax']}
        />
      )

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'Pneumothorax')
      await user.click(screen.getByText('Submit'))

      expect(screen.getByText('You have already guessed this diagnosis')).toBeInTheDocument()
    })

    it('clears validation error when user types', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'Invalid')
      await user.click(screen.getByText('Submit'))

      expect(screen.getByText('Please select a diagnosis from the list')).toBeInTheDocument()

      await user.type(input, 'x')
      expect(screen.queryByText('Please select a diagnosis from the list')).not.toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('calls onSubmit with exact condition name on valid submission', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} onSubmit={onSubmit} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'pneumothorax')
      await user.click(screen.getByText('Submit'))

      expect(onSubmit).toHaveBeenCalledWith('Pneumothorax')
    })

    it('clears input after successful submission', async () => {
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'pneumothorax')
      await user.click(screen.getByText('Submit'))

      expect(input).toHaveValue('')
    })

    it('does not submit empty input', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} onSubmit={onSubmit} />)

      await user.click(screen.getByText('Submit'))
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('submits via Enter key when dropdown is closed', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<DiagnosisAutocomplete {...defaultProps} onSubmit={onSubmit} />)

      const input = screen.getByPlaceholderText('Diagnosis...')
      await user.type(input, 'pneumothorax')
      // Close dropdown first
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')

      expect(onSubmit).toHaveBeenCalledWith('Pneumothorax')
    })
  })

  describe('previously guessed items', () => {
    it('shows "(Previously selected)" label on guessed items', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisAutocomplete
          {...defaultProps}
          previousGuesses={['Pneumothorax']}
        />
      )

      await user.type(screen.getByPlaceholderText('Diagnosis...'), 'Pneu')
      expect(screen.getByText('(Previously selected)')).toBeInTheDocument()
    })

    it('disables previously guessed dropdown items', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisAutocomplete
          {...defaultProps}
          previousGuesses={['Pneumothorax']}
        />
      )

      await user.type(screen.getByPlaceholderText('Diagnosis...'), 'Pneu')
      const buttons = screen.getAllByRole('button', { name: /Pneum/ })
      const disabledBtn = buttons.find(btn => btn.hasAttribute('disabled'))
      expect(disabledBtn).toBeDefined()
    })
  })

  describe('click outside', () => {
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <DiagnosisAutocomplete {...defaultProps} />
        </div>
      )

      await user.type(screen.getByPlaceholderText('Diagnosis...'), 'Pneu')
      expect(screen.getByText('Pneumothorax')).toBeInTheDocument()

      await user.click(screen.getByTestId('outside'))
      expect(screen.queryByText('Pneumothorax')).not.toBeInTheDocument()
    })
  })
})
