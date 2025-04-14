import { ethers } from 'ethers';
import { NetworkType, getNetworkConfig } from './network-config';

// Enhanced ABI for common ERC20 functions and events
const ERC20_ABI = [
  // Read functions
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Keep providers cached for efficiency
// Two sets of providers: GCP for trace methods and public RPCs for contract calls
const gcpProviders: Record<NetworkType, ethers.Provider> = {} as any;
const publicProviders: Record<NetworkType, ethers.Provider> = {} as any;

// Get or create GCP provider (for trace methods, logs, etc.)
export function getGcpProvider(network: NetworkType): ethers.Provider {
  if (!gcpProviders[network]) {
    const config = getNetworkConfig(network);
    gcpProviders[network] = new ethers.JsonRpcProvider(config.rpcUrl);
    console.log(`[Ethers] Created new GCP provider for ${network}`);
  }
  return gcpProviders[network];
}

// Get or create public provider (for contract interactions)
export function getPublicProvider(network: NetworkType): ethers.Provider {
  if (!publicProviders[network]) {
    const config = getNetworkConfig(network);
    publicProviders[network] = new ethers.JsonRpcProvider(config.publicRpcUrl);
    console.log(`[Ethers] Created new public provider for ${network}`);
  }
  return publicProviders[network];
}

// Get the appropriate provider based on the context
// Default to public provider because it's more reliable for most operations
export function getProvider(network: NetworkType, preferGcp = false): ethers.Provider {
  return preferGcp ? getGcpProvider(network) : getPublicProvider(network);
}

// Get an ethers contract instance for the specified token address
export function getERC20Contract(tokenAddress: string, network: NetworkType): ethers.Contract {
  const provider = getProvider(network);
  return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
}

// Get the total supply of a token with proper decimals handling
export async function getTokenTotalSupply(tokenAddress: string, network: NetworkType): Promise<{
  raw: bigint,
  formatted: string,
  decimals: number
}> {
  try {
    const contract = getERC20Contract(tokenAddress, network);
    
    const [totalSupply, decimals, symbol] = await Promise.all([
      contract.totalSupply(),
      contract.decimals(),
      contract.symbol()
    ]);
    
    const formatted = ethers.formatUnits(totalSupply, decimals);
    
    return {
      raw: totalSupply,
      formatted: `${Number(formatted).toLocaleString()} ${symbol}`,
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error(`[Ethers] Error getting total supply for ${tokenAddress}:`, error);
    throw error;
  }
}

// Get the balance of a token for a specific address
export async function getTokenBalance(tokenAddress: string, address: string, network: NetworkType): Promise<{
  raw: bigint,
  formatted: string,
  decimals: number
}> {
  try {
    const contract = getERC20Contract(tokenAddress, network);
    
    const [balance, decimals, symbol] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
      contract.symbol()
    ]);
    
    const formatted = ethers.formatUnits(balance, decimals);
    
    return {
      raw: balance,
      formatted: `${Number(formatted).toLocaleString()} ${symbol}`,
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error(`[Ethers] Error getting balance for ${address} of token ${tokenAddress}:`, error);
    throw error;
  }
}

// Get basic token information (name, symbol, decimals)
export async function getTokenInfo(tokenAddress: string, network: NetworkType): Promise<{
  name: string,
  symbol: string,
  decimals: number
}> {
  try {
    const contract = getERC20Contract(tokenAddress, network);
    
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals()
    ]);
    
    return {
      name,
      symbol,
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error(`[Ethers] Error getting token info for ${tokenAddress}:`, error);
    throw error;
  }
}

// Get multiple token balances efficiently
export async function getMultipleTokenBalances(
  tokenAddress: string, 
  addresses: string[], 
  network: NetworkType
): Promise<Map<string, bigint>> {
  try {
    const contract = getERC20Contract(tokenAddress, network);
    const balanceMap = new Map<string, bigint>();
    
    // Process in batches to avoid rate limiting
    const batchSize = 20;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      console.log(`[Ethers] Getting balances for addresses ${i} to ${i + batch.length - 1}`);
      
      const balances = await Promise.all(
        batch.map(address => contract.balanceOf(address))
      );
      
      batch.forEach((address, index) => {
        balanceMap.set(address, balances[index]);
      });
    }
    
    return balanceMap;
  } catch (error) {
    console.error(`[Ethers] Error getting multiple balances for token ${tokenAddress}:`, error);
    throw error;
  }
}

// Format a BigInt value with proper token decimals
export function formatTokenAmount(
  amount: bigint, 
  decimals: number, 
  symbol?: string,
  options: { maximumFractionDigits?: number } = {}
): string {
  const formatted = ethers.formatUnits(amount, decimals);
  const value = Number(formatted).toLocaleString(undefined, {
    maximumFractionDigits: options.maximumFractionDigits ?? 2
  });
  
  return symbol ? `${value} ${symbol}` : value;
}