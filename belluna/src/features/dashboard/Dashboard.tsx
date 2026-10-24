import { Link } from 'react-router-dom';
import { CalendarHeart, MessageCircleQuestion, Siren, MapPin, Users, Pill, BookOpen, Languages } from 'lucide-react';
import { useAuth } from '../../app/stubs/auth';

export default function Dashboard() {
  const { session } = useAuth();
  const email = session?.email ?? '';
  const name = email.split('@')[0] || 'there';

  const tiles = [
    { to: '/tracker', icon: CalendarHeart, label: 'Period Tracker', desc: 'Log flow, pain & mood. See your cycle at a glance.', color: 'from-rose-50 to-pink-50 border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500' },
    { to: '/medicines', icon: Pill, label: 'Medicine Library', desc: 'Info on common women\'s health medicines.', color: 'from-purple-50 to-lavender/20 border-lavender hover:border-primary', iconColor: 'text-primary' },
    { to: '/doctors', icon: MapPin, label: 'Find Nearby Care', desc: 'Hospitals & clinics on a live map near you.', color: 'from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400', iconColor: 'text-blue-600' },
    { to: '/learn', icon: BookOpen, label: 'Health Awareness', desc: 'Curated videos on PCOS, periods, nutrition & more.', color: 'from-amber-50 to-orange-50 border-amber-200 hover:border-amber-400', iconColor: 'text-amber-600' },
    { to: '/sos', icon: Siren, label: 'Period SOS', desc: 'Check how urgent your symptoms are — right now.', color: 'from-red-50 to-rose-50 border-red-200 hover:border-red-400', iconColor: 'text-[#B42318]' },
    { to: '/community', icon: Users, label: 'Belluna Circle', desc: 'Anonymous peer support — post, like, comment freely.', color: 'from-teal-50 to-emerald-50 border-teal-200 hover:border-teal-400', iconColor: 'text-teal-600' },
    { to: '/translator', icon: Languages, label: 'Health Translator', desc: 'Ask women\'s health questions in English or Hindi.', color: 'from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400', iconColor: 'text-violet-600' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">
          Hello, <span className="text-primary capitalize">{name}</span> 👋
        </h1>
        <p className="mt-1 text-ink/70">Welcome to Belluna — your private women's health companion.</p>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="card bg-gradient-to-br from-purple-50 to-lavender/30 border-lavender">
          <p className="text-xs text-ink/50 mb-1">Today's reminder</p>
          <p className="font-semibold text-primary">Log your symptoms daily for better predictions 🌸</p>
        </div>
        <Link to="/sos" className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:border-red-400 transition-all">
          <p className="text-xs text-ink/50 mb-1">Feeling unwell?</p>
          <p className="font-semibold text-[#B42318] flex items-center gap-2"><Siren size={16} />Open Period SOS →</p>
        </Link>
        <Link to="/translator" className="card bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400 transition-all">
          <p className="text-xs text-ink/50 mb-1">Got a question?</p>
          <p className="font-semibold text-violet-700 flex items-center gap-2"><MessageCircleQuestion size={16} />Ask Belluna in Hindi or English →</p>
        </Link>
      </div>

      {/* Feature tiles */}
      <h2 className="text-lg font-semibold mb-4 text-ink/80">All Features</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tiles.map(tile => (
          <Link key={tile.to} to={tile.to}
            className={`card bg-gradient-to-br ${tile.color} flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-0.5`}>
            <tile.icon size={28} className={tile.iconColor} />
            <div>
              <p className="font-semibold text-ink">{tile.label}</p>
              <p className="text-sm text-ink/65 mt-0.5 leading-snug">{tile.desc}</p>
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
