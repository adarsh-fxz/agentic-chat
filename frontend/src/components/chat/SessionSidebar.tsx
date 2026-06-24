import { LogOut, MessageSquare, Plus } from "lucide-react";

import type { ChatSession, User } from "../../types";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

type SessionSidebarProps = {
  user: User;
  sessions: ChatSession[];
  activeSessionId: string;
  isLoading: boolean;
  onCreateSession: () => void;
  onSelectSession: (id: string) => void;
  onSignOut: () => void;
};

export function SessionSidebar({
  user,
  sessions,
  activeSessionId,
  isLoading,
  onCreateSession,
  onSelectSession,
  onSignOut,
}: SessionSidebarProps) {
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
          <Badge variant="secondary">{sessions.length} chats</Badge>
        </div>
      </div>

      <div className="border-b border-border p-4">
        <Button type="button" className="w-full" onClick={onCreateSession} loading={isLoading}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && sessions.length === 0 ? (
          <div className="space-y-2" aria-label="Loading chats">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No chats yet. Create one to start testing the assistant.
          </div>
        ) : (
          sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                session.id === activeSessionId && "border-border bg-accent shadow-sm",
              )}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 space-y-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {session.title || "Untitled chat"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {session.last_message?.content || "No messages yet"}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
