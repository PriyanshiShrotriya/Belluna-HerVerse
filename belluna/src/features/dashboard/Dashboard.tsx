import { Link } from 'react-router-dom';
import { CalendarHeart, MessageCircleQuestion, Siren, MapPin, Users, Pill, BookOpen, Languages, Sparkles, ArrowUpRight, Heart } from 'lucide-react';
import { useAuth } from '../../app/stubs/auth';

export default function Dashboard() {
  const { session } = useAuth();
  const email = session?.email ?? '';
  const name = email.split('@')[0] || 'there';

  const tiles = [
    { to: '/tracker', icon: CalendarHeart, label: 'Period Tracker', desc: 'Log flow, pain & mood. See your cycle at a glance.', color: 'from-rose-50 to-pink-50 border-rose-100', iconColor: 'text-rose-500' },
    { to: '/medicines', icon: Pill, label: 'Medicine Library', desc: 'Explore helpful information about common medicines.', color: 'from-purple-50 to-lavender/20 border-lavender/60', iconColor: 'text-primary' },
    { to: '/doctors', icon: MapPin, label: 'Find Nearby Care', desc: 'Discover hospitals and clinics on a live map.', color: 'from-blue-50 to-indigo-50 border-blue-100', iconColor: 'text-blue-600' },
    { to: '/learn', icon: BookOpen, label: 'Health Awareness', desc: 'Learn about PCOS, periods, nutrition and more.', color: 'from-amber-50 to-orange-50 border-amber-100', iconColor: 'text-amber-600' },
    { to: '/sos', icon: Siren, label: 'Period SOS', desc: 'Find guidance and support when you need it.', color: 'from-red-50 to-rose-50 border-red-100', iconColor: 'text-[#B42318]' },
    { to: '/community', icon: Users, label: 'Belluna Circle', desc: 'A private space to share and find peer support.', color: 'from-teal-50 to-emerald-50 border-teal-100', iconColor: 'text-teal-600' },
    { to: '/translator', icon: Languages, label: 'Health Translator', desc: 'Ask women’s health questions in English or Hindi.', color: 'from-violet-50 to-purple-50 border-violet-100', iconColor: 'text-violet-600' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="relative mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f1eaff] via-[#fff8fc] to-[#f9eaf3] p-6 shadow-card sm:p-9">
        <div aria-hidden="true" className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/60 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-primary/75"><Sparkles size={15} /> Your personal wellness space</p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Hello, <span className="capitalize text-primary">{name}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink/65 sm:text-base">A little space for your health, your questions, and everything in between.</p>
          </div>
          <Link to="/tracker" className="btn-primary shrink-0">Check in today<ArrowUpRight size={16} /></Link>
        </div>
      </div>

      <div className="mb-9 grid gap-4 sm:grid-cols-3">
        <div className="card border-lavender/30 bg-gradient-to-br from-white to-[#f4efff]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><CalendarHeart size={19} /></div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/50">A gentle reminder</p>
          <p className="mt-1 font-semibold text-primary">Small check-ins can help you notice patterns.</p>
        </div>
        <Link to="/sos" className="card lift-card border-red-100 bg-gradient-to-br from-white to-rose-50">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#B42318] shadow-sm"><Siren size={19} /></div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Need a little help?</p>
          <p className="mt-1 font-semibold text-[#8f241d]">Explore Period SOS <span aria-hidden="true">→</span></p>
        </Link>
        <Link to="/translator" className="card lift-card border-violet-100 bg-gradient-to-br from-white to-violet-50">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm"><MessageCircleQuestion size={19} /></div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Questions are welcome</p>
          <p className="mt-1 font-semibold text-violet-800">Ask Belluna in Hindi or English <span aria-hidden="true">→</span></p>
        </Link>
      </div>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary/70">Explore Belluna</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Your care, all in one place</h2></div>
        <Heart size={21} className="mb-1 text-rose-400" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tiles.map(tile => (
          <Link key={tile.to} to={tile.to}
            className={`card lift-card group flex flex-col gap-4 bg-gradient-to-br ${tile.color}`}>
            <div className="flex items-center justify-between">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm ${tile.iconColor}`}><tile.icon size={22} /></span>
              <ArrowUpRight size={18} className="text-ink/25 transition-colors group-hover:text-primary" />
            </div>
            <div>
              <p className="font-semibold text-ink">{tile.label}</p>
              <p className="mt-1 text-sm leading-6 text-ink/60">{tile.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs text-ink/40 text-center">
        Belluna provides general health information only — not a diagnosis. In an emergency, call 112.
      </p>
    </div>
  );
}
