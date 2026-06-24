import { Send } from "lucide-react";

import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

type ComposerProps = {
  value: string;
  disabled: boolean;
  isSending: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function Composer({
  value,
  disabled,
  isSending,
  onChange,
  onSubmit,
  onKeyDown,
}: ComposerProps) {
  return (
    <form
      className="border-t border-border/80 bg-background px-4 py-3 md:px-6"
      onSubmit={onSubmit}
      aria-busy={isSending}
    >
      <div className="mx-auto w-full max-w-3xl">
        <Label htmlFor="composer" className="sr-only">
          Message
        </Label>
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <Textarea
            id="composer"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything"
            rows={1}
            disabled={disabled || isSending}
            className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            disabled={disabled || !value.trim() || isSending}
            loading={isSending}
            aria-label="Send message"
          >
            {!isSending && <Send className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Enter to send. Shift + Enter adds a line.
        </p>
      </div>
    </form>
  );
}
