import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { DEFAULT_NETWORK, NETWORKS, NetworkType } from './constants';
import axios from 'axios';

interface NetworkContextType {
  network: NetworkType;
  switchNetwork: (network: NetworkType) => Promise<void>;
  networkName: string;
  rpcUrl: string;
  explorerUrl: string;
  chainId: number;
  pyusdAddress: string;
  relayerAddress: string;
  isNetworkSwitching: boolean;
}

interface NetworkResponse {
  current: NetworkType;
  available: string[];
  details: {
    name: string;
    rpcUrl: string;
    chainId: number;
    contracts: {
      PYUSD: string;
      PYUSD_RELAYER: string;
    }
  }
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
  // Get network from local storage or use default
  const storedNetwork = typeof window !== 'undefined' 
    ? localStorage.getItem('network') as NetworkType 
    : null;
  
  const [network, setNetwork] = useState<NetworkType>(
    storedNetwork && (storedNetwork === 'sepolia' || storedNetwork === 'mainnet') 
      ? storedNetwork 
      : DEFAULT_NETWORK
  );
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  // Fetch initial network from server
  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const response = await axios.get('/api/network');
        const data = response.data as NetworkResponse;
        
        if (data.current) {
          setNetwork(data.current);
          localStorage.setItem('network', data.current);
        }
      } catch (error) {
        console.error('Failed to fetch network:', error);
      }
    };
    
    fetchNetwork();
  }, []);

  // Effect to synchronize networks
  useEffect(() => {
    localStorage.setItem('network', network);
  }, [network]);

  // Get current network configuration
  const currentNetwork = NETWORKS[network];

  // Function to switch networks via the API
  const switchNetwork = async (newNetwork: NetworkType) => {
    if (newNetwork === network) return; // No change needed
    
    setIsNetworkSwitching(true);
    try {
      const response = await axios.post('/api/network/switch', { network: newNetwork });
      const data = response.data;
      
      if (data.success) {
        setNetwork(data.current);
        
        // Refresh the page to ensure all components use the new network
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        network,
        switchNetwork,
        networkName: currentNetwork.name,
        rpcUrl: currentNetwork.rpcUrl,
        explorerUrl: currentNetwork.explorerUrl,
        chainId: currentNetwork.chainId,
        pyusdAddress: currentNetwork.contracts.PYUSD,
        relayerAddress: currentNetwork.contracts.PYUSD_RELAYER,
        isNetworkSwitching,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};