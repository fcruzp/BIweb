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
} from 'lucide-react';
import { useAppStore, type AppView } from '@/stores/app-store';
import { DataSourceList } from './datasource-list';
import { DataSourceUpload } from './datasource-upload';
import { useState } from 'react';

export function AppSidebar() {
  const { currentView, setCurrentView } = useAppStore();
  const [uploadOpen, setUploadOpen] = useState(false);

  const navItems: Array<{ view: AppView; icon: React.ReactNode; label: string }> = [
    { view: 'chat', icon: <MessageSquare className="h-4 w-4" />, label: 'Chat' },
    { view: 'dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboards' },
    { view: 'history', icon: <History className="h-4 w-4" />, label: 'History' },
    { view: 'schema', icon: <Table2 className="h-4 w-4" />, label: 'Schema' },
  ];

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
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <DataSourceUpload open={uploadOpen} onOpenChange={setUploadOpen} />
    </Sidebar>
  );
}
