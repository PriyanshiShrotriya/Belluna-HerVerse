import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../../app/stubs/auth';
import { useT, type Lang } from '../../i18n/t';
import { profileRepo } from './profileRepository';

type LanguagePreferenceContextValue = {
  loading: boolean;
  error: string;
  changeLanguage: (language: Lang) => Promise<void>;
};

const LanguagePreferenceContext = createContext<LanguagePreferenceContextValue | null>(null);

export function ProfileLanguageProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { setLang, t } = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const activeUserId = session?.userId ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!activeUserId) {
      setLoading(false);
      setError('');
      return;
    }

    const requestRevision = revision.current;
    let cancelled = false;
    setLoading(true);
    setError('');
    void profileRepo.get(activeUserId).then((profile) => {
      if (!cancelled && revision.current === requestRevision) {
        setLang(profile.preferredLanguage);
      }
    }).catch(() => {
      if (!cancelled && revision.current === requestRevision) {
        setError(t('profile.languageLoadError'));
      }
    }).finally(() => {
      if (!cancelled && revision.current === requestRevision) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeUserId, authLoading, setLang, t]);

  const changeLanguage = useCallback(async (language: Lang) => {
    setError('');
    if (!activeUserId) {
      setLang(language);
      return;
    }

    const changeRevision = ++revision.current;
    setLoading(true);
    try {
      const profile = await profileRepo.updateLanguage(activeUserId, language);
      if (revision.current === changeRevision) setLang(profile.preferredLanguage);
    } catch {
      if (revision.current === changeRevision) setError(t('profile.languageSaveError'));
      throw new Error(t('profile.languageSaveError'));
    } finally {
      if (revision.current === changeRevision) setLoading(false);
    }
  }, [activeUserId, setLang, t]);

  return (
    <LanguagePreferenceContext.Provider value={{ loading, error, changeLanguage }}>
      {children}
    </LanguagePreferenceContext.Provider>
  );
}

export function useProfileLanguage() {
  const context = useContext(LanguagePreferenceContext);
  if (!context) throw new Error('useProfileLanguage must be used within ProfileLanguageProvider.');
  return context;
}
