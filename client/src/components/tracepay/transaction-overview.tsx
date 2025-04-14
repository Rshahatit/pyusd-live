import { Badge } from "@/components/ui/badge";
import { TransactionResult } from "@/lib/web3/types";
import { formatEther, formatUnits } from "ethers";

interface TransactionOverviewProps {
  transaction: TransactionResult;
}

export default function TransactionOverview({ transaction }: TransactionOverviewProps) {
  if (!transaction) return null;

  const {
    hash,
    blockNumber,
    timestamp,
    from,
    to,
    value,
    gasUsed,
    gasPrice,
    status,
    isPYUSDTransfer,
    blockTimestamp,
    ethPrice,
    tokenTransfers,
  } = transaction;

  // Calculate time ago
  const timeAgo = blockTimestamp 
    ? getTimeAgo(new Date(blockTimestamp * 1000))
    : "Unknown time";

  // Calculate fee in ETH and USD
  const feeInEth = parseFloat(formatEther(BigInt(gasUsed || 0) * BigInt(gasPrice || 0)));
  const feeInUSD = ethPrice ? (feeInEth * ethPrice).toFixed(2) : "?";

  // Format the PYUSD value if available
  let pyusdValue = "";
  if (isPYUSDTransfer && tokenTransfers && tokenTransfers.length > 0) {
    const pyusdTransfer = tokenTransfers.find(t => t.tokenSymbol === "PYUSD");
    if (pyusdTransfer) {
      pyusdValue = `${formatUnits(pyusdTransfer.value, pyusdTransfer.tokenDecimals)} PYUSD`;
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Transaction Overview</h3>
          <p className="text-sm text-gray-500">
            {timeAgo} (Block #{blockNumber})
          </p>
        </div>
        <div className="flex space-x-2">
          <Badge variant={status === 1 ? "success" : "error"}>
            {status === 1 ? "Success" : "Failed"}
          </Badge>
          {isPYUSDTransfer && (
            <Badge variant="info">PYUSD Transfer</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">From:</span>
              <span className="text-sm font-medium font-mono">
                {shortenAddress(from)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">To:</span>
              <span className="text-sm font-medium font-mono">
                {shortenAddress(to)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Value:</span>
              <div>
                {pyusdValue ? (
                  <>
                    <span className="text-sm font-medium">{pyusdValue}</span>
                    <span className="text-xs text-gray-500 ml-1">(${parseFloat(pyusdValue).toFixed(2)})</span>
                  </>
                ) : (
                  <span className="text-sm font-medium">
                    {formatEther(value || "0")} ETH
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Gas Used:</span>
              <span className="text-sm font-medium">
                {parseInt(gasUsed || "0").toLocaleString()} ({calculateGasPercentage(gasUsed || "0")})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Gas Price:</span>
              <span className="text-sm font-medium">
                {(parseFloat(formatUnits(gasPrice || "0", "gwei"))).toFixed(1)} Gwei
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Fee:</span>
              <span className="text-sm font-medium">
                {feeInEth.toFixed(6)} ETH (${feeInUSD})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function shortenAddress(address?: string): string {
  if (!address) return "Unknown";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function calculateGasPercentage(gasUsed: string): string {
  // Assuming block gas limit is 30M for Ethereum
  const blockGasLimit = 30000000;
  const percentage = (parseInt(gasUsed) / blockGasLimit) * 100;
  return `${percentage.toFixed(1)}%`;
}
