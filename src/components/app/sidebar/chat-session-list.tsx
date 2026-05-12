'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore, type ChatSessionInfo } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { MessageSquare, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch, isAuthError } from '@/lib/fetch-utils';
import { useAuth } from '@/components/auth/AuthProvider';

export function ChatSessionList() {
  const {
    activeDataSourceId,
    activeSessionId,
    chatSessions,
    chatSessionsLoading,
    dataSources,
    setChatSessions,
    setChatSessionsLoading,
    setActiveSession,
    addChatSession,
    removeChatSession,
    updateChatSession,
  } = useAppStore();

  const { loadMessages, clearMessages } = useChatStore();
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Track last fetched dataSourceId to avoid unnecessary refetches
  const lastFetchedDsId = useRef<string | null>(null);

  // Fetch sessions for the active data source
  // Background refresh: no spinner if we already have cached sessions for this dataSource
  const fetchSessions = useCallback(async (showLoading = false) => {
    if (!activeDataSourceId) {
      setChatSessions([]);
      lastFetchedDsId.current = null;
      return;
    }

    if (showLoading) setChatSessionsLoading(true);
    try {
      const res = await authFetch(
        `/api/chat/sessions?dataSourceId=${activeDataSourceId}`
      );
      if (res.ok) {
        const data = await res.json();
        const sessions: ChatSessionInfo[] = data.sessions.map(
          (s: {
            id: string;
            title: string;
            dataSourceId: string;
            createdAt: string;
            updatedAt: string;
          }) => ({
            id: s.id,
            title: s.title,
            dataSourceId: s.dataSourceId,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })
        );
        setChatSessions(sessions);
        lastFetchedDsId.current = activeDataSourceId;
      } else if (isAuthError(res)) {
        // Don't retry on 401 — AuthProvider will handle session recovery
        // Keep whatever cached sessions we have
        if (chatSessions.length === 0) {
          setChatSessions([]);
        }
      } else {
        setChatSessions([]);
      }
    } catch (error) {
      setChatSessions([]);
    } finally {
      if (showLoading) setChatSessionsLoading(false);
    }
  }, [activeDataSourceId, setChatSessions, setChatSessionsLoading]);

  useEffect(() => {
    if (!activeDataSourceId) {
      lastFetchedDsId.current = null;
      return;
    }
    if (!isAuthenticated) return; // Don't fetch if not authenticated

    // VALIDATION: Don't fetch sessions for a datasource that's not in our list.
    // This prevents 403/404 floods when activeDataSourceId is stale (e.g., after DB reset).
    const isActiveSourceValid = dataSources.some(ds => ds.id === activeDataSourceId);
    if (!isActiveSourceValid) {
      // The active datasource doesn't exist in our list — skip fetching sessions.
      // DataSourceList or SchemaExplorer will eventually clear the stale ID.
      return;
    }

    // If we're switching to a different dataSource, clear sessions and fetch
    // If same dataSource (e.g., page refresh), use cached data + background refresh
    const isDifferentDs = lastFetchedDsId.current !== activeDataSourceId;
    const hasCachedSessions = chatSessions.some(s => s.dataSourceId === activeDataSourceId);

    if (isDifferentDs) {
      // Clear sessions from previous dataSource immediately
      setChatSessions([]);
      fetchSessions(true);
    } else if (!hasCachedSessions) {
      // No cached data for this dataSource — show spinner
      fetchSessions(true);
    } else {
      // We have cached data — refresh in background, no spinner
      fetchSessions(false);
    }
  }, [activeDataSourceId, dataSources]);

  // Create a new chat session
  const handleNewChat = async () => {
    if (!activeDataSourceId) return;
    try {
      const res = await authFetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSourceId: activeDataSourceId }),
      });
      if (res.ok) {
        const data = await res.json();
        const session: ChatSessionInfo = {
          id: data.session.id,
          title: data.session.title,
          dataSourceId: data.session.dataSourceId,
          createdAt: data.session.createdAt,
          updatedAt: data.session.updatedAt,
        };
        addChatSession(session);
        setActiveSession(session.id);
        clearMessages();
      }
    } catch (error) {
      toast.error('Failed to create new chat');
    }
  };

  // Switch to a chat session
  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setActiveSession(sessionId);
    await loadMessages(sessionId);
  };

  // Start inline rename
  const handleStartRename = (session: ChatSessionInfo) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  // Confirm rename
  const handleConfirmRename = async () => {
    if (!editingId || !editTitle.trim()) return;
    try {
      const res = await authFetch(`/api/chat/sessions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        updateChatSession(editingId, { title: editTitle.trim() });
      }
    } catch (error) {
      toast.error('Failed to rename chat');
    } finally {
      setEditingId(null);
      setEditTitle('');
    }
  };

  // Cancel rename
  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Delete a session
  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/chat/sessions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        removeChatSession(id);
        if (activeSessionId === id) {
          clearMessages();
        }
        toast.success('Chat deleted');
      }
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  if (!activeDataSourceId) {
    return (
      <div className="px-2 py-3 text-center text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
        {t('selectDataSourceToSeeChats')}
      </div>
    );
  }

  // Only show spinner when we have NO cached data for this dataSource AND loading
  const hasCachedForThisDs = chatSessions.some(s => s.dataSourceId === activeDataSourceId);
  if (chatSessionsLoading && !hasCachedForThisDs) {
    return (
      <div className="flex items-center justify-center p-3">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chatSessions.length === 0 && !chatSessionsLoading) {
    return (
      <div className="px-2 py-3 text-center text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
        {t('noChatsHint')}
      </div>
    );
  }

  return (
    <>
      <SidebarMenu>
        {chatSessions
          .filter(s => s.dataSourceId === activeDataSourceId)
          .map((session) => (
          <SidebarMenuItem key={session.id}>
            <div className="flex items-center w-full group/chat-item">
              {editingId === session.id ? (
                // Inline rename mode
                <div className="flex items-center gap-1 flex-1 min-w-0 px-1">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename();
                      if (e.key === 'Escape') handleCancelRename();
                      e.stopPropagation();
                    }}
                    className="h-6 text-xs bg-muted/50 border-border/50 focus-visible:ring-emerald-500/50"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    className="p-0.5 rounded hover:bg-emerald-500/10 text-emerald-500 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmRename();
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelRename();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                // Normal display mode
                <>
                  <SidebarMenuButton
                    isActive={activeSessionId === session.id}
                    onClick={() => handleSelectSession(session.id)}
                    onDoubleClick={() => handleStartRename(session)}
                    className="flex-1 min-w-0"
                    tooltip={session.title}
                  >
                    <MessageSquare className="h-3 w-3 shrink-0" />
                    <span className="truncate text-xs">{session.title}</span>
                  </SidebarMenuButton>
                  <button
                    className="p-1 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 opacity-0 group-hover/chat-item:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(session);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <AlertDialog
                    open={deleteId === session.id}
                    onOpenChange={(open) => {
                      if (!open) setDeleteId(null);
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover/chat-item:opacity-100 transition-opacity shrink-0 mr-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(session.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteChat')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('deleteChatConfirm')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(session.id)}
                        >
                          {t('delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
