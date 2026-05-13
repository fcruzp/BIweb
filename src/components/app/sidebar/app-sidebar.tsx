'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  MessageSquare,
  LayoutDashboard,
  History,
  Plus,
  Brain,
  Settings,
  Table2,
  Lock,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { useAppStore, type AppView } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { DataSourceList } from './datasource-list';
import { DataSourceUpload } from './datasource-upload';
import { ChatSessionList } from './chat-session-list';
import { LocaleSwitcher } from '@/components/app/locale-switcher';
import { PlanUsageWidget } from './plan-usage-widget';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch } from '@/lib/fetch-utils';
import { useUsageLimits, useUsageLimitsInit } from '@/hooks/use-usage-limits';
import { useAIStatus } from '@/hooks/use-ai-status';
import { SettingsDialog } from '@/components/app/settings/settings-dialog';
import { toast } from 'sonner';

export function AppSidebar() {
  const { currentView, setCurrentView, activeDataSourceId, setActiveSession, addChatSession, uploadDialogOpen, setUploadDialogOpen } =
    useAppStore();
  const { clearMessages } = useChatStore();
  const { t } = useI18n();
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const { status: aiStatus, errorMessage: aiError, check: checkAI } = useAIStatus();
  // Initialize the shared Zustand store — fetches on auth change, resets on sign-out
  useUsageLimitsInit();

  // Check AI status once on mount
  const aiCheckedRef = useRef(false);
  useEffect(() => {
    if (!aiCheckedRef.current) {
      aiCheckedRef.current = true;
      checkAI();
    }
  }, [checkAI]);

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems: Array<{ view: AppView; icon: React.ReactNode; label: string }> = [
    { view: 'chat', icon: <MessageSquare className="h-4 w-4" />, label: t('chat') },
    { view: 'dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: t('dashboards') },
    { view: 'history', icon: <History className="h-4 w-4" />, label: t('history') },
    { view: 'schema', icon: <Table2 className="h-4 w-4" />, label: t('schema') },
  ];

  const handleNewChat = async () => {
    if (!activeDataSourceId) return;
    if (limits.chatSessions.atLimit) {
      toast.error(t('limitReached'), {
        description: t('chatSessionsLimitMessage', { limit: String(limits.chatSessions.limit) }),
      });
      return;
    }
    try {
      const res = await authFetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSourceId: activeDataSourceId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session.id);
        addChatSession({
          id: data.session.id,
          title: data.session.title,
          dataSourceId: data.session.dataSourceId,
          createdAt: data.session.createdAt,
          updatedAt: data.session.updatedAt,
        });
        clearMessages();
        refreshLimits();
      } else if (res.status === 403) {
        // Limit exceeded — backend rejected
        const data = await res.json().catch(() => ({}));
        toastLimitError('chatSessions', data);
      }
    } catch (error) {
      // Silently ignore — authFetch handles 401 globally
    }
  };

  const toastLimitError = (type: string, data: Record<string, unknown>) => {
    toast.error(t('limitReached'), {
      description: data.error as string || t('upgradeRequired'),
    });
  };

  const handleUploadClick = () => {
    if (limits.dataSources.atLimit) {
      toast.error(t('limitReached'), {
        description: t('dataSourcesLimitMessage', { limit: String(limits.dataSources.limit) }),
      });
      return;
    }
    setUploadDialogOpen(true);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold">DataMind</span>
            <span className="text-[10px] text-muted-foreground">{t('appSubtitle')}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={currentView === item.view}
                    onClick={() => setCurrentView(item.view)}
                    tooltip={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Data Sources */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('datasources')}</SidebarGroupLabel>
          {limits.dataSources.atLimit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarGroupAction
                  onClick={handleUploadClick}
                  className="text-muted-foreground cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground"
                >
                  <Plus className="h-4 w-4" />
                </SidebarGroupAction>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('dataSourcesLimitMessage', { limit: String(limits.dataSources.limit) })}</p>
                <p className="text-xs opacity-70">{t('upgradeRequired')}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <SidebarGroupAction onClick={handleUploadClick} title={t('uploadDataSource')}>
              <Plus className="h-4 w-4" />
            </SidebarGroupAction>
          )}
          <SidebarGroupContent>
            <DataSourceList />
            {/* Near-limit warning */}
            {limits.dataSources.nearLimit && !limits.dataSources.atLimit && (
              <div className="px-2 py-1.5 text-[10px] text-amber-600 bg-amber-500/5 rounded flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                <Lock className="h-3 w-3 shrink-0" />
                {limits.dataSources.used}/{limits.dataSources.limit} {t('dataSourcesUsed').toLowerCase()}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Chat Sessions */}
        {activeDataSourceId && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('chats')}</SidebarGroupLabel>
            {limits.chatSessions.atLimit ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarGroupAction
                    onClick={handleNewChat}
                    className="text-muted-foreground cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </SidebarGroupAction>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t('chatSessionsLimitMessage', { limit: String(limits.chatSessions.limit) })}</p>
                  <p className="text-xs opacity-70">{t('upgradeRequired')}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <SidebarGroupAction onClick={handleNewChat} title={t('newChat')}>
                <Plus className="h-4 w-4" />
              </SidebarGroupAction>
            )}
            <SidebarGroupContent>
              <ChatSessionList />
              {/* Near-limit warning for chat sessions */}
              {limits.chatSessions.nearLimit && !limits.chatSessions.atLimit && (
                <div className="px-2 py-1.5 text-[10px] text-amber-600 bg-amber-500/5 rounded flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                  <Lock className="h-3 w-3 shrink-0" />
                  {limits.chatSessions.used}/{limits.chatSessions.limit} {t('chatSessions').toLowerCase()}
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {/* Plan Usage Widget */}
        <PlanUsageWidget />

        <SidebarMenu>
          {/* Settings with AI status indicator */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={aiStatus === 'error' ? t('aiConnectionError') : t('settings')}
              onClick={() => setSettingsOpen(true)}
            >
              <div className="relative">
                <Settings className="h-4 w-4" />
                {/* AI Status dot */}
                {aiStatus === 'ok' && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
                {aiStatus === 'error' && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
                {aiStatus === 'checking' && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                )}
              </div>
              <span>{t('settings')}</span>
              {/* Compact status text — only when expanded */}
              {aiStatus === 'ok' && (
                <span className="ml-auto text-[9px] text-emerald-600 dark:text-emerald-400 font-medium group-data-[collapsible=icon]:hidden">
                  OK
                </span>
              )}
              {aiStatus === 'error' && (
                <WifiOff className="ml-auto h-3 w-3 text-red-500 group-data-[collapsible=icon]:hidden" />
              )}
              {aiStatus === 'checking' && (
                <Loader2 className="ml-auto h-3 w-3 animate-spin text-amber-500 group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Locale Switcher */}
        <div className="px-2 pt-2 border-t border-border/50 group-data-[collapsible=icon]:hidden">
          <LocaleSwitcher />
        </div>
      </SidebarFooter>

      <DataSourceUpload open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  );
}