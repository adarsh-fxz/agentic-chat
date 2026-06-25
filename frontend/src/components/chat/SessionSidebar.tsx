import { Check, LogOut, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { ChatSession, User } from "../../types";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";

type SessionSidebarProps = {
  user: User;
  sessions: ChatSession[];
  activeSessionId: string;
  isLoading: boolean;
  onCreateSession: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onSignOut: () => void;
};

export function SessionSidebar({
  user,
  sessions,
  activeSessionId,
  isLoading,
  onCreateSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onSignOut,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteArmedId, setDeleteArmedId] = useState("");

  useEffect(() => {
    setDeleteArmedId("");
  }, [activeSessionId]);

  function startEditing(session: ChatSession) {
    setDeleteArmedId("");
    setEditingId(session.id);
    setEditingTitle(session.title || "Untitled chat");
  }

  function cancelEditing() {
    setEditingId("");
    setEditingTitle("");
  }

  function submitEditing(sessionId: string) {
    onRenameSession(sessionId, editingTitle);
    cancelEditing();
  }

  function requestDelete(sessionId: string) {
    if (deleteArmedId !== sessionId) {
      setEditingId("");
      setDeleteArmedId(sessionId);
      return;
    }

    setDeleteArmedId("");
    onDeleteSession(sessionId);
  }

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
          sessions.map((session) => {
            const isEditing = editingId === session.id;
            const isDeleteArmed = deleteArmedId === session.id;

            return (
              <div
                key={session.id}
                className={cn(
                  "group rounded-lg border border-transparent p-2 transition-colors duration-150 hover:bg-accent",
                  session.id === activeSessionId && "border-border bg-accent shadow-sm",
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Open ${session.title || "Untitled chat"}`}
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") submitEditing(session.id);
                            if (event.key === "Escape") cancelEditing();
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => submitEditing(session.id)}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={cancelEditing}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        className="block w-full rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <span className="block truncate text-sm font-medium text-foreground">
                          {session.title || "Untitled chat"}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {session.last_message?.content || "No messages yet"}
                        </span>
                      </button>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditing(session)}
                        aria-label={`Rename ${session.title || "chat"}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant={isDeleteArmed ? "destructive" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => requestDelete(session.id)}
                        aria-label={
                          isDeleteArmed
                            ? `Confirm delete ${session.title || "chat"}`
                            : `Delete ${session.title || "chat"}`
                        }
                        title={isDeleteArmed ? "Click again to delete" : "Delete chat"}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>
                {isDeleteArmed && (
                  <p className="mt-2 pl-10 text-xs font-medium text-destructive">
                    Click delete again to archive this chat.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
