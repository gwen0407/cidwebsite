import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, employeeProcedure, router } from "./_core/trpc";
import { authRouter } from "./_core/auth";
import superjson from "superjson";
import {
  addEmployee,
  assignTask,
  clockIn,
  clockOut,
  getActiveTimeLog,
  getEmployeeByEmail,
  listAllTimeLogs,
  listAllTasks,
  listEmployees,
  listTasksByEmployee,
  listTimeLogsByEmployee,
  markTaskComplete,
  addShift,
  deleteShift,
  listShiftsByEmployee,
  hasActiveShift,
} from "./db";

// ---------------------------------------------------------------------------
// Routers
// ---------------------------------------------------------------------------
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
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
        await addEmployee(input.email, input.name);
        return { success: true };
      }),
    // Shift management
    addShift: adminProcedure
      .input(
        z.object({
          employeeId: z.number().int(),
          dayOfWeek: z.number().int().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .mutation(async ({ input }) => {
        await addShift(input);
        return { success: true };
      }),
    listShifts: adminProcedure
      .input(z.object({ employeeId: z.number().int() }))
      .query(async ({ input }) => {
        return listShiftsByEmployee(input.employeeId);
      }),
    deleteShift: adminProcedure
      .input(z.object({ shiftId: z.number().int() }))
      .mutation(async ({ input }) => {
        await deleteShift(input.shiftId);
        return { success: true };
      }),
  }),
  // -------------------------------------------------------------------------
  // Shifts (employee-facing + admin)
  // -------------------------------------------------------------------------
  shifts: router({
    // Employee: get their active shift for today
    active: employeeProcedure.query(async ({ ctx }) => {
      const shifts = await listShiftsByEmployee(ctx.employee.id);
      const today = new Date().getDay(); // 0=Sun, 6=Sat
      return shifts.find((s) => s.dayOfWeek === today) ?? null;
    }),
    // Employee: list all their shifts
    list: employeeProcedure.query(async ({ ctx }) => {
      return listShiftsByEmployee(ctx.employee.id);
    }),
    // Admin: add a shift
    add: adminProcedure
      .input(
        z.object({
          employeeId: z.number().int(),
          dayOfWeek: z.number().int().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .mutation(async ({ input }) => {
        await addShift(input);
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
        await assignTask(input.employeeId, input.description);
        return { success: true };
      }),
    // Admin: view all tasks
    listAll: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional() }).optional())
      .query(async () => {
        return listAllTasks();
      }),
    // Employee: view own tasks
    myTasks: employeeProcedure.query(async ({ ctx }) => {
      return listTasksByEmployee(ctx.employee.id);
    }),
    // Employee: mark a task complete
    complete: employeeProcedure
      .input(z.object({ taskId: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
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
    clockIn: employeeProcedure.mutation(async ({ ctx }) => {
      const active = await getActiveTimeLog(ctx.employee.id);
      if (active) throw new TRPCError({ code: "BAD_REQUEST", message: "Already clocked in" });
      const logId = await clockIn(ctx.employee.id);
      return { success: true, logId };
    }),
    clockOut: employeeProcedure
      .input(z.object({ logId: z.number().int() }))
      .mutation(async ({ input }) => {
        await clockOut(input.logId);
        return { success: true };
      }),
    activeSession: employeeProcedure.query(async ({ ctx }) => {
      return (await getActiveTimeLog(ctx.employee.id)) ?? null;
    }),
    myLogs: employeeProcedure.query(async ({ ctx }) => {
      return listTimeLogsByEmployee(ctx.employee.id);
    }),
    listAll: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional() }).optional())
      .query(async () => {
        return listAllTimeLogs();
      }),
  }),
});

export type AppRouter = typeof appRouter;
