import { Link } from 'react-router-dom';
import { MessageCircleQuestion, CalendarHeart, Siren, MapPin, Users, ShieldCheck, Droplets, Moon, Sparkles } from 'lucide-react';
import Logo from '../../components/Logo';
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
      <section className="bg-gradient-to-br from-soft via-canvas to-blush/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <Logo className="h-14 mb-6" />
            <h1 className="text-3xl font-bold leading-tight text-ink sm:text-5xl">{t('hero.title')}</h1>
            <p className="mt-4 max-w-md text-lg text-ink/80">{t('hero.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary">{t('cta.start')}</Link>
              <a href="#about" className="btn-ghost">{t('cta.explore')}</a>
            </div>
          </div>
          <div aria-hidden className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl bg-white p-6 shadow-card border border-soft">
              <div className="flex items-center gap-3"><Moon className="text-primary" /><div className="h-3 w-32 rounded-full bg-soft" /></div>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {Array.from({ length: 28 }, (_, i) => <div key={i} className={`aspect-square rounded-full ${i < 5 ? 'bg-primary' : i > 12 && i < 16 ? 'bg-lavender' : 'bg-soft'}`} />)}
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-blush p-3"><Droplets className="text-primary" /><div className="h-3 w-40 rounded-full bg-white" /></div>
            </div>
            <Sparkles className="absolute -right-3 -top-4 text-lavender" size={34} />
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold sm:text-3xl">{t('intro.title')}</h2>
        <p className="mt-3 max-w-2xl text-ink/80">{t('intro.body')}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="mb-6 text-2xl font-semibold">{t('feat.title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f) => (
            <Link key={f.to} to={f.to} className="card hover:border-lavender transition-colors">
              <f.i className="text-primary" /><h3 className="mt-3 font-semibold">{f.h}</h3><p className="mt-1 text-sm text-ink/75">{f.d}</p>
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
