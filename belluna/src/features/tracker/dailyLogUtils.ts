
import { z } from 'zod';
import { isoDateSchema } from './trackerData';

export type HealthLog = {
  flow: number;
  pain: number;
  mood: number;
  notes: string;
};

export type DailyLogRow = {
  log_date: string;
  flow: number | null;
  pain: number | null;
  mood: string | null;
  notes: string | null;
};

export const MOOD_TO_DB = [
  'low',
  'anxious',
  'okay',
  'good',
  'great',
  'irritable',
] as const;

export const dailyLogSchema = z.object({
  flow: z.number().int().min(0).max(4),
  pain: z.number().int().min(0).max(10),
  mood: z.number().int().min(0).max(5),
  notes: z.string().max(200, 'Notes must be 200 characters or fewer.'),
});

export function fromDatabase(row: DailyLogRow): HealthLog {
  const moodIndex = row.mood === null
    ? MOOD_TO_DB.indexOf('okay')
    : MOOD_TO_DB.indexOf(row.mood as (typeof MOOD_TO_DB)[number]);
  if (moodIndex < 0) throw new Error(`Unsupported mood value in daily log: ${row.mood}`);

  return {
    flow: row.flow ?? 0,
    pain: row.pain ?? 0,
    mood: moodIndex,
    notes: row.notes ?? '',
  };
}

export function validateDailyLog(date: string, log: HealthLog): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }
  const dateResult = isoDateSchema.safeParse(date);
  if (!dateResult.success) throw new Error('Invalid calendar date.');
  const logResult = dailyLogSchema.safeParse(log);
  if (!logResult.success) {
    if (logResult.error.issues.some((issue) => issue.path[0] === 'notes')) {
      throw new Error('Notes must be 200 characters or fewer.');
    }
    throw new Error('Invalid flow, pain, or mood selection.');
  }
}

export function toDatabaseFields(log: HealthLog) {
  return {
    flow: log.flow,
    pain: log.pain,
    mood: MOOD_TO_DB[log.mood],
    notes: log.notes.trim() || null,
  };
}
