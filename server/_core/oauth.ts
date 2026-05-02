import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import * as db from "../db.js";
import { getSessionCookieOptions } from "./cookies.js";
import { sdk } from "./sdk.js";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/health", (req: Request, res: Response) => {
    res.send("OK");
  });

  app.get("/api/debug", async (req: Request, res: Response) => {
    const diagnostics = {
      env: {
        VITE_APP_ID: process.env.VITE_APP_ID ? "PRESENT" : "MISSING",
        JWT_SECRET: process.env.JWT_SECRET ? "PRESENT" : "MISSING",
        DATABASE_URL: process.env.DATABASE_URL ? "PRESENT" : "MISSING",
        OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL ? "PRESENT" : "MISSING",
        NODE_ENV: process.env.NODE_ENV,
      },
      database: "testing...",
    };

    try {
      const dbInstance = await db.getDb();
      if (dbInstance) {
        diagnostics.database = "INITIALIZED";
      } else {
        diagnostics.database = "FAILED_TO_INITIALIZE";
      }
    } catch (e) {
      diagnostics.database = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }

    res.json(diagnostics);
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Starting callback processing...");
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth] Token exchanged successfully");
      
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth] User info retrieved:", userInfo.openId);
      
      if (!userInfo.openId) {
        console.error("[OAuth] openId missing from user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      
      console.log("[OAuth] Attempting to upsert user to database...");
      try {
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
        console.log("[OAuth] User upserted successfully");
      } catch (dbError) {
        console.warn("[OAuth] Database upsert failed, but continuing login flow:", dbError);
      }
      
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      console.log("[OAuth] Session token created");
      
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log("[OAuth] Cookie set, redirecting to home...");
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed with error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: "OAuth callback failed", 
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
}
