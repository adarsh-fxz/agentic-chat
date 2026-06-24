import { AlertCircle, Bot } from "lucide-react";

import type { ReturnTypeOfUseChatApp } from "./types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { SessionSidebar } from "./SessionSidebar";

type ChatWorkspaceProps = {
  state: ReturnTypeOfUseChatApp;
};

export function ChatWorkspace({ state }: ChatWorkspaceProps) {
  if (!state.user) {
    return null;
  }

  return (
    <main className="grid h-screen min-h-[640px] bg-background text-foreground lg:grid-cols-[320px_minmax(0,1fr)]">
      <SessionSidebar
        user={state.user}
        sessions={state.sessions}
        activeSessionId={state.activeSessionId}
        isLoading={state.isLoadingSessions}
        onCreateSession={state.handleNewSession}
        onSelectSession={state.setActiveSessionId}
        onSignOut={state.handleSignOut}
      />

      <section className="flex min-h-0 flex-col bg-background">
        <header className="border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Signed in as {state.user.username}
              </p>
              <h2 className="truncate text-xl font-semibold tracking-tight">
                {state.activeSession?.title || "Select a chat"}
              </h2>
            </div>
            <Badge variant={state.isSending ? "default" : "secondary"} className="shrink-0">
              <Bot className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {state.isSending ? "Streaming" : "Ready"}
            </Badge>
          </div>
        </header>

        {state.error && (
          <div className="border-b border-border bg-background px-4 py-3 md:px-6">
            <Alert className="mx-auto max-w-3xl border-destructive/30 bg-destructive/5 text-destructive">
              <AlertCircle className="absolute left-4 top-4 h-4 w-4" aria-hidden="true" />
              <div className="pl-6">
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription className="text-destructive/80">
                  <span>{state.error}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => state.setError("")}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MessageList
            activeSessionId={state.activeSessionId}
            messages={state.messages}
            isLoading={state.isLoadingMessages}
            streamText={state.streamText}
            streamStatus={state.streamStatus}
            messageEndRef={state.messageEndRef}
            onCreateSession={state.handleNewSession}
          />
        </div>

        <Composer
          value={state.composer}
          disabled={!state.activeSessionId}
          isSending={state.isSending}
          onChange={state.setComposer}
          onSubmit={state.handleSendMessage}
          onKeyDown={state.handleComposerKeyDown}
        />
      </section>
    </main>
  );
}
