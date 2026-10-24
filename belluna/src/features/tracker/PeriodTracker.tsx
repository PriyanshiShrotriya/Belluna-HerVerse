import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Zap, Smile, Save, CalendarHeart } from 'lucide-react';

type Log = { flow: number; pain: number; mood: number; notes: string };
type Logs = Record<string, Log>; // key: "YYYY-MM-DD"

const MOODS = ['😢', '😕', '😐', '🙂', '😄'];
const FLOWS = ['None', 'Light', 'Medium', 'Heavy'];
const PAINS = ['None', 'Mild', 'Moderate', 'Severe'];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function predictNext(logs: Logs): number | null {
  const periodDays = Object.entries(logs)
    .filter(([, v]) => v.flow > 0)
    .map(([k]) => new Date(k).getTime())
    .sort((a, b) => a - b);
  if (periodDays.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < periodDays.length; i++) {
    const gap = (periodDays[i] - periodDays[i - 1]) / (1000 * 60 * 60 * 24);
    if (gap > 2 && gap < 50) gaps.push(gap);
  }
  if (!gaps.length) return null;
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const last = periodDays[periodDays.length - 1];
  const next = new Date(last + avg * 24 * 60 * 60 * 1000);
  const diff = Math.round((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PeriodTracker() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [logs, setLogs] = useState<Logs>(() => {
    try { return JSON.parse(localStorage.getItem('belluna.tracker') || '{}'); } catch { return {}; }
  });
  const [form, setForm] = useState<Log>({ flow: 0, pain: 0, mood: 2, notes: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem('belluna.tracker', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    if (selected && logs[selected]) setForm(logs[selected]);
    else setForm({ flow: 0, pain: 0, mood: 2, notes: '' });
    setSaved(false);
  }, [selected]);

  function save() {
    if (!selected) return;
    setLogs({ ...logs, [selected]: form });
    setSaved(true);
  }

  const days = getDays(year, month);
  const firstDay = getFirstDay(year, month);
  const nextIn = predictNext(logs);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <CalendarHeart className="text-primary" size={28} />
        <h1 className="text-2xl font-semibold">Period Tracker</h1>
      </div>
      <p className="text-ink/70 mb-6">Tap a date to log how you feel. Data stays only on this device.</p>

      {/* Prediction banner */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="card bg-gradient-to-br from-purple-50 to-lavender/20">
          <p className="text-xs text-ink/60 mb-1">Next period estimate</p>
          <p className="text-2xl font-bold text-primary">
            {nextIn === null ? '—' : nextIn <= 0 ? 'Today / Due' : `in ${nextIn} days`}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-ink/60 mb-1">Days logged</p>
          <p className="text-2xl font-bold text-primary">{Object.keys(logs).filter(k => logs[k].flow > 0).length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-ink/60 mb-1">Average cycle</p>
          <p className="text-2xl font-bold text-primary">
            {(() => {
              const periodDays = Object.entries(logs).filter(([, v]) => v.flow > 0).map(([k]) => new Date(k).getTime()).sort((a, b) => a - b);
              if (periodDays.length < 2) return '—';
              const gaps = [];
              for (let i = 1; i < periodDays.length; i++) { const g = (periodDays[i] - periodDays[i - 1]) / 86400000; if (g > 2 && g < 50) gaps.push(g); }
              if (!gaps.length) return '—';
              return `${Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)} days`;
            })()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="btn-ghost p-2 min-h-0 h-9 w-9"><ChevronLeft size={18} /></button>
            <h2 className="font-semibold text-lg">{MONTHS[month]} {year}</h2>
            <button onClick={next} className="btn-ghost p-2 min-h-0 h-9 w-9"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink/50 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
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
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#B42318]" />Heavy flow</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-400" />Light flow</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />Pain logged</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lavender" />Other</span>
          </div>
        </div>

        {/* Log form */}
        <div className="card">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 text-ink/50 gap-3">
              <CalendarHeart size={40} className="text-lavender" />
              <p>Tap a date on the calendar to log symptoms</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-lg mb-4">
                {selected === toKey(today.getFullYear(), today.getMonth(), today.getDate()) ? 'Today' : selected}
              </h2>

              {/* Flow */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-medium mb-2"><Droplets size={16} className="text-primary" />Flow</label>
                <div className="grid grid-cols-4 gap-2">
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
                <label className="flex items-center gap-2 text-sm font-medium mb-2"><Zap size={16} className="text-primary" />Pain level</label>
                <div className="grid grid-cols-4 gap-2">
                  {PAINS.map((p, i) => (
                    <button key={p} onClick={() => setForm({ ...form, pain: i })}
                      className={`rounded-xl py-2 text-sm font-medium transition-all ${form.pain === i ? 'bg-orange-500 text-white' : 'bg-soft hover:bg-orange-100'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-medium mb-2"><Smile size={16} className="text-primary" />Mood</label>
                <div className="flex gap-3">
                  {MOODS.map((m, i) => (
                    <button key={i} onClick={() => setForm({ ...form, mood: i })}
                      className={`text-2xl rounded-xl p-2 transition-all ${form.mood === i ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'hover:bg-soft'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="How are you feeling?" className="input py-2 resize-none" maxLength={200} />
              </div>

              <button onClick={save} className="btn-primary w-full">
                <Save size={16} />{saved ? '✓ Saved!' : 'Save log'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
