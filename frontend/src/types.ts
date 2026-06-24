export type AuthTokens = {
  access: string;
  refresh: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type ChatSession = {
  id: string;
  title: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  last_message?: {
    id: string;
    role: Message["role"];
    content: string;
    created_at: string;
  } | null;
};

export type Message = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AssistantRun = {
  id: string;
  status: "queued" | "running" | "requires_action" | "completed" | "failed" | "cancelled";
  model: string;
  error: string;
  total_tokens: number;
};

export type MessageCreateResponse = {
  message: Message;
  run: AssistantRun;
};
