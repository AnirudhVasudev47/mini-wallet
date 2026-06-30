"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
