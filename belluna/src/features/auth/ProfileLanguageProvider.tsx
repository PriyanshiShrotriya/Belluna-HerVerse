import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../../app/stubs/auth';
import { useT, type Lang } from '../../i18n/t';

type LanguagePreferenceContextValue = {
  loading: boolean;
  error: string;
  changeLanguage: (language: Lang) => Promise<void>;
};

const LanguagePreferenceContext = createContext<LanguagePreferenceContextValue | null>(null);

export function ProfileLanguageProvider({ children }: { children: ReactNode }) {
  const { session, profile, updateLanguage: updateAccountLanguage } = useAuth();
  const { setLang, t } = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeUserId = session?.userId ?? null;

  useEffect(() => {
    if (!activeUserId) setError('');
    if (profile?.id === activeUserId) setLang(profile.preferredLanguage);
  }, [activeUserId, profile, setLang]);

  const changeLanguage = useCallback(async (language: Lang) => {
    setError('');
    if (!activeUserId) {
      setLang(language);
      return;
    }

    setLoading(true);
    try {
      const updated = await updateAccountLanguage(language);
      setLang(updated.preferredLanguage);
    } catch {
      setError(t('profile.languageSaveError'));
      throw new Error(t('profile.languageSaveError'));
    } finally {
      setLoading(false);
    }
  }, [activeUserId, setLang, t, updateAccountLanguage]);

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
