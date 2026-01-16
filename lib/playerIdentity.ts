/**
 * Persistent Player Identity Management
 *
 * Stores the player_hash in multiple locations for redundancy:
 * 1. localStorage (primary, fast)
 * 2. Cookie (survives localStorage clears, 1 year expiry)
 *    - Set via HTTP header for Safari ITP compatibility
 * 3. IndexedDB (separate storage, often survives when localStorage is cleared)
 *
 * On retrieval, checks all locations and restores to localStorage if found elsewhere.
 */

const PLAYER_HASH_KEY = 'radiordle_player_hash';
const COOKIE_NAME = 'radiordle_pid';
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year
const IDB_DB_NAME = 'radiordle_identity';
const IDB_STORE_NAME = 'player';
const IDB_TIMEOUT_MS = 3000; // Timeout for IndexedDB operations

// Singleton promise to prevent race conditions during hash generation
let hashGenerationPromise: Promise<string> | null = null;

/**
 * Generates a random player hash for anonymous identification.
 */
function generatePlayerHash(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}${randomPart2}`;
}

// ============================================
// Cookie Functions
// ============================================

/**
 * Sets cookie via JavaScript (fallback).
 * Note: Safari ITP may delete JS-set cookies after 7 days.
 */
function setCookieJS(value: string): void {
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
  } catch (error) {
    console.error('Error setting cookie via JS:', error);
  }
}

/**
 * Sets cookie via HTTP header (Safari ITP compatible).
 * This makes the cookie "server-side" which Safari respects more.
 */
async function setCookieHTTP(value: string): Promise<boolean> {
  try {
    const response = await fetch('/api/set-player-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: value }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error setting cookie via HTTP:', error);
    return false;
  }
}

/**
 * Sets cookie using both methods for maximum compatibility.
 * - HTTP method for Safari ITP
 * - JS method as immediate fallback
 */
async function setCookie(value: string): Promise<void> {
  // Set via JS immediately (works on all browsers)
  setCookieJS(value);

  // Also set via HTTP for Safari ITP compatibility (fire and forget)
  setCookieHTTP(value).catch(() => {});
}

function getCookie(): string | null {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const name = trimmed.substring(0, eqIndex);
      const value = trimmed.substring(eqIndex + 1);

      if (name === COOKIE_NAME && value) {
        return decodeURIComponent(value);
      }
    }
  } catch (error) {
    console.error('Error reading cookie:', error);
  }
  return null;
}

// ============================================
// IndexedDB Functions
// ============================================

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(IDB_DB_NAME, 1);

    // Handle blocked state (another tab has older version open)
    request.onblocked = () => {
      console.warn('IndexedDB blocked - another tab may have it open');
      reject(new Error('IndexedDB blocked'));
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
  });
}

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    ),
  ]);
}

async function setIDB(value: string): Promise<void> {
  try {
    const db = await withTimeout(openIDB(), IDB_TIMEOUT_MS);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.put(value, PLAYER_HASH_KEY);

      request.onerror = () => {
        db.close();
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error writing to IndexedDB:', error);
  }
}

async function getIDB(): Promise<string | null> {
  try {
    const db = await withTimeout(openIDB(), IDB_TIMEOUT_MS);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.get(PLAYER_HASH_KEY);

      request.onerror = () => {
        db.close();
        reject(request.error);
      };

      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error reading from IndexedDB:', error);
    return null;
  }
}

// ============================================
// localStorage Functions
// ============================================

function setLocalStorage(value: string): void {
  try {
    localStorage.setItem(PLAYER_HASH_KEY, value);
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

function getLocalStorage(): string | null {
  try {
    return localStorage.getItem(PLAYER_HASH_KEY);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

// ============================================
// Main API
// ============================================

/**
 * Stores the player hash in all persistent locations.
 */
export async function storePlayerHash(hash: string): Promise<void> {
  setLocalStorage(hash);
  await setCookie(hash); // Now async for HTTP call
  await setIDB(hash).catch(() => {
    // IndexedDB failure is non-fatal
  });
}

/**
 * Syncs an existing localStorage hash to backup locations.
 * Call this on app init to ensure existing users have backups.
 */
export async function syncExistingHashToBackups(): Promise<void> {
  if (typeof window === 'undefined') return;

  const localHash = getLocalStorage();
  if (!localHash) return;

  // Check if backups exist
  const cookieHash = getCookie();
  const idbHash = await getIDB().catch(() => null);

  // Sync to any missing backup locations
  if (cookieHash !== localHash) {
    await setCookie(localHash);
  }
  if (idbHash !== localHash) {
    await setIDB(localHash).catch(() => {});
  }
}

/**
 * Checks backup storage locations WITHOUT restoring to localStorage.
 * Used to detect if recovery is needed before triggering restore.
 */
export async function checkBackupStorageOnly(): Promise<{
  hasLocalStorage: boolean;
  hasCookie: boolean;
  hasIndexedDB: boolean;
  backupHash: string | null;
}> {
  if (typeof window === 'undefined') {
    return { hasLocalStorage: false, hasCookie: false, hasIndexedDB: false, backupHash: null };
  }

  const localHash = getLocalStorage();
  const cookieHash = getCookie();
  const idbHash = await getIDB().catch(() => null);

  return {
    hasLocalStorage: localHash !== null,
    hasCookie: cookieHash !== null,
    hasIndexedDB: idbHash !== null,
    backupHash: cookieHash || idbHash || null,
  };
}

/**
 * Retrieves the player hash, checking all storage locations.
 * If found in a backup location but missing from localStorage, restores it.
 * Returns null only if not found anywhere (truly new user).
 */
export async function retrievePlayerHash(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // 1. Check localStorage first (fastest)
  let hash = getLocalStorage();
  if (hash) {
    // Ensure backups are in sync (fire and forget)
    const cookieHash = getCookie();
    if (cookieHash !== hash) setCookie(hash);
    setIDB(hash).catch(() => {});
    return hash;
  }

  // 2. Check cookie (survives localStorage clears)
  hash = getCookie();
  if (hash) {
    console.log('Restored player hash from cookie');
    setLocalStorage(hash);
    setIDB(hash).catch(() => {});
    return hash;
  }

  // 3. Check IndexedDB (separate storage)
  try {
    hash = await getIDB();
    if (hash) {
      console.log('Restored player hash from IndexedDB');
      setLocalStorage(hash);
      await setCookie(hash);
      return hash;
    }
  } catch (error) {
    console.error('Error checking IndexedDB:', error);
  }

  // Not found anywhere
  return null;
}

/**
 * Gets or creates a persistent player hash.
 * This is the main entry point - use this instead of the old getPlayerHash().
 * Uses singleton pattern to prevent race conditions.
 */
export async function getOrCreatePlayerHash(): Promise<string> {
  // If already generating, return the same promise
  if (hashGenerationPromise) {
    return hashGenerationPromise;
  }

  hashGenerationPromise = (async () => {
    try {
      let hash = await retrievePlayerHash();

      if (!hash) {
        // Truly new user - generate and store
        hash = generatePlayerHash();
        await storePlayerHash(hash);
        console.log('Generated new player hash');
      }

      return hash;
    } finally {
      // Clear the singleton after completion to allow future calls
      // (in case storage was cleared and user needs a new hash)
      hashGenerationPromise = null;
    }
  })();

  return hashGenerationPromise;
}

/**
 * Synchronous version for cases where async isn't practical.
 * Only checks localStorage and cookie (not IndexedDB).
 * Use getOrCreatePlayerHash() when possible.
 */
export function getPlayerHashSync(): string | null {
  if (typeof window === 'undefined') return null;

  let hash = getLocalStorage();
  if (hash) return hash;

  hash = getCookie();
  if (hash) {
    setLocalStorage(hash);
    return hash;
  }

  return null;
}
