import axios from "axios";
import { DEFAULT_NETWORK, getNetworkConfig, NetworkType } from "./network-config";

// Function to get the current RPC URL based on network
function getCurrentRpcUrl(): string {
  // Get the current network from env vars or use default
  const networkType = process.env.NETWORK_TYPE as NetworkType || DEFAULT_NETWORK;
  
  // Get network config and RPC URL
  const currentNetwork = getNetworkConfig(networkType);
  console.log(`[GCP-RPC] Using network: ${networkType} with RPC: ${currentNetwork.rpcUrl}`);
  
  return process.env.GCP_RPC_URL || currentNetwork.rpcUrl;
}

// Simple log level for RPC errors
const RPC_LOG_LEVEL = process.env.RPC_LOG_LEVEL || 'warn'; // 'error', 'warn', 'info', 'debug'

// RPC call to the GCP Blockchain Node
export async function makeRpcCall(method: string, params: any[] = [], { silentErrors = false, logFullErrors = false } = {}): Promise<any> {
  try {
    // Get the current RPC URL dynamically each time we make a call
    const rpcUrl = getCurrentRpcUrl();
    
    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (response.data.error) {
      // Only log error if not silenced
      if (!silentErrors) {
        // Less verbose error handling for common 400s
        if (method === "eth_getLogs" && response.data.error.message?.includes("range")) {
          // These are common and expected, just log at info level
          if (RPC_LOG_LEVEL === 'debug') {
            console.info(`[GCP-RPC] ${method} log range error (suppressed)`);
          }
        } else {
          console.warn(`[GCP-RPC] Error in ${method} call: ${response.data.error.message}`);
        }
      }
      throw new Error(response.data.error.message);
    }

    return response.data.result;
  } catch (err: unknown) {
    const error = err as Error;
    // Don't log every error (especially 400s from eth_getLogs which are common)
    if (!silentErrors) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        
        // Suppress common 400 errors which are mostly due to querying ranges
        if (method === "eth_getLogs" && status === 400) {
          // Only log at debug level
          if (RPC_LOG_LEVEL === 'debug') {
            console.info(`[GCP-RPC] ${method} 400 error (suppressed) - likely invalid block range`);
          }
        } else if (status >= 500) {
          // Always log server errors
          console.error(`[GCP-RPC] ${method} server error: ${status}`);
        } else if (RPC_LOG_LEVEL !== 'info') {
          // Log client errors only if log level permits
          console.warn(`[GCP-RPC] ${method} client error: ${status}`);
        }
      } else if (logFullErrors) {
        console.error(`[GCP-RPC] Error in ${method} call:`, error);
      } else {
        // Just log the message for other errors
        console.warn(`[GCP-RPC] Error in ${method} call: ${error.message || String(error)}`);
      }
    }
    throw error;
  }
}

// Get transaction by hash
export async function getTransaction(txHash: string): Promise<any> {
  return makeRpcCall("eth_getTransactionByHash", [txHash], { silentErrors: true });
}

// Get transaction receipt
export async function getTransactionReceipt(txHash: string): Promise<any> {
  return makeRpcCall("eth_getTransactionReceipt", [txHash], { silentErrors: true });
}

// Get block by number
export async function getBlockByNumber(blockNumber: string | number, includeTransactions = false): Promise<any> {
  // Convert number to hex if needed
  const blockNumberHex = typeof blockNumber === "number" 
    ? `0x${blockNumber.toString(16)}` 
    : blockNumber;
    
  return makeRpcCall("eth_getBlockByNumber", [blockNumberHex, includeTransactions], { silentErrors: true });
}

