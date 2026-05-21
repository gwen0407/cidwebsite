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
import crypto from "crypto";
import { Resend } from "resend";

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
      try {
        const existing = await db.getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

        // First user or matching ADMIN_EMAIL gets admin role
        const dbConn = await db.getDb();
        const allUsers = dbConn ? await dbConn.select().from(schema.users) : [];
        const isFirst = allUsers.length === 0;
        const isAdminEmail = ENV.adminEmail && input.email.toLowerCase() === ENV.adminEmail.toLowerCase();
        
        // Check if this email belongs to a pre-created employee record
        const existingEmployee = await db.getEmployeeByEmail(input.email);
        
        let role: "admin" | "employee" | "user" = "user";
        if (isFirst || isAdminEmail) {
          role = "admin";
        } else if (existingEmployee) {
          role = "employee";
        }

        const user = await db.createUser({ email: input.email, password: input.password, name: input.name, role });
        
        // Auto-link employee record if one exists
        if (existingEmployee) {
          await db.linkEmployeeToUser(existingEmployee.id, user.id);
        }

        const token = await signToken({ userId: user.id, email: user.email, role: user.role });
        setCookie(ctx.res as unknown as ServerResponse, token);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      } catch (error) {
        console.error("[Auth Signup Error]", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Signup failed. Please try again." });
      }
    }),

  /** Login with email + password */
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
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
      } catch (error) {
        console.error("[Auth Login Error]", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login failed. Please try again." });
      }
    }),

  /** Logout — clear cookie */
  logout: authedProcedure.mutation(async ({ ctx }) => {
    clearCookieFromRes(ctx.res as unknown as ServerResponse);
    return { success: true };
  }),

  /** Request a password reset — sends an email with a reset link */
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      try {
        // Always return success to prevent email enumeration
        const user = await db.getUserByEmail(input.email);
        if (!user) return { success: true };

        // Generate a secure random token valid for 1 hour
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.setPasswordResetToken(input.email, token, expiry);

        const resetUrl = `${ENV.appUrl}/reset-password?token=${token}`;

        // Send email via Resend if API key is configured
        if (ENV.resendApiKey) {
          const resend = new Resend(ENV.resendApiKey);
          await resend.emails.send({
            from: "Consider It Done <noreply@considerit-done.com>",
            to: input.email,
            subject: "Reset your password",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">Reset your password</h2>
                <p>Hi ${user.name ?? "there"},</p>
                <p>We received a request to reset your password for your Consider It Done account.</p>
                <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
                <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
                <p style="color:#666;font-size:14px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
                <p style="color:#666;font-size:12px;">Or copy this link: ${resetUrl}</p>
              </div>
            `,
          });
        } else {
          // Log the reset URL in development when no email provider is configured
          console.log(`[Password Reset] Token for ${input.email}: ${resetUrl}`);
        }

        return { success: true };
      } catch (error) {
        console.error("[Forgot Password Error]", error);
        // Still return success to prevent enumeration
        return { success: true };
      }
    }),

  /** Reset password using a valid token */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const success = await db.resetPasswordWithToken(input.token, input.newPassword);
      if (!success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reset link is invalid or has expired. Please request a new one.",
        });
      }
      return { success: true };
    }),

  /** Verify that a reset token is valid (without consuming it) */
  verifyResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const user = await db.getUserByResetToken(input.token);
      if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
        return { valid: false };
      }
      return { valid: true, email: user.email };
    }),
});
