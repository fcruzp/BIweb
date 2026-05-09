import { create } from 'zustand';

export type Locale = 'en' | 'es';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: (typeof window !== 'undefined' && localStorage.getItem('datamind-locale') as Locale) || 'es',
  setLocale: (locale: Locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('datamind-locale', locale);
    }
    set({ locale });
  },
}));
