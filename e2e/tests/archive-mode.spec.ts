import { test, expect } from '@playwright/test';
import {
  acceptCookieConsent,
  clearAllStorage,
  extractCorrectAnswer,
  submitGuess,
  waitForGameLoad,
  mockSupabaseClientCalls,
} from '../fixtures/helpers';

test.describe('Archive Mode', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await acceptCookieConsent(page);
  });

  test('should display archive page with list of past days', async ({ page }) => {
    await page.goto('/archive');

    // Verify archive title
    await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();
    await expect(page.getByText('Play any past puzzle!')).toBeVisible();

    // Verify days are listed as grid links
    const dayLinks = page.locator('a[href^="/archive/"], a[href="/"]').filter({
      has: page.locator('.font-bold'),
    });
    const count = await dayLinks.count();
    expect(count).toBeGreaterThan(0);

    // Verify TODAY badge exists on the current day
    await expect(page.getByText('TODAY')).toBeVisible();
  });

  test('should show unplayed days with default styling', async ({ page }) => {
    await page.goto('/archive');

    // Unplayed days use bg-surface styling (no success/error color)
    const dayLinks = page.locator('a[href^="/archive/"]');
    const count = await dayLinks.count();
    expect(count).toBeGreaterThan(0);

    // At least one link should have bg-surface (unplayed default)
    const firstLink = dayLinks.first();
    await expect(firstLink).toHaveClass(/bg-surface/);
  });

  test('should navigate to archive game when clicking a past day', async ({ page }) => {
    await page.goto('/archive');

    // Find archive links (not the TODAY link which goes to /)
    const archiveLinks = page.locator('a[href^="/archive/"]');
    const linkCount = await archiveLinks.count();

    if (linkCount === 0) {
      test.skip();
      return;
    }

    await archiveLinks.first().click();

    // Should load a game page
    await waitForGameLoad(page);
    await expect(page.getByText("What's the Diagnosis?").first()).toBeVisible();
  });

  test('should use separate stats for archive games', async ({ page }) => {
    await page.goto('/archive');
    const archiveLinks = page.locator('a[href^="/archive/"]');
    const linkCount = await archiveLinks.count();

    if (linkCount === 0) {
      test.skip();
      return;
    }

    // Navigate directly to the archive game (full page load ensures answer is in HTML)
    const href = await archiveLinks.first().getAttribute('href');
    await page.goto(href!);
    await acceptCookieConsent(page);
    await waitForGameLoad(page);
    await mockSupabaseClientCalls(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Win the archive game
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Check that archive stats are separate from daily stats
    const archiveStats = await page.evaluate(() => {
      const stats = localStorage.getItem('radiordle_archive_statistics');
      return stats ? JSON.parse(stats) : null;
    });

    expect(archiveStats).not.toBeNull();
    expect(archiveStats.gamesPlayed).toBe(1);
    expect(archiveStats.gamesWon).toBe(1);

    // Daily stats should still be empty (we only played archive)
    const dailyStats = await page.evaluate(() => {
      const stats = localStorage.getItem('radiordle_statistics');
      return stats ? JSON.parse(stats) : null;
    });

    if (dailyStats) {
      expect(dailyStats.gamesPlayed).toBe(0);
    }
  });

  test('should show WON badge after completing archive game', async ({ page }) => {
    await page.goto('/archive');
    const archiveLinks = page.locator('a[href^="/archive/"]');
    const linkCount = await archiveLinks.count();

    if (linkCount === 0) {
      test.skip();
      return;
    }

    // Navigate directly to the archive game (full page load ensures answer is in HTML)
    const href = await archiveLinks.first().getAttribute('href');
    await page.goto(href!);
    await acceptCookieConsent(page);
    await waitForGameLoad(page);
    await mockSupabaseClientCalls(page);

    const correctAnswer = await extractCorrectAnswer(page);
    await submitGuess(page, correctAnswer);
    await expect(page.getByText('Congratulations!').first()).toBeVisible({ timeout: 3000 });

    // Navigate back to archive
    await page.goto('/archive');

    // The played day should now show success styling (green bg with checkmark SVG)
    const wonLink = page.locator('a[class*="bg-success"]');
    await expect(wonLink.first()).toBeVisible({ timeout: 3000 });
  });

  test('should redirect today to home page', async ({ page }) => {
    await page.goto('/archive');

    // The TODAY entry links to '/' (home)
    const todayEntry = page.locator('a').filter({ hasText: 'TODAY' });
    const href = await todayEntry.getAttribute('href');
    expect(href).toBe('/');
  });

  test('should have back button to return home', async ({ page }) => {
    await page.goto('/archive');

    // Click the back button (← arrow link to /)
    await page.locator('a[href="/"]').first().click();

    // Should navigate to home
    await expect(page).toHaveURL('/');
  });
});
