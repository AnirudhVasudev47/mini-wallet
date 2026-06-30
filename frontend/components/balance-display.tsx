"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { depositFunds, type BalanceResponse } from "@/lib/api";
import { toast } from "sonner";
import { ArrowDownToLine, TrendingUp } from "lucide-react";

interface BalanceDisplayProps {
  balance: BalanceResponse | null;
  loading: boolean;
  userId: string | null;
  onDeposit: () => Promise<void>;
}

export function BalanceDisplay({
  balance,
  loading,
  userId,
  onDeposit,
}: BalanceDisplayProps) {
  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!userId || isNaN(parsed) || parsed <= 0) return;

    try {
      setDepositing(true);
      await depositFunds(userId, parsed);
      toast.success(`Deposited ₹${parsed.toFixed(2)} into ${userId}`);
      setAmount("");
      setDepositOpen(false);
      await onDeposit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setDepositing(false);
    }
  }

  if (!userId) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Balance
        </CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold tracking-tight">
              ₹{balance?.balance.toFixed(2) ?? "0.00"}
            </p>
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" id="deposit-btn">
                  <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                  Deposit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deposit to {userId}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount (₹)</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100.00"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={depositing || !amount || parseFloat(amount) <= 0}
                    id="submit-deposit"
                  >
                    {depositing ? "Processing..." : "Deposit"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
