import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hammer, ShieldCheck, Trash2, LogOut, User, Save } from 'lucide-react';
import { useT } from '../../i18n/t';
import { useAuth } from '../../app/stubs/auth';
import { LangSwitch } from '../../components/Layout';

type Profile = { name: string; age: string; city: string };

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
  const { t, lang } = useT();
  const { signOut } = useAuth();

  const [profile, setProfile] = useState<Profile>(() => {
    try {
      return JSON.parse(localStorage.getItem('belluna.profile') || '{}');
    } catch { return { name: '', age: '', city: '' }; }
  });
  const [saved, setSaved] = useState(false);

  function saveProfile() {
    localStorage.setItem('belluna.profile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t('set.title')}</h1>

      {/* Profile section */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User size={20} className="text-primary" />
          <h2 className="font-semibold">{t('set.profile')}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-ink/70 block mb-1">{t('set.name')}</label>
            <input
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              placeholder={lang === 'hi' ? 'आपका नाम' : 'Your name'}
              className="input"
              maxLength={50}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-ink/70 block mb-1">{t('set.age')}</label>
              <input
                type="number"
                value={profile.age}
                onChange={e => setProfile({ ...profile, age: e.target.value })}
                placeholder={lang === 'hi' ? 'उम्र' : 'Age'}
                className="input"
                min={10}
                max={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-ink/70 block mb-1">{t('set.city')}</label>
              <input
                value={profile.city}
                onChange={e => setProfile({ ...profile, city: e.target.value })}
                placeholder={lang === 'hi' ? 'शहर' : 'City'}
                className="input"
                maxLength={50}
              />
            </div>
          </div>
          <button onClick={saveProfile} className="btn-primary">
            <Save size={16} />
            {saved ? `✓ ${t('set.saved')}` : t('set.save')}
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="card flex items-center justify-between"><span>{t('common.language')}</span><LangSwitch /></div>

      {/* Privacy */}
      <div className="card"><ShieldCheck className="text-primary" /><h2 className="mt-2 font-semibold">{t('set.privacy')}</h2><p className="mt-1 text-sm">{t('set.privacy.b')}</p></div>

      {/* Discreet */}
      <div className="card opacity-70"><p>{t('set.discreet')}</p></div>

      {/* Delete */}
      <div className="card"><h2 className="flex items-center gap-2 font-semibold"><Trash2 size={18} />{t('set.delete')}</h2><p className="mt-1 text-sm">{t('set.delete.b')}</p><button className="btn-ghost mt-3" disabled>{t('set.delete')}</button></div>

      {/* Logout */}
      <button className="btn-primary" onClick={signOut}><LogOut size={16} />{t('nav.logout')}</button>
    </div>
  );
}
