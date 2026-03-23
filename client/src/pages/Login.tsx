/**
 * Login / Register page — the auth gate for the entire application.
 *
 * Uses shadcn/ui Tabs to switch between Login and Register forms.
 * Both forms use react-hook-form + Zod for client-side validation
 * (same schemas the server uses for server-side validation).
 *
 * In C++ terms, react-hook-form is like an observer pattern:
 * the form "observes" input changes and validates against the Zod
 * schema without you having to write onChange handlers for each field.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, registerSchema } from "@shared/schema";
import type { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Loader2 } from "lucide-react";

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

function LoginForm() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      await login(data);
      setLocation("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      // Extract the JSON error message from "401: {json}" format
      try {
        const parsed = JSON.parse(message.replace(/^\d+:\s*/, ""));
        setError(parsed.message || message);
      } catch {
        setError(message);
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="login-username">Username</Label>
        <Input
          id="login-username"
          placeholder="Enter your username"
          {...form.register("username")}
        />
        {form.formState.errors.username && (
          <p className="text-xs text-destructive">
            {form.formState.errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}
        Sign In
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { register: registerUser } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", displayName: "", password: "" },
  });

  async function onSubmit(data: RegisterFormData) {
    setError(null);
    try {
      await registerUser(data);
      setLocation("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      try {
        const parsed = JSON.parse(message.replace(/^\d+:\s*/, ""));
        setError(parsed.message || message);
      } catch {
        setError(message);
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reg-username">Username</Label>
        <Input
          id="reg-username"
          placeholder="Choose a username"
          {...form.register("username")}
        />
        {form.formState.errors.username && (
          <p className="text-xs text-destructive">
            {form.formState.errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="you@company.com"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-displayName">Display Name</Label>
        <Input
          id="reg-displayName"
          placeholder="Your full name"
          {...form.register("displayName")}
        />
        {form.formState.errors.displayName && (
          <p className="text-xs text-destructive">
            {form.formState.errors.displayName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="At least 8 characters"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}
        Create Account
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-6 h-6 text-primary" />
            <CardTitle className="text-xl">Energy Intelligence</CardTitle>
          </div>
          <CardDescription>
            AI-powered predictive operations for renewable energy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
