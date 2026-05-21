import "dotenv/config";
import type { Request, Response, NextFunction } from "express";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Health Check
app.get("/api/health", (_req: Request, res: Response) =>
  res.json({ ok: true, source: "vercel-api" })
);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => createContext({ req, res }),
  })
);

// 404 fallback for unmatched API routes
app.use("/api/*", (req: Request, res: Response) => {
  console.warn("[API 404]", req.method, req.url);
  res.status(404).json({ error: "API route not found" });
});

// Catch-all error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Unhandled Error]", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
