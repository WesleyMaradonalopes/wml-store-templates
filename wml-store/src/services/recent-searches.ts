import { getStoredJson, setStoredJson } from './storage';

const RECENT_SEARCHES_KEY = 'lojahr:recent-searches:v1';
const MAX_RECENT_SEARCHES = 10;

let recentSearchWriteQueue: Promise<void> = Promise.resolve();

function normalizeSearchTerm(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function searchTermIdentity(value: string) {
  return value.toLowerCase();
}

function uniqueRecentSearches(values: unknown[]) {
  const seen = new Set<string>();
  const searches: string[] = [];

  for (const value of values) {
    const term = normalizeSearchTerm(value);
    const identity = searchTermIdentity(term);
    if (!term || seen.has(identity)) continue;
    seen.add(identity);
    searches.push(term);
    if (searches.length === MAX_RECENT_SEARCHES) break;
  }

  return searches;
}

export async function getRecentSearches() {
  try {
    const stored = await getStoredJson<unknown>(RECENT_SEARCHES_KEY);
    return uniqueRecentSearches(Array.isArray(stored) ? stored : []);
  } catch {
    return [];
  }
}

export function saveRecentSearch(value: string): Promise<string[]> {
  const term = normalizeSearchTerm(value);
  if (!term) return getRecentSearches();

  const update = recentSearchWriteQueue.then(async () => {
    const existing = await getRecentSearches();
    const identity = searchTermIdentity(term);
    const next = [term, ...existing.filter((search) => searchTermIdentity(search) !== identity)]
      .slice(0, MAX_RECENT_SEARCHES);
    await setStoredJson(RECENT_SEARCHES_KEY, next);
    return next;
  });

  recentSearchWriteQueue = update.then(() => undefined, () => undefined);
  return update;
}

export function removeRecentSearch(value: string): Promise<string[]> {
  const identity = searchTermIdentity(normalizeSearchTerm(value));
  if (!identity) return getRecentSearches();

  const update = recentSearchWriteQueue.then(async () => {
    const existing = await getRecentSearches();
    const next = existing.filter((search) => searchTermIdentity(search) !== identity);
    await setStoredJson(RECENT_SEARCHES_KEY, next);
    return next;
  });

  recentSearchWriteQueue = update.then(() => undefined, () => undefined);
  return update;
}

export function clearRecentSearches(): Promise<void> {
  const update = recentSearchWriteQueue.then(() => setStoredJson(RECENT_SEARCHES_KEY, []));
  recentSearchWriteQueue = update.then(() => undefined, () => undefined);
  return update;
}
