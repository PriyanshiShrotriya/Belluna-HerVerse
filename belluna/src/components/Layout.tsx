import { Link, NavLink, Outlet } from 'react-router-dom';
import { Home, MessageCircleQuestion, CalendarHeart, MapPin, Users, Settings, Siren, Pill, BookOpen } from 'lucide-react';
import Logo from './Logo';
import { useT } from '../i18n/t';
import { useAuth } from '../app/stubs/auth';

export function LangSwitch() {
  const { lang, setLang, t } = useT();
  return (
    <div role="group" aria-label={t('common.language')} className="inline-flex rounded-xl bg-soft p-1">
      {(['en', 'hi'] as const).map((l) => (
        <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}
          className={`min-h-[40px] min-w-[44px] rounded-lg px-3 text-sm font-medium ${lang === l ? 'bg-white text-primary shadow-sm' : 'text-ink/70'}`}>
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
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
    { to: '/medicines', icon: Pill, label: 'Medicines' },
    { to: '/learn', icon: BookOpen, label: 'Awareness' },
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
    `flex items-center gap-2 rounded-xl px-3 min-h-[44px] text-sm font-medium ${isActive ? 'bg-soft text-primary' : 'text-ink/80 hover:bg-soft/60'}`;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-soft bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Link to="/" aria-label="Belluna"><Logo className="h-9" /></Link>
          <nav aria-label="Primary" className="ml-4 hidden md:flex gap-1">
            {navItems.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === '/'} className={link}>
                <i.icon size={18} />{i.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangSwitch />
            <Link to="/sos" className="btn-danger px-3 sm:px-4"><Siren size={18} /><span className="hidden sm:inline">{t('nav.sos')}</span><span className="sm:hidden">SOS</span></Link>
            {session ? (
              <>
                <NavLink to="/settings" aria-label={t('nav.settings')} className={link}><Settings size={18} /></NavLink>
                <button className="btn-ghost hidden md:inline-flex" onClick={signOut}>{t('nav.logout')}</button>
              </>
            ) : (
              <Link to="/login" className="btn-ghost hidden md:inline-flex">{t('nav.login')}</Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 pb-24 md:pb-0"><Outlet /></main>
      <footer className="border-t border-soft bg-white px-4 py-8 pb-28 md:pb-8">
        <div className="mx-auto max-w-6xl flex flex-col gap-3">
          <Logo className="h-8" />
          <p className="font-medium text-primary">{t('tagline')}</p>
          <p className="max-w-2xl text-sm text-ink/70">{t('footer.disclaimer')}</p>
        </div>
      </footer>
      <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-soft bg-white md:hidden">
        {mobileItems.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === '/'}
            className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'text-primary font-semibold' : 'text-ink/70'}`}>
            <i.icon size={20} />{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
