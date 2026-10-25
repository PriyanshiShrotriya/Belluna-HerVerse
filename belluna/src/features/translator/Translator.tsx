import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Siren, ShieldAlert, Send, Sparkles, LockKeyhole } from 'lucide-react';
import { useT } from '../../i18n/t';
import { useAuth } from '../../app/stubs/auth';
import { Loading, ErrorBox } from '../../components/States';

// Types follow architecture.md §6.1 (Member 1's contract).
type Safety = { level: 'info' | 'caution' | 'urgent'; flags: string[] };
type Result = {
  status: 'ok' | 'emergency' | 'refused' | 'out_of_scope' | 'rate_limited' | 'error';
  language: 'en' | 'hi'; title?: string; summary?: string; key_points?: string[]; what_you_can_do?: string[];
  see_a_doctor_if?: string[]; glossary?: { term: string; meaning: string }[];
  sources?: { id: string; title: string; publisher: string; url: string }[];
  disclaimer: string; safety: Safety; message?: string;
};

export default function Translator() {
  const { t, lang } = useT();
  const { session } = useAuth();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);

  async function ask() {
    if (!q.trim() || busy) return;
    setBusy(true); setFailed(false); setRes(null);
    try {
      const r = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}) },
        body: JSON.stringify({ question: q.trim(), language: lang }),
      });
      const data = (await r.json()) as Result;
      if (!data || typeof data.status !== 'string') throw new Error('bad');
      setRes(data);
    } catch { setFailed(true); } finally { setBusy(false); }
  }

  const List = ({ h, items }: { h: string; items?: string[] }) => items?.length ? (
    <section className="mt-4"><h3 className="font-semibold">{h}</h3><ul className="mt-2 list-disc space-y-1 pl-5">{items.map((x) => <li key={x}>{x}</li>)}</ul></section>) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#f2ecff] via-[#fff9fc] to-[#f7efff] p-5 sm:p-7">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.13em] text-primary"><Sparkles size={14} /> A little clarity, in your words</span>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t('tr.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{t('tr.sub')}</p>
      </div>
      <div className="card border-lavender/20 bg-gradient-to-br from-white to-[#fbf8ff] p-4 sm:p-6">
        <label htmlFor="q" className="sr-only">{t('tr.title')}</label>
        <textarea id="q" rows={4} maxLength={500} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tr.placeholder')} className="input resize-y py-3" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-ink/55"><LockKeyhole size={14} className="text-primary/70" />{500 - q.length} {t('tr.chars')}</span>
          <button className="btn-primary" onClick={ask} disabled={busy || !q.trim()}><Send size={16} />{t('tr.ask')}</button>
        </div>
      </div>

      <div className="mt-5" aria-live="polite">
        {busy && <Loading text={t('tr.thinking')} />}
        {failed && <ErrorBox text={t('tr.unavailable')} onRetry={ask} />}
        {res?.status === 'emergency' && (
          <div role="alert" className="card border-[#B42318] bg-[#FEF3F2]">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#912018]"><Siren />{t('tr.emergency')}</h2>
            <p className="mt-2">{res.message ?? t('tr.emergency.b')}</p>
            <div className="mt-4 flex flex-wrap gap-3"><a href="tel:112" className="btn-danger">{t('sos.call')}</a><Link to="/sos" className="btn-ghost">{t('nav.sos')}</Link></div>
          </div>)}
        {(res?.status === 'refused' || res?.status === 'out_of_scope') && (
          <div className="card"><h2 className="font-semibold">{t(res.status === 'refused' ? 'tr.refused' : 'tr.oos')}</h2><p className="mt-2">{res.message}</p><p className="mt-3 text-sm text-ink/70">{res.disclaimer}</p></div>)}
        {res?.status === 'rate_limited' && <div className="card"><h2 className="font-semibold">{t('tr.rate')}</h2><p className="mt-2">{res.message ?? t('tr.rate.b')}</p></div>}
        {res?.status === 'error' && <ErrorBox text={res.message} onRetry={ask} />}
        {res?.status === 'ok' && (
          <article className="card mt-4 border-lavender/20">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${res.safety.level === 'urgent' ? 'bg-[#FEF3F2] text-[#912018]' : res.safety.level === 'caution' ? 'bg-blush text-primary' : 'bg-soft text-primary'}`}>
              <ShieldAlert size={14} />{t(`tr.safety.${res.safety.level}` as 'tr.safety.info')}</span>
            <h2 className="mt-3 text-xl font-semibold">{res.title}</h2>
            {res.summary && <section className="mt-3"><h3 className="font-semibold">{t('tr.summary')}</h3><p className="mt-1">{res.summary}</p></section>}
            <List h={t('tr.key')} items={res.key_points} />
            <List h={t('tr.do')} items={res.what_you_can_do} />
            <List h={t('tr.doctor')} items={res.see_a_doctor_if} />
            {res.glossary?.length ? <section className="mt-4"><h3 className="font-semibold">{t('tr.glossary')}</h3><dl className="mt-2 space-y-1">{res.glossary.map((g) => <div key={g.term}><dt className="inline font-medium">{g.term}: </dt><dd className="inline">{g.meaning}</dd></div>)}</dl></section> : null}
            {res.sources?.length ? <section className="mt-4"><h3 className="font-semibold">{t('tr.sources')}</h3><ul className="mt-2 space-y-1 text-sm">{res.sources.map((s) => <li key={s.id}><a className="text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> — {s.publisher}</li>)}</ul></section> : null}
            <p className="mt-5 rounded-xl bg-canvas p-3 text-sm text-ink/80">{res.disclaimer}</p>
          </article>)}
      </div>
    </div>
  );
}
