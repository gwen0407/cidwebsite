import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers.js";
import type { TrpcContext } from "./_core/context.js";
import type { User } from "../drizzle/schema.js";

// ---------------------------------------------------------------------------
// Mock the db module so tests don't need a real database
// ---------------------------------------------------------------------------
vi.mock("./db", () => ({
  addEmployee: vi.fn().mockResolvedValue(undefined),
  listEmployees: vi.fn().mockResolvedValue([
    { id: 1, email: "alice@example.com", name: "Alice", userId: 10, createdAt: new Date() },
  ]),
  getEmployeeByEmail: vi.fn().mockResolvedValue(undefined),
  getEmployeeByUserId: vi.fn().mockResolvedValue({
    id: 1,
    email: "alice@example.com",
    name: "Alice",
    userId: 10,
    createdAt: new Date(),
  }),
  linkEmployeeToUser: vi.fn().mockResolvedValue(undefined),
  assignTask: vi.fn().mockResolvedValue(undefined),
  listTasksByEmployee: vi.fn().mockResolvedValue([
    { id: 42, description: "Write report", status: "pending", assignedToEmployeeId: 1, completedAt: null, createdAt: new Date() },
  ]),
  listAllTasks: vi.fn().mockResolvedValue([]),
  markTaskComplete: vi.fn().mockResolvedValue(undefined),
  clockIn: vi.fn().mockResolvedValue(99),
  clockOut: vi.fn().mockResolvedValue(undefined),
  getActiveTimeLog: vi.fn().mockResolvedValue(null),
  listTimeLogsByEmployee: vi.fn().mockResolvedValue([]),
  listAllTimeLogs: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Context factories
// ---------------------------------------------------------------------------
const adminUser: User = {
  id: 1,
  openId: "admin-open-id",
  email: "admin@example.com",
  name: "Admin User",
  loginMethod: "manus",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const employeeUser: User = {
  id: 10,
  openId: "emp-open-id",
  email: "alice@example.com",
  name: "Alice",
  loginMethod: "manus",
  role: "employee",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function makeCtx(user: User): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("employees router", () => {
  it("admin can list employees", async () => {
    const caller = appRouter.createCaller(makeCtx(adminUser));
    const result = await caller.employees.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]?.email).toBe("alice@example.com");
  });

  it("non-admin cannot list employees", async () => {
    const caller = appRouter.createCaller(makeCtx(employeeUser));
    await expect(caller.employees.list()).rejects.toThrow("You do not have required permission (10002)");
  });

  it("admin can add an employee", async () => {
    const caller = appRouter.createCaller(makeCtx(adminUser));
    const result = await caller.employees.add({ email: "bob@example.com", name: "Bob" });
    expect(result.success).toBe(true);
  });
});

describe("tasks router", () => {
  it("admin can assign a task", async () => {
    const caller = appRouter.createCaller(makeCtx(adminUser));
    const result = await caller.tasks.assign({ description: "Prepare slides", employeeId: 1 });
    expect(result.success).toBe(true);
  });

  it("employee can view their tasks", async () => {
    const caller = appRouter.createCaller(makeCtx(employeeUser));
    const tasks = await caller.tasks.myTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks[0]?.description).toBe("Write report");
  });

  it("employee can mark a task complete", async () => {
    const caller = appRouter.createCaller(makeCtx(employeeUser));
    const result = await caller.tasks.complete({ taskId: 42 });
    expect(result.success).toBe(true);
  });
});

describe("timeLogs router", () => {
  it("employee can clock in when no active session", async () => {
    const caller = appRouter.createCaller(makeCtx(employeeUser));
    const result = await caller.timeLogs.clockIn();
    expect(result.success).toBe(true);
    expect(result.logId).toBe(99);
  });

  it("employee can clock out", async () => {
    const caller = appRouter.createCaller(makeCtx(employeeUser));
    const result = await caller.timeLogs.clockOut({ logId: 99 });
    expect(result.success).toBe(true);
  });

  it("employee can view their logs", async () => {
    const caller = appRouter.createCaller(makeCtx(employeeUser));
    const logs = await caller.timeLogs.myLogs();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("admin can view all time logs", async () => {
    const caller = appRouter.createCaller(makeCtx(adminUser));
    const logs = await caller.timeLogs.listAll();
    expect(Array.isArray(logs)).toBe(true);
  });
});

describe("auth router", () => {
  it("me returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});
