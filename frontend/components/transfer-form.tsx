"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transfer, type Account } from "@/lib/api";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";

interface TransferFormProps {
  accounts: Account[];
  selectedUserId: string | null;
  onTransferComplete: () => Promise<void>;
}

export function TransferForm({
  accounts,
  selectedUserId,
  onTransferComplete,
}: TransferFormProps) {
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const otherAccounts = accounts.filter(
    (a) => a.user_id !== selectedUserId,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !toUser || !amount) return;

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    // Generate client-side transaction ID for idempotency
    const transactionId = crypto.randomUUID();

    try {
      setSending(true);
      const result = await transfer(
        transactionId,
        toUser,
        parsed,
        notes.trim() || undefined,
      );

      if (result.status === "duplicate") {
        toast.info("This transfer was already processed (duplicate)");
      } else {
        toast.success(
          `Transferred ₹${parsed.toFixed(2)} to ${toUser}`,
        );
      }

      setToUser("");
      setAmount("");
      setNotes("");
      await onTransferComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSending(false);
    }
  }

  if (!selectedUserId) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ArrowRightLeft className="h-4 w-4" />
          Transfer Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Select value={toUser} onValueChange={setToUser}>
              <SelectTrigger id="transfer-to">
                <SelectValue placeholder="Select recipient..." />
              </SelectTrigger>
              <SelectContent>
                {otherAccounts.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    <span className="font-medium">{a.user_id}</span>
                    <span className="ml-2 text-muted-foreground">({a.name})</span>
                  </SelectItem>
                ))}
                {otherAccounts.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No other accounts available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-amount" className="text-xs text-muted-foreground">
              Amount (₹)
            </Label>
            <Input
              id="transfer-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-notes" className="text-xs text-muted-foreground">
              Notes <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Textarea
              id="transfer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's this for?"
              rows={2}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={sending || !toUser || !amount || parseFloat(amount) <= 0}
            id="submit-transfer"
          >
            {sending ? "Sending..." : "Send Transfer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
