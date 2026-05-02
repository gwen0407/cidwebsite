import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);
// 404 fallback for unmatched API routes
app.use("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "API route not found" });
});
export default app;
