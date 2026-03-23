/**
 * Auth context and hook — provides current user state to the entire app.
 *
 * React Context is like a global singleton — any component in the tree can
 * access the auth state via useAuth() without passing it through props.
 * In C++ terms, it's similar to a Service Locator pattern where components
 * call AuthContext::getInstance() to get the current user.
 *
 * The context wraps React Query for data fetching:
 *   - GET /api/auth/me fetches the current user on mount
 *   - login/register/logout are mutations that update the cached user
 *   - on401: "returnNull" means a 401 returns null (not logged in), not an error
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (data: { username: string; password: string }) => Promise<User>;
  register: (data: {
    username: string;
    email: string;
    displayName: string;
    password: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch current user — returns null if 401 (not logged in)
  const {
    data: user,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return (await res.json()) as User;
    },
    onSuccess: (loggedInUser: User) => {
      queryClient.setQueryData(["/api/auth/me"], loggedInUser);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      email: string;
      displayName: string;
      password: string;
    }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return (await res.json()) as User;
    },
    onSuccess: (registeredUser: User) => {
      queryClient.setQueryData(["/api/auth/me"], registeredUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear(); // Clear all cached data on logout
    },
  });

  function hasRole(...roles: string[]): boolean {
    return user != null && roles.includes(user.role);
  }

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
