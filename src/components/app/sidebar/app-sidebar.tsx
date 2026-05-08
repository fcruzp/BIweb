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
} from 'lucide-react';
import { useAppStore, type AppView } from '@/stores/app-store';
import { useAIConfigStore } from '@/stores/ai-config-store';
import { DataSourceList } from './datasource-list';
import { DataSourceUpload } from './datasource-upload';
import { AISettingsDialog } from '@/components/app/settings/ai-settings-dialog';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function AppSidebar() {
  const { currentView, setCurrentView } = useAppStore();
  const { provider, isConfigured } = useAIConfigStore();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems: Array<{ view: AppView; icon: React.ReactNode; label: string }> = [
    { view: 'chat', icon: <MessageSquare className="h-4 w-4" />, label: 'Chat' },
    { view: 'dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboards' },
    { view: 'history', icon: <History className="h-4 w-4" />, label: 'History' },
    { view: 'schema', icon: <Table2 className="h-4 w-4" />, label: 'Schema' },
  ];

  const currentProviderLabel = provider === 'z-ai' ? 'Z-AI' : 'OpenRouter';
  const currentProviderIcon = provider === 'z-ai' ? <Zap className="h-3 w-3" /> : <Key className="h-3 w-3" />;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold">DataMind</span>
            <span className="text-[10px] text-muted-foreground">AI-Powered BI</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
          <SidebarGroupLabel>Data Sources</SidebarGroupLabel>
          <SidebarGroupAction onClick={() => setUploadOpen(true)} title="Upload Data Source">
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <DataSourceList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* AI Config indicator */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="AI Settings"
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
            <SidebarMenuButton tooltip="Settings" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <DataSourceUpload open={uploadOpen} onOpenChange={setUploadOpen} />
      <AISettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  );
}
