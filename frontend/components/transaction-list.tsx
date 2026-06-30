"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Transaction } from "@/lib/api";
import { History, Copy, Check } from "lucide-react";
import { useState } from "react";

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  userId: string | null;
  showTxIdColumn?: boolean;
}

export function TransactionList({
  transactions,
  loading,
  userId,
  showTxIdColumn = false,
}: TransactionListProps) {
  if (!userId) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <History className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    {showTxIdColumn && <TableHead>Transaction ID</TableHead>}
                    <TableHead>From / To</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, idx) => (
                    <TableRow key={`${tx.transaction_id}-${idx}`}>
                      <TableCell>
                        <Badge
                          variant={tx.type === "credit" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {tx.type === "credit" ? "CR" : "DR"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono font-medium ${
                            tx.type === "credit"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                        </span>
                        {!showTxIdColumn && (
                          <div className="mt-0.5">
                            <CopyableId id={tx.transaction_id} />
                          </div>
                        )}
                      </TableCell>
                      {showTxIdColumn && (
                        <TableCell>
                          <CopyableId id={tx.transaction_id} />
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {tx.counterparty_id === "SYSTEM" ? (
                          <span className="text-muted-foreground">Deposit</span>
                        ) : (
                          <>
                            <span className="text-muted-foreground">
                              {tx.type === "debit" ? "To " : "From "}
                            </span>
                            <span className="font-medium">{tx.counterparty_id}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {tx.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(tx.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const short = id.slice(0, 8);

  async function handleCopy() {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {short}…
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3 opacity-50" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono text-xs">{id}</p>
        <p className="text-xs text-muted-foreground">Click to copy</p>
      </TooltipContent>
    </Tooltip>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
