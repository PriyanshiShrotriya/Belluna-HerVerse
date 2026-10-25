import { describe, expect, it } from 'vitest';
import {
  loadTrackerLogs,
  saveTrackerLogs,
} from '../src/features/tracker/trackerStorage';

function createStorage() {
  const values = new Map<string, string>();
  const reads: string[] = [];
  const writes: string[] = [];

  return {
    getItem: (key: string) => {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      writes.push(key);
      values.set(key, value);
    },
    has: (key: string) => values.has(key),
    get: (key: string) => values.get(key),
    reads,
    writes,
  };
}

describe('account-scoped tracker storage', () => {
  it('keeps two signed-in users’ local logs separate when switching accounts', () => {
    const storage = createStorage();
    const userA = { '2026-10-01': { flow: 1, pain: 6, mood: 3, notes: 'A' } };
    const userB = { '2026-10-02': { flow: 2, pain: 3, mood: 2, notes: 'B' } };

    saveTrackerLogs('synthetic-user-a', userA, storage);
    expect(loadTrackerLogs('synthetic-user-b', storage)).toEqual({});

    saveTrackerLogs('synthetic-user-b', userB, storage);
    expect(loadTrackerLogs('synthetic-user-a', storage)).toEqual(userA);
    expect(loadTrackerLogs('synthetic-user-b', storage)).toEqual(userB);
  });

  it('does not read or write tracker data while signed out', () => {
    const storage = createStorage();
    storage.setItem('belluna.tracker', '{"2026-10-01":{"notes":"legacy"}}');
    storage.reads.length = 0;
    storage.writes.length = 0;

    expect(loadTrackerLogs(null, storage)).toEqual({});
    saveTrackerLogs(null, { '2026-10-02': { flow: 1, pain: 1, mood: 1, notes: 'x' } }, storage);

    expect(storage.reads).toEqual([]);
    expect(storage.writes).toEqual([]);
    expect(storage.get('belluna.tracker')).toBe('{"2026-10-01":{"notes":"legacy"}}');
  });

  it('does not adopt or modify the unscoped legacy key for a signed-in account', () => {
    const storage = createStorage();
    const legacyValue = '{"2026-10-01":{"flow":3,"pain":3,"mood":4,"notes":"legacy"}}';
    storage.setItem('belluna.tracker', legacyValue);

    expect(loadTrackerLogs('synthetic-user-a', storage)).toEqual({});
    expect(storage.get('belluna.tracker')).toBe(legacyValue);
  });

  it('converts legacy pain categories into the numeric scale without deleting the stored copy', () => {
    const storage = createStorage();
    const legacyValue = '{"2026-10-01":{"flow":3,"pain":2,"mood":4,"notes":"legacy"}}';
    storage.setItem('belluna.tracker.user:synthetic-user-a', legacyValue);

    expect(loadTrackerLogs('synthetic-user-a', storage)['2026-10-01'].pain).toBe(6);
    expect(storage.get('belluna.tracker.user:synthetic-user-a')).toBe(legacyValue);
    expect(storage.get('belluna.tracker.user.v2:synthetic-user-a')).toContain('"pain":6');
  });
});
