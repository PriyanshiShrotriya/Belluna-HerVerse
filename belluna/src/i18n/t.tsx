import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import en from './en.json';
import hi from './hi.json';

export type Lang = 'en' | 'hi';
type Key = keyof typeof en;
const dict: Record<Lang, Record<string, string>> = { en, hi };
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: 'en', setLang: () => { }, t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('belluna.lang') === 'hi' ? 'hi' : 'en'));
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { localStorage.setItem('belluna.lang', l); setLangState(l); };
  const t = (k: Key) => dict[lang][k] ?? dict.en[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);

