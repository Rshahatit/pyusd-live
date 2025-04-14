import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { cacheService } from "./services/cache-service";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add cache control headers to prevent 304 responses
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    // Disable caching for all API routes
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Set default network environment variable to mainnet
process.env.NETWORK_TYPE = 'mainnet';
console.log(`[Network] Using network: ${process.env.NETWORK_TYPE}`);

(async () => {
  try {
    // Push schema changes to the database
    log('[DB] Pushing schema changes to database');
    // Use drizzle-kit push instead of migrate as it's simpler for this use case
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cache_entries (
        id SERIAL PRIMARY KEY,
        cache_key TEXT NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        network TEXT NOT NULL DEFAULT 'mainnet'
      )
    `);
    log('[DB] Schema push completed');
    
    // Set up periodic cache cleanup
    setInterval(() => {
      cacheService.cleanup().catch(err => {
        console.error('[Cache] Error in cleanup job:', err);
      });
    }, 5 * 60 * 1000); // Run every 5 minutes
    
    log('[Cache] Initialized cache service with periodic cleanup');
  } catch (error) {
    console.error('[DB] Error initializing database:', error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
