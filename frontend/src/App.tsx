import { AuthScreen } from "./components/auth/AuthScreen";
import { ChatWorkspace } from "./components/chat/ChatWorkspace";
import { useChatApp } from "./hooks/useChatApp";
import "./styles.css";

export function App() {
  const state = useChatApp();

  if (!state.user) {
    return (
      <AuthScreen
        mode={state.authMode}
        username={state.username}
        email={state.email}
        password={state.password}
        error={state.error}
        isBooting={state.isBooting}
        isSubmitting={state.isAuthSubmitting}
        onUsernameChange={state.setUsername}
        onEmailChange={state.setEmail}
        onPasswordChange={state.setPassword}
        onSubmit={state.handleAuthSubmit}
        onToggleMode={state.toggleAuthMode}
      />
    );
  }

  return <ChatWorkspace state={state} />;
}
