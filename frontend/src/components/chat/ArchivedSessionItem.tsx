import { Archive, RotateCcw, Trash2 } from "lucide-react";

import type { ChatSession } from "../../types";
import { Button } from "../ui/button";

type ArchivedSessionItemProps = {
  session: ChatSession;
  isDeleteArmed: boolean;
  onRestore: (id: string) => void;
  onRequestPermanentDelete: (id: string) => void;
};

export function ArchivedSessionItem({
  session,
  isDeleteArmed,
  onRestore,
  onRequestPermanentDelete,
}: ArchivedSessionItemProps) {
  return (
    <div className="group rounded-lg border border-transparent p-2 transition-colors duration-150 hover:bg-accent">
      <div className="flex items-start gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
          <Archive className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 py-1">
          <p className="truncate text-sm font-medium text-foreground">
            {session.title || "Untitled chat"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {session.last_message?.content || "No messages yet"}
          </p>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRestore(session.id)}
            aria-label={`Restore ${session.title || "chat"}`}
            title="Restore chat"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant={isDeleteArmed ? "destructive" : "ghost"}
            size="icon"
            onClick={() => onRequestPermanentDelete(session.id)}
            aria-label={
              isDeleteArmed
                ? `Confirm permanent delete ${session.title || "chat"}`
                : `Delete ${session.title || "chat"} permanently`
            }
            title={isDeleteArmed ? "Click again to delete permanently" : "Delete permanently"}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
      {isDeleteArmed && (
        <p className="mt-2 pl-12 text-xs font-medium text-destructive">
          Click delete again to remove it permanently.
        </p>
      )}
    </div>
  );
}
