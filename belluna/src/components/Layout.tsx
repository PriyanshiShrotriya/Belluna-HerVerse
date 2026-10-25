import { Link, NavLink, Outlet } from 'react-router-dom';
import { Home, MessageCircleQuestion, CalendarHeart, MapPin, Users, Settings, Siren } from 'lucide-react';
import Logo from './Logo';
import { useT } from '../i18n/t';
import { useAuth } from '../app/stubs/auth';
import { useProfileLanguage } from '../features/auth/ProfileLanguageProvider';

export function LangSwitch() {
  const { lang, t } = useT();
  const { loading, error, changeLanguage } = useProfileLanguage();
  return (
    <>
      <div role="group" aria-label={t('common.language')} className="inline-flex rounded-xl bg-soft p-1">
        {(['en', 'hi'] as const).map((l) => (
          <button key={l} aria-pressed={lang === l} disabled={loading}
            onClick={() => void changeLanguage(l).catch(() => undefined)}
            className={`min-h-[40px] min-w-[44px] rounded-lg px-3 text-sm font-medium disabled:opacity-60 ${lang === l ? 'bg-white text-primary shadow-sm' : 'text-ink/70'}`}>
            {l === 'en' ? 'EN' : 'हिं'}
          </button>
        ))}
      </div>
      {error && <span role="alert" className="max-w-36 text-xs text-red-700">{error}</span>}
    </>
  );
}

export default function Layout() {
  const { t } = useT();
  const { session, signOut } = useAuth();
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/tracker', icon: CalendarHeart, label: 'Tracker' },
    { to: '/translator', icon: MessageCircleQuestion, label: 'Ask' },
    { to: '/doctors', icon: MapPin, label: 'Care' },
    { to: '/community', icon: Users, label: 'Circle' },
  ];
  const mobileItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/tracker', icon: CalendarHeart, label: 'Tracker' },
    { to: '/translator', icon: MessageCircleQuestion, label: 'Ask' },
    { to: '/doctors', icon: MapPin, label: 'Care' },
    { to: '/community', icon: Users, label: 'Circle' },
  ];
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-xl px-3 min-h-[42px] text-sm font-medium transition-colors ${isActive ? 'bg-soft text-primary' : 'text-ink/75 hover:bg-soft/70 hover:text-primary'}`;
  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="site-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" aria-label="Belluna"><Logo className="h-9" /></Link>
          <nav aria-label="Primary" className="ml-4 hidden lg:flex gap-1">
            {navItems.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === '/'} className={link}>
                <i.icon size={18} />{i.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden min-[360px]:block"><LangSwitch /></div>
            <Link to="/sos" className="btn-danger px-3 sm:px-4"><Siren size={17} /><span>{t('nav.sos')}</span></Link>
            {session ? (
              <>
                <NavLink to="/settings" aria-label={t('nav.settings')} className={({ isActive }) => `${link({ isActive })} hidden sm:flex`}><Settings size={18} /></NavLink>
                <button className="btn-ghost hidden md:inline-flex" onClick={signOut}>{t('nav.logout')}</button>
              </>
            ) : (
              <Link to="/login" className="btn-ghost hidden md:inline-flex">{t('nav.login')}</Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 pb-28 lg:pb-0"><Outlet /></main>
      <footer className="border-t border-soft/80 bg-white/80 px-4 py-8 pb-32 lg:pb-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:px-2">
          <Logo className="h-8" />
          <p className="font-medium text-primary">{t('tagline')}</p>
          <p className="max-w-2xl text-sm text-ink/70">{t('footer.disclaimer')}</p>
        </div>
      </footer>
      <nav aria-label="Primary mobile" className="mobile-nav lg:hidden">
        <div className="mobile-nav__inner">
          {mobileItems.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'}
              className={({ isActive }) => `mobile-nav__link ${isActive ? 'is-active' : ''}`}>
              <i.icon size={20} strokeWidth={2} aria-hidden="true" />
              <span>{i.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
