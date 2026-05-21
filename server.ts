/**
 * Vercel serverless entrypoint.
 *
 * Vercel auto-detects server.{js,ts} at the project root and turns it into a
 * serverless function, routing all incoming requests through it.
 * The app.listen() call is detected by Vercel to capture the HTTP server.
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./server/routers";
import { createContext } from "./server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, source: "vercel-server" });
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => createContext({ req, res }),
  })
);

// 404 fallback for unmatched API routes
app.use("/api/*", (req, res) => {
  console.warn("[API 404]", req.method, req.url);
  res.status(404).json({ error: "API route not found" });
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[Unhandled Error]", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Vercel captures the listen() call to detect the HTTP server
const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app;
