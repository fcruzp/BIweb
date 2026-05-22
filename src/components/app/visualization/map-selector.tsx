'use client';

import { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useI18n } from '@/hooks/use-i18n';
import { MAP_REGISTRY, getMapConfig } from '@/lib/map-registry';
import type { MapConfig } from '@/lib/map-registry';

interface MapSelectorProps {
  /** Currently selected country code */
  value: string;
  /** Callback when user selects a country */
  onChange: (countryCode: string) => void;
  /** Whether auto-detection was used */
  autoDetected?: boolean;
}

const COUNTRY_FLAGS: Record<string, string> = {
  DO: '🇩🇴',
  US: '🇺🇸',
  MX: '🇲🇽',
  CO: '🇨🇴',
  AR: '🇦🇷',
};

/**
 * Map selector dropdown for choosing which country's map to use
 * in a geographic heatmap visualization.
 */
export function MapSelector({ value, onChange, autoDetected }: MapSelectorProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  const currentConfig = getMapConfig(value);
  const displayName = currentConfig
    ? (locale === 'es' ? currentConfig.name : currentConfig.nameEn)
    : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
        >
          <Globe className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium">
            {COUNTRY_FLAGS[value] || '🗺️'} {displayName}
          </span>
          {autoDetected && (
            <span className="text-[10px] text-emerald-500 font-normal">
              auto
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          {t('mapSelectCountry')}
        </div>
        {Object.entries(MAP_REGISTRY).map(([code, config]) => {
          const name = locale === 'es' ? config.name : config.nameEn;
          const isSelected = code === value;

          return (
            <button
              key={code}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'hover:bg-muted'
              }`}
              onClick={() => {
                onChange(code);
                setOpen(false);
              }}
            >
              <span className="text-base">{COUNTRY_FLAGS[code] || '🗺️'}</span>
              <span className="flex-1 text-left">{name}</span>
              <span className="text-[10px] text-muted-foreground">
                {config.regions.length} {locale === 'es' ? config.regionLabel : config.regionLabelEn}
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
