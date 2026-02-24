import { test, expect } from '@playwright/test';
import {
  acceptCookieConsent,
  clearAllStorage,
  waitForGameLoad,
  extractCorrectAnswer,
  submitGuess,
  makeIncorrectGuess,
  mockSupabaseClientCalls,
  getInput,
  getDropdown,
  SEARCH_TERMS,
} from '../fixtures/helpers';

test.describe('Mobile Responsiveness', () => {
  // Use iPhone 12 viewport (390x844)
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  });

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await page.reload();
    await acceptCookieConsent(page);
    await mockSupabaseClientCalls(page);
  });

  test('should render mobile layout correctly', async ({ page }) => {
    await waitForGameLoad(page);

    // Verify title is visible (use :visible to skip hidden desktop layout)
    await expect(page.locator('h1:visible:has-text("Radiordle")')).toBeVisible();

    // Verify no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Verify the mobile layout has the fixed bottom input (use z-40 to target the input bar, not the consent banner)
    const fixedInput = page.locator('.fixed.bottom-0.z-40');
    await expect(fixedInput).toBeVisible();
  });

  test('should have properly sized game image', async ({ page }) => {
    await waitForGameLoad(page);

    // Image should be visible and fit within viewport
    const image = page.locator('img[alt*="Puzzle"]');
    const box = await image.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
  });

  test('should show autocomplete dropdown above input on mobile', async ({ page }) => {
    await waitForGameLoad(page);

    const input = getInput(page);
    await input.fill('frac');

    // Wait for dropdown
    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // On mobile, dropdown should appear above the input (bottom-full class)
    const dropdownParent = dropdown.locator('..');
    await expect(dropdownParent).toHaveClass(/bottom-full/);
  });

  test('should complete a full game on mobile viewport', async ({ page }) => {
    await waitForGameLoad(page);

    const correctAnswer = await extractCorrectAnswer(page);

    // Make an incorrect guess
    await makeIncorrectGuess(page, SEARCH_TERMS[0], correctAnswer);

    // Verify guess counter updates (use :visible to skip hidden desktop layout)
    await expect(page.locator('p:visible:has-text("Guesses: 1 / 5")')).toBeVisible();

    // Make the correct guess
    await submitGuess(page, correctAnswer);

    // Win modal should appear (use :visible to skip hidden desktop layout)
    await expect(page.locator(':visible:has-text("Congratulations!")').first()).toBeVisible({ timeout: 3000 });

    // Modal should be scrollable and fully visible
    const modal = page.locator('.max-h-\\[90vh\\]:visible');
    await expect(modal).toBeVisible();

    // Verify modal fits within viewport
    const modalBox = await modal.boundingBox();
    expect(modalBox).not.toBeNull();
    if (modalBox) {
      expect(modalBox.height).toBeLessThanOrEqual(844);
    }
  });

  test('should display cookie consent properly on mobile', async ({ page }) => {
    // Clear consent to trigger banner
    await page.evaluate(() => localStorage.removeItem('radiordle_cookie_consent'));
    await page.reload();

    const banner = page.getByText(/Radiordle uses local storage/);
    await expect(banner).toBeVisible({ timeout: 3000 });

    // Banner should not cause horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Accept it
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(banner).not.toBeVisible();
  });

  test('should show stats/archive buttons on mobile', async ({ page }) => {
    await waitForGameLoad(page);

    // Stats button should be visible
    await expect(page.getByText('Stats').first()).toBeVisible();

    // Archives button should be visible
    await expect(page.getByText('Archives').first()).toBeVisible();
  });
});
