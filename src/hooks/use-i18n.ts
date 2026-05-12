'use client';

import { useLocaleStore, type Locale } from '@/stores/locale-store';
import { translations, type TranslationKey } from '@/lib/i18n';

export function useI18n() {
  const { locale, setLocale } = useLocaleStore();
  const dict = translations[locale];

  return {
    locale,
    setLocale,
    t: (key: TranslationKey, params?: Record<string, string>): string => {
      let value = (dict[key] || translations.en[key] || key) as string;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, v);
        }
      }
      return value;
    },
  };
}
