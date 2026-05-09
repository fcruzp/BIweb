'use client';

import { useLocaleStore, localeNames, type Locale } from '@/stores/locale-store';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2">
          <Languages className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{localeNames[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(localeNames) as [Locale, string][]).map(([key, name]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => setLocale(key)}
            className={locale === key ? 'bg-emerald-500/10 text-emerald-600' : ''}
          >
            <span className="font-medium">{name}</span>
            {locale === key && (
              <span className="ml-auto text-emerald-500">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
