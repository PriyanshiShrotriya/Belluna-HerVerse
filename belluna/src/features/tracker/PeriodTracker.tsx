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
function BarChart({ data, label, color, maxVal = 3 }: { data: { date: string; val: number }[]; label: string; color: string; maxVal?: number }) {
  if (!data.length) return null;
  const last30 = data.slice(-30);
  return (
    <div>
      <p className="text-xs font-semibold text-ink/60 mb-2 uppercase tracking-wide">{label}</p>
      <div className="flex items-end gap-px h-14 overflow-hidden">
        {last30.map((d, i) => {
          const pct = maxVal > 0 ? (d.val / maxVal) * 100 : 0;
          return (
            <div key={i} className="group relative flex-1 flex items-end" title={`${d.date}: ${d.val}`}>
              <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(pct, d.val > 0 ? 8 : 0)}%`, background: d.val > 0 ? color : '#f1f0f7' }} />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink/40 mt-1">Last 30 logged days</p>
    </div>
  );
}

// ─── Mood Line Chart ───────────────────────────────────────────────────────
function MoodChart({ data, label }: { data: { date: string; val: number }[]; label: string }) {
  const last = data.slice(-20);
  if (!last.length) return null;
  const w = 100 / last.length;
  const points = last.map((d, i) => `${(i * w + w / 2).toFixed(1)},${((5 - d.val) / 5) * 80 + 10}`).join(' ');
  return (
    <div>
      <p className="text-xs font-semibold text-ink/60 mb-2 uppercase tracking-wide">{label}</p>
      <svg viewBox="0 0 100 100" className="h-14 w-full" preserveAspectRatio="none">
        <polyline fill="none" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {last.map((d, i) => (
          <circle key={i} cx={(i * w + w / 2).toFixed(1)} cy={((5 - d.val) / 5) * 80 + 10} r="3" fill="#6D3AAE" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-ink/40 mt-1">
        <span>😢</span><span>😐</span><span>😄</span>
      </div>
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
  const [showCharts, setShowCharts] = useState(false);

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3 mb-2 justify-between">
        <div className="flex items-center gap-3">
          <CalendarHeart className="text-primary" size={28} />
          <h1 className="text-2xl font-semibold">Period Tracker</h1>
        </div>
        <button onClick={() => setShowCharts(!showCharts)}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all border ${showCharts ? 'bg-primary text-white border-primary' : 'bg-white border-soft text-primary hover:bg-soft'}`}>
          <BarChart2 size={16} />
          {t('tracker.charts')}
        </button>
      </div>
      <p className="text-ink/70 mb-6 text-sm">
        {lang === 'hi'
          ? 'तारीख टैप करके अपने लक्षण दर्ज करें। आपकी प्रविष्टियाँ आपके खाते से जुड़ी हैं।'
          : 'Tap a date to log your symptoms and track your cycle. Your logs are linked to your signed-in account.'}
      </p>

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
        <div className="card">
          <p className="text-xs text-ink/60 mb-1">{lang === 'hi' ? 'दर्ज किए दिन' : 'Days logged'}</p>
          <p className="text-2xl font-bold text-primary">{Object.keys(logs).filter(k => logs[k].flow > 0).length}</p>
        </div>
      </div>

      {/* Charts panel */}
      {showCharts && (
        <div className="card mb-6">
          <h2 className="font-semibold text-base mb-1">{t('tracker.charts')}</h2>
          <p className="text-xs text-ink/60 mb-5">{t('tracker.charts.sub')}</p>
          {!hasData ? (
            <div className="text-center py-8 text-ink/50">
              <BarChart2 size={36} className="mx-auto mb-3 text-lavender" />
              <p className="text-sm">{t('tracker.nodata')}</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-3">
              <BarChart data={flowData} label={t('tracker.chart.flow')} color="#B42318" maxVal={4} />
              <BarChart data={painData} label={t('tracker.chart.pain')} color="#F97316" maxVal={10} />
              <MoodChart data={moodData} label={t('tracker.chart.mood')} />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
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
