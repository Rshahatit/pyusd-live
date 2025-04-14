import { useState } from "react";
import { shortenAddress } from "@/lib/web3/ethers";
import { Copy, ExternalLink, Check } from "lucide-react";

interface Holder {
  rank: number;
  address: string;
  balance: string;
  percentage: string;
}

interface TopHoldersProps {
  holders: Holder[];
}

export default function TopHolders({ holders }: TopHoldersProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  // Limit to top 5 holders
  const topFiveHolders = holders.slice(0, 5);
  
  const getEtherscanLink = (address: string) => {
    const networkPrefix = import.meta.env.VITE_NETWORK_TYPE === 'sepolia' ? 'sepolia.' : '';
    return `https://${networkPrefix}etherscan.io/token/0x6c3ea9036406852006290770bedfcaba0e23a0e8?a=${address}`;
  };
  
  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    
    // Reset after 2 seconds
    setTimeout(() => {
      setCopiedAddress(null);
    }, 2000);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {topFiveHolders.length > 0 ? (
              topFiveHolders.map((holder) => (
                <tr key={holder.address}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{holder.rank}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                    <div className="flex items-center">
                      <a 
                        href={`https://${import.meta.env.VITE_NETWORK_TYPE === 'sepolia' ? 'sepolia.' : ''}etherscan.io/address/${holder.address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 font-medium hover:underline"
                      >
                        {shortenAddress(holder.address)}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{holder.balance}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{holder.percentage}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(holder.address)}
                        className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50"
                        title="Copy address"
                      >
                        {copiedAddress === holder.address ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                      <a
                        href={getEtherscanLink(holder.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50"
                        title="View on Etherscan"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
