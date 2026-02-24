import { test, expect } from '@playwright/test';
import {
  acceptCookieConsent,
  clearAllStorage,
  waitForGameLoad,
  extractCorrectAnswer,
  submitGuess,
  makeIncorrectGuess,
  mockSupabaseClientCalls,
  SEARCH_TERMS,
} from '../fixtures/helpers';

test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await page.reload();
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);
  });

  test('should show toast on incorrect guess', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Make an incorrect guess
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    // Toast should appear with role="status"
    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible({ timeout: 2000 });

    // Check for incorrect/partial message
    const toastText = await toast.textContent();
    expect(
      toastText?.includes('Not quite') || toastText?.includes('Close!')
    ).toBe(true);
  });

  test('should show green toast on correct guess', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Make the correct guess
    await submitGuess(page, correctAnswer);

    // Green toast should appear
    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible({ timeout: 2000 });
    await expect(toast).toContainText('Correct!');

    // Should have green background (semantic token)
    await expect(toast).toHaveClass(/bg-success/);
  });

  test('should show red toast on completely incorrect guess', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Make an incorrect guess with a term unlikely to be a partial match
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible({ timeout: 2000 });

    const toastText = await toast.textContent();
    const classes = await toast.getAttribute('class');

    // Should be either red (incorrect) or yellow (partial) — using semantic tokens
    if (toastText?.includes('Not quite')) {
      expect(classes).toContain('bg-error');
    } else if (toastText?.includes('Close!')) {
      expect(classes).toContain('bg-warning');
    }
  });

  test('should auto-dismiss toast after approximately 2 seconds', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Make an incorrect guess
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    // Toast should appear
    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible({ timeout: 2000 });

    // Wait for auto-dismiss (2s for incorrect, 2.5s for correct + buffer)
    await expect(toast).not.toBeVisible({ timeout: 4000 });
  });

  test('should replace previous toast when making consecutive guesses', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Make first incorrect guess
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    // Toast appears
    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible({ timeout: 2000 });

    // Make second incorrect guess quickly (before first toast dismisses)
    await makeIncorrectGuess(page, SEARCH_TERMS[1], correctAnswer);

    // Should still only have one toast visible (no stacking)
    const toastCount = await page.locator('[role="status"]').count();
    expect(toastCount).toBe(1);
  });
});
