import type { HealthLog } from './dailyLogUtils';
import { validateDailyLog } from './dailyLogUtils';

type TrackerLogs = Record<string, HealthLog>;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const TRACKER_STORAGE_PREFIX = 'belluna.tracker.user.v2:';
const LEGACY_USER_STORAGE_PREFIX = 'belluna.tracker.user:';

function storageKeys(userId: string | null): { current: string; legacy: string } | null {
  if (!userId) return null;
  const encodedUserId = encodeURIComponent(userId);
  return {
    current: `${TRACKER_STORAGE_PREFIX}${encodedUserId}`,
    legacy: `${LEGACY_USER_STORAGE_PREFIX}${encodedUserId}`,
  };
}

function parseLogs(value: string, convertLegacyPain: boolean): TrackerLogs {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const logs: TrackerLogs = {};
  for (const [date, value] of Object.entries(parsed)) {
    if (!value || typeof value !== 'object') continue;
    const candidate = value as HealthLog;
    const log = {
      ...candidate,
      pain: convertLegacyPain
        ? [0, 3, 6, 10][candidate.pain] ?? candidate.pain
        : candidate.pain,
    };
    try {
      validateDailyLog(date, log);
      logs[date] = log;
    } catch {
      continue;
    }
  }
  return logs;
}

export function loadTrackerLogs(
  userId: string | null,
  storage: StorageLike
): TrackerLogs {
  const keys = storageKeys(userId);
  if (!keys) return {};

  try {
    const currentValue = storage.getItem(keys.current);
    if (currentValue) return parseLogs(currentValue, false);

    const legacyValue = storage.getItem(keys.legacy);
    if (!legacyValue) return {};
    const migratedLogs = parseLogs(legacyValue, true);
    storage.setItem(keys.current, JSON.stringify(migratedLogs));
    return migratedLogs;
  } catch {
    return {};
  }
}

export function saveTrackerLogs(
  userId: string | null,
  logs: TrackerLogs,
  storage: StorageLike
): void {
  const keys = storageKeys(userId);
  if (keys) storage.setItem(keys.current, JSON.stringify(logs));
}
