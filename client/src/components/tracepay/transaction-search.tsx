import { useState } from "react";
import { Search } from "lucide-react";

interface TransactionSearchProps {
  onSearch: (txHash: string) => void;
}

export default function TransactionSearch({ onSearch }: TransactionSearchProps) {
  const [txHash, setTxHash] = useState<string>("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation for Ethereum tx hash
    if (txHash && /^0x([A-Fa-f0-9]{64})$/.test(txHash)) {
      onSearch(txHash);
    } else {
      // Show error for invalid hash format
      alert("Please enter a valid Ethereum transaction hash (0x followed by 64 hexadecimal characters)");
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <form className="flex items-stretch" onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Enter transaction hash (0x...)" 
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none" 
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
        />
        <button 
          type="submit" 
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-r-md flex items-center"
        >
          <Search className="w-4 h-4 mr-2" />
          Analyze
        </button>
      </form>
    </div>
  );
}
