import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useT } from '../../i18n/t';
import { cycleRepo, symptomRepo } from './trackerRepositories';
import {
  buildTimeline,
  calculateCycleStats,
  symptomFrequency,
  newCycleEntrySchema,
  symptomEntrySchema,
  type CycleEntry,
  type DailyLog,
  type NewCycleEntry,
  type SymptomDefinition,
  type SymptomEntry,
} from './trackerData';

type Props = { userId: string; dailyLogs: DailyLog[] };
type SymptomFormValues = { date: string; code: string; severity: number };

function localToday(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function HealthHistory({ userId, dailyLogs }: Props) {
  const { t, lang } = useT();
  const activeUserId = useRef(userId);
  activeUserId.current = userId;
  const [cycles, setCycles] = useState<CycleEntry[]>([]);
  const [catalogue, setCatalogue] = useState<SymptomDefinition[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cycleForm = useForm<NewCycleEntry>({
    resolver: zodResolver(newCycleEntrySchema),
    defaultValues: { startDate: localToday(), endDate: null, notes: '' },
  });
  const symptomForm = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomEntrySchema),
    defaultValues: { date: localToday(), code: '', severity: 3 },
  });

  async function reload(ownerId: string) {
    const [cycleRows, symptomCatalog, symptomRows] = await Promise.all([
      cycleRepo.list(ownerId),
      symptomRepo.catalog(ownerId),
      symptomRepo.list(ownerId),
    ]);
    if (activeUserId.current !== ownerId) return;
    setCycles(cycleRows);
    setCatalogue(symptomCatalog);
    setSymptoms(symptomRows);
    if (!symptomForm.getValues('code')) {
      symptomForm.setValue('code', symptomCatalog[0]?.code ?? '');
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setLoadedUserId(null);
    setCycles([]);
    setCatalogue([]);
    setSymptoms([]);
    cycleForm.reset({ startDate: localToday(), endDate: null, notes: '' });
    symptomForm.reset({ date: localToday(), code: '', severity: 3 });

    void Promise.all([
      cycleRepo.list(userId),
      symptomRepo.catalog(userId),
      symptomRepo.list(userId),
    ]).then(([cycleRows, symptomCatalog, symptomRows]) => {
      if (cancelled) return;
      setCycles(cycleRows);
      setCatalogue(symptomCatalog);
      setSymptoms(symptomRows);
      symptomForm.setValue('code', symptomCatalog[0]?.code ?? '');
      setLoadedUserId(userId);
    }).catch(() => {
      if (!cancelled) {
        setError(t('tracker.loadError'));
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, lang]);

  async function saveCycle(input: NewCycleEntry) {
    if (busy) return;
    const ownerId = userId;
    setBusy(true);
    setError('');
    try {
      const saved = await cycleRepo.save(ownerId, input);
      if (activeUserId.current !== ownerId) return;
      setCycles((current) => [
        saved,
        ...current.filter((cycle) => cycle.id !== saved.id && cycle.startDate !== saved.startDate),
      ].sort((a, b) => b.startDate.localeCompare(a.startDate)));
      cycleForm.reset({ startDate: localToday(), endDate: null, notes: '' });
    } catch {
      if (activeUserId.current === ownerId) {
        setError(t('tracker.saveError'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteCycle(id: string) {
    const ownerId = userId;
    setBusy(true);
    setError('');
    try {
      await cycleRepo.remove(ownerId, id);
      if (activeUserId.current === ownerId) {
        setCycles((current) => current.filter((cycle) => cycle.id !== id));
      }
    } catch {
      if (activeUserId.current === ownerId) {
        setError(t('tracker.deleteError'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveSymptom(input: SymptomFormValues) {
    if (busy) return;
    const ownerId = userId;
    setBusy(true);
    setError('');
    try {
      await symptomRepo.upsert(ownerId, {
        date: input.date,
        code: input.code,
        severity: input.severity,
      });
      if (activeUserId.current !== ownerId) return;
      await reload(ownerId);
    } catch {
      if (activeUserId.current === ownerId) {
        setError(t('tracker.saveError'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteSymptom(id: string) {
    const ownerId = userId;
    setBusy(true);
    setError('');
    try {
      await symptomRepo.remove(ownerId, id);
      if (activeUserId.current === ownerId) {
        setSymptoms((current) => current.filter((symptom) => symptom.id !== id));
      }
    } catch {
      if (activeUserId.current === ownerId) {
        setError(t('tracker.deleteError'));
      }
    } finally {
      setBusy(false);
    }
  }

  const stats = calculateCycleStats(cycles);
  const timeline = buildTimeline(cycles, dailyLogs, symptoms, catalogue, lang, {
    periodStarted: t('tracker.timeline.periodStarted'),
    periodEnded: t('tracker.timeline.periodEnded'),
    periodEndMissing: t('tracker.timeline.periodEndMissing'),
    dailyLog: t('tracker.timeline.dailyLog'),
    flow: t('tracker.timeline.flow'),
    pain: t('tracker.timeline.pain'),
    severity: t('tracker.timeline.severity'),
    moods: {
      low: t('tracker.mood.low'),
      anxious: t('tracker.mood.anxious'),
      okay: t('tracker.mood.okay'),
      good: t('tracker.mood.good'),
      great: t('tracker.mood.great'),
      irritable: t('tracker.mood.irritable'),
    },
  });
  const frequency = symptomFrequency(symptoms, catalogue, lang).slice(0, 8);
  const chartLogs = dailyLogs.slice(-30);
  const dateLabel = (date: string) => new Intl.DateTimeFormat(
    lang === 'hi' ? 'hi-IN' : 'en',
    { dateStyle: 'medium', timeZone: 'UTC' }
  ).format(new Date(`${date}T00:00:00.000Z`));

  return (
    <section className="mt-8 space-y-6" aria-labelledby="tracker-history-heading">
      <h2 id="tracker-history-heading" className="text-xl font-semibold">{t('tracker.history')}</h2>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p role="status" className="text-sm text-ink/60">{t('tracker.loadingHistory')}</p>
      ) : loadedUserId !== userId ? null : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <form className="card space-y-3" onSubmit={cycleForm.handleSubmit((input) => void saveCycle(input))}>
              <h3 className="font-semibold">{t('tracker.addPeriod')}</h3>
              {Object.keys(cycleForm.formState.errors).length > 0 && (
                <p role="alert" className="text-sm text-red-700">{t('tracker.validationError')}</p>
              )}
              <label className="block text-sm">
                {t('tracker.periodStart')}
                <input className="input mt-1" type="date" required {...cycleForm.register('startDate')} />
              </label>
              <label className="block text-sm">
                {t('tracker.periodEnd')}
                <input className="input mt-1" type="date"
                  {...cycleForm.register('endDate', { setValueAs: (value: string) => value || null })} />
              </label>
              <label className="block text-sm">
                {t('tracker.periodNotes')}
                <textarea className="input mt-1" maxLength={500} {...cycleForm.register('notes')} />
              </label>
              <button className="btn-primary" disabled={busy}>{t('tracker.savePeriod')}</button>
              {cycles.length > 0 && (
                <ul className="divide-y divide-soft">
                  {cycles.map((cycle) => (
                    <li key={cycle.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <button type="button" className="text-left underline decoration-dotted"
                        onClick={() => cycleForm.reset({
                          id: cycle.id,
                          startDate: cycle.startDate,
                          endDate: cycle.endDate,
                          notes: cycle.notes ?? '',
                        })}>
                        {dateLabel(cycle.startDate)}{cycle.endDate ? ` – ${dateLabel(cycle.endDate)}` : ''}
                      </button>
                      <button type="button" className="text-red-700 underline" disabled={busy}
                        onClick={() => void deleteCycle(cycle.id)}>{t('tracker.delete')}</button>
                    </li>
                  ))}
                </ul>
              )}
            </form>

            <form className="card space-y-3" onSubmit={symptomForm.handleSubmit((input) => void saveSymptom(input))}>
              <h3 className="font-semibold">{t('tracker.addSymptom')}</h3>
              {Object.keys(symptomForm.formState.errors).length > 0 && (
                <p role="alert" className="text-sm text-red-700">{t('tracker.validationError')}</p>
              )}
              {catalogue.length === 0 ? (
                <p className="text-sm text-ink/60">{t('tracker.catalogEmpty')}</p>
              ) : (
                <>
                  <label className="block text-sm">
                    {t('tracker.symptom')}
                    <select className="input mt-1" {...symptomForm.register('code')}>
                      {catalogue.map((item) => (
                        <option key={item.code} value={item.code}>
                          {lang === 'hi' ? item.labelHi : item.labelEn}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    {t('tracker.symptomDate')}
                    <input className="input mt-1" type="date" required {...symptomForm.register('date')} />
                  </label>
                  <label className="block text-sm">
                    {t('tracker.severity')}
                    <select className="input mt-1"
                      {...symptomForm.register('severity', { setValueAs: (value: string) => Number(value) })}>
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
                    </select>
                  </label>
                  <button className="btn-primary" disabled={busy}>{t('tracker.saveSymptom')}</button>
                </>
              )}
              {symptoms.length > 0 && (
                <ul className="divide-y divide-soft">
                  {symptoms.slice(0, 10).map((symptom) => {
                    const definition = catalogue.find((item) => item.code === symptom.code);
                    return (
                      <li key={symptom.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>{dateLabel(symptom.date)} · {definition ? (lang === 'hi' ? definition.labelHi : definition.labelEn) : symptom.code} · {symptom.severity}/5</span>
                        <button type="button" className="text-red-700 underline" disabled={busy}
                          onClick={() => void deleteSymptom(symptom.id)}>{t('tracker.delete')}</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </form>
          </div>

          <div className="card">
            <h3 className="font-semibold">{t('tracker.cycleSummary')}</h3>
            {stats.averageLength === null ? (
              <p className="mt-2 text-sm text-ink/60">{t('tracker.insufficientCycles')}</p>
            ) : (
              <p className="mt-2 text-sm">
                {t('tracker.averageCycle')}: {stats.averageLength} {t('tracker.days')}
                {stats.minLength !== null && stats.maxLength !== null
                  ? ` (${stats.minLength}–${stats.maxLength} ${t('tracker.days')})`
                  : ''}
                {stats.nextEstimate ? ` · ${t('tracker.nextEstimate')}: ${dateLabel(stats.nextEstimate)}` : ''}
              </p>
            )}
            <p className="mt-1 text-xs text-ink/60">{t('tracker.estimateDisclaimer')}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card min-w-0">
              <h3 className="mb-3 font-semibold">{t('tracker.cycleLengthChart')}</h3>
              {stats.lengths.length === 0 ? <p className="text-sm text-ink/60">{t('tracker.insufficientCycles')}</p> : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.lengths}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="startDate" tickFormatter={dateLabel} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={(value) => dateLabel(String(value))} />
                      <Bar dataKey="days" fill="#6D3AAE" name={t('tracker.days')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="card min-w-0">
              <h3 className="mb-3 font-semibold">{t('tracker.dailyTrends')}</h3>
              {chartLogs.length === 0 ? <p className="text-sm text-ink/60">{t('tracker.nodata')}</p> : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={dateLabel} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={(value) => dateLabel(String(value))} />
                      <Line type="monotone" dataKey="flow" stroke="#B42318" name={t('tracker.chart.flow')} />
                      <Line type="monotone" dataKey="pain" stroke="#F97316" name={t('tracker.chart.pain')} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="card min-w-0">
              <h3 className="mb-3 font-semibold">{t('tracker.symptomFrequency')}</h3>
              {frequency.length === 0 ? <p className="text-sm text-ink/60">{t('tracker.nodata')}</p> : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frequency} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#A78BFA" name={t('tracker.occurrences')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="card">
              <h3 className="mb-3 font-semibold">{t('tracker.timeline')}</h3>
              {timeline.length === 0 ? <p className="text-sm text-ink/60">{t('tracker.nodata')}</p> : (
                <ol className="space-y-3">
                  {[...timeline].reverse().map((item) => (
                    <li key={item.id} className="border-l-2 border-lavender pl-3">
                      <p className="text-xs text-ink/60">{dateLabel(item.date)}</p>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-sm text-ink/70">{item.detail}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
