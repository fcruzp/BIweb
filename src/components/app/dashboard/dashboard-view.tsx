'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore, type DashboardInfo, type WidgetConfig } from '@/stores/dashboard-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  Plus,
  Trash2,
  Loader2,
  BarChart3,
  Table2,
  Type,
  Gauge,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AddWidgetDialog, type WidgetType } from './add-widget-dialog';
import { WidgetRenderer } from './widget-renderer';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch } from '@/lib/fetch-utils';

export function DashboardView() {
  const {
    dashboards,
    activeDashboard,
    dashboardsLoading,
    setDashboards,
    setActiveDashboard,
    setDashboardsLoading,
    addDashboard,
    removeDashboard,
    addWidget,
    removeWidget,
  } = useDashboardStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [deletingWidgetId, setDeletingWidgetId] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    async function loadDashboards() {
      setDashboardsLoading(true);
      try {
        const res = await authFetch('/api/dashboards');
        if (res.ok) {
          const data = await res.json();
          setDashboards(data.dashboards || []);
        }
      } catch (error) {
        // Silently ignore — authFetch handles 401 globally
      } finally {
        setDashboardsLoading(false);
      }
    }
    loadDashboards();
  }, [setDashboards, setDashboardsLoading]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a dashboard name');
      return;
    }

    try {
      const res = await authFetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription }),
      });

      if (res.ok) {
        const data = await res.json();
        addDashboard(data.dashboard);
        setActiveDashboard(data.dashboard);
        setNewName('');
        setNewDescription('');
        setCreateOpen(false);
        toast.success('Dashboard created!');
      } else {
        toast.error('Failed to create dashboard');
      }
    } catch (error) {
      toast.error('Failed to create dashboard');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/dashboards/${id}`, { method: 'DELETE' });
      if (res.ok) {
        removeDashboard(id);
        toast.success('Dashboard deleted');
      }
    } catch (error) {
      toast.error('Failed to delete dashboard');
    }
  };

  const handleDeleteWidget = async (dashboardId: string, widgetId: string) => {
    setDeletingWidgetId(widgetId);
    try {
      const res = await authFetch(`/api/dashboards/widgets/${widgetId}`, { method: 'DELETE' });
      if (res.ok) {
        removeWidget(dashboardId, widgetId);
        toast.success('Widget removed');
      } else {
        toast.error('Failed to delete widget');
      }
    } catch (error) {
      toast.error('Failed to delete widget');
    } finally {
      setDeletingWidgetId(null);
    }
  };

  const handleWidgetCreated = (widget: WidgetConfig) => {
    if (activeDashboard) {
      addWidget(activeDashboard.id, widget);
    }
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'chart': return <BarChart3 className="h-4 w-4" />;
      case 'table': return <Table2 className="h-4 w-4" />;
      case 'metric': return <Gauge className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  if (dashboardsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Dashboard list view
  if (!activeDashboard) {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{t('dashboards')}</h2>
              <p className="text-sm text-muted-foreground">{t('manageDashboards')}</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('newDashboard')}
            </Button>
          </div>

          {dashboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">{t('noDashboards')}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {t('noDashboardsDesc')}
              </p>
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('createDashboard')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboards.map((dashboard) => (
                <Card
                  key={dashboard.id}
                  className="cursor-pointer hover:border-emerald-500/50 transition-colors"
                  onClick={() => setActiveDashboard(dashboard)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{dashboard.name}</CardTitle>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('deleteDashboard')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('deleteDashboardConfirm')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(dashboard.id)}>
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dashboard.description && (
                      <p className="text-xs text-muted-foreground mb-2">{dashboard.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        {dashboard.widgets.length} {t('widgets')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {new Date(dashboard.updatedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('createDashboard')}</DialogTitle>
                <DialogDescription>
                  {t('createDashboardDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dash-name">{t('dashboardName')}</Label>
                  <Input
                    id="dash-name"
                    placeholder={t('dashboardNamePlaceholder')}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dash-desc">{t('dashboardDescription')}</Label>
                  <Input
                    id="dash-desc"
                    placeholder={t('dashboardDescriptionPlaceholder')}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('cancel')}</Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">{t('create')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    );
  }

  // Active dashboard view
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/50 px-6 py-3 flex items-center justify-between bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveDashboard(null)}>
            {t('back')}
          </Button>
          <div>
            <h2 className="text-lg font-bold">{activeDashboard.name}</h2>
            {activeDashboard.description && (
              <p className="text-xs text-muted-foreground">{activeDashboard.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{activeDashboard.widgets.length} {t('widgets')}</Badge>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-8 text-xs"
            onClick={() => setAddWidgetOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addWidget')}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {activeDashboard.widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">{t('emptyDashboard')}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {t('addWidgetsHint')}
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={() => setAddWidgetOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t('addWidget')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeDashboard.widgets.map((widget) => (
                <Card key={widget.id} className="border-border/50 group relative">
                  <CardHeader className="pb-2 pt-3 px-4 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {getWidgetIcon(widget.widgetType)}
                      {widget.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={deletingWidgetId === widget.id}
                      onClick={() => handleDeleteWidget(activeDashboard.id, widget.id)}
                    >
                      {deletingWidgetId === widget.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <WidgetRenderer widget={widget} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Widget Dialog */}
      {activeDashboard && (
        <AddWidgetDialog
          open={addWidgetOpen}
          onOpenChange={setAddWidgetOpen}
          dashboardId={activeDashboard.id}
          onWidgetCreated={handleWidgetCreated}
        />
      )}
    </div>
  );
}
