import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Droplets, Zap, HelpCircle, Siren } from 'lucide-react';
import { useT } from '../../i18n/t';
import { QUESTIONS, evaluate, type Answers } from './evaluate';

// Answers live in component state only — never persisted (SOS-6).
export default function Sos() {
  const { t } = useT();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Answers>({});
  const done = step >= QUESTIONS.length;
  const reset = () => { setStarted(false); setStep(0); setAns({}); };
  const answer = (v: boolean) => { setAns({ ...ans, [QUESTIONS[step]]: v }); setStep(step + 1); };

  if (!started) {
    const cats = [{ i: Droplets, k: 'sos.c.bleeding' }, { i: Zap, k: 'sos.c.pain' }, { i: HelpCircle, k: 'sos.c.other' }] as const;
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Siren className="text-[#B42318]" />{t('sos.title')}</h1>
        <p className="mt-1 text-ink/75">{t('sos.sub')}</p>
        <h2 className="mt-6 font-semibold">{t('sos.pick')}</h2>
        <div className="mt-3 grid gap-3">
          {cats.map((c) => <button key={c.k} onClick={() => setStarted(true)} className="card flex min-h-[64px] items-center gap-3 text-left hover:border-primary"><c.i className="text-primary" />{t(c.k)}</button>)}
        </div>
        <a href="tel:112" className="btn-danger mt-6 w-full"><Phone size={18} />{t('sos.call')}</a>
      </div>
    );
  }

  if (!done) {
    const key = QUESTIONS[step];
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-2 text-sm text-ink/70">{t('sos.progress')} {step + 1} {t('sos.of')} {QUESTIONS.length}</div>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-valuenow={step + 1} className="h-2 rounded-full bg-soft"><div className="h-2 rounded-full bg-primary" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
        <h1 className="mt-6 text-xl font-semibold">{t(`sos.q.${key}` as 'sos.q.soak')}</h1>
        <div className="mt-6 grid grid-cols-2 gap-3"><button className="btn-primary min-h-[56px]" onClick={() => answer(true)}>{t('common.yes')}</button><button className="btn-ghost min-h-[56px]" onClick={() => answer(false)}>{t('common.no')}</button></div>
        <button className="mt-4 text-sm text-primary underline" onClick={() => (step === 0 ? reset() : setStep(step - 1))}>{t('common.back')}</button>
      </div>
    );
  }

  const { level } = evaluate(ans);
  const style = { emergency: 'border-[#B42318] bg-[#FEF3F2]', urgent: 'border-[#F79009] bg-[#FFFAEB]', selfcare: 'border-lavender bg-soft/60' }[level];
  return (
    <div className="mx-auto max-w-xl px-4 py-8" aria-live="polite">
      <div role={level === 'emergency' ? 'alert' : undefined} className={`card ${style}`}>
        <h1 className="text-2xl font-semibold">{t(`sos.r.${level}` as 'sos.r.emergency')}</h1>
        <p className="mt-2">{t(`sos.r.${level}.b` as 'sos.r.emergency.b')}</p>
        <div className="mt-5 grid gap-3">
          {level === 'emergency' && <><a href="tel:112" className="btn-danger min-h-[56px] text-lg"><Phone />{t('sos.call')}</a><Link to="/doctors" className="btn-ghost"><MapPin size={18} />{t('sos.hospitals')}</Link></>}
          {level === 'urgent' && <Link to="/doctors" className="btn-primary"><MapPin size={18} />{t('sos.finddoc')}</Link>}
          {level === 'selfcare' && <Link to="/tracker" className="btn-primary">{t('nav.tracker')}</Link>}
        </div>
      </div>
      <p className="mt-4 text-sm text-ink/70">{t('sos.review')}</p>
      <button className="btn-ghost mt-4" onClick={reset}>{t('sos.restart')}</button>
    </div>
  );
}