// Trace transaction
export async function traceTransaction(txHash: string): Promise<any> {
  try {
    // First try debug_traceTransaction which provides detailed call traces
    return await makeRpcCall("debug_traceTransaction", [txHash, {
      tracer: "callTracer",
      timeout: "30s",
    }], { silentErrors: true });
  } catch (err: unknown) {
    if (RPC_LOG_LEVEL === 'debug') {
      console.info("[GCP-RPC] debug_traceTransaction not available, using fallback");
    }
    
    // If the specialized method isn't available (common on public nodes),
    // we'll return a simplified trace based on transaction and receipt
    try {
      const [tx, receipt] = await Promise.all([
        getTransaction(txHash),
        getTransactionReceipt(txHash)
      ]);
      
      // Create a simplified trace from the basic transaction data
      return {
        type: "CALL",
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gas: tx.gas,
        gasUsed: receipt.gasUsed,
        input: tx.input,
        output: "0x", // Not available in basic data
        calls: [] // No call trace available
      };
    } catch (txError) {
      if (RPC_LOG_LEVEL !== 'info') {
        console.warn("[GCP-RPC] Failed to get transaction details");
      }
      return {
        type: "CALL",
        from: "0x0",
        to: "0x0",
        value: "0x0",
        calls: []
      };
    }
  }
}

// Get gas price
export async function getGasPrice(): Promise<string> {
  return makeRpcCall("eth_gasPrice", [], { silentErrors: true });
}

// Estimate gas
export async function estimateGas(txObject: any): Promise<string> {
  return makeRpcCall("eth_estimateGas", [txObject], { silentErrors: true });
}

// Send raw transaction
export async function sendRawTransaction(signedTx: string): Promise<string> {
  return makeRpcCall("eth_sendRawTransaction", [signedTx], { silentErrors: true });
}

// Get token balance
export async function getTokenBalance(tokenAddress: string, address: string): Promise<string> {
  try {
    // Call the balanceOf method on the token contract
    const data = `0x70a08231000000000000000000000000${address.substring(2)}`;
    
    const result = await makeRpcCall("eth_call", [{
      to: tokenAddress,
      data,
    }, "latest"], { silentErrors: true });
    
    return result;
  } catch (err: unknown) {
    if (RPC_LOG_LEVEL === 'debug') {
      console.warn(`[GCP-RPC] Error getting token balance for ${address} on ${tokenAddress}`);
    }
    return "0x0";
  }
}

// Get ETH balance
export async function getEthBalance(address: string): Promise<string> {
  try {
    return await makeRpcCall("eth_getBalance", [address, "latest"], { silentErrors: true });
  } catch (err: unknown) {
    if (RPC_LOG_LEVEL === 'debug') {
      console.warn(`[GCP-RPC] Error getting ETH balance for ${address}`);
    }
    return "0x0";
  }
}

