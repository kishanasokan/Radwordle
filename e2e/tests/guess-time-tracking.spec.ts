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

test.describe('Guess Time Tracking', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await page.reload();
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
    await waitForGameLoad(page);
  });

  test('should track guess time in localStorage', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Wait a bit before making the first guess to have measurable time
    await page.waitForTimeout(1500);

    // Make a guess
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    // Check that guess time was tracked
    const stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });

    expect(stats.totalGuessTime).toBeDefined();
    expect(stats.totalGuessTime).toBeGreaterThan(0);
    expect(stats.totalGuessCount).toBe(1);
  });

  test('should accumulate time across multiple guesses', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Wait and make first guess
    await page.waitForTimeout(1000);
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    // Check first guess time
    let stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });
    const firstGuessTime = stats.totalGuessTime;
    expect(stats.totalGuessCount).toBe(1);

    // Wait and make second guess
    await page.waitForTimeout(1000);
    await makeIncorrectGuess(page, SEARCH_TERMS[1], correctAnswer);

    // Check accumulated time
    stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });

    expect(stats.totalGuessCount).toBe(2);
    expect(stats.totalGuessTime).toBeGreaterThan(firstGuessTime);
  });

  test('should show average guess time in results modal', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Wait before guessing
    await page.waitForTimeout(2000);

    // Win the game
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // The results modal should show average guess time
    const modal = page.locator('[data-testid="results-modal"]');

    // Look for the "Avg Time" label — use .first() since desktop+mobile layouts both render it
    const avgTimeLabel = modal.getByText('Avg Time').first();
    await expect(avgTimeLabel).toBeVisible();

    // The value should show a time (e.g., "2.0s")
    const avgTimeValue = avgTimeLabel.locator('..').locator('p.font-bold');
    const timeText = await avgTimeValue.textContent();
    expect(timeText).toMatch(/\d+\.\d+s/);
  });

  test('should track time per guess independently', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Make first guess quickly
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    let stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });
    const firstGuessOnlyTime = stats.totalGuessTime;

    // Wait longer before second guess
    await page.waitForTimeout(2000);
    await makeIncorrectGuess(page, SEARCH_TERMS[1], correctAnswer);

    stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });

    // Second guess should have added more time
    const secondGuessTime = stats.totalGuessTime - firstGuessOnlyTime;
    expect(secondGuessTime).toBeGreaterThan(1); // At least 1 second (we waited 2)
  });

  test('should show correct time in StatsModal via Stats button', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);

    // Wait and win
    await page.waitForTimeout(1500);
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Close the results modal
    await page.getByRole('button', { name: 'Close' }).first().click();

    // Open the Stats modal via the Stats button
    await page.getByText('Stats').first().click();

    // The StatsModal should show Avg Guess Time
    const statsModal = page.locator('.fixed.inset-0');
    await expect(statsModal.getByText('Your Statistics')).toBeVisible();
    await expect(statsModal.getByText('Avg Guess Time')).toBeVisible();

    // Close stats modal
    await statsModal.getByRole('button', { name: 'Close' }).click();
  });
});
