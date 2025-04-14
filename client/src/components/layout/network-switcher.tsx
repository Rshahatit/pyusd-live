import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckIcon, ChevronDownIcon, Network } from "lucide-react";
import { useNetwork } from '@/lib/web3/NetworkContext';
import { NetworkType } from '@/lib/web3/constants';

export default function NetworkSwitcher() {
  const { network, switchNetwork, networkName } = useNetwork();
  const [open, setOpen] = useState(false);

  const handleNetworkChange = (newNetwork: NetworkType) => {
    switchNetwork(newNetwork);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span>{networkName}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="flex items-center justify-between"
          onClick={() => handleNetworkChange('mainnet')}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Ethereum</span>
          </div>
          {network === 'mainnet' && <CheckIcon className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center justify-between"
          onClick={() => handleNetworkChange('sepolia')}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Sepolia</span>
          </div>
          {network === 'sepolia' && <CheckIcon className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}