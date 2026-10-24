import { useParams, Link } from 'react-router-dom';
import { Hammer, ShieldCheck, Trash2, LogOut } from 'lucide-react';
import { useT } from '../../i18n/t';
import { useAuth } from '../../app/stubs/auth';
import { LangSwitch } from '../../components/Layout';

// Placeholder for screens owned by other members or built later (tracker, timeline, learn, medicines, chat).
export function Placeholder({ title }: { title: string }) {
  const { t } = useT();
  const { slug } = useParams();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="card"><Hammer className="text-lavender" /><h1 className="mt-3 text-2xl font-semibold">{title}{slug ? `: ${slug}` : ''}</h1><p className="mt-2 text-ink/75">{t('ph.body')}</p></div>
    </div>
  );
}

export function Community() {
  const { t } = useT();
  const rooms = ['menstrual-health', 'pcos', 'reproductive-health', 'sexual-health', 'emotional-wellbeing'];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t('circle.title')}</h1>
      <p className="mt-2 rounded-xl bg-blush p-3 text-sm">{t('circle.body')} <Link className="font-medium text-primary underline" to="/sos">{t('nav.sos')}</Link></p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">{rooms.map((r) => <li key={r}><Link to={`/community/${r}`} className="card block capitalize hover:border-lavender">{r.replace('-', ' ')}</Link></li>)}</ul>
      <p className="mt-4 text-sm text-ink/70">{t('ph.body')}</p>
    </div>
  );
}

export function SettingsPage() {
  const { t } = useT();
  const { signOut } = useAuth();
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t('set.title')}</h1>
      <div className="card flex items-center justify-between"><span>{t('common.language')}</span><LangSwitch /></div>
      <div className="card"><ShieldCheck className="text-primary" /><h2 className="mt-2 font-semibold">{t('set.privacy')}</h2><p className="mt-1 text-sm">{t('set.privacy.b')}</p></div>
      <div className="card opacity-70"><p>{t('set.discreet')}</p></div>
      <div className="card"><h2 className="flex items-center gap-2 font-semibold"><Trash2 size={18} />{t('set.delete')}</h2><p className="mt-1 text-sm">{t('set.delete.b')}</p><button className="btn-ghost mt-3" disabled>{t('set.delete')}</button></div>
      <button className="btn-primary" onClick={signOut}><LogOut size={16} />{t('nav.logout')}</button>
    </div>
  );
}
