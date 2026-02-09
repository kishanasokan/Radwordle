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

test.describe('Multi-Day Progression', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await page.reload();
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
  });

  test('should maintain separate game state per day', async ({ page }) => {
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Win today's game
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Check localStorage has a day-specific key
    const gameKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('radiordle_game_day_')) {
          keys.push(key);
        }
      }
      return keys;
    });

    // Should have at least one day-specific game state
    expect(gameKeys.length).toBeGreaterThanOrEqual(1);

    // Each day's game state should be independent
    const dayState = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) || '{}');
    }, gameKeys[0]);

    expect(dayState.isComplete).toBe(true);
    expect(dayState.isWon).toBe(true);
  });

  test('should track winning streak correctly', async ({ page }) => {
    await waitForGameLoad(page);
    const correctAnswer = await extractCorrectAnswer(page);

    // Win a game
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Check stats
    const stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });

    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(1);
  });

  test('should break streak on loss', async ({ page }) => {
    await waitForGameLoad(page);
    const correctAnswer = await extractCorrectAnswer(page);

    // First, simulate having a streak by setting stats manually
    await page.evaluate(() => {
      localStorage.setItem(
        'radiordle_statistics',
        JSON.stringify({
          gamesPlayed: 2,
          gamesWon: 2,
          currentStreak: 2,
          maxStreak: 2,
          guessDistribution: { 1: 1, 2: 1 },
          lastPlayedDay: -1,
        })
      );
    });

    // Lose the game (make 5 incorrect guesses)
    for (let i = 0; i < 5; i++) {
      await makeIncorrectGuess(page, SEARCH_TERMS[i], correctAnswer);
    }

    await expect(page.getByText('Game Over').first()).toBeVisible({ timeout: 3000 });

    // Check that streak is broken
    const stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });

    expect(stats.gamesPlayed).toBe(3);
    expect(stats.gamesWon).toBe(2);
    expect(stats.currentStreak).toBe(0); // Streak broken!
    expect(stats.maxStreak).toBe(2); // Max streak preserved
  });

  test('should update guess distribution on win', async ({ page }) => {
    await waitForGameLoad(page);
    const correctAnswer = await extractCorrectAnswer(page);

    // Make 2 incorrect guesses then win on 3rd
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);
    await makeIncorrectGuess(page, SEARCH_TERMS[1], correctAnswer);
    await submitGuess(page, correctAnswer);

    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Check guess distribution
    const stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });

    // Won in 3 guesses
    expect(stats.guessDistribution['3']).toBe(1);
  });

  test('should simulate multi-day play via archive', async ({ page }) => {
    // This test simulates playing across multiple days using archive games
    // and verifies that stats accumulate correctly

    // First, win today's game
    await waitForGameLoad(page);
    const todayAnswer = await extractCorrectAnswer(page);
    await submitGuess(page, todayAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Verify initial stats
    let stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);

    // Now play an archive game (separate stats)
    await page.goto('/archive');
    const archiveLinks = page.locator('a[href^="/archive/"]');
    const linkCount = await archiveLinks.count();

    if (linkCount > 0) {
      // Navigate directly (full page load ensures answer is in HTML)
      const href = await archiveLinks.first().getAttribute('href');
      await page.goto(href!);
      await acceptCookieConsent(page);
      await mockSupabaseClientCalls(page);
      await waitForGameLoad(page);

      const archiveAnswer = await extractCorrectAnswer(page);
      await submitGuess(page, archiveAnswer);
      await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

      // Daily stats should still be 1 game (archive doesn't count)
      stats = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
      });
      expect(stats.gamesPlayed).toBe(1);

      // Archive stats should have 1 game
      const archiveStats = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('radiordle_archive_statistics') || '{}');
      });
      expect(archiveStats.gamesPlayed).toBe(1);
      expect(archiveStats.gamesWon).toBe(1);
    }
  });

  test('should track lastPlayedDay in stats', async ({ page }) => {
    await waitForGameLoad(page);
    const correctAnswer = await extractCorrectAnswer(page);

    // Win the game
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Check that lastPlayedDay is set
    const stats = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('radiordle_statistics') || '{}');
    });

    expect(stats.lastPlayedDay).toBeDefined();
    expect(typeof stats.lastPlayedDay).toBe('number');
    expect(stats.lastPlayedDay).toBeGreaterThanOrEqual(0);
  });
});
