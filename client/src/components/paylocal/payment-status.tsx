import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Fuel } from "lucide-react";
import { shortenAddress } from "@/lib/web3/ethers";

interface AccountInfo {
  address: string;
  balance: string;
  gasSavings: {
    eth: string;
    usd: string;
  };
}

interface Transaction {
  id: string;
  type: string;
  recipient?: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

interface PaymentStatusProps {
  account?: AccountInfo;
  transactions: Transaction[];
  onFaucetRequest: () => void;
  isRequestingFaucet: boolean;
  lastPayment: any;
  paymentStatus: 'idle' | 'pending' | 'success' | 'error';
}

export default function PaymentStatus({ 
  account, 
  transactions, 
  onFaucetRequest, 
  isRequestingFaucet,
  lastPayment,
  paymentStatus
}: PaymentStatusProps) {
  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Faucet & Payment Status</h3>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-md">
        {account ? (
          <>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Your Balance:</span>
              <span className="text-sm font-medium">{account.balance} PYUSD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Address:</span>
              <span className="text-sm font-mono">{shortenAddress(account.address)}</span>
            </div>
            <div className="mt-3">
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                onClick={onFaucetRequest}
                disabled={isRequestingFaucet}
              >
                {isRequestingFaucet ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  "Request 100 PYUSD from Faucet"
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-8 bg-slate-200 rounded mt-3"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Recently sent payment (if applicable) */}
      {paymentStatus === 'pending' && lastPayment && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Payment to {shortenAddress(lastPayment.recipient)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{lastPayment.amount} PYUSD</span>
            <Badge variant="info" className="flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
            </Badge>
          </div>
        </div>
      )}
      
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Recent Transactions</h4>
        <div className="border border-gray-200 rounded-md overflow-hidden">
          {transactions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <div className="px-4 py-3" key={tx.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">
                      {tx.type === 'payment' 
                        ? `Payment to ${shortenAddress(tx.recipient || '')}`
                        : 'Faucet Request'
                      }
                    </span>
                    <span className="text-sm text-gray-500">{getTimeAgo(tx.timestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{tx.amount} PYUSD</span>
                    <Badge variant={
                      tx.status === 'completed' ? 'success' :
                      tx.status === 'pending' ? 'info' : 'error'
                    }>
                      {tx.status === 'pending' ? (
                        <div className="flex items-center">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
                        </div>
                      ) : (
                        tx.status.charAt(0).toUpperCase() + tx.status.slice(1)
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No transactions yet
            </div>
          )}
        </div>
      </div>
      
      {/* Gas Savings Info */}
      {account && account.gasSavings && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
          <div className="flex items-start">
            <div className="text-blue-500 mr-3 mt-1">
              <Fuel className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">Gas Savings</p>
              <p className="text-sm text-blue-600">
                You've saved approximately {account.gasSavings.eth} ETH (${account.gasSavings.usd}) in gas fees by using our relayer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
