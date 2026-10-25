import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  calculateCycleStats,
  symptomFrequency,
  symptomEntrySchema,
  validateCycleEntry,
  validateSymptomEntry,
  type CycleEntry,
} from '../src/features/tracker/trackerData';

const cycles: CycleEntry[] = [
  { id: 'c2', startDate: '2026-02-01', endDate: null, notes: null },
  { id: 'c1', startDate: '2026-01-04', endDate: '2026-01-08', notes: null },
  { id: 'c3', startDate: '2026-03-01', endDate: null, notes: null },
];

describe('cycle validation and statistics', () => {
  it('calculates cycle lengths and estimate from actual period start dates', () => {
    expect(calculateCycleStats(cycles)).toEqual({
      lengths: [
        { startDate: '2026-02-01', days: 28 },
        { startDate: '2026-03-01', days: 28 },
      ],
      averageLength: 28,
      minLength: 28,
      maxLength: 28,
      nextEstimate: '2026-03-29',
    });
  });

  it('returns no estimate until there are two distinct valid start dates', () => {
    expect(calculateCycleStats([cycles[0]])).toMatchObject({
      lengths: [],
      averageLength: null,
      nextEstimate: null,
    });
  });

  it('uses a robust median of recent intervals for the next estimate', () => {
    const irregularHistory: CycleEntry[] = [
      { id: 'old-1', startDate: '2025-01-01', endDate: null, notes: null },
      { id: 'old-2', startDate: '2025-07-20', endDate: null, notes: null },
      { id: 'recent-1', startDate: '2025-08-17', endDate: null, notes: null },
      { id: 'recent-2', startDate: '2025-10-26', endDate: null, notes: null },
      { id: 'latest', startDate: '2025-11-25', endDate: null, notes: null },
    ];

    expect(calculateCycleStats(irregularHistory).nextEstimate).toBe('2025-12-25');
  });

  it('rejects invalid dates, reversed end dates, and duplicate starts', () => {
    expect(() => validateCycleEntry({ startDate: '2026-02-30', endDate: null, notes: '' })).toThrow();
    expect(() => validateCycleEntry({ startDate: '2026-02-01', endDate: '2026-01-31', notes: '' })).toThrow();
    expect(() => validateCycleEntry({ startDate: '2026-02-01', endDate: null, notes: '' }, cycles)).toThrow();
  });

  it('allows editing an existing record without treating its own date as a duplicate', () => {
    expect(() => validateCycleEntry({
      id: 'c2',
      startDate: '2026-02-01',
      endDate: null,
      notes: '',
    }, cycles)).not.toThrow();
  });
});

describe('symptom validation and timeline', () => {
  it('accepts the actual symptom form values without a separate date field', () => {
    expect(symptomEntrySchema.safeParse({
      recordedAt: '2026-10-25T17:00',
      code: 'cramps',
      severity: 3,
      note: '',
    }).success).toBe(true);
  });

  it.each([
    { recordedAt: 'not-a-date', code: 'cramps', severity: 3, note: '' },
    { recordedAt: '2026-10-25T17:00', code: '', severity: 3, note: '' },
    { recordedAt: '2026-10-25T17:00', code: 'cramps', severity: 6, note: '' },
  ])('rejects invalid symptom form values: %o', (input) => {
    expect(symptomEntrySchema.safeParse(input).success).toBe(false);
  });

  it('validates symptom date and severity bounds', () => {
    expect(() => validateSymptomEntry('2026-02-30', '2026-02-01T09:00:00.000Z', 'cramps', 3)).toThrow();
    expect(() => validateSymptomEntry('2026-02-01', 'invalid', 'cramps', 3)).toThrow();
    expect(() => validateSymptomEntry('2026-02-01', '2026-02-01T09:00:00.000Z', '', 3)).toThrow();
    expect(() => validateSymptomEntry('2026-02-01', '2026-02-01T09:00:00.000Z', 'cramps', 1)).not.toThrow();
  });

  it('builds an ascending localized timeline and symptom frequency', () => {
    const timeline = buildTimeline(
      [cycles[0]],
      [{ date: '2026-02-03', flow: 1, pain: 4, mood: 'irritable' }],
      [{ id: 's1', date: '2026-02-02', code: 'cramps', severity: 2 }],
      [{ code: 'cramps', category: 'pain', labelEn: 'Cramps', labelHi: 'ऐंठन' }],
      'hi',
      {
        periodStarted: 'माहवारी शुरू हुई',
        periodEnded: 'समाप्ति',
        periodEndMissing: 'समाप्ति की तारीख दर्ज नहीं',
        dailyLog: 'दैनिक स्वास्थ्य लॉग',
        flow: 'फ़्लो',
        pain: 'दर्द',
        severity: 'तीव्रता',
        moods: { good: 'अच्छा', irritable: 'चिड़चिड़ापन' },
      }
    );
    expect(timeline.map((item) => item.date)).toEqual([
      '2026-02-01',
      '2026-02-02',
      '2026-02-03',
    ]);
    expect(timeline[1].title).toBe('ऐंठन');
    expect(timeline[2].detail).toContain('चिड़चिड़ापन');
    expect(symptomFrequency(
      [{ id: 'a', date: '2026-02-01', code: 'cramps', severity: 1 }],
      [{ code: 'cramps', category: 'pain', labelEn: 'Cramps', labelHi: 'ऐंठन' }],
      'en'
    )).toEqual([{ label: 'Cramps', count: 1 }]);
  });
});
