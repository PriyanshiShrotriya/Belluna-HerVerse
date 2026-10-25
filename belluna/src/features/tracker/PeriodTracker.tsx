import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Zap,
  Smile,
  Save,
  CalendarHeart,
  BarChart2,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { getDailyLogs, saveDailyLog } from './dailyLogsService';
import { useAuth } from '../../app/stubs/auth';
import { loadTrackerLogs, saveTrackerLogs } from './trackerStorage';
import { useT } from '../../i18n/t';

const HealthHistory = lazy(() => import('./HealthHistory'));

type Log = { flow: number; pain: number; mood: number; notes: string };
type Logs = Record<string, Log>;

const MOODS = ['😢', '😕', '😐', '🙂', '😄', '😣'];
const MOOD_LABEL_KEYS = [
  'tracker.mood.low',
  'tracker.mood.anxious',
  'tracker.mood.okay',
  'tracker.mood.good',
  'tracker.mood.great',
  'tracker.mood.irritable',
] as const;

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function getDays(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDay(year: number, month: number) { return new Date(year, month, 1).getDay(); }

const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्तूबर', 'नवंबर', 'दिसंबर'];
const DAY_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_HI = ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'];

// ─── Mini Bar Chart Component ──────────────────────────────────────────────
function TrendChart({ data, label, color, maxVal = 3, mood = false }: { data: { date: string; val: number }[]; label: string; color: string; maxVal?: number; mood?: boolean }) {
  if (!data.length) return null;
  const last30 = data.slice(-30);
  return (
    <div className="rounded-2xl border border-soft/70 bg-white/80 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="h-48 w-full" role="img" aria-label={`${label} trend across the last ${last30.length} logged days`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={last30} margin={{ top: 8, right: 2, bottom: 0, left: -22 }}>
            <CartesianGrid vertical={false} stroke="#eee8f5" strokeDasharray="3 5" />
            <XAxis dataKey="date" tickFormatter={(date: string) => date.slice(5)} tickLine={false} axisLine={false} tick={{ fill: '#91879d', fontSize: 10 }} interval="preserveStartEnd" minTickGap={22} />
            <YAxis domain={[0, maxVal]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#91879d', fontSize: 10 }} width={28} />
            <Tooltip
              cursor={{ fill: '#f6f1fb' }}
              labelFormatter={(date) => String(date)}
              formatter={(value) => [value, label]}
              contentStyle={{ borderRadius: 12, border: '1px solid #eee8f5', boxShadow: '0 8px 28px rgba(49,30,69,.1)', fontSize: 12 }}
            />
            {mood
              ? <Line type="monotone" dataKey="val" stroke={color} strokeWidth={3} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              : <Bar dataKey="val" fill={color} radius={[5, 5, 0, 0]} maxBarSize={18} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-ink/45">Last {last30.length} logged days</p>
    </div>
  );
}

export default function PeriodTracker() {
  const { session } = useAuth();
  const userId = session?.userId ?? null;
  const activeUserId = useRef(userId);
  activeUserId.current = userId;
  const { t, lang } = useT();
  const localCacheWarning = t('tracker.localCacheWarning');
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [logs, setLogs] = useState<Logs>({});
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Log>({ flow: 0, pain: 0, mood: 2, notes: '' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    if (!loading && userId && loadedUserId === userId) {
      try {
        saveTrackerLogs(userId, logs, window.localStorage);
      } catch {
        setError(localCacheWarning);
      }
    }
  }, [logs, loading, userId, loadedUserId, localCacheWarning]);

  useEffect(() => {
    let cancelled = false;

    setSelected(null);
    setForm({ flow: 0, pain: 0, mood: 2, notes: '' });
    setSaved(false);
    setError('');

    if (!userId) {
      setLogs({});
      setLoadedUserId(null);
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    const authenticatedUserId = userId;

    async function loadLogs() {
      setLoading(true);

      try {
        const localLogs = loadTrackerLogs(
          authenticatedUserId,
          window.localStorage
        );

        setLogs(localLogs);
        setLoadedUserId(authenticatedUserId);

        const cloudLogs = await getDailyLogs(authenticatedUserId);

        if (cancelled) return;

        const mergedLogs: Logs = { ...localLogs, ...cloudLogs };
        setLogs(mergedLogs);

        for (const [date, log] of Object.entries(localLogs)) {
          if (!Object.prototype.hasOwnProperty.call(cloudLogs, date)) {
            try {
              await saveDailyLog(authenticatedUserId, date, log);
            } catch {
              if (!cancelled) {
                setError(t('tracker.migrationWarning'));
              }
            }
          }

          if (cancelled) return;
        }
      } catch {
        if (!cancelled) {
          setLoadedUserId(authenticatedUserId);
          setError(t('tracker.loadError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLogs();

    return () => {
      cancelled = true;
    };
  }, [userId]);
  useEffect(() => {
    if (selected && logs[selected]) setForm(logs[selected]);
    else setForm({ flow: 0, pain: 0, mood: 2, notes: '' });
    setSaved(false);
  }, [selected]);

 
async function save() {
  if (!userId || loadedUserId !== userId || !selected || saving || loading) return;
  const savingUserId = userId;

  setSaving(true);
  setError('');
  setSaved(false);

  try {
    await saveDailyLog(savingUserId, selected, form);
    if (activeUserId.current !== savingUserId) return;

    setLogs((previous) => ({
      ...previous,
      [selected]: { ...form },
    }));

    setSaved(true);
  } catch {
    if (activeUserId.current === savingUserId) {
      setError(t('tracker.saveError'));
    }
  } finally {
    setSaving(false);
  }
}


  const FLOWS = [t('tracker.flow.none'), t('tracker.flow.light'), t('tracker.flow.medium'), t('tracker.flow.heavy'), t('tracker.flow.veryHeavy')];
  const PAINS = [t('tracker.pain.none'), t('tracker.pain.mild'), t('tracker.pain.moderate'), t('tracker.pain.severe')];
  const MONTHS = lang === 'hi' ? MONTH_HI : MONTH_EN;
  const DAYS = lang === 'hi' ? DAY_HI : DAY_EN;

  const days = getDays(year, month);
  const firstDay = getFirstDay(year, month);
  if (!userId) {
    return (
      <p role="status" className="mx-auto max-w-5xl px-4 py-8 text-ink/70">
        Sign in to view your health logs.
      </p>
    );
  }

  if (loading || loadedUserId !== userId) {
    return (
      <p role="status" className="mx-auto max-w-5xl px-4 py-8 text-ink/70">
        Loading your health logs…
      </p>
    );
  }

  const prev = () => { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); };

  function dotColor(key: string) {
    const l = logs[key];
    if (!l) return '';
    if (l.flow >= 2) return 'bg-[#B42318]';
    if (l.flow === 1) return 'bg-pink-400';
    if (l.pain >= 2) return 'bg-orange-400';
    return 'bg-lavender';
  }

  // Chart data — all logged days sorted ascending
  const allEntries = Object.entries(logs).sort(([a], [b]) => a.localeCompare(b));
  const flowData = allEntries.map(([k, v]) => ({ date: k, val: v.flow }));
  const painData = allEntries.map(([k, v]) => ({ date: k, val: v.pain }));
  const moodData = allEntries.map(([k, v]) => ({ date: k, val: v.mood }));
  const hasData = allEntries.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#f2ecff] via-[#fff8fc] to-[#fcecf4] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-primary shadow-sm"><CalendarHeart size={22} /></span>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-primary/70">{lang === 'hi' ? 'आपका चक्र' : 'Your cycle, your way'}</p>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Period Tracker</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
              {lang === 'hi'
                ? 'तारीख टैप करके अपने लक्षण दर्ज करें। आपकी प्रविष्टियाँ आपके खाते से जुड़ी हैं।'
                : 'Tap a date to log your symptoms and notice your personal patterns over time.'}
            </p>
          </div>
          <button onClick={() => setShowCharts(!showCharts)} aria-pressed={showCharts}
            className={`btn ${showCharts ? 'bg-primary text-white shadow-md shadow-primary/15' : 'bg-white text-primary hover:bg-soft'}`}>
            <BarChart2 size={17} />
            {t('tracker.charts')}
          </button>
        </div>
      </div>

      {loading && (
        <p role="status" className="mb-4 text-sm text-ink/60">
          {lang === 'hi'
            ? 'आपकी स्वास्थ्य प्रविष्टियाँ लोड हो रही हैं…'
            : 'Loading your health logs…'}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Stats strip */}
      <div className="mb-6 max-w-xs">
        <div className="card flex items-center gap-4 border-lavender/30 bg-gradient-to-br from-white to-[#f8f4ff]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-soft text-primary"><Droplets size={20} /></span>
          <div>
          <p className="text-xs text-ink/60 mb-1">{lang === 'hi' ? 'दर्ज किए दिन' : 'Days logged'}</p>
          <p className="text-2xl font-semibold text-primary">{Object.keys(logs).filter(k => logs[k].flow > 0).length}</p>
          </div>
        </div>
      </div>

      {/* Charts panel */}
      {showCharts && (
        <div className="card mb-6 border-lavender/20 bg-gradient-to-br from-white via-white to-[#faf7ff] p-4 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-soft text-primary"><BarChart2 size={19} /></span>
            <div><h2 className="font-semibold text-base">{t('tracker.charts')}</h2><p className="mt-1 text-xs leading-5 text-ink/55">{t('tracker.charts.sub')}</p></div>
          </div>
          {!hasData ? (
            <div className="rounded-2xl border border-dashed border-lavender/40 bg-white/70 py-9 text-center text-ink/55">
              <BarChart2 size={34} className="mx-auto mb-3 text-lavender" />
              <p className="text-sm">{t('tracker.nodata')}</p>
              <p className="mt-1 text-xs">Add a daily log to see your flow, pain and mood trends.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <TrendChart data={flowData} label={t('tracker.chart.flow')} color="#b94c72" maxVal={4} />
              <TrendChart data={painData} label={t('tracker.chart.pain')} color="#df8a58" maxVal={10} />
              <TrendChart data={moodData} label={t('tracker.chart.mood')} color="#7652ae" maxVal={5} mood />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="btn-ghost p-2 min-h-0 h-9 w-9"><ChevronLeft size={18} /></button>
            <h2 className="font-semibold text-lg">{MONTHS[month]} {year}</h2>
            <button onClick={next} className="btn-ghost p-2 min-h-0 h-9 w-9"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink/50 mb-2">
            {DAYS.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1;
              const key = toKey(year, month, d);
              const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
              const isSel = selected === key;
              const dot = dotColor(key);
              return (
                <button key={d} onClick={() => setSelected(key)}
                  className={`relative flex flex-col items-center justify-center rounded-xl py-2 text-sm transition-all
                    ${isSel ? 'bg-primary text-white font-bold' : isToday ? 'bg-soft font-semibold text-primary' : 'hover:bg-soft/60'}`}>
                  {d}
                  {dot && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : dot}`} />}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink/60">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#B42318]" />{lang === 'hi' ? 'भारी फ़्लो' : 'Heavy flow'}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-400" />{lang === 'hi' ? 'हल्का फ़्लो' : 'Light flow'}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />{lang === 'hi' ? 'दर्द' : 'Pain logged'}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lavender" />{lang === 'hi' ? 'अन्य' : 'Other'}</span>
          </div>
        </div>

        {/* Log form */}
        <div className="card">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 text-ink/50 gap-3">
              <CalendarHeart size={40} className="text-lavender" />
              <p className="text-sm">{t('tracker.symptoms')}</p>
              <Link to="/sos" className="mt-2 text-xs text-primary underline">Period SOS →</Link>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-lg mb-4">
                {selected === toKey(today.getFullYear(), today.getMonth(), today.getDate())
                  ? (lang === 'hi' ? 'आज' : 'Today')
                  : selected}
              </h2>
              {/* Flow */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-medium mb-2"><Droplets size={16} className="text-primary" />{lang === 'hi' ? 'फ़्लो' : 'Flow'}</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {FLOWS.map((f, i) => (
                    <button key={f} onClick={() => setForm({ ...form, flow: i })}
                      className={`rounded-xl py-2 text-sm font-medium transition-all ${form.flow === i ? 'bg-primary text-white' : 'bg-soft hover:bg-lavender/30'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {/* Pain */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-medium mb-2"><Zap size={16} className="text-primary" />{lang === 'hi' ? 'दर्द का स्तर' : 'Pain level'}</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink/60">{PAINS[0]}</span>
                  <input type="range" min="0" max="10" step="1" value={form.pain}
                    onChange={(event) => setForm({ ...form, pain: Number(event.target.value) })}
                    className="w-full accent-orange-500" aria-label={lang === 'hi' ? 'दर्द का स्तर 0 से 10' : 'Pain level from 0 to 10'} />
                  <span className="min-w-8 text-right text-sm font-medium">{form.pain}/10</span>
                </div>
              </div>
              {/* Mood */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-medium mb-2"><Smile size={16} className="text-primary" />{lang === 'hi' ? 'मूड' : 'Mood'}</label>
                <div className="flex gap-3">
                  {MOODS.map((m, i) => (
                    <button key={i} type="button" aria-label={t(MOOD_LABEL_KEYS[i])}
                      aria-pressed={form.mood === i} onClick={() => setForm({ ...form, mood: i })}
                      className={`text-2xl rounded-xl p-2 transition-all ${form.mood === i ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'hover:bg-soft'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">{lang === 'hi' ? 'नोट्स (वैकल्पिक)' : 'Notes (optional)'}</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder={lang === 'hi' ? 'आप कैसा महसूस कर रही हैं?' : 'How are you feeling?'}
                  className="input py-2 resize-none" maxLength={200} />
              </div>
              <button
                onClick={() => void save()}
                disabled={loading || saving}
                className="btn-primary w-full disabled:opacity-60"
              >
                <Save size={16} />
                {saving
                  ? (lang === 'hi' ? 'सेव हो रहा है…' : 'Saving…')
                  : saved
                    ? (lang === 'hi' ? '✓ सेव हो गया!' : '✓ Saved!')
                    : (lang === 'hi' ? 'सेव करें' : 'Save log')}
              </button>
            </>
          )}
        </div>
      </div>
      <Suspense fallback={<p role="status" className="text-sm text-ink/60">{t('tracker.loadingHistory')}</p>}>
        <HealthHistory
          userId={userId}
          dailyLogs={allEntries.map(([date, log]) => ({
            date,
            flow: log.flow,
            pain: log.pain,
            mood: MOODS[log.mood],
          }))}
        />
      </Suspense>
    </div>
  );
}
