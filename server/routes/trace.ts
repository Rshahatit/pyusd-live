import express from "express";
import { storage } from "../storage";
import { getTransaction, getTransactionReceipt, traceTransaction } from "../utils/gcp-rpc";
import { parseTrace, analyzeTrace } from "../utils/trace-parser";
import { ethers } from "ethers";
import { getNetworkConfig } from "../utils/network-config";

const router = express.Router();

// Function to get the current PYUSD contract address based on network
function getPYUSDContract(): string {
  const networkConfig = getNetworkConfig(process.env.NETWORK_TYPE as any);
  return networkConfig.contracts.PYUSD;
}

// Function to check if a transaction is related to PYUSD
function isPYUSDTransaction(to: string, logs: any[]): boolean {
  const PYUSD_CONTRACT = getPYUSDContract();
  console.log(`[Trace API] Using PYUSD contract: ${PYUSD_CONTRACT} for network: ${process.env.NETWORK_TYPE}`);
  
  // Check if the transaction is directly to the PYUSD contract
  if (to && to.toLowerCase() === PYUSD_CONTRACT.toLowerCase()) {
    return true;
  }
  
  // Check if any logs are emitted from the PYUSD contract
  return logs.some(log => log.address && log.address.toLowerCase() === PYUSD_CONTRACT.toLowerCase());
}

// Parse token transfers from logs
function parseTokenTransfers(logs: any[]): any[] {
  const transfers = [];
  
  // ERC20 Transfer event signature
  const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  
  for (const log of logs) {
    if (log.topics[0] === transferEventSignature && log.topics.length === 3) {
      // This is an ERC20 transfer event
      const from = "0x" + log.topics[1].substring(26);
      const to = "0x" + log.topics[2].substring(26);
      const value = log.data;
      
      // Get token details - in a real app we would query the contract
      let tokenSymbol = "Unknown";
      let tokenName = "Unknown Token";
      let tokenDecimals = 18;
      
      // Check if it's PYUSD
      const PYUSD_CONTRACT = getPYUSDContract();
      if (log.address.toLowerCase() === PYUSD_CONTRACT.toLowerCase()) {
        tokenSymbol = "PYUSD";
        tokenName = "PayPal USD";
        tokenDecimals = 6;
      }
      
      transfers.push({
        tokenAddress: log.address,
        tokenSymbol,
        tokenName,
        tokenDecimals,
        from,
        to,
        value,
      });
    }
  }
  
  return transfers;
}

