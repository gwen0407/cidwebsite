import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";
import superjson from "superjson";
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// API Health Check
app.get("/api/health", (_req, res) => res.json({ ok: true, source: "vercel-api" }));

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({ 
    router: appRouter, 
    createContext,
    transformer: superjson
  })
);
// 404 fallback for unmatched API routes
app.use("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "API route not found" });
});
export default app;
