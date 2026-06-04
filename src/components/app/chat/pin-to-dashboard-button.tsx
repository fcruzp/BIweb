'use client';

import { useState } from 'react';
import { useDashboardStore, type DashboardInfo } from '@/stores/dashboard-store';
import type { VisualizationConfig } from '@/stores/chat-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Pin, Loader2, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/fetch-utils';
import { useI18n } from '@/hooks/use-i18n';

interface PinToDashboardButtonProps {
  title: string;
  widgetType: 'chart' | 'table' | 'metric' | 'map';
  dataSourceId: string;
  sqlQuery: string;
  visualization?: VisualizationConfig | null;
}

export function PinToDashboardButton({
  title,
  widgetType,
  dataSourceId,
  sqlQuery,
  visualization,
}: PinToDashboardButtonProps) {
  const { dashboards, addWidget } = useDashboardStore();
  const [pinning, setPinning] = useState<string | null>(null);
  const { t } = useI18n();

  const handlePin = async (dashboard: DashboardInfo) => {
    setPinning(dashboard.id);
    try {
      const res = await authFetch('/api/dashboards/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardId: dashboard.id,
          title: title || 'Pinned Widget',
          widgetType,
          dataSourceId,
          sqlQuery,
          visualization: visualization || null,
          config: {},
          positionX: 0,
          positionY: dashboard.widgets?.length || 0,
          width: widgetType === 'metric' ? 3 : widgetType === 'map' ? 6 : 6,
          height: widgetType === 'metric' ? 3 : widgetType === 'map' ? 5 : 4,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to pin to dashboard');
      }

      const data = await res.json();
      addWidget(dashboard.id, data.widget);
      toast.success(`Pinned to "${dashboard.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pin to dashboard');
    } finally {
      setPinning(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Pin className="h-3 w-3" />
          {t('pinToDashboard')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('selectDashboard')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {dashboards.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            {t('noDashboardsHint')}
          </div>
        ) : (
          dashboards.map((dashboard) => (
            <DropdownMenuItem
              key={dashboard.id}
              disabled={pinning !== null}
              onClick={() => handlePin(dashboard)}
              className="gap-2 cursor-pointer"
            >
              {pinning === dashboard.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LayoutDashboard className="h-3.5 w-3.5" />
              )}
              <span className="truncate">{dashboard.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {dashboard.widgets.length} {t('widgets')}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