// Get transaction information
router.get("/:txHash", async (req, res) => {
  try {
    const { txHash } = req.params;
    console.log(`[Trace API] Processing transaction trace request for hash: ${txHash}`);
    
    // First check if this transaction is already in our database for the current network
    let storedTrace = await storage.getTrace(txHash);
    const currentNetwork = process.env.NETWORK_TYPE || 'sepolia';
    
    // Only use the stored trace if it's from the same network or force a fresh fetch
    const forceRefresh = req.query.refresh === 'true';
    
    if (storedTrace && storedTrace.data && !forceRefresh) {
      // Return stored trace data
      console.log(`[Trace API] Found existing trace in storage for ${txHash}`);
      res.json(storedTrace.data);
      return;
    }
    
    console.log(`[Trace API] No existing trace found, fetching blockchain data for ${txHash}`);
    
    // Fetch transaction data from the blockchain one by one with error handling
    let tx, receipt, traceData;
    
    try {
      console.log(`[Trace API] Fetching transaction data for ${txHash}`);
      tx = await getTransaction(txHash);
      console.log(`[Trace API] Transaction data received:`, tx ? 'Success' : 'Not found');
    } catch (txError) {
      console.error(`[Trace API] Error fetching transaction:`, txError);
      return res.status(404).json({ 
        message: "Error fetching transaction", 
        error: txError instanceof Error ? txError.message : String(txError)
      });
    }
    
    if (!tx) {
      console.log(`[Trace API] Transaction not found: ${txHash}`);
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    try {
      console.log(`[Trace API] Fetching transaction receipt for ${txHash}`);
      receipt = await getTransactionReceipt(txHash);
      console.log(`[Trace API] Transaction receipt received:`, receipt ? 'Success' : 'Not found');
    } catch (receiptError) {
      console.error(`[Trace API] Error fetching receipt:`, receiptError);
      return res.status(404).json({ 
        message: "Error fetching transaction receipt", 
        error: receiptError instanceof Error ? receiptError.message : String(receiptError)
      });
    }
    
    if (!receipt) {
      console.log(`[Trace API] Transaction receipt not found: ${txHash}`);
      return res.status(404).json({ message: "Transaction receipt not found" });
    }
    
    try {
      console.log(`[Trace API] Fetching transaction trace for ${txHash}`);
      traceData = await traceTransaction(txHash);
      console.log(`[Trace API] Trace data received:`, traceData ? 'Success' : 'Not found');
    } catch (traceError) {
      console.error(`[Trace API] Error fetching trace data:`, traceError);
      // Continue with limited data rather than failing - our fallback should handle this
      console.log(`[Trace API] Will continue with limited trace data`);
      traceData = null;
    }
    
    // Check if this is a PYUSD transaction
    console.log(`[Trace API] Checking if this is a PYUSD transaction`);
    const isPYUSD = isPYUSDTransaction(tx.to, receipt.logs);
    console.log(`[Trace API] PYUSD transaction: ${isPYUSD}`);
    
    // Parse token transfers from logs
    console.log(`[Trace API] Parsing token transfers from logs`);
    const tokenTransfers = parseTokenTransfers(receipt.logs);
    console.log(`[Trace API] Found ${tokenTransfers.length} token transfers`);
    
    // Parse the trace data
    console.log(`[Trace API] Parsing trace data`);
    const parsedTrace = parseTrace(traceData || {
      type: "CALL",
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gas: tx.gas,
      gasUsed: receipt.gasUsed,
      input: tx.input,
      output: "0x",
      calls: []
    });
    
    // Analyze the trace
    console.log(`[Trace API] Analyzing the trace`);
    const analysis = analyzeTrace(parsedTrace, isPYUSD);
    
    // Prepare the response
    console.log(`[Trace API] Preparing response data`);
    console.log(`[Trace API] Transaction data:`, {
      from: tx.from,
      to: tx.to,
      blockNumber: tx.blockNumber, 
      value: tx.value
    });
    console.log(`[Trace API] Receipt data:`, {
      from: receipt.from,
      to: receipt.to,
      status: receipt.status,
      gasUsed: receipt.gasUsed
    });
    
    // Make sure we're getting the correct from/to addresses
    const result = {
      hash: txHash,
      blockNumber: parseInt(tx.blockNumber || '0x0', 16).toString(),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: receipt.gasUsed,
      gasPrice: tx.gasPrice,
      status: parseInt(receipt.status || '0x0', 16),
      isPYUSDTransfer: isPYUSD,
      tokenTransfers,
      trace: parsedTrace,
      analysis,
      // Mock ETH price - in a real app this would come from an oracle
      ethPrice: 2240.50,
      timestamp: Date.now(),
    };
    
    // Store the trace in the database
    console.log(`[Trace API] Storing trace data in database`);
    try {
      await storage.saveTrace({
        txHash,
        blockNumber: parseInt(tx.blockNumber || '0x0', 16),
        data: result,
        isPYUSD,
        analysis,
      });
      console.log(`[Trace API] Trace data stored successfully`);
    } catch (storageError) {
      console.error(`[Trace API] Error storing trace data:`, storageError);
      // Continue even if storage fails - we can still return the response
    }
    
    console.log(`[Trace API] Transaction analysis complete for ${txHash}`);
    res.json(result);
  } catch (error) {
    console.error("[Trace API] Error fetching transaction trace:", error);
    res.status(500).json({ 
      message: "Error fetching transaction trace", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
