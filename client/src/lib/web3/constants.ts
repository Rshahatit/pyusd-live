// Web3 Constants
export type NetworkType = 'sepolia' | 'mainnet';

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  chainId: number;
  contracts: {
    PYUSD: string;
    PYUSD_RELAYER: string;
  };
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia',
    rpcUrl: '/api/rpc', // Use our proxy instead of direct access
    explorerUrl: 'https://sepolia.etherscan.io',
    chainId: 11155111,
    contracts: {
      PYUSD: "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05", // USDC contract on Sepolia
      PYUSD_RELAYER: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // Example address
    }
  },
  mainnet: {
    name: 'Ethereum',
    rpcUrl: '/api/rpc', // Use our proxy instead of direct access
    explorerUrl: 'https://etherscan.io',
    chainId: 1,
    contracts: {
      PYUSD: "0x6c3ea9036406852006290770bedfcaba0e23a0e8", // Mainnet PYUSD address (PayPal USD)
      PYUSD_RELAYER: "0x0000000000000000000000000000000000000000", // Placeholder
    }
  }
};

// Default network
export const DEFAULT_NETWORK: NetworkType = 'mainnet';