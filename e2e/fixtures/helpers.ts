import { Page, expect, Locator } from '@playwright/test';

/**
 * The game renders dual layouts (desktop + mobile) so many elements appear twice.
 * These helpers use the desktop layout (hidden sm:block) by default.
 * On mobile viewport tests, the mobile layout is visible instead.
 */

/**
 * Gets the visible input field (handles dual desktop/mobile layout).
 * Uses :visible pseudo-class so this works on both desktop and mobile viewports.
 */
export function getInput(page: Page): Locator {
  return page.locator('input[placeholder="Diagnosis..."]:visible').first();
}

/**
 * Gets the visible Submit button (handles dual layout).
 * Uses :visible pseudo-class so this works on both desktop and mobile viewports.
 */
export function getSubmitButton(page: Page): Locator {
  return page.locator('button:has-text("Submit"):visible').first();
}

/**
 * Gets the visible autocomplete dropdown (specific to DiagnosisAutocomplete).
 * Uses the dropdown's container structure to avoid matching other scrollable elements.
 */
export function getDropdown(page: Page): Locator {
  return page.locator('.shadow-2xl .overflow-y-auto').first();
}

/**
 * Extracts the correct answer from the loaded game page.
 * Next.js RSC embeds puzzle data (including the answer) in the HTML payload.
 */
export async function extractCorrectAnswer(page: Page): Promise<string> {
  const answer = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    // Next.js RSC flight data uses escaped quotes: \"answer\":\"Varicocele \"
    // Try the escaped format first (RSC streaming), then plain JSON
    const escapedMatch = html.match(/\\"answer\\":\\"([^\\]+)\\"/);
    if (escapedMatch) return escapedMatch[1].trim();

    const plainMatch = html.match(/"answer":"([^"]+)"/);
    if (plainMatch) return plainMatch[1].trim();

    return null;
  });

  if (!answer) {
    throw new Error('Could not extract correct answer from page');
  }

  return answer;
}

/**
 * Accepts the cookie consent banner if visible.
 */
export async function acceptCookieConsent(page: Page): Promise<void> {
  const banner = page.getByText(/Radiordle uses local storage/);
  // Wait a bit for the delayed banner to appear
  try {
    await banner.waitFor({ state: 'visible', timeout: 3000 });
    await page.getByRole('button', { name: 'Got it' }).click();
    await banner.waitFor({ state: 'hidden', timeout: 2000 });
  } catch {
    // Banner might not appear if consent was already given
  }
}

/**
 * Clears all browser storage for a fresh state.
 */
export async function clearAllStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Submits a guess by typing in the input and clicking Submit.
 */
export async function submitGuess(page: Page, conditionName: string): Promise<void> {
  const input = getInput(page);
  await input.fill(conditionName);

  // Close dropdown if open by pressing Escape
  await page.keyboard.press('Escape');

  // Short wait for dropdown to close
  await page.waitForTimeout(200);

  // Click the Submit button
  await getSubmitButton(page).click();
}

/**
 * Makes an incorrect guess by selecting from the dropdown.
 * Ensures the selected condition is NOT the correct answer.
 * Returns the condition name that was guessed.
 */
export async function makeIncorrectGuess(
  page: Page,
  searchTerm: string,
  correctAnswer: string
): Promise<string> {
  const input = getInput(page);
  await input.fill(searchTerm);

  // Wait for dropdown
  const dropdown = getDropdown(page);
  await dropdown.waitFor({ state: 'visible', timeout: 3000 });

  // Find a non-disabled option that isn't the correct answer
  const options = dropdown.locator('button:not([disabled])');
  const count = await options.count();

  for (let i = 0; i < count; i++) {
    const option = options.nth(i);
    const name = await option.locator('.font-medium').textContent();
    if (name && name.trim().toLowerCase() !== correctAnswer.toLowerCase()) {
      await option.click();
      // Submit the guess
      await getSubmitButton(page).click();
      return name.trim();
    }
  }

  throw new Error(`Could not find an incorrect guess for search term: ${searchTerm}`);
}

/**
 * Gets the current guess count displayed on the page.
 */
export async function getGuessCount(page: Page): Promise<{ current: number; max: number }> {
  const text = await page.locator('text=/Guesses: \\d+ \\/ \\d+/').first().textContent();
  const match = text?.match(/Guesses: (\d+) \/ (\d+)/);
  if (!match) throw new Error('Could not parse guess count');
  return { current: parseInt(match[1]), max: parseInt(match[2]) };
}

/**
 * Mocks client-side Supabase API calls to prevent real database interactions.
 */
export async function mockSupabaseClientCalls(page: Page): Promise<void> {
  const supabaseUrl = await page.evaluate(() => {
    // Look for the Supabase URL in the page's environment
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const script of scripts) {
      const match = script.textContent?.match(/NEXT_PUBLIC_SUPABASE_URL['":\s]+['"]([^'"]+)['"]/);
      if (match) return match[1];
    }
    return null;
  });

  if (supabaseUrl) {
    // Mock game result submission
    await page.route(`${supabaseUrl}/rest/v1/game_results*`, (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
      // Count query for first solver check
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0/0' },
        body: JSON.stringify([]),
      });
    });

    // Mock global stats views
    await page.route(`${supabaseUrl}/rest/v1/game_stats_overall*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_games: 100,
          total_wins: 75,
          win_rate: 75.0,
          avg_guesses: 2.5,
          unique_players: 50,
        }),
      })
    );

    await page.route(`${supabaseUrl}/rest/v1/game_stats_guess_distribution*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { guess_count: 1, total_games: 20, wins: 20 },
          { guess_count: 2, total_games: 30, wins: 30 },
          { guess_count: 3, total_games: 15, wins: 15 },
          { guess_count: 4, total_games: 7, wins: 7 },
          { guess_count: 5, total_games: 3, wins: 3 },
        ]),
      })
    );
  }

  // Mock player-stats API
  await page.route('**/api/player-stats*', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not found' }),
    })
  );
}

/**
 * Common search terms for finding conditions in the dropdown.
 * These are broad enough to match multiple conditions in any dataset.
 */
export const SEARCH_TERMS = [
  'fracture',
  'pneumo',
  'effusion',
  'tumor',
  'carcinoma',
  'edema',
  'stenosis',
  'hernia',
  'abscess',
  'nodule',
];

/**
 * Waits for the game to fully load (image and input visible).
 */
export async function waitForGameLoad(page: Page): Promise<void> {
  // Wait for the game image
  await page.locator('img[alt*="Puzzle"]').waitFor({ state: 'visible', timeout: 15000 });
  // Wait for the enabled input (placeholder="Diagnosis..." means consent is given).
  // Allows up to 10s since GameClient polls consent every 500ms after banner dismissal.
  await page.locator('input[placeholder="Diagnosis..."]:visible').first().waitFor({ state: 'visible', timeout: 10000 });
}
