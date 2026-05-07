import { z } from "zod";
import { publicProcedure, router } from "./trpc.js";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),
  debugSession: publicProcedure.query(async ({ ctx }) => {
    return {
      hasUser: !!ctx.user,
      role: ctx.user?.role ?? null,
      email: ctx.user?.email ?? null,
    };
  }),
});
