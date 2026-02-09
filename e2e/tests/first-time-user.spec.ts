import { test, expect } from '@playwright/test';
import {
  extractCorrectAnswer,
  acceptCookieConsent,
  clearAllStorage,
  submitGuess,
  makeIncorrectGuess,
  waitForGameLoad,
  mockSupabaseClientCalls,
  SEARCH_TERMS,
} from '../fixtures/helpers';

test.describe('First-Time User Journey', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await page.reload();
  });

  test('should show cookie consent banner on first visit', async ({ page }) => {
    // Cookie consent banner appears after a small delay
    await expect(page.getByText('Data Storage Notice')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Radiordle stores your game progress')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  });

  test('should dismiss cookie consent and save to localStorage', async ({ page }) => {
    await acceptCookieConsent(page);

    // Verify consent saved to localStorage
    const consent = await page.evaluate(() =>
      localStorage.getItem('radiordle_cookie_consent')
    );
    expect(consent).toBe('accepted');

    // Verify banner is gone
    await expect(page.getByText('Data Storage Notice')).not.toBeVisible();
  });

  test('should complete full game flow from start to win', async ({ page }) => {
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);

    // Extract the correct answer from the page
    const correctAnswer = await extractCorrectAnswer(page);

    // Verify initial state
    await expect(page.getByText('Guesses: 0 / 5').first()).toBeVisible();
    await expect(page.getByText("What's the Diagnosis?").first()).toBeVisible();

    // Make an incorrect guess first
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    // Verify guess counter updated
    await expect(page.getByText('Guesses: 1 / 5').first()).toBeVisible();

    // Make the correct guess
    await submitGuess(page, correctAnswer);

    // Verify win modal appears
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(`The correct answer was: ${correctAnswer}`).first()).toBeVisible();
    await expect(page.getByText(/You solved.*Day.*in 2/).first()).toBeVisible();

    // Verify View Results button is available
    const closeBtn = page.getByRole('button', { name: 'Close' }).first();
    await closeBtn.click();

    // "View Results" button should be visible after closing modal
    await expect(page.getByRole('button', { name: 'View Results' }).first()).toBeVisible();
  });

  test('should persist game state across page refresh', async ({ page }) => {
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Make a guess
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);
    await expect(page.getByText('Guesses: 1 / 5').first()).toBeVisible();

    // Win the game
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Refresh the page
    await page.reload();

    // Game state should be restored - should show completed state
    await expect(page.getByText('Congratulations! The answer was:').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('button', { name: 'View Results' }).first()).toBeVisible();
  });

  test('should show correct statistics after winning', async ({ page }) => {
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Win in 1 guess
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // The results modal (inline in GameClient) should show stats
    // Check for statistics section in the modal
    const modal = page.locator('.fixed.inset-0.bg-black');
    await expect(modal.getByText('Statistics')).toBeVisible();

    // Verify stats: 1 game played
    const playedStat = modal.locator('text=Played').locator('..');
    await expect(playedStat).toContainText('1');

    // Verify streak
    const streakStat = modal.locator('text=Current Streak').locator('..');
    await expect(streakStat).toContainText('1');
  });
});
