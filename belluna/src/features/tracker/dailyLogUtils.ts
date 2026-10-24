
export type HealthLog = {
  flow: number;
  pain: number;
  mood: number;
  notes: string;
};

export type DailyLogRow = {
  log_date: string;
  flow: number;
  pain: number;
  mood: string;
  notes: string | null;
};

export const MOOD_TO_DB = [
  'low',
  'anxious',
  'okay',
  'good',
  'great',
] as const;

const PAIN_TO_DB = [0, 3, 6, 10];

export function fromDatabase(row: DailyLogRow): HealthLog {
  const moodIndex = MOOD_TO_DB.indexOf(
    row.mood as (typeof MOOD_TO_DB)[number]
  );

  const painIndex =
    row.pain >= 8 ? 3 :
    row.pain >= 5 ? 2 :
    row.pain >= 2 ? 1 : 0;

  return {
    flow: row.flow,
    pain: painIndex,
    mood: moodIndex >= 0 ? moodIndex : 2,
    notes: row.notes ?? '',
  };
}

export function validateDailyLog(date: string, log: HealthLog): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error('Invalid calendar date.');
  }

  if (
    !Number.isInteger(log.flow) ||
    log.flow < 0 ||
    log.flow > 3 ||
    !Number.isInteger(log.pain) ||
    log.pain < 0 ||
    log.pain > 3 ||
    !Number.isInteger(log.mood) ||
    log.mood < 0 ||
    log.mood > 4
  ) {
    throw new Error('Invalid flow, pain, or mood selection.');
  }

  if (typeof log.notes !== 'string' || log.notes.length > 200) {
    throw new Error('Notes must be 200 characters or fewer.');
  }
}

export function toDatabaseFields(log: HealthLog) {
  return {
    flow: log.flow,
    pain: PAIN_TO_DB[log.pain],
    mood: MOOD_TO_DB[log.mood],
    notes: log.notes.trim() || null,
  };
}
