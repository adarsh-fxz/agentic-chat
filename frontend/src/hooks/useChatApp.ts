import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  createSession,
  deleteSession,
  getMe,
  listMessages,
  listSessions,
  login,
  register,
  renameSession,
  sendMessage,
  streamRun,
} from "../api";
import type { ChatSession, Message, User } from "../types";

export type AuthMode = "login" | "register";

const TOKEN_STORAGE_KEY = "agentic-chat-access-token";

function buildSessionTitle(content: string) {
  const title = content.replace(/\s+/g, " ").trim();
  if (!title) return "New chat";
  return title.length > 48 ? `${title.slice(0, 45)}...` : title;
}

export function useChatApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [composer, setComposer] = useState("");
  const [isBooting, setIsBooting] = useState(Boolean(token));
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [error, setError] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  useEffect(() => {
    if (!token) {
      setIsBooting(false);
      return;
    }

    void bootSession(token);
  }, [token]);

  useEffect(() => {
    if (!activeSessionId || !token) return;
    void loadMessages(token, activeSessionId);
  }, [activeSessionId, token]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streamText, streamStatus]);

  async function bootSession(currentToken: string) {
    setIsBooting(true);
    setError("");

    try {
      const [profile, sessionList] = await Promise.all([
        getMe(currentToken),
        listSessions(currentToken),
      ]);
      setUser(profile);
      setSessions(sessionList);
      setActiveSessionId((current) => current || sessionList[0]?.id || "");
    } catch (err) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken("");
      setUser(null);
      setError(getErrorMessage(err));
    } finally {
      setIsBooting(false);
    }
  }

  async function loadMessages(currentToken: string, sessionId: string) {
    setIsLoadingMessages(true);
    setError("");

    try {
      setMessages(await listMessages(currentToken, sessionId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthSubmitting(true);
    setError("");

    try {
      if (authMode === "register") {
        await register(username, email, password);
      }

      const tokens = await login(username, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access);
      setToken(tokens.access);
      setPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleNewSession() {
    if (!token) return;

    setIsLoadingSessions(true);
    setError("");

    try {
      const session = await createSession(token, "New chat");
      setSessions((current) => [session, ...current]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function handleRenameSession(sessionId: string, title: string) {
    if (!token) return;

    const cleanTitle = title.trim() || "Untitled chat";
    setError("");

    try {
      const updated = await renameSession(token, sessionId, cleanTitle);
      setSessions((current) =>
        current.map((session) => (session.id === updated.id ? updated : session)),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!token || isSending) return;

    setError("");

    try {
      await deleteSession(token, sessionId);
      setSessions((current) => {
        const next = current.filter((session) => session.id !== sessionId);
        if (sessionId === activeSessionId) {
          setActiveSessionId(next[0]?.id || "");
          setMessages([]);
        }
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = composer.trim();

    if (!token || !activeSessionId || !content || isSending) return;

    setIsSending(true);
    setComposer("");
    setStreamText("");
    setStreamStatus("Starting assistant...");
    setError("");

    try {
      const sessionBeforeSend = activeSession;
      if (sessionBeforeSend && sessionBeforeSend.title === "New chat" && messages.length === 0) {
        const title = buildSessionTitle(content);
        setSessions((current) =>
          current.map((session) =>
            session.id === activeSessionId ? { ...session, title } : session,
          ),
        );
        void handleRenameSession(activeSessionId, title);
      }

      const created = await sendMessage(token, activeSessionId, content);
      setMessages((current) => [...current, created.message]);

      await streamRun(token, created.run.id, {
        onDelta: (text) => {
          setStreamStatus("Assistant is responding...");
          setStreamText((current) => current + text);
        },
        onToolEvent: (text) => setStreamStatus(text),
        onComplete: (message) => {
          setStreamStatus("");
          setStreamText("");
          if (message) {
            setMessages((current) => [...current, message]);
          }
        },
        onError: (message) => {
          setStreamStatus("");
          setError(message);
        },
      });

      setSessions(await listSessions(token));
    } catch (err) {
      setStreamStatus("");
      setError(getErrorMessage(err));
      setComposer(content);
    } finally {
      setIsSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  }

  function toggleAuthMode() {
    setError("");
    setAuthMode((current) => (current === "login" ? "register" : "login"));
  }

  function handleSignOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setUser(null);
    setSessions([]);
    setMessages([]);
    setActiveSessionId("");
    setStreamText("");
    setStreamStatus("");
    setError("");
  }

  return {
    user,
    sessions,
    activeSession,
    activeSessionId,
    messages,
    authMode,
    username,
    email,
    password,
    composer,
    isBooting,
    isAuthSubmitting,
    isLoadingSessions,
    isLoadingMessages,
    isSending,
    streamText,
    streamStatus,
    error,
    messageEndRef,
    setUsername,
    setEmail,
    setPassword,
    setComposer,
    setActiveSessionId,
    setError,
    handleAuthSubmit,
    handleNewSession,
    handleRenameSession,
    handleDeleteSession,
    handleSendMessage,
    handleComposerKeyDown,
    toggleAuthMode,
    handleSignOut,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
