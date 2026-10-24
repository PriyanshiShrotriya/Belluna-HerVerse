import type { HealthLog } from './dailyLogUtils';

type TrackerLogs = Record<string, HealthLog>;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const TRACKER_STORAGE_PREFIX = 'belluna.tracker.user:';

function storageKey(userId: string | null): string | null {
  return userId ? `${TRACKER_STORAGE_PREFIX}${encodeURIComponent(userId)}` : null;
}

export function loadTrackerLogs(
  userId: string | null,
  storage: StorageLike
): TrackerLogs {
  const key = storageKey(userId);
  if (!key) return {};

  try {
    const value = storage.getItem(key);
    return value ? (JSON.parse(value) as TrackerLogs) : {};
  } catch {
    return {};
  }
}

export function saveTrackerLogs(
  userId: string | null,
  logs: TrackerLogs,
  storage: StorageLike
): void {
  const key = storageKey(userId);
  if (key) storage.setItem(key, JSON.stringify(logs));
}
