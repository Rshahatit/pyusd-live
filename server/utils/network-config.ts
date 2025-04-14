// Network configurations
export type NetworkType = 'sepolia' | 'mainnet';

export interface NetworkConfig {
  name: string;
  // Primary GCP RPC URL for trace methods and block queries
  rpcUrl: string;
  // Secondary public RPC URL for contract calls that GCP might not support
  publicRpcUrl: string;
  chainId: number;
  contracts: {
    PYUSD: string;
    PYUSD_RELAYER: string;
  };
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia',
    // Primary GCP endpoint with trace method support
    rpcUrl: "https://blockchain.googleapis.com/v1/projects/voter-ride-app/locations/us-central1/endpoints/ethereum-sepolia/rpc?key=AIzaSyCNhGoPR97lbrw2sLDszP5jReJ12VdB24I",
    // Publicnode endpoint for Sepolia
    publicRpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: 11155111,
    contracts: {
      PYUSD: "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05", // USDC contract on Sepolia
      PYUSD_RELAYER: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // Example address
    }
  },
  mainnet: {
    name: 'Ethereum',
    // Primary GCP endpoint with trace method support
    rpcUrl: "https://blockchain.googleapis.com/v1/projects/voter-ride-app/locations/us-central1/endpoints/ethereum-mainnet/rpc?key=AIzaSyCNhGoPR97lbrw2sLDszP5jReJ12VdB24I",
    // Publicnode endpoint for Mainnet
    publicRpcUrl: "https://ethereum-rpc.publicnode.com",
    chainId: 1,
    contracts: {
      PYUSD: "0x6c3ea9036406852006290770bedfcaba0e23a0e8", // Mainnet PYUSD address (PayPal USD)
      PYUSD_RELAYER: "0x0000000000000000000000000000000000000000", // Placeholder
    }
  }
};

// Default network
export const DEFAULT_NETWORK: NetworkType = 'mainnet';

// Get network config
export function getNetworkConfig(network: NetworkType = DEFAULT_NETWORK): NetworkConfig {
  return NETWORKS[network] || NETWORKS[DEFAULT_NETWORK];
}