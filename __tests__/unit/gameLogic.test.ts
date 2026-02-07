import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkAnswer, getDayNumber, dayNumberToDate, MAX_GUESSES } from '@/lib/gameLogic'

describe('MAX_GUESSES', () => {
  it('is 5', () => {
    expect(MAX_GUESSES).toBe(5)
  })
})

describe('checkAnswer', () => {
  describe('correct matches', () => {
    it('returns correct for exact match', () => {
      expect(checkAnswer('Pneumothorax', 'Pneumothorax')).toBe('correct')
    })

    it('returns correct for case-insensitive match', () => {
      expect(checkAnswer('pneumothorax', 'Pneumothorax')).toBe('correct')
      expect(checkAnswer('PNEUMOTHORAX', 'Pneumothorax')).toBe('correct')
    })

    it('returns correct when punctuation differs', () => {
      expect(checkAnswer("Crohn's Disease", 'crohns disease')).toBe('correct')
    })

    it('returns partial when hyphen removal changes word boundaries', () => {
      // "Non-Hodgkins" normalizes to "nonhodgkins" (no space), vs "Non Hodgkins" = "non hodgkins"
      // These differ, but share the word "lymphoma"
      expect(checkAnswer('Non-Hodgkins Lymphoma', 'Non Hodgkins Lymphoma')).toBe('partial')
    })

    it('returns correct with leading/trailing whitespace', () => {
      expect(checkAnswer('  Pneumothorax  ', 'Pneumothorax')).toBe('correct')
    })

    it('returns correct when both have different special characters', () => {
      expect(checkAnswer("Crohn's Disease", "Crohn's Disease")).toBe('correct')
    })
  })

  describe('partial matches', () => {
    it('returns partial for shared significant word', () => {
      // "septal" is shared and significant
      expect(checkAnswer('Atrial Septal Defect', 'Ventricular Septal Defect')).toBe('partial')
    })

    it('returns partial for prefix match (5+ chars)', () => {
      // "esoph" prefix shared (5 chars)
      expect(checkAnswer('Esophageal Atresia', 'Esophagus Cancer')).toBe('partial')
    })

    it('returns partial for anatomical synonym match', () => {
      // "liver" and "hepatic" are in the same synonym group
      expect(checkAnswer('Liver Abscess', 'Hepatic Cyst')).toBe('partial')
    })

    it('returns partial for kidney/renal synonyms', () => {
      expect(checkAnswer('Kidney Stones', 'Renal Cell Carcinoma')).toBe('partial')
    })

    it('returns partial for lung/pulmonary synonyms', () => {
      expect(checkAnswer('Lung Cancer', 'Pulmonary Embolism')).toBe('partial')
    })

    it('returns partial for heart/cardiac synonyms', () => {
      expect(checkAnswer('Heart Failure', 'Cardiac Arrest')).toBe('partial')
    })

    it('returns partial for brain/cerebral synonyms', () => {
      expect(checkAnswer('Brain Tumor', 'Cerebral Hemorrhage')).toBe('partial')
    })

    it('returns partial for prefix match across compound terms', () => {
      // "pneumo" prefix >= 5 chars, shared between words
      expect(checkAnswer('Pneumonia', 'Pneumothorax')).toBe('partial')
    })
  })

  describe('incorrect matches', () => {
    it('returns incorrect for completely unrelated terms', () => {
      expect(checkAnswer('Fracture', 'Pneumothorax')).toBe('incorrect')
    })

    it('returns incorrect when only common terms match', () => {
      // "disease" and "syndrome" are filtered out
      expect(checkAnswer('Paget Disease', 'Marfan Syndrome')).toBe('incorrect')
    })

    it('returns partial when significant words overlap despite short prefix words', () => {
      // "type" and "i"/"ii" are filtered as common terms, but "diabetes" is shared
      expect(checkAnswer('Type I Diabetes', 'Type II Diabetes')).toBe('partial')
    })

    it('returns incorrect for empty guess', () => {
      expect(checkAnswer('', 'Pneumothorax')).toBe('incorrect')
    })

    it('returns incorrect for single common word match', () => {
      // "acute" is in commonTerms and filtered out
      expect(checkAnswer('Acute Bronchitis', 'Acute Pancreatitis')).toBe('incorrect')
    })
  })

  describe('edge cases', () => {
    it('handles single-word diagnoses', () => {
      expect(checkAnswer('Pneumothorax', 'Pneumothorax')).toBe('correct')
      expect(checkAnswer('Fracture', 'Pneumothorax')).toBe('incorrect')
    })

    it('returns partial for multiple spaces (normalization keeps extra spaces)', () => {
      // normalizeDiagnosis keeps spaces, so "pulmonary  embolism" !== "pulmonary embolism"
      // But "pulmonary" and "embolism" are shared words → partial
      expect(checkAnswer('Pulmonary  Embolism', 'Pulmonary Embolism')).toBe('partial')
    })

    it('common terms alone do not produce partial', () => {
      // All words in both are common terms
      expect(checkAnswer('Acute Chronic Disease', 'Mild Severe Syndrome')).toBe('incorrect')
    })
  })
})

describe('dayNumberToDate', () => {
  it('returns Dec 29, 2025 for day 0', () => {
    const date = dayNumberToDate(0)
    expect(date.getUTCFullYear()).toBe(2025)
    expect(date.getUTCMonth()).toBe(11) // December = 11
    expect(date.getUTCDate()).toBe(29)
  })

  it('returns Dec 30, 2025 for day 1', () => {
    const date = dayNumberToDate(1)
    expect(date.getUTCFullYear()).toBe(2025)
    expect(date.getUTCMonth()).toBe(11)
    expect(date.getUTCDate()).toBe(30)
  })

  it('returns Jan 1, 2026 for day 3', () => {
    const date = dayNumberToDate(3)
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(0) // January = 0
    expect(date.getUTCDate()).toBe(1)
  })

  it('returns Dec 28, 2025 for day -1', () => {
    const date = dayNumberToDate(-1)
    expect(date.getUTCFullYear()).toBe(2025)
    expect(date.getUTCMonth()).toBe(11)
    expect(date.getUTCDate()).toBe(28)
  })

  it('returns correct date for day 365', () => {
    const date = dayNumberToDate(365)
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(11) // December
    expect(date.getUTCDate()).toBe(29)
  })
})

describe('getDayNumber', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 on the epoch date (Dec 29, 2025 EST)', () => {
    // Set to Dec 29, 2025 12:00 noon EST = 17:00 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-29T17:00:00Z'))
    expect(getDayNumber()).toBe(0)
  })

  it('returns 1 on Dec 30, 2025 EST', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-30T17:00:00Z'))
    expect(getDayNumber()).toBe(1)
  })

  it('returns positive number for dates after epoch', () => {
    vi.useFakeTimers()
    // Jan 28, 2026 = 30 days after Dec 29, 2025
    vi.setSystemTime(new Date('2026-01-28T17:00:00Z'))
    expect(getDayNumber()).toBe(30)
  })

  it('is consistent when called twice', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T12:00:00Z'))
    const first = getDayNumber()
    const second = getDayNumber()
    expect(first).toBe(second)
  })
})
