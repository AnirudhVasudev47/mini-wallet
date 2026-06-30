"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Track whether the user has interacted with each field
  const [dirty, setDirty] = useState({ email: false, password: false });
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError = touched.email && dirty.email && !email.trim()
    ? "Email is required"
    : touched.email && dirty.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? "Invalid email format"
    : null;

  const passwordError = touched.password && dirty.password && !password
    ? "Password is required"
    : null;

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setDirty({ email: true, password: true });
    setTouched({ email: true, password: true });
    if (!email.trim() || !password) return;

    try {
      setSubmitting(true);
      await login(email.trim(), password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="text-xl font-bold">₹</span>
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your Mini Wallet account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setDirty((d) => ({ ...d, email: true })); setFormError(null); }}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className={emailError ? "border-red-500" : ""}
                />
                {emailError && (
                  <p className="text-xs text-red-500">{emailError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setDirty((d) => ({ ...d, password: true })); setFormError(null); }}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`pr-10 ${passwordError ? "border-red-500" : ""}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-500">{passwordError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !email.trim() || !password}
                id="login-btn"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