// Get contract logs (events) with enhanced error handling and range limiting
export async function getLogs(address: string, fromBlock: string, toBlock: string, topics: string[] = []): Promise<any[]> {
  try {
    // For GCP blockchain nodes, querying too many blocks can result in a 400 error
    if (RPC_LOG_LEVEL === 'debug') {
      console.log(`[GCP-RPC] Getting logs for ${address} from ${fromBlock} to ${toBlock}`);
    }
    
    // Convert the block numbers to check if the range is too large
    const fromBlockNum = parseInt(fromBlock.startsWith('0x') ? fromBlock : `0x${fromBlock}`, 16);
    let targetToBlock = toBlock;
    let targetToBlockNum: number;
    
    if (toBlock === 'latest') {
      // Get the current block number if toBlock is 'latest'
      try {
        const latestBlockHex = await makeRpcCall("eth_blockNumber", [], { silentErrors: true });
        targetToBlockNum = parseInt(latestBlockHex, 16);
        targetToBlock = latestBlockHex;
        if (RPC_LOG_LEVEL === 'debug') {
          console.log(`[GCP-RPC] Resolved 'latest' to block ${targetToBlockNum} (${targetToBlock})`);
        }
      } catch (err) {
        console.warn("[GCP-RPC] Failed to get latest block number, using default range");
        targetToBlockNum = Number.MAX_SAFE_INTEGER;
      }
    } else {
      targetToBlockNum = parseInt(toBlock.startsWith('0x') ? toBlock : `0x${toBlock}`, 16);
    }
    
    // GCP blockchain endpoints seem to have stricter limits than expected
    // For PYUSD and other popular tokens, we need to limit even further to 100 blocks
    // to avoid 400 Bad Request errors
    const maxBlockRange = 100; // Reducing from 500 to 100 for maximum reliability
    
    if (targetToBlockNum !== Number.MAX_SAFE_INTEGER && targetToBlockNum - fromBlockNum > maxBlockRange) {
      const newFromBlock = targetToBlockNum - maxBlockRange;
      if (RPC_LOG_LEVEL !== 'info') {
        console.info(`[GCP-RPC] Block range limited to ${maxBlockRange} blocks`);
      }
      fromBlock = `0x${newFromBlock.toString(16)}`;
    }
    
    // Prepare the log filter params
    const params = {
      address,
      fromBlock,
      toBlock: targetToBlock,
      topics: topics.filter(t => t !== null), // Filter out null topics
    };
    
    // Debug log the exact parameters being sent
    if (RPC_LOG_LEVEL === 'debug') {
      console.log(`[GCP-RPC] Log filter params: ${JSON.stringify(params)}`);
    }
    
    // Make the RPC call with enhanced error handling
    try {
      const result = await makeRpcCall("eth_getLogs", [params], { silentErrors: true });
      if (RPC_LOG_LEVEL === 'debug') {
        console.log(`[GCP-RPC] Found ${result?.length || 0} logs`);
      }
      return result || [];
    } catch (rpcError: any) {
      // Handle errors silently to reduce console noise
      // If block range is still large, try with an even smaller range
      if (targetToBlockNum - fromBlockNum > 50) {
        const verySmallRange = 50;
        const newFromBlock = targetToBlockNum - verySmallRange;
        
        if (RPC_LOG_LEVEL === 'debug') {
          console.info(`[GCP-RPC] Retrying with smaller range of ${verySmallRange} blocks`);
        }
        
        const newFromBlockHex = `0x${newFromBlock.toString(16)}`;
        
        try {
          const fallbackResult = await makeRpcCall("eth_getLogs", [{
            address,
            fromBlock: newFromBlockHex,
            toBlock: targetToBlock,
            topics: topics.filter(t => t !== null),
          }], { silentErrors: true });
          
          return fallbackResult || [];
        } catch (fallbackError) {
          // Silently fail
          return [];
        }
      }
      
      // For other errors, just return empty without logging
      return [];
    }
  } catch (err: unknown) {
    if (RPC_LOG_LEVEL === 'debug') {
      console.warn('[GCP-RPC] Error in getLogs function');
    }
    return [];
  }
}

// Trace block 
export async function traceBlock(blockNumber: string | number): Promise<any> {
  // Convert number to hex if needed
  const blockNumberHex = typeof blockNumber === "number" 
    ? `0x${blockNumber.toString(16)}` 
    : blockNumber;
  
  try {  
    // Try the detailed trace method first
    return await makeRpcCall("debug_traceBlockByNumber", [blockNumberHex, {
      tracer: "callTracer",
      timeout: "60s",
    }], { silentErrors: true });
  } catch (err: unknown) {
    if (RPC_LOG_LEVEL === 'debug') {
      console.info("[GCP-RPC] debug_traceBlockByNumber not available, using fallback");
    }
    
    try {
      // If the specialized trace method isn't available, return basic block data
      const block = await getBlockByNumber(blockNumberHex, true);
      return block.transactions.map((tx: any) => ({
        type: "CALL",
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gas: tx.gas,
        input: tx.input,
        calls: []
      }));
    } catch (blockError) {
      // Return an empty result if even the fallback fails
      return [];
    }
  }
}

// Get fee history for better gas price estimation
export async function getFeeHistory(blockCount: number, newestBlock: string = "latest", rewardPercentiles: number[] = [25, 50, 75]): Promise<any> {
  return makeRpcCall("eth_feeHistory", [
    `0x${blockCount.toString(16)}`, 
    newestBlock, 
    rewardPercentiles
  ], { silentErrors: true });
}

// Get transaction count (nonce)
export async function getTransactionCount(address: string, blockParameter: string = "latest"): Promise<string> {
  return makeRpcCall("eth_getTransactionCount", [address, blockParameter], { silentErrors: true });
}
