import { Activity } from "lucide-react";

import type { Message } from "../../types";
import { EmptyState } from "./EmptyState";
import { MessageBubble } from "./MessageBubble";
import { Skeleton } from "../ui/skeleton";

type MessageListProps = {
  activeSessionId: string;
  messages: Message[];
  isLoading: boolean;
  streamText: string;
  streamStatus: string;
  messageEndRef: React.RefObject<HTMLDivElement | null>;
  onCreateSession: () => void;
};

export function MessageList({
  activeSessionId,
  messages,
  isLoading,
  streamText,
  streamStatus,
  messageEndRef,
  onCreateSession,
}: MessageListProps) {
  if (!activeSessionId) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-3xl items-center px-4 py-8 md:px-6">
        <EmptyState
          title="Choose or create a chat"
          description="Your conversation history and streamed replies will appear here."
          actionLabel="Create first chat"
          onAction={onCreateSession}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 md:px-6" aria-label="Loading messages">
        <Skeleton className="h-20 w-3/4 rounded-2xl" />
        <Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" />
        <Skeleton className="h-24 w-4/5 rounded-2xl" />
      </div>
    );
  }

  if (messages.length === 0 && !streamText) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-3xl items-center px-4 py-8 md:px-6">
        <EmptyState
          title="Ask the first question"
          description="Try a calculation or ask for a short explanation to test streaming and tool calls."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 md:px-6" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {streamText && (
        <MessageBubble
          streaming
          message={{
            id: "streaming",
            role: "assistant",
            content: streamText,
            metadata: {},
            created_at: new Date().toISOString(),
          }}
        />
      )}
      {streamStatus && (
        <p className="ml-11 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          {streamStatus}
        </p>
      )}
      <div ref={messageEndRef} />
    </div>
  );
}
