import { TransactionResult, TokenTransfer } from "@/lib/web3/types";
import { shortenAddress } from "@/lib/web3/ethers";
import { formatUnits } from "ethers";

interface TokenMovementsProps {
  transaction: TransactionResult;
}

export default function TokenMovements({ transaction }: TokenMovementsProps) {
  if (!transaction || !transaction.tokenTransfers || transaction.tokenTransfers.length === 0) {
    return null;
  }
  
  const { tokenTransfers } = transaction;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Token Movements</h3>
      
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tokenTransfers.map((transfer, index) => (
              <TokenRow key={index} transfer={transfer} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TokenRowProps {
  transfer: TokenTransfer;
}

function TokenRow({ transfer }: TokenRowProps) {
  const { tokenSymbol, tokenName, tokenDecimals, from, to, value } = transfer;
  
  const formattedValue = formatUnits(value, tokenDecimals);
  const abbreviation = getTokenAbbreviation(tokenSymbol);
  const bgColor = getTokenColor(tokenSymbol);
  
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center mr-3`}>
            <span className="text-xs font-medium text-blue-800">{abbreviation}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{tokenSymbol}</div>
            <div className="text-xs text-gray-500">{tokenName}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 font-mono">{shortenAddress(from)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 font-mono">{shortenAddress(to)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{parseFloat(formattedValue).toFixed(2)} {tokenSymbol}</div>
      </td>
    </tr>
  );
}

function getTokenAbbreviation(symbol: string): string {
  if (!symbol) return "??";
  
  if (symbol === "PYUSD") {
    return "PY";
  }
  
  if (symbol.length <= 2) {
    return symbol;
  }
  
  return symbol.substring(0, 2);
}

function getTokenColor(symbol: string): string {
  switch(symbol) {
    case "PYUSD":
      return "bg-blue-100";
    case "USDC":
      return "bg-blue-200";
    case "USDT":
      return "bg-green-100";
    case "DAI":
      return "bg-yellow-100";
    case "WETH":
      return "bg-purple-100";
    default:
      return "bg-gray-100";
  }
}
