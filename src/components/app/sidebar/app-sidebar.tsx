'use client';

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
  Zap,
  Key,
  Lock,
} from 'lucide-react';
import { useAppStore, type AppView } from '@/stores/app-store';
import { useAIConfigStore } from '@/stores/ai-config-store';
import { useChatStore } from '@/stores/chat-store';
import { DataSourceList } from './datasource-list';
import { DataSourceUpload } from './datasource-upload';
import { ChatSessionList } from './chat-session-list';
import { AISettingsDialog } from '@/components/app/settings/ai-settings-dialog';
import { LocaleSwitcher } from '@/components/app/locale-switcher';
import { PlanUsageWidget } from './plan-usage-widget';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useState } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch } from '@/lib/fetch-utils';
import { useUsageLimits } from '@/hooks/use-usage-limits';
import { toast } from 'sonner';

export function AppSidebar() {
  const { currentView, setCurrentView, activeDataSourceId, setActiveSession, addChatSession, uploadDialogOpen, setUploadDialogOpen } =
    useAppStore();
  const { clearMessages } = useChatStore();
  const { provider, isConfigured } = useAIConfigStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useI18n();
  const { limits, refresh: refreshLimits } = useUsageLimits();

  const navItems: Array<{ view: AppView; icon: React.ReactNode; label: string }> = [
    { view: 'chat', icon: <MessageSquare className="h-4 w-4" />, label: t('chat') },
    { view: 'dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: t('dashboards') },
    { view: 'history', icon: <History className="h-4 w-4" />, label: t('history') },
    { view: 'schema', icon: <Table2 className="h-4 w-4" />, label: t('schema') },
  ];

  const currentProviderLabel = provider === 'z-ai' ? 'Z-AI' : 'OpenRouter';
  const currentProviderIcon = provider === 'z-ai' ? <Zap className="h-3 w-3" /> : <Key className="h-3 w-3" />;

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
          {/* AI Config indicator */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t('aiSettings')}
              onClick={() => setSettingsOpen(true)}
              className="group/ai-btn"
            >
              {currentProviderIcon}
              <span className="flex items-center gap-1.5">
                {currentProviderLabel}
                {isConfigured() ? (
                  <Badge variant="secondary" className="h-4 text-[8px] px-1 bg-emerald-500/10 text-emerald-500">
                    OK
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="h-4 text-[8px] px-1 bg-amber-500/10 text-amber-500">
                    KEY
                  </Badge>
                )}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Settings */}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t('settings')} onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              <span>{t('settings')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Locale Switcher */}
        <div className="px-2 pt-2 border-t border-border/50 group-data-[collapsible=icon]:hidden">
          <LocaleSwitcher />
        </div>
      </SidebarFooter>

      <DataSourceUpload open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
      <AISettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  );
}