/**
 * Statistics Recovery Module
 *
 * Handles recovering player statistics from the server when localStorage
 * has been cleared but the player_hash was preserved in cookie/IndexedDB.
 */

import {
  checkBackupStorageOnly,
  storePlayerHash,
  syncExistingHashToBackups,
} from './playerIdentity';
import { Statistics, saveStatistics, getStatistics } from './localStorage';

const RECOVERY_ATTEMPTED_KEY = 'radiordle_recovery_attempted';

interface RecoveredStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: { [key: number]: number };
  lastPlayedDay: number | null;
  gameStates: Array<{
    dayNumber: number;
    puzzleNumber: number;
    won: boolean;
    guessCount: number;
  }>;
}

/**
 * Checks if statistics need to be recovered and fetches from server if needed.
 * Returns true if recovery was performed, false otherwise.
 */
export async function attemptStatsRecovery(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // First, sync any existing hash to backups (for existing users)
    await syncExistingHashToBackups();

    // Check if we already have stats in localStorage
    const existingStats = getStatistics();
    if (existingStats.gamesPlayed > 0) {
      // Already have stats, no recovery needed
      return false;
    }

    // Check if we've already attempted recovery this session
    const recoveryAttempted = sessionStorage.getItem(RECOVERY_ATTEMPTED_KEY);
    if (recoveryAttempted) {
      return false;
    }

    // Mark that we've attempted recovery (prevent multiple attempts)
    sessionStorage.setItem(RECOVERY_ATTEMPTED_KEY, 'true');

    // Check backup storage WITHOUT restoring to localStorage yet
    // This is critical - we need to know if hash exists in backup
    // BEFORE retrievePlayerHash() copies it to localStorage
    const backupStatus = await checkBackupStorageOnly();

    // If hash is in localStorage, this isn't a recovery scenario
    if (backupStatus.hasLocalStorage) {
      return false;
    }

    // If no backup hash exists, this is a truly new user
    if (!backupStatus.backupHash) {
      return false;
    }

    // We have a backup hash but no localStorage - this is a recovery scenario!
    const playerHash = backupStatus.backupHash;

    console.log('Attempting to recover stats for player:', playerHash.slice(0, 8) + '...');

    // Fetch stats from server
    const response = await fetch(`/api/player-stats?hash=${encodeURIComponent(playerHash)}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('No server-side stats found for player');
      } else if (response.status === 429) {
        console.log('Rate limited - try again later');
      } else {
        console.error('Failed to fetch stats:', response.status);
      }
      // Still restore the player hash even if no stats found
      await storePlayerHash(playerHash);
      return false;
    }

    const recoveredStats: RecoveredStats = await response.json();

    // Restore stats to localStorage
    const stats: Statistics = {
      gamesPlayed: recoveredStats.gamesPlayed,
      gamesWon: recoveredStats.gamesWon,
      currentStreak: recoveredStats.currentStreak,
      maxStreak: recoveredStats.maxStreak,
      guessDistribution: recoveredStats.guessDistribution,
      lastPlayedDay: recoveredStats.lastPlayedDay ?? undefined,
    };

    saveStatistics(stats);

    // Restore player hash to all storage locations
    await storePlayerHash(playerHash);

    console.log('Successfully recovered stats:', stats);
    return true;
  } catch (error) {
    console.error('Error during stats recovery:', error);
    return false;
  }
}

/**
 * Forces a stats recovery attempt, ignoring the session check.
 * Useful for manual recovery triggers (e.g., a "Recover My Stats" button).
 */
export async function forceStatsRecovery(): Promise<{
  success: boolean;
  stats?: Statistics;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser' };
  }

  try {
    // Check for backup hash
    const backupStatus = await checkBackupStorageOnly();
    const playerHash = backupStatus.backupHash;

    if (!playerHash) {
      return { success: false, error: 'No player identity found in backups' };
    }

    const response = await fetch(`/api/player-stats?hash=${encodeURIComponent(playerHash)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'No game history found on server' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Too many requests - please try again later' };
      }
      return { success: false, error: `Server error: ${response.status}` };
    }

    const recoveredStats: RecoveredStats = await response.json();

    const stats: Statistics = {
      gamesPlayed: recoveredStats.gamesPlayed,
      gamesWon: recoveredStats.gamesWon,
      currentStreak: recoveredStats.currentStreak,
      maxStreak: recoveredStats.maxStreak,
      guessDistribution: recoveredStats.guessDistribution,
      lastPlayedDay: recoveredStats.lastPlayedDay ?? undefined,
    };

    saveStatistics(stats);
    await storePlayerHash(playerHash);

    return { success: true, stats };
  } catch (error) {
    console.error('Error during forced stats recovery:', error);
    return { success: false, error: 'Recovery failed' };
  }
}
