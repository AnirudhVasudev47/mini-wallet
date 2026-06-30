"use client";

import { TransactionList } from "@/components/transaction-list";
import { useWallet } from "@/hooks/use-wallet";

export default function TransactionsPage() {
  const wallet = useWallet();

  return (
    <div>
      <TransactionList
        transactions={wallet.transactions}
        loading={wallet.transactionsLoading}
        userId={wallet.userId}
        showTxIdColumn
      />
    </div>
  );
}
