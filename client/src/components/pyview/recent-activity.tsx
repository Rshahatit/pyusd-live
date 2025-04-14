import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/web3/ethers";
import { RefreshCw } from "lucide-react";

interface Transaction {
  hash: string;
  type: 'transfer' | 'mint' | 'burn';
  amount: string;
  timestamp: number;
}

interface RecentActivityProps {
  transactions: Transaction[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function RecentActivity({ 
  transactions, 
  onRefresh, 
  isRefreshing = false 
}: RecentActivityProps) {
  const getTimeAgo = (timestamp: number): string => {
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
  
  const getTransactionTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'transfer':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Transfer</span>;
      case 'mint':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Mint</span>;
      case 'burn':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Burn</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{type}</span>;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
        
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Refresh Data'}
          </Button>
        )}
      </div>
      
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tx Hash</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length > 0 ? (
              transactions.map((tx, index) => (
                <tr key={`tx-${index}-${tx.hash.substring(0, 10)}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                    <a 
                      href={`https://${import.meta.env.VITE_NETWORK_TYPE === 'sepolia' ? 'sepolia.' : ''}etherscan.io/tx/${tx.hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {shortenAddress(tx.hash)}
                    </a>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getTransactionTypeBadge(tx.type)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{tx.amount}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getTimeAgo(tx.timestamp)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                  No recent transactions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
