import { ethers } from "ethers";
import { NETWORKS, DEFAULT_NETWORK } from "./constants";

// Utility functions
export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Default RPC URL for initial provider
const defaultRpcUrl = NETWORKS[DEFAULT_NETWORK].rpcUrl;

// Initialize provider with default URL
export const getProvider = (rpcUrl = defaultRpcUrl) => {
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get a basic provider with default network
export const provider = getProvider();

// ERC20 ABI for token interaction
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "event Approval(address indexed owner, address indexed spender, uint amount)"
];

// Get PYUSD contract for the given network
export const getPyusdContract = (networkProvider: ethers.JsonRpcProvider, pyusdAddress: string) => {
  return new ethers.Contract(pyusdAddress, ERC20_ABI, networkProvider);
};

// Gas price functions
export async function getGasPrice(networkProvider = provider): Promise<bigint> {
  return networkProvider.getFeeData().then(data => data.gasPrice || BigInt(0));
}

export async function estimateGasForTransfer(to: string, amount: string): Promise<bigint> {
  // Basic estimation, should be implemented properly in production
  return BigInt(50000);
}
