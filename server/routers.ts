import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addEmployee,
  assignTask,
  clockIn,
  clockOut,
  getActiveTimeLog,
  getEmployeeByEmail,
  getEmployeeByUserId,
  linkEmployeeToUser,
  listAllTimeLogs,
  listAllTasks,
  listEmployees,
  listTasksByEmployee,
  listTimeLogsByEmployee,
  markTaskComplete,
} from "./db";

// ---------------------------------------------------------------------------
// Admin-only guard
// ---------------------------------------------------------------------------
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ---------------------------------------------------------------------------
// Employee-only guard (auto-links user → employee on first call)
// ---------------------------------------------------------------------------
const employeeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  let employee = await getEmployeeByUserId(ctx.user.id);

  // Auto-link: if the user's email matches an employee record, link them
  if (!employee && ctx.user.email) {
    const byEmail = await getEmployeeByEmail(ctx.user.email);
    if (byEmail && !byEmail.userId) {
      await linkEmployeeToUser(byEmail.id, ctx.user.id);
      employee = { ...byEmail, userId: ctx.user.id };
    }
  }

  // Auto-create: if still no employee record, create one for this user
  if (!employee && ctx.user.email && ctx.user.name) {
    await addEmployee({
      name: ctx.user.name,
      email: ctx.user.email,
      userId: ctx.user.id,
    });
    employee = await getEmployeeByUserId(ctx.user.id);
  }

  if (!employee) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Employee record not found for this user" });
  }

  return next({ ctx: { ...ctx, employee } });
});

// ---------------------------------------------------------------------------
// Routers
// ---------------------------------------------------------------------------

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // -------------------------------------------------------------------------
  // Employees (admin only)
  // -------------------------------------------------------------------------
  employees: router({
    list: adminProcedure.query(async () => {
      return listEmployees();
    }),

    add: adminProcedure
      .input(z.object({ email: z.string().email(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        const existing = await getEmployeeByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Employee already exists" });
        await addEmployee({ email: input.email, name: input.name ?? null });
        return { success: true };
      }),
  }),

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------
  tasks: router({
    // Admin: assign a task to an employee
    assign: adminProcedure
      .input(z.object({ description: z.string().min(1), employeeId: z.number().int() }))
      .mutation(async ({ input }) => {
        await assignTask({ description: input.description, assignedToEmployeeId: input.employeeId });
        return { success: true };
      }),

    // Admin: view all tasks (with optional date filter)
    listAll: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional() }).optional())
      .query(async ({ input }) => {
        return listAllTasks(input);
      }),

    // Employee: view own tasks
    myTasks: employeeProcedure.query(async ({ ctx }) => {
      return listTasksByEmployee(ctx.employee.id);
    }),

    // Employee: mark a task complete
    complete: employeeProcedure
      .input(z.object({ taskId: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        // Verify the task belongs to this employee
        const myTasks = await listTasksByEmployee(ctx.employee.id);
        const task = myTasks.find((t) => t.id === input.taskId);
        if (!task) throw new TRPCError({ code: "FORBIDDEN", message: "Task not found" });
        if (task.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Task already completed" });
        await markTaskComplete(input.taskId);
        return { success: true };
      }),
  }),

  // -------------------------------------------------------------------------
  // Time Logs
  // -------------------------------------------------------------------------
  timeLogs: router({
    // Employee: clock in
    clockIn: employeeProcedure.mutation(async ({ ctx }) => {
      const active = await getActiveTimeLog(ctx.employee.id);
      if (active) throw new TRPCError({ code: "BAD_REQUEST", message: "Already clocked in" });
      const logId = await clockIn(ctx.employee.id);
      return { success: true, logId };
    }),

    // Employee: clock out
    clockOut: employeeProcedure
      .input(z.object({ logId: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        await clockOut(input.logId);
        return { success: true };
      }),

    // Employee: get active session
    activeSession: employeeProcedure.query(async ({ ctx }) => {
      return getActiveTimeLog(ctx.employee.id) ?? null;
    }),

    // Employee: own log history
    myLogs: employeeProcedure.query(async ({ ctx }) => {
      return listTimeLogsByEmployee(ctx.employee.id);
    }),

    // Admin: all logs with optional date filter
    listAll: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional() }).optional())
      .query(async ({ input }) => {
        return listAllTimeLogs(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
