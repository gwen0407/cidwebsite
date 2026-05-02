/**
 * Simple email/password authentication using JWT cookies.
 * Replaces Manus OAuth entirely.
 */
import { router, publicProcedure, authedProcedure } from "./trpc.js";
import * as db from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { ENV } from "./env.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { ServerResponse } from "http";

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
const getSecret = () => new TextEncoder().encode(ENV.jwtSecret);

export async function signToken(payload: { userId: number; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1y")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

function buildCookieString(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (ENV.isProduction) parts.push("Secure");
  return parts.join("; ");
}

function setCookie(res: ServerResponse, token: string) {
  res.setHeader("Set-Cookie", buildCookieString(COOKIE_NAME, token, ONE_YEAR_MS));
}

function clearCookieFromRes(res: ServerResponse) {
  res.setHeader("Set-Cookie", buildCookieString(COOKIE_NAME, "", 0));
}

// ---------------------------------------------------------------------------
// Auth tRPC router
// ---------------------------------------------------------------------------
export const authRouter = router({
  /** Return current session user or null */
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null;
  }),

  /** Register a new account */
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

      // First user or matching ADMIN_EMAIL gets admin role
      const dbConn = await db.getDb();
      const allUsers = dbConn ? await dbConn.select().from(schema.users) : [];
      const isFirst = allUsers.length === 0;
      const isAdminEmail = ENV.adminEmail && input.email.toLowerCase() === ENV.adminEmail.toLowerCase();
      const role: "admin" | "user" = isFirst || isAdminEmail ? "admin" : "user";

      const user = await db.createUser({ email: input.email, password: input.password, name: input.name, role });
      const token = await signToken({ userId: user.id, email: user.email, role: user.role });
      setCookie(ctx.res as unknown as ServerResponse, token);
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    }),

  /** Login with email + password */
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });

      const valid = await db.verifyPassword(user, input.password);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });

      await db.updateUserLastSignedIn(user.id);

      // Auto-link employee record if one exists
      const emp = await db.getEmployeeByEmail(user.email);
      if (emp && !emp.userId) await db.linkEmployeeToUser(emp.id, user.id);

      // If user is an employee, ensure their role reflects that
      if (emp && user.role === "user") {
        const dbConn = await db.getDb();
        if (dbConn) {
          await dbConn.update(schema.users).set({ role: "employee" }).where(eq(schema.users.id, user.id));
          user.role = "employee";
        }
      }

      const token = await signToken({ userId: user.id, email: user.email, role: user.role });
      setCookie(ctx.res as unknown as ServerResponse, token);
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    }),

  /** Logout — clear cookie */
  logout: authedProcedure.mutation(async ({ ctx }) => {
    clearCookieFromRes(ctx.res as unknown as ServerResponse);
    return { success: true };
  }),
});
