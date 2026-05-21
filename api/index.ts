import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
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
    transformer: superjson,
  })
);

// 404 fallback for unmatched API routes
app.use("/api/*", (req, res) => {
  console.warn("[API 404]", req.method, req.url);
  res.status(404).json({ error: "API route not found" });
});

// Catch-all error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[Unhandled Error]", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
