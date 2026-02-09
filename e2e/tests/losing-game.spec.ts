import { test, expect } from '@playwright/test';
import {
  extractCorrectAnswer,
  acceptCookieConsent,
  clearAllStorage,
  makeIncorrectGuess,
  waitForGameLoad,
  mockSupabaseClientCalls,
  SEARCH_TERMS,
} from '../fixtures/helpers';

test.describe('Losing Game Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await page.reload();
  });

  test('should show Game Over after 5 incorrect guesses', async ({ page }) => {
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Make 5 incorrect guesses using different search terms
    for (let i = 0; i < 5; i++) {
      await makeIncorrectGuess(page, SEARCH_TERMS[i], correctAnswer);

      if (i < 4) {
        // Verify guess counter updates
        await expect(page.getByText(`Guesses: ${i + 1} / 5`).first()).toBeVisible();
      }
    }

    // Verify Game Over modal appears
    await expect(page.getByText('Game Over').first()).toBeVisible({ timeout: 3000 });

    // Verify correct answer is shown
    await expect(page.getByText(`The correct answer was: ${correctAnswer}`).first()).toBeVisible();
  });

  test('should reveal hints after each incorrect guess', async ({ page }) => {
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Initially no hints visible
    const hintContainers = page.locator('.backdrop-blur-sm.rounded-lg');

    // Make incorrect guesses and verify hints appear
    for (let i = 0; i < 4; i++) {
      await makeIncorrectGuess(page, SEARCH_TERMS[i], correctAnswer);

      // After each wrong guess, a new hint should be revealed
      // The hint count increases with each guess (up to 4 hints)
      const expectedHints = i + 1;
      await expect(hintContainers).toHaveCount(expectedHints, { timeout: 3000 });
    }

    // Make the 5th wrong guess
    await makeIncorrectGuess(page, SEARCH_TERMS[4], correctAnswer);

    // Game should be over - modal appears
    await expect(page.getByText('Game Over').first()).toBeVisible({ timeout: 3000 });
  });

  test('should not allow more guesses after game over', async ({ page }) => {
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Make 5 incorrect guesses
    for (let i = 0; i < 5; i++) {
      await makeIncorrectGuess(page, SEARCH_TERMS[i], correctAnswer);
    }

    // Close the game over modal
    await expect(page.getByText('Game Over').first()).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Close' }).first().click();

    // The input field should no longer be visible (game complete state)
    await expect(page.getByPlaceholder('Diagnosis...').first()).not.toBeVisible();

    // Instead, "Game Over" message and "View Results" button should show
    await expect(page.getByText('Game Over. The answer was:').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Results' }).first()).toBeVisible();
  });

  test('should reflect loss in statistics', async ({ page }) => {
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Lose the game
    for (let i = 0; i < 5; i++) {
      await makeIncorrectGuess(page, SEARCH_TERMS[i], correctAnswer);
    }

    // Modal should be visible with stats
    await expect(page.getByText('Game Over').first()).toBeVisible({ timeout: 3000 });

    const modal = page.locator('.fixed.inset-0.bg-black');

    // Verify stats: 1 game played, 0% win rate
    const playedStat = modal.locator('text=Played').locator('..');
    await expect(playedStat).toContainText('1');

    const winRateStat = modal.locator('text=Win %').locator('..');
    await expect(winRateStat).toContainText('0');

    // Verify streak is 0
    const streakStat = modal.locator('text=Current Streak').locator('..');
    await expect(streakStat).toContainText('0');
  });
});
