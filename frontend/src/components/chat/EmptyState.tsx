import { MessageSquarePlus } from "lucide-react";

import { Button } from "../ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button type="button" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
