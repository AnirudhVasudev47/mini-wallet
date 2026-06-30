"use client";

import { BalanceDisplay } from "@/components/balance-display";
import { TransferForm } from "@/components/transfer-form";
import { TransactionList } from "@/components/transaction-list";
import { useWallet } from "@/hooks/use-wallet";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const wallet = useWallet();

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Left Column — Balance + Transfer */}
      <div className="space-y-6 lg:col-span-2">
        <BalanceDisplay
          balance={wallet.balance}
          loading={wallet.balanceLoading}
          userId={wallet.userId}
          onDeposit={wallet.refreshAll}
        />

        <Separator />

        <TransferForm
          accounts={wallet.accounts}
          selectedUserId={wallet.userId}
          onTransferComplete={wallet.refreshAll}
        />
      </div>

      {/* Right Column — Recent Transactions */}
      <div className="lg:col-span-3">
        <TransactionList
          transactions={wallet.transactions.slice(0, 10)}
          loading={wallet.transactionsLoading}
          userId={wallet.userId}
        />
      </div>
    </div>
  );
}
