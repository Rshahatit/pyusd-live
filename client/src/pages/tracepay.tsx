import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TransactionSearch from "@/components/tracepay/transaction-search";
import TransactionOverview from "@/components/tracepay/transaction-overview";
import TransactionTrace from "@/components/tracepay/transaction-trace";
import TokenMovements from "@/components/tracepay/token-movements";
import { TransactionResult } from "@/lib/web3/types";

export default function TracePay() {
  const [txHash, setTxHash] = useState<string>("");

  const { data: transactionData, isLoading: isLoadingTransaction } = useQuery({
    queryKey: [`/api/trace/${txHash}`],
    enabled: !!txHash,
  });

  const handleSearch = (hash: string) => {
    setTxHash(hash);
  };

  return (
    <section id="tracepay">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Transaction Forensics</h2>
        <p className="text-gray-600">Analyze any PYUSD transaction to see what's happening under the hood</p>
      </div>

      <TransactionSearch onSearch={handleSearch} />

      {txHash && (isLoadingTransaction ? (
        <div className="py-10 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Analyzing transaction...</p>
        </div>
      ) : transactionData ? (
        <>
          <TransactionOverview transaction={transactionData as TransactionResult} />
          <TransactionTrace transaction={transactionData as TransactionResult} />
          <TokenMovements transaction={transactionData as TransactionResult} />
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 my-6 text-center">
          <p className="text-gray-600">No transaction data found. Please check the hash and try again.</p>
        </div>
      ))}
    </section>
  );
}
