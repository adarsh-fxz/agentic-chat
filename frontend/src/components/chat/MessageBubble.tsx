import { Bot, UserRound } from "lucide-react";

import { cn } from "../../lib/utils";
import type { Message } from "../../types";

type MessageBubbleProps = {
  message: Message;
  streaming?: boolean;
};

export function MessageBubble({ message, streaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <article className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {isUser ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[min(680px,82%)] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-card-foreground",
          streaming && "border-blue-200 bg-blue-50 text-slate-950",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </article>
  );
}
