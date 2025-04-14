import express from "express";
import { storage } from "../storage";
import { ethers } from "ethers";
import {
  getGasPrice,
  estimateGas,
  sendRawTransaction,
  getTokenBalance,
  getTransactionCount,
} from "../utils/gcp-rpc";

const router = express.Router();

// Constants
const PYUSD_CONTRACT = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"; // Example address for Sepolia testnet
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY || ""; // Private key for the relay service
const FAUCET_AMOUNT = "100000000"; // 100 PYUSD (with 6 decimals)

// Mock account data for demo purposes - in production this would come from a database
const DEMO_ADDRESS = "0x3b2d1c6742F999E787fF66e445Cc2D511B3Fa7e9";
const DEMO_BALANCE = "50000000"; // 50 PYUSD (with 6 decimals)

// ERC20 token ABI (minimal for transfer function)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Get account info
router.get("/account", async (req, res) => {
  try {
    // In a real app, this would get the user from a session or token
    // and look up their wallet address
    
    const gasSavings = {
      eth: "0.032",
      usd: "72.40"
    };
    
    // Return mock account information
    res.json({
      address: DEMO_ADDRESS,
      balance: "50.00", // Formatted for display
      gasSavings
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ 
      message: "Error fetching account information", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get transaction history
router.get("/history", async (req, res) => {
  try {
    // In a real app, we would get the user's address from their session
    // and look up their transaction history from the database
    
    const now = Date.now();
    
    // Get the user's payment history
    const transactions = [
      {
        id: "1",
        type: "payment",
        recipient: "0x74c2fF484E5A2734ab2B701232D9529Cb731398c",
        amount: "25.00",
        timestamp: now - 120000, // 2 minutes ago
        status: "completed"
      },
      {
        id: "2",
        type: "faucet",
        amount: "100.00",
        timestamp: now - 86400000, // 1 day ago
        status: "completed"
      }
    ];
    
    res.json({ transactions });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ 
      message: "Error fetching payment history", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Send a payment
router.post("/send", async (req, res) => {
  try {
    const { recipient, amount, memo, gasSpeed } = req.body;
    
    // Validate inputs
    if (!recipient || !amount) {
      return res.status(400).json({ message: "Recipient and amount are required" });
    }
    
    if (!ethers.isAddress(recipient)) {
      return res.status(400).json({ message: "Invalid recipient address" });
    }
    
    // Parse the amount (convert from user-friendly format to token units with decimals)
    const amountInTokenUnits = ethers.parseUnits(amount, 6); // PYUSD has 6 decimals
    
    // In a real application, we would:
    // 1. Check that the user has enough balance
    // 2. Create and sign a transaction using the relayer's private key
    // 3. Send the transaction to the blockchain
    // 4. Record the transaction in the database
    
    // For this demo, we'll create a payment record in our in-memory storage
    const paymentData = {
      userId: 1, // Demo user
      fromAddress: DEMO_ADDRESS,
      toAddress: recipient,
      amount: amount,
      status: "pending",
      memo: memo || "",
      gasSpeed: gasSpeed
    };
    
    const payment = await storage.createPayment(paymentData);
    
    // In a real implementation, we would now:
    // 1. Get the current gas price (either fast or optimal based on selection)
    // 2. Create a transaction to the PYUSD contract
    // 3. Sign it with the relayer's private key
    // 4. Broadcast it to the network
    // 5. Update the payment record with the txHash
    
    // For this demo, we'll simulate a successful payment after a short delay
    setTimeout(async () => {
      await storage.updatePayment(payment.id, "completed", "0x" + Math.random().toString(16).substring(2) + "0".repeat(40));
    }, 3000);
    
    res.json({ 
      message: "Payment initiated", 
      paymentId: payment.id,
      status: "pending"
    });
  } catch (error) {
    console.error("Error sending payment:", error);
    res.status(500).json({ 
      message: "Error sending payment", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Request PYUSD from faucet
router.post("/faucet", async (req, res) => {
  try {
    // In a real app, we would get the user's address from their session
    const toAddress = DEMO_ADDRESS;
    
    // Create a faucet request
    const faucetData = {
      userId: 1, // Demo user
      address: toAddress,
      amount: "100.00", // 100 PYUSD
      status: "pending"
    };
    
    const request = await storage.createFaucetRequest(faucetData);
    
    // In a real implementation, this would interact with a faucet contract
    // or directly transfer PYUSD to the user using a faucet wallet
    
    // For this demo, we'll simulate a successful faucet request after a short delay
    setTimeout(async () => {
      await storage.updateFaucetRequest(request.id, "completed", "0x" + Math.random().toString(16).substring(2) + "0".repeat(40));
    }, 2000);
    
    res.json({ 
      message: "Faucet request initiated", 
      requestId: request.id,
      status: "pending"
    });
  } catch (error) {
    console.error("Error requesting from faucet:", error);
    res.status(500).json({ 
      message: "Error requesting from faucet", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get current gas prices
router.get("/gas", async (req, res) => {
  try {
    // Get current gas price from the network
    const gasPrice = await getGasPrice();
    
    // Convert from wei to gwei
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, "gwei"));
    
    // Calculate recommended gas prices
    const slow = Math.max(1, Math.floor(gasPriceGwei * 0.8));
    const average = Math.floor(gasPriceGwei);
    const fast = Math.floor(gasPriceGwei * 1.2);
    
    res.json({
      slow,     // Slower but cheaper
      average,  // Standard
      fast,     // Faster but more expensive
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error getting gas prices:", error);
    res.status(500).json({ 
      message: "Error getting gas prices", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
