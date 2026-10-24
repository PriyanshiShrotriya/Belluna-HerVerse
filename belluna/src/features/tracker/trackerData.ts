import { z } from 'zod';

export type CycleEntry = {
  id: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
};

export type NewCycleEntry = {
  id?: string;
  startDate: string;
  endDate: string | null;
  notes: string;
};

export type DailyLog = {
  date: string;
  flow: number;
  pain: number;
  mood: string;
};

export type SymptomDefinition = {
  code: string;
  category: string;
  labelEn: string;
  labelHi: string;
};

export type SymptomEntry = {
  id: string;
  date: string;
  code: string;
  severity: number;
};

export type TimelineItem = {
  id: string;
  date: string;
  kind: 'cycle' | 'daily-log' | 'symptom';
  title: string;
  detail: string;
};

export type TimelineLabels = {
  periodStarted: string;
  periodEnded: string;
  periodEndMissing: string;
  dailyLog: string;
  flow: string;
  pain: string;
  severity: string;
  moods: Record<string, string>;
};

export type CycleStats = {
  lengths: { startDate: string; days: number }[];
  averageLength: number | null;
  minLength: number | null;
  maxLength: number | null;
  nextEstimate: string | null;
};

export const isoDateSchema = z.string().refine(
  (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  },
  'Enter a valid date.'
);

export function isValidDate(value: string): boolean {
  return isoDateSchema.safeParse(value).success;
}

export const newCycleEntrySchema = z.object({
  id: z.string().optional(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullable(),
  notes: z.string().max(500, 'Period notes must be 500 characters or fewer.'),
}).superRefine((input, context) => {
  if (input.endDate && input.endDate < input.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'Period end date cannot be before its start date.',
    });
  }
});

export const symptomEntrySchema = z.object({
  date: isoDateSchema,
  code: z.string().trim().min(1, 'Choose a symptom.'),
  severity: z.number().int().min(1).max(5),
});

export function validateCycleEntry(
  input: NewCycleEntry,
  existing: CycleEntry[] = []
): void {
  const parsed = newCycleEntrySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  if (existing.some((entry) => entry.startDate === input.startDate && entry.id !== input.id)) {
    throw new Error('A period with this start date already exists.');
  }
}

export function validateSymptomEntry(date: string, code: string, severity: number): void {
  const parsed = symptomEntrySchema.safeParse({ date, code, severity });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
}

function dateMilliseconds(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

function addDays(date: string, days: number): string {
  return new Date(dateMilliseconds(date) + days * 86_400_000).toISOString().slice(0, 10);
}

export function calculateCycleStats(entries: CycleEntry[]): CycleStats {
  const starts = [...new Set(entries.map((entry) => entry.startDate).filter(isValidDate))].sort();
  const lengths = starts.slice(1).map((startDate, index) => ({
    startDate,
    days: Math.round((dateMilliseconds(startDate) - dateMilliseconds(starts[index])) / 86_400_000),
  }));
  if (!lengths.length) {
    return { lengths: [], averageLength: null, minLength: null, maxLength: null, nextEstimate: null };
  }

  const values = lengths.map((length) => length.days);
  const averageLength = Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  const recentValues = values.slice(-3).sort((a, b) => a - b);
  const midpoint = Math.floor(recentValues.length / 2);
  // A recent median limits the influence of a single unusually long or short interval.
  const recentMedian = recentValues.length % 2
    ? recentValues[midpoint]
    : (recentValues[midpoint - 1] + recentValues[midpoint]) / 2;
  return {
    lengths,
    averageLength,
    minLength: Math.min(...values),
    maxLength: Math.max(...values),
    nextEstimate: addDays(starts[starts.length - 1], Math.round(recentMedian)),
  };
}

export function buildTimeline(
  cycles: CycleEntry[],
  dailyLogs: DailyLog[],
  symptoms: SymptomEntry[],
  catalogue: SymptomDefinition[],
  language: 'en' | 'hi',
  labels: TimelineLabels
): TimelineItem[] {
  const symptomLabels = new Map(catalogue.map((item) => [item.code, language === 'hi' ? item.labelHi : item.labelEn]));
  return [
    ...cycles.map((cycle) => ({
      id: `cycle:${cycle.id}`,
      date: cycle.startDate,
      kind: 'cycle' as const,
      title: labels.periodStarted,
      detail: cycle.endDate
        ? `${labels.periodEnded}: ${cycle.endDate}`
        : labels.periodEndMissing,
    })),
    ...dailyLogs.map((log) => ({
      id: `log:${log.date}`,
      date: log.date,
      kind: 'daily-log' as const,
      title: labels.dailyLog,
      detail: `${labels.flow} ${log.flow} · ${labels.pain} ${log.pain} · ${labels.moods[log.mood] ?? log.mood}`,
    })),
    ...symptoms.map((symptom) => ({
      id: `symptom:${symptom.id}`,
      date: symptom.date,
      kind: 'symptom' as const,
      title: symptomLabels.get(symptom.code) ?? symptom.code,
      detail: `${labels.severity}: ${symptom.severity}/5`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function symptomFrequency(
  entries: SymptomEntry[],
  catalogue: SymptomDefinition[],
  language: 'en' | 'hi'
): { label: string; count: number }[] {
  const labels = new Map(catalogue.map((item) => [item.code, language === 'hi' ? item.labelHi : item.labelEn]));
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
  return [...counts].map(([code, count]) => ({ label: labels.get(code) ?? code, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
