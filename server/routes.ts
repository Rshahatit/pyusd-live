import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import traceRoutes from "./routes/trace";
import payRoutes from "./routes/pay";
import dashboardRoutes from "./routes/dashboard";
import networkRoutes from "./routes/network";
import { testBlockchainConnectivity, testContractAccess, testDirectCall } from "./utils/contract-test";
import { cacheService } from "./services/cache-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API routes with /api prefix
  app.use("/api/trace", traceRoutes);
  app.use("/api/pay", payRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/network", networkRoutes);
  
  // Add special test routes for diagnostics
  app.get("/api/dashboard/clear-cache", async (req: Request, res: Response) => {
    try {
      // Clear dashboard cache entries
      await cacheService.clearAll('dashboard');
      console.log('[API] Dashboard cache cleared');
      return res.json({ success: true, message: 'Dashboard cache cleared successfully' });
    } catch (error) {
      console.error('[API] Error clearing dashboard cache:', error);
      return res.status(500).json({ success: false, error: 'Failed to clear dashboard cache' });
    }
  });
  
  app.get("/api/test/blockchain", async (req: Request, res: Response) => {
    try {
      // Get network from query params, default to sepolia
      const networkParam = req.query.network as string || 'sepolia';
      console.log(`[TEST] Testing blockchain connectivity on ${networkParam} network`);
      
      const result = await testBlockchainConnectivity(networkParam as any);
      
      res.json({
        network: networkParam,
        connectivity: result
      });
    } catch (error) {
      console.error("[TEST] Error in blockchain test:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Contract test route
  app.get("/api/test/contract", async (req: Request, res: Response) => {
    try {
      // Get network from query params, default to sepolia
      const networkParam = req.query.network as string || 'sepolia';
      console.log(`[TEST] Testing contract access on ${networkParam} network`);
      
      // First test basic blockchain connectivity
      const connectivityResult = await testBlockchainConnectivity(networkParam as any);
      
      // Then try contract access methods if blockchain is available
      let contractResult = "Not tested - blockchain unavailable";
      let directResult = "Not tested - blockchain unavailable";
      
      if (connectivityResult.success) {
        contractResult = await testContractAccess(networkParam as any);
        directResult = await testDirectCall(networkParam as any);
      }
      
      res.json({
        network: networkParam,
        connectivity: connectivityResult,
        ethersResult: contractResult,
        directCallResult: directResult
      });
    } catch (error) {
      console.error("[TEST] Error in contract test:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Catch-all 404 for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);

  return httpServer;
}
