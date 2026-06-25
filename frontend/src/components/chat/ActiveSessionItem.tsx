import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import type { ChatSession } from "../../types";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type ActiveSessionItemProps = {
  session: ChatSession;
  isActive: boolean;
  isDeleteArmed: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRequestDelete: (id: string) => void;
};

export function ActiveSessionItem({
  session,
  isActive,
  isDeleteArmed,
  onSelect,
  onRename,
  onRequestDelete,
}: ActiveSessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(session.title || "Untitled chat");

  function startEditing() {
    setEditingTitle(session.title || "Untitled chat");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditingTitle(session.title || "Untitled chat");
  }

  function submitEditing() {
    onRename(session.id, editingTitle);
    setIsEditing(false);
  }

  return (
    <div
      className={cn(
        "group rounded-lg border border-transparent p-2 transition-colors duration-150 hover:bg-accent",
        isActive && "border-border bg-accent shadow-sm",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onSelect(session.id)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  if (event.key === "Enter") submitEditing();
                  if (event.key === "Escape") cancelEditing();
                }}
                className="h-10"
                aria-label="Chat title"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={submitEditing}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={cancelEditing}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(session.id)}
              className="block w-full rounded-sm py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              onClick={startEditing}
              aria-label={`Rename ${session.title || "chat"}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant={isDeleteArmed ? "destructive" : "ghost"}
              size="icon"
              onClick={() => onRequestDelete(session.id)}
              aria-label={
                isDeleteArmed
                  ? `Confirm archive ${session.title || "chat"}`
                  : `Archive ${session.title || "chat"}`
              }
              title={isDeleteArmed ? "Click again to archive" : "Archive chat"}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
      {isDeleteArmed && (
        <p className="mt-2 pl-12 text-xs font-medium text-destructive">
          Click delete again to archive this chat.
        </p>
      )}
    </div>
  );
}
