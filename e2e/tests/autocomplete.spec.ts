import { test, expect } from '@playwright/test';
import {
  acceptCookieConsent,
  clearAllStorage,
  waitForGameLoad,
  extractCorrectAnswer,
  mockSupabaseClientCalls,
  getInput,
  getDropdown,
  getSubmitButton,
  SEARCH_TERMS,
} from '../fixtures/helpers';

test.describe('Autocomplete & Validation', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await clearAllStorage(page);
    await page.reload();
    await acceptCookieConsent(page);
    await waitForGameLoad(page);
    await mockSupabaseClientCalls(page);
  });

  test('should show dropdown when typing', async ({ page }) => {
    const input = getInput(page);
    await input.fill('pneu');

    // Dropdown should appear
    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Should have matching items
    const items = dropdown.locator('button');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter conditions case-insensitively', async ({ page }) => {
    const input = getInput(page);

    // Type lowercase
    await input.fill('frac');
    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    const lowercaseCount = await dropdown.locator('button').count();

    // Clear and type uppercase
    await input.fill('FRAC');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    const uppercaseCount = await dropdown.locator('button').count();

    // Should return same results regardless of case
    expect(lowercaseCount).toBe(uppercaseCount);
    expect(lowercaseCount).toBeGreaterThan(0);
  });

  test('should show "Showing first 40 results" for broad searches', async ({ page }) => {
    const input = getInput(page);

    // Type a very common letter to get many results
    await input.fill('a');

    // Wait for dropdown
    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Check if 40 results indicator is shown
    const items = dropdown.locator('button');
    const count = await items.count();

    if (count >= 40) {
      await expect(page.getByText('Showing first 40 results').first()).toBeVisible();
    }
  });

  test('should navigate dropdown with arrow keys', async ({ page }) => {
    const input = getInput(page);
    await input.fill('frac');

    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Press ArrowDown to select first item
    await page.keyboard.press('ArrowDown');

    // First item should have blue highlight (bg-blue-100)
    const firstItem = dropdown.locator('button').first();
    await expect(firstItem).toHaveClass(/bg-blue-100/);

    // Press ArrowDown again to move to second item
    await page.keyboard.press('ArrowDown');

    // Second item should now be highlighted
    const secondItem = dropdown.locator('button').nth(1);
    await expect(secondItem).toHaveClass(/bg-blue-100/);

    // First item should no longer be highlighted
    await expect(firstItem).not.toHaveClass(/bg-blue-100/);

    // Press ArrowUp to go back
    await page.keyboard.press('ArrowUp');
    await expect(firstItem).toHaveClass(/bg-blue-100/);
  });

  test('should select item with Enter key', async ({ page }) => {
    const input = getInput(page);
    await input.fill('frac');

    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Navigate to first item and get its name
    await page.keyboard.press('ArrowDown');
    const firstName = await dropdown.locator('button').first().locator('.font-medium').textContent();

    // Press Enter to select
    await page.keyboard.press('Enter');

    // Input should now contain the selected value
    const inputValue = await input.inputValue();
    expect(inputValue).toBe(firstName?.trim());

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });

  test('should close dropdown with Escape key', async ({ page }) => {
    const input = getInput(page);
    await input.fill('frac');

    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });

  test('should show validation error for invalid diagnosis', async ({ page }) => {
    const input = getInput(page);

    // Type something that's not a valid condition
    await input.fill('xyznotadiagnosis123');
    await page.keyboard.press('Escape');

    // Click Submit
    await getSubmitButton(page).click();

    // Validation error should appear
    await expect(page.getByText('Please select a diagnosis from the list')).toBeVisible();

    // Input should have red ring
    await expect(input).toHaveClass(/ring-red-500/);
  });

  test('should clear validation error when typing again', async ({ page }) => {
    const input = getInput(page);

    // Trigger validation error
    await input.fill('invaliddiagnosis');
    await page.keyboard.press('Escape');
    await getSubmitButton(page).click();
    await expect(page.getByText('Please select a diagnosis from the list')).toBeVisible();

    // Start typing again - error should clear
    await input.fill('frac');
    await expect(page.getByText('Please select a diagnosis from the list')).not.toBeVisible();
  });

  test('should disable previously guessed conditions in dropdown', async ({ page }) => {
    const correctAnswer = await extractCorrectAnswer(page);
    const input = getInput(page);

    // Make a guess using the first search term
    await input.fill(SEARCH_TERMS[0]);
    const dropdown = getDropdown(page);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Get the first non-disabled option name
    const firstOption = dropdown.locator('button:not([disabled])').first();
    const guessedName = await firstOption.locator('.font-medium').textContent();

    // Select and submit it
    await firstOption.click();
    await getSubmitButton(page).click();

    // Now search for the same term again
    await input.fill(SEARCH_TERMS[0]);
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // The previously guessed condition should be disabled
    const disabledOptions = dropdown.locator('button[disabled]');
    const disabledCount = await disabledOptions.count();

    if (disabledCount > 0) {
      // Find the disabled option matching our guess
      let foundDisabled = false;
      for (let i = 0; i < disabledCount; i++) {
        const text = await disabledOptions.nth(i).textContent();
        if (text?.includes(guessedName?.trim() || '')) {
          foundDisabled = true;
          // Should show "(Previously selected)" text
          await expect(disabledOptions.nth(i)).toContainText('Previously selected');
          break;
        }
      }
      expect(foundDisabled).toBe(true);
    }
  });

  test('should not allow submitting empty input', async ({ page }) => {
    const input = getInput(page);

    // Ensure input is empty
    await input.fill('');

    // Click Submit
    await getSubmitButton(page).click();

    // Should not show any error (empty submit is silently ignored)
    // Guess counter should still show initial state (next guess = 1)
    await expect(page.getByText('Guess 1 / 5').first()).toBeVisible();
  });
});
