import { Bot, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import type { AuthMode } from "../../hooks/useChatApp";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";

type AuthScreenProps = {
  mode: AuthMode;
  username: string;
  email: string;
  password: string;
  error: string;
  isBooting: boolean;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onToggleMode: () => void;
};

export function AuthScreen({
  mode,
  username,
  email,
  password,
  error,
  isBooting,
  isSubmitting,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === "register";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.10),transparent_32%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))] px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden border-border/80 shadow-xl">
        <CardHeader className="space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Agentic Chat
            </p>
            <CardTitle className="text-3xl">
              {isRegister ? "Create your workspace" : "Welcome back"}
            </CardTitle>
            <CardDescription className="leading-6">
              Sign in to stream assistant responses, inspect tool-backed runs, and keep every chat session saved.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <Alert className="border-destructive/30 bg-destructive/5 text-destructive">
              <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
              <AlertDescription className="text-destructive/80">{error}</AlertDescription>
            </Alert>
          )}

          {isBooting ? (
            <div className="space-y-3" aria-label="Loading saved session">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit} aria-busy={isSubmitting}>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  autoComplete="username"
                  spellCheck={false}
                  required
                />
              </div>

              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    autoComplete="email"
                    spellCheck={false}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    className="pr-11"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                {isRegister ? "Create account" : "Sign in"}
              </Button>
            </form>
          )}

          <Button type="button" variant="ghost" className="w-full" onClick={onToggleMode}>
            {isRegister ? "Already registered? Sign in" : "Need an account? Register"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
