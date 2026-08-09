import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { getCurrentUser, login as loginRequest, signup as signupRequest, User } from '@/services/authApi';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/services/tokenStorage';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  /** True only while checking for a stored session on app startup --
   * this is what Splash watches to decide whether to route to
   * Onboarding/Login or straight into the app. Not used for individual
   * signup/login button loading states; screens track that themselves. */
  isInitializing: boolean;
  signUp: (fullName: string, phoneNumber: string, password: string) => Promise<void>;
  signIn: (phoneNumber: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Swaps in a freshly-issued token + user without a full sign-in --
   * for anything that reissues a token as a side effect (right now,
   * Change Password: the backend invalidates every existing token when
   * the password changes, including the one this device was just using,
   * so the new one has to replace it immediately or this device would
   * get logged out by its own action). */
  updateSession: (accessToken: string, user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Runs once when the app first mounts: is there a token saved from a
  // previous session? If so, ask the backend to confirm it's still
  // valid (rather than trusting it blindly) and fetch the current user
  // in the same call. An expired or tampered token gets discarded here
  // instead of the app pretending you're still logged in.
  useEffect(() => {
    (async () => {
      const storedToken = await getStoredToken();
      if (!storedToken) {
        setIsInitializing(false);
        return;
      }
      try {
        const currentUser = await getCurrentUser(storedToken);
        setToken(storedToken);
        setUser(currentUser);
      } catch {
        await clearStoredToken();
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  const updateSession = async (accessToken: string, updatedUser: User) => {
    await setStoredToken(accessToken);
    setToken(accessToken);
    setUser(updatedUser);
  };

  const signUp = async (fullName: string, phoneNumber: string, password: string) => {
    const response = await signupRequest(fullName, phoneNumber, password);
    await updateSession(response.access_token, response.user);
  };

  const signIn = async (phoneNumber: string, password: string) => {
    const response = await loginRequest(phoneNumber, password);
    await updateSession(response.access_token, response.user);
  };

  const signOut = async () => {
    await clearStoredToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isInitializing, signUp, signIn, signOut, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
