"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut, LayoutDashboard, History } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/transactions", label: "Transactions", icon: History },
  ];

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-svh bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-lg font-bold">₹</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  Mini Wallet
                </h1>
                <p className="text-xs text-muted-foreground">
                  Ledger-based transaction system
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Nav */}
              <nav className="hidden items-center gap-1 sm:flex">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2",
                        pathname === item.href
                          ? "font-medium bg-secondary border border-border shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>

              {/* User + Logout */}
              <div className="flex items-center gap-3 border-l pl-4">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.user_id}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        id="logout-btn"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sign out</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="flex border-t px-4 sm:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm",
                  pathname === item.href
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </>
  );
}
