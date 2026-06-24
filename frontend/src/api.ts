import type {
  AssistantRun,
  AuthTokens,
  ChatSession,
  Message,
  MessageCreateResponse,
  User,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type RequestOptions = {
  token?: string;
  method?: string;
  body?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = "Request failed. Please try again.";
    try {
      const payload = await response.json();
      message =
        payload.detail ||
        Object.values(payload).flat().join(" ") ||
        message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function register(username: string, email: string, password: string) {
  return request<User>("/api/auth/register/", {
    method: "POST",
    body: { username, email, password },
  });
}

export function login(username: string, password: string) {
  return request<AuthTokens>("/api/auth/token/", {
    method: "POST",
    body: { username, password },
  });
}

export function getMe(token: string) {
  return request<User>("/api/auth/me/", { token });
}

export function listSessions(token: string) {
  return request<ChatSession[]>("/api/chats/sessions/", { token });
}

export function createSession(token: string, title: string) {
  return request<ChatSession>("/api/chats/sessions/", {
    token,
    method: "POST",
    body: { title },
  });
}

export function listMessages(token: string, sessionId: string) {
  return request<Message[]>(`/api/chats/sessions/${sessionId}/messages/`, {
    token,
  });
}

export function sendMessage(token: string, sessionId: string, content: string) {
  return request<MessageCreateResponse>(
    `/api/chats/sessions/${sessionId}/messages/`,
    {
      token,
      method: "POST",
      body: { content },
    },
  );
}

export async function streamRun(
  token: string,
  runId: string,
  handlers: {
    onDelta: (text: string) => void;
    onToolEvent: (name: string) => void;
    onComplete: (message?: Message, run?: AssistantRun) => void;
    onError: (message: string) => void;
  },
) {
  const response = await fetch(`${API_BASE_URL}/api/chats/runs/${runId}/stream/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream, */*",
    },
  });

  if (!response.ok || !response.body) {
    throw new ApiError("Could not start the assistant stream.", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const parsed = parseSseEvent(rawEvent);
      if (!parsed) continue;

      if (parsed.event === "delta") {
        handlers.onDelta(String(parsed.data.text || ""));
      } else if (parsed.event === "tool.started") {
        handlers.onToolEvent(`Running ${parsed.data.name || "tool"}...`);
      } else if (parsed.event === "tool.completed") {
        handlers.onToolEvent(`Tool completed: ${parsed.data.name || "tool"}`);
      } else if (parsed.event === "tool.failed") {
        handlers.onToolEvent(`Tool failed: ${parsed.data.name || "tool"}`);
      } else if (parsed.event === "run.completed") {
        handlers.onComplete(parsed.data.message, parsed.data.run);
      } else if (parsed.event === "error") {
        handlers.onError(String(parsed.data.detail || "Assistant failed."));
      }
    }
  }
}

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));

  if (!eventLine || !dataLine) {
    return null;
  }

  try {
    return {
      event: eventLine.replace("event:", "").trim(),
      data: JSON.parse(dataLine.replace("data:", "").trim()),
    };
  } catch {
    return null;
  }
}
