import express from "express";
import { DEFAULT_NETWORK, NetworkType, NETWORKS } from "../utils/network-config";

// Network state
let currentNetwork: NetworkType = DEFAULT_NETWORK;

const router = express.Router();

// Get current network information
router.get("/", (req, res) => {
  const networkInfo = {
    current: currentNetwork,
    available: Object.keys(NETWORKS),
    details: NETWORKS[currentNetwork]
  };

  res.json(networkInfo);
});

// Update the network
router.post("/switch", (req, res) => {
  const { network } = req.body;

  if (!network || !NETWORKS[network as NetworkType]) {
    return res.status(400).json({ 
      error: "Invalid network",
      available: Object.keys(NETWORKS) 
    });
  }

  // Update the current network
  currentNetwork = network as NetworkType;
  
  // Set environment variable for other parts of the application
  process.env.NETWORK_TYPE = currentNetwork;

  // Return updated network info
  res.json({
    success: true,
    current: currentNetwork,
    details: NETWORKS[currentNetwork]
  });
});

export default router;