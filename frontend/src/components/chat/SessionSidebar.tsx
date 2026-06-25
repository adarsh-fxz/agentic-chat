import { Archive, LogOut, MessageSquare, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ChatSession, User } from "../../types";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { ActiveSessionItem } from "./ActiveSessionItem";
import { ArchivedSessionItem } from "./ArchivedSessionItem";

type SessionSidebarProps = {
  user: User;
  sessions: ChatSession[];
  archivedSessions: ChatSession[];
  activeSessionId: string;
  isLoading: boolean;
  isLoadingArchived: boolean;
  isViewingArchived: boolean;
  onCreateSession: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onRestoreSession: (id: string) => void;
  onPermanentDeleteSession: (id: string) => void;
  onShowActiveChats: () => void;
  onShowArchivedChats: () => void;
  onSignOut: () => void;
};

export function SessionSidebar({
  user,
  sessions,
  archivedSessions,
  activeSessionId,
  isLoading,
  isLoadingArchived,
  isViewingArchived,
  onCreateSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onRestoreSession,
  onPermanentDeleteSession,
  onShowActiveChats,
  onShowArchivedChats,
  onSignOut,
}: SessionSidebarProps) {
  const [deleteArmedId, setDeleteArmedId] = useState("");

  const visibleSessions = isViewingArchived ? archivedSessions : sessions;
  const isCurrentLoading = isViewingArchived ? isLoadingArchived : isLoading;

  const emptyState = useMemo(() => {
    if (isViewingArchived) {
      return {
        icon: Archive,
        title: "No archived chats",
        description: "Archived conversations will appear here.",
      };
    }

    return {
      icon: MessageSquare,
      title: "No chats yet",
      description: "Create one to start testing the assistant.",
    };
  }, [isViewingArchived]);

  useEffect(() => {
    setDeleteArmedId("");
  }, [activeSessionId, isViewingArchived]);

  function handleCreateSession() {
    onShowActiveChats();
    onCreateSession();
  }

  function requestArchive(sessionId: string) {
    if (deleteArmedId !== sessionId) {
      setDeleteArmedId(sessionId);
      return;
    }

    setDeleteArmedId("");
    onDeleteSession(sessionId);
  }

  function requestPermanentDelete(sessionId: string) {
    if (deleteArmedId !== sessionId) {
      setDeleteArmedId(sessionId);
      return;
    }

    setDeleteArmedId("");
    onPermanentDeleteSession(sessionId);
  }

  const EmptyIcon = emptyState.icon;

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-card/80 backdrop-blur">
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Agentic Chat
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Workspace</h1>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Badge variant="outline" className="max-w-[180px] truncate">
            {user.username}
          </Badge>
          <Badge variant="secondary">{sessions.length} active</Badge>
        </div>
      </div>

      <div className="space-y-3 border-b border-border p-4">
        <Button type="button" className="w-full" onClick={handleCreateSession} loading={isLoading}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New chat
        </Button>

        <div className="grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="Chat filters">
          <button
            type="button"
            onClick={onShowActiveChats}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !isViewingArchived && "bg-background text-foreground shadow-sm",
            )}
            aria-pressed={!isViewingArchived}
          >
            Active
            <span className="text-xs text-muted-foreground">{sessions.length}</span>
          </button>
          <button
            type="button"
            onClick={onShowArchivedChats}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isViewingArchived && "bg-background text-foreground shadow-sm",
            )}
            aria-pressed={isViewingArchived}
          >
            Archived
            <span className="text-xs text-muted-foreground">{archivedSessions.length}</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {isCurrentLoading && visibleSessions.length === 0 ? (
          <div className="space-y-2" aria-label="Loading chats">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <EmptyIcon className="h-5 w-5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">{emptyState.title}</p>
              <p className="text-xs">{emptyState.description}</p>
            </div>
            {!isViewingArchived && (
              <Button type="button" variant="secondary" size="sm" onClick={handleCreateSession}>
                Start a chat
              </Button>
            )}
          </div>
        ) : isViewingArchived ? (
          visibleSessions.map((session) => (
            <ArchivedSessionItem
              key={session.id}
              session={session}
              isDeleteArmed={deleteArmedId === session.id}
              onRestore={onRestoreSession}
              onRequestPermanentDelete={requestPermanentDelete}
            />
          ))
        ) : (
          visibleSessions.map((session) => (
            <ActiveSessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              isDeleteArmed={deleteArmedId === session.id}
              onSelect={onSelectSession}
              onRename={onRenameSession}
              onRequestDelete={requestArchive}
            />
          ))
        )}
      </div>
    </aside>
  );
}
