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
import { UserPlus, Check, X, Eye, EyeOff } from "lucide-react";

// Password requirement checks
function getPasswordChecks(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Field-level dirty + touched state for inline errors
  const [dirty, setDirty] = useState({
    email: false, password: false, userId: false, name: false,
  });
  const [touched, setTouched] = useState({
    email: false, password: false, userId: false, name: false,
  });

  const passwordChecks = getPasswordChecks(password);
  const allPasswordChecksMet = passwordChecks.every((c) => c.met);

  // Field-level validation errors — only show after dirty + blurred
  const emailError = touched.email && dirty.email && !email.trim()
    ? "Email is required"
    : touched.email && dirty.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? "Invalid email format"
    : null;

  const userIdError = touched.userId && dirty.userId && !userId.trim()
    ? "User ID is required"
    : touched.userId && dirty.userId && userId.trim().length < 2
    ? "User ID must be at least 2 characters"
    : touched.userId && dirty.userId && !/^[a-zA-Z0-9_-]+$/.test(userId.trim())
    ? "Only letters, numbers, hyphens, and underscores"
    : null;

  const nameError = touched.name && dirty.name && !name.trim()
    ? "Name is required"
    : touched.name && dirty.name && name.trim().length < 2
    ? "Name must be at least 2 characters"
    : null;

  const canSubmit =
    email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    allPasswordChecksMet &&
    userId.trim().length >= 2 &&
    /^[a-zA-Z0-9_-]+$/.test(userId.trim()) &&
    name.trim().length >= 2;

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    // Mark all fields as dirty + touched on submit
    setDirty({ email: true, password: true, userId: true, name: true });
    setTouched({ email: true, password: true, userId: true, name: true });
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      await register(email.trim(), password, userId.trim(), name.trim());
      toast.success("Account created! Welcome to Mini Wallet.");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setFormError(message);
      toast.error(message);
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
      <div className="flex min-h-svh items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="text-xl font-bold">₹</span>
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Set up your Mini Wallet in seconds
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
                  onChange={(e) => { setEmail(e.target.value); setDirty((d) => ({ ...d, email: true })); }}
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
                    onChange={(e) => { setPassword(e.target.value); setDirty((d) => ({ ...d, password: true })); }}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
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
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-center gap-2 text-xs"
                      >
                        {check.met ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-red-500" />
                        )}
                        <span
                          className={
                            check.met ? "text-green-600" : "text-muted-foreground"
                          }
                        >
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setDirty((d) => ({ ...d, userId: true })); }}
                  onBlur={() => setTouched((t) => ({ ...t, userId: true }))}
                  placeholder="e.g. alice"
                  autoComplete="username"
                  required
                  className={userIdError ? "border-red-500" : ""}
                />
                {userIdError ? (
                  <p className="text-xs text-red-500">{userIdError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, hyphens, underscores. Min 2 characters.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setDirty((d) => ({ ...d, name: true })); }}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="e.g. Alice Johnson"
                  autoComplete="name"
                  required
                  className={nameError ? "border-red-500" : ""}
                />
                {nameError && (
                  <p className="text-xs text-red-500">{nameError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !canSubmit}
                id="register-btn"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
