
import { describe, expect, it } from 'vitest';
import {
  fromDatabase,
  toDatabaseFields,
  validateDailyLog,
  type HealthLog,
} from '../src/features/tracker/dailyLogUtils';

const sampleLog: HealthLog = {
  flow: 2,
  pain: 2,
  mood: 3,
  notes: 'Mild discomfort',
};

describe('Daily health log mapping', () => {
  it('maps UI values to database values', () => {
    expect(toDatabaseFields(sampleLog)).toEqual({
      flow: 2,
      pain: 6,
      mood: 'good',
      notes: 'Mild discomfort',
    });
  });

  it('maps database rows back to UI values', () => {
    expect(
      fromDatabase({
        log_date: '2026-10-24',
        flow: 2,
        pain: 6,
        mood: 'good',
        notes: 'Mild discomfort',
      })
    ).toEqual(sampleLog);
  });

  it('converts blank notes to null for storage', () => {
    expect(
      toDatabaseFields({ ...sampleLog, notes: '   ' }).notes
    ).toBeNull();
  });

  it('rejects an invalid calendar date', () => {
    expect(() =>
      validateDailyLog('2026-02-30', sampleLog)
    ).toThrow('Invalid calendar date.');
  });

  it('rejects a flow value outside the UI range', () => {
    expect(() =>
      validateDailyLog('2026-10-24', { ...sampleLog, flow: 4 })
    ).toThrow('Invalid flow, pain, or mood selection.');
  });

  it('rejects notes longer than 200 characters', () => {
    expect(() =>
      validateDailyLog('2026-10-24', {
        ...sampleLog,
        notes: 'x'.repeat(201),
      })
    ).toThrow('Notes must be 200 characters or fewer.');
  });
});
