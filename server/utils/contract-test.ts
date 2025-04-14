import { ethers } from 'ethers';
import { NetworkType, getNetworkConfig } from './network-config';
import { getGcpProvider, getPublicProvider } from './ethers-helpers';

// Function to test basic blockchain connectivity
export async function testBlockchainConnectivity(network: NetworkType = 'sepolia'): Promise<{
  success: boolean,
  blockNumber?: number,
  blockTimestamp?: string,
  error?: string
}> {
  try {
    // Get network config
    const networkConfig = getNetworkConfig(network);
    console.log(`[TEST] Testing basic connectivity to ${networkConfig.name} with RPC: ${networkConfig.rpcUrl}`);
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    // Test getting block number
    const blockNumber = await provider.getBlockNumber();
    console.log(`[TEST] Successfully connected! Current block number: ${blockNumber}`);
    
    // Get latest block to check timestamp
    const latestBlock = await provider.getBlock('latest');
    
    if (latestBlock && latestBlock.timestamp) {
      const blockDate = new Date(Number(latestBlock.timestamp) * 1000);
      console.log(`[TEST] Latest block timestamp: ${blockDate.toISOString()}`);
      
      return {
        success: true,
        blockNumber,
        blockTimestamp: blockDate.toISOString()
      };
    }
    
    return {
      success: true,
      blockNumber
    };
  } catch (error: any) {
    console.error('[TEST] Failed to connect to blockchain:', error);
    return {
      success: false,
      error: error.message || 'Unknown error connecting to blockchain'
    };
  }
}

// Simple function to test contract access
export async function testContractAccess(network: NetworkType = 'sepolia'): Promise<string> {
  try {
    // First check basic connectivity
    const connectivityResult = await testBlockchainConnectivity(network);
    if (!connectivityResult.success) {
      return `Failed to connect to blockchain: ${connectivityResult.error}`;
    }
    
    // Get network config
    const networkConfig = getNetworkConfig(network);
    console.log(`[TEST] Using network ${networkConfig.name}`);
    
    // Use network-specific contract address
    const contractAddress = networkConfig.contracts.PYUSD;
    console.log(`[TEST] PYUSD contract address: ${contractAddress}`);
    
    // Test with both providers to compare results
    console.log(`[TEST] Testing with GCP provider: ${networkConfig.rpcUrl}`);
    const gcpProvider = getGcpProvider(network);
    
    console.log(`[TEST] Testing with public provider: ${networkConfig.publicRpcUrl}`);
    const publicProvider = getPublicProvider(network);
    
    // Use public provider for contract access
    const provider = publicProvider;
    
    // Define a minimal ABI for token information
    const basicAbi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)"
    ];
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, basicAbi, provider);
    
    // Test basic calls one by one
    let name, symbol, decimals, totalSupply;
    
    try {
      name = await contract.name();
      console.log(`[TEST] Contract name: ${name}`);
    } catch (error) {
      console.error('[TEST] Failed to get name:', error);
    }
    
    try {
      symbol = await contract.symbol();
      console.log(`[TEST] Contract symbol: ${symbol}`);
    } catch (error) {
      console.error('[TEST] Failed to get symbol:', error);
    }
    
    try {
      decimals = await contract.decimals();
      console.log(`[TEST] Contract decimals: ${decimals}`);
    } catch (error) {
      console.error('[TEST] Failed to get decimals:', error);
    }
    
    try {
      totalSupply = await contract.totalSupply();
      console.log(`[TEST] Raw total supply: ${totalSupply.toString()}`);
      
      if (decimals) {
        const formatted = ethers.formatUnits(totalSupply, decimals);
        console.log(`[TEST] Formatted total supply: ${formatted} ${symbol}`);
        return `${formatted} ${symbol}`;
      } else {
        // Assume 6 decimals for PYUSD
        const formatted = ethers.formatUnits(totalSupply, 6);
        console.log(`[TEST] Formatted total supply (assuming 6 decimals): ${formatted}`);
        return `${formatted} (assumed 6 decimals)`;
      }
    } catch (error) {
      console.error('[TEST] Failed to get totalSupply:', error);
      return 'Failed to get total supply';
    }
  } catch (error) {
    console.error('[TEST] Critical error:', error);
    return 'Critical error in contract test';
  }
}

// Simple test of the legacy call method with fixed parameters
export async function testDirectCall(network: NetworkType = 'sepolia'): Promise<string> {
  try {
    // Get network config
    const networkConfig = getNetworkConfig(network);
    console.log(`[TEST] Using network ${networkConfig.name} for direct call`);
    
    // Use network-specific contract address
    const contractAddress = networkConfig.contracts.PYUSD;
    console.log(`[TEST] Using PYUSD contract address for direct call: ${contractAddress}`);
    
    // Use public provider for direct call
    console.log(`[TEST] Using public provider for direct call: ${networkConfig.publicRpcUrl}`);
    const provider = getPublicProvider(network);
    
    // First get the basic data for proper formatting
    const basicAbi = ["function decimals() view returns (uint8)"];
    const simple = new ethers.Contract(contractAddress, basicAbi, provider);
    let decimals = 6; // Default for PYUSD
    
    try {
      decimals = await simple.decimals();
      console.log(`[TEST] Token has ${decimals} decimals`);
    } catch (error) {
      console.error(`[TEST] Error getting decimals, using default (6):`, error);
    }
    
    // Hard-code the call data for totalSupply() function
    const callData = {
      to: contractAddress,
      data: "0x18160ddd" // Function selector for totalSupply()
    };
    
    const result = await provider.call(callData);
    console.log(`[TEST] Raw result from direct call: ${result}`);
    
    // Parse the result
    const totalSupply = BigInt(result);
    const formatted = ethers.formatUnits(totalSupply, decimals);
    console.log(`[TEST] Formatted total supply from direct call: ${formatted}`);
    
    return formatted;
  } catch (error) {
    console.error('[TEST] Error in direct call test:', error);
    return 'Error in direct call test';
  }
}