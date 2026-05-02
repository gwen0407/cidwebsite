import type { IncomingMessage, ServerResponse } from "http";
import type { User } from "../../drizzle/schema.js";
import { verifyToken } from "./auth.js";
import * as db from "../db.js";
import { COOKIE_NAME } from "../../shared/const.js";
import { parse as parseCookies } from "cookie";

export type TrpcContext = {
  req: IncomingMessage & { body?: unknown };
  res: ServerResponse;
  user: User | null;
};

export async function createContext(
  opts: { req: IncomingMessage & { body?: unknown }; res: ServerResponse }
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const cookieHeader = (opts.req.headers["cookie"] as string | undefined) ?? "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        user = await db.getUserById(payload.userId);
      }
    }
  } catch {
    user = null;
  }
  return { req: opts.req, res: opts.res, user };
}
