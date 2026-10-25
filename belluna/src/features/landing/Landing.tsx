import { Link } from 'react-router-dom';
import { MessageCircleQuestion, CalendarHeart, Siren, MapPin, Users, ShieldCheck, Droplets, Moon, Sparkles, ArrowUpRight, LockKeyhole, HeartHandshake } from 'lucide-react';
import { useT } from '../../i18n/t';

export default function Landing() {
  const { t } = useT();
  const feats = [
    { i: MessageCircleQuestion, h: t('feat.ask'), d: t('feat.ask.d'), to: '/translator' },
    { i: CalendarHeart, h: t('feat.track'), d: t('feat.track.d'), to: '/tracker' },
    { i: Siren, h: t('feat.sos'), d: t('feat.sos.d'), to: '/sos' },
    { i: MapPin, h: t('feat.care'), d: t('feat.care.d'), to: '/doctors' },
    { i: Users, h: t('feat.circle'), d: t('feat.circle.d'), to: '/community' },
  ];
  return (
    <>
      <section className="hero-glow relative isolate overflow-hidden">
        <div aria-hidden="true" className="soft-grid absolute inset-0 -z-10 opacity-30" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:py-24 lg:gap-20">
          <div className="relative z-10">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] text-primary shadow-sm">
              <HeartHandshake size={15} /> {t('tagline')}
            </span>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-6xl">{t('hero.title')}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/70 sm:text-lg">{t('hero.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary px-6">{t('cta.start')}<ArrowUpRight size={17} /></Link>
              <a href="#about" className="btn-ghost">{t('cta.explore')}</a>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-ink/55">
              <LockKeyhole size={16} className="text-primary" />
              <span>{t('privacy.title')}</span>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto w-full max-w-lg">
            <div className="absolute -left-5 top-8 h-40 w-40 rounded-full bg-lavender/30 blur-3xl" />
            <div className="absolute -right-2 bottom-2 h-44 w-44 rounded-full bg-blush blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/80 bg-white/70 p-4 shadow-[0_30px_90px_rgba(75,43,106,.16)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-primary"><Moon size={19} /></span><div><p className="text-sm font-semibold text-ink">Your cycle, understood</p><p className="text-xs text-ink/50">A kinder way to check in</p></div></div>
                <Sparkles className="text-lavender" size={20} />
              </div>
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#f8f4ff] to-[#fff5fa] p-4 sm:p-5">
                <div className="flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-primary/70">Cycle overview</p><p className="mt-1 text-2xl font-semibold text-ink">Your rhythm</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">Personal</span></div>
                <div className="mt-5 grid grid-cols-7 gap-2">
                  {Array.from({ length: 28 }, (_, i) => <div key={i} className={`aspect-square rounded-full ${i < 5 ? 'bg-primary shadow-sm shadow-primary/25' : i > 12 && i < 16 ? 'bg-lavender/70' : 'bg-white'}`} />)}
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blush text-primary"><Droplets size={18} /></span><div><p className="text-sm font-semibold text-ink">Notice patterns, gently</p><p className="text-xs text-ink/55">Your notes stay yours</p></div></div>
              </div>
            </div>
            <Sparkles className="absolute -right-4 -top-5 text-primary/50" size={30} />
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('intro.title')}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-ink/70">{t('intro.body')}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="mb-6 text-2xl font-semibold">{t('feat.title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f) => (
            <Link key={f.to} to={f.to} className="card lift-card group">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white"><f.i size={20} /></span><h3 className="mt-4 font-semibold">{f.h}</h3><p className="mt-1 text-sm leading-6 text-ink/65">{f.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-2xl font-semibold">{t('how.title')}</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {(['how.1', 'how.2', 'how.3'] as const).map((k, i) => (
              <li key={k} className="flex gap-3 items-center rounded-2xl bg-soft/60 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-semibold text-white">{i + 1}</span>{t(k)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 md:grid-cols-2">
        <div className="card"><ShieldCheck className="text-primary" /><h2 className="mt-3 text-xl font-semibold">{t('privacy.title')}</h2><p className="mt-2 text-ink/80">{t('privacy.body')}</p></div>
        <div className="card bg-blush/60 border-blush"><Siren className="text-primary" /><h2 className="mt-3 text-xl font-semibold">{t('sos.banner.title')}</h2><p className="mt-2 text-ink/80">{t('sos.banner.body')}</p>
          <Link to="/sos" className="btn-danger mt-4">{t('nav.sos')}</Link></div>
      </section>
    </>
  );
}
