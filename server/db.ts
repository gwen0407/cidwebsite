import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { employees, InsertEmployee, InsertShift, InsertTask, InsertTimeLog, InsertUser, shifts, tasks, timeLogs, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export async function addEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(employees).values(data);
}

export async function listEmployees() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees).orderBy(desc(employees.createdAt));
}

export async function getEmployeeByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.email, email)).limit(1);
  return result[0] ?? undefined;
}

export async function getEmployeeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return result[0] ?? undefined;
}

export async function linkEmployeeToUser(employeeId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set({ userId }).where(eq(employees.id, employeeId));
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function assignTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data);
  return result;
}

export async function listTasksByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.assignedToEmployeeId, employeeId)).orderBy(desc(tasks.createdAt));
}

export async function listAllTasks(opts?: { startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.startDate) conditions.push(gte(tasks.createdAt, opts.startDate));
  if (opts?.endDate) conditions.push(lte(tasks.createdAt, opts.endDate));
  const query = conditions.length > 0
    ? db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt))
    : db.select().from(tasks).orderBy(desc(tasks.createdAt));
  return query;
}

export async function markTaskComplete(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set({ status: "completed", completedAt: new Date() }).where(eq(tasks.id, taskId));
}

// ---------------------------------------------------------------------------
// Time Logs
// ---------------------------------------------------------------------------

export async function clockIn(employeeId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  const result = await db.insert(timeLogs).values({ employeeId, clockIn: now });
  // Return the inserted id
  const inserted = result as unknown as { insertId: number };
  return inserted.insertId;
}

export async function clockOut(logId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(timeLogs).where(eq(timeLogs.id, logId)).limit(1);
  if (!rows[0]) throw new Error("Time log not found");
  const log = rows[0];
  const now = Date.now();
  const hoursWorked = (now - log.clockIn) / 1000 / 3600;
  await db.update(timeLogs).set({ clockOut: now, hoursWorked: parseFloat(hoursWorked.toFixed(4)) }).where(eq(timeLogs.id, logId));
}

export async function getActiveTimeLog(employeeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(timeLogs)
    .where(and(eq(timeLogs.employeeId, employeeId), eq(timeLogs.clockOut as unknown as typeof timeLogs.clockOut, null as unknown as number)))
    .limit(1);
  return result[0] ?? undefined;
}

export async function listTimeLogsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeLogs).where(eq(timeLogs.employeeId, employeeId)).orderBy(desc(timeLogs.createdAt));
}

export async function listAllTimeLogs(opts?: { startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.startDate) conditions.push(gte(timeLogs.createdAt, opts.startDate));
  if (opts?.endDate) conditions.push(lte(timeLogs.createdAt, opts.endDate));
  const query = conditions.length > 0
    ? db.select().from(timeLogs).where(and(...conditions)).orderBy(desc(timeLogs.createdAt))
    : db.select().from(timeLogs).orderBy(desc(timeLogs.createdAt));
  return query;
}

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------

export async function addShift(data: InsertShift) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(shifts).values(data);
}

export async function listShiftsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shifts).where(eq(shifts.employeeId, employeeId));
}

export async function deleteShift(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(shifts).where(eq(shifts.id, shiftId));
}

export async function hasActiveShift(employeeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const employeeShifts = await db.select().from(shifts).where(
    and(
      eq(shifts.employeeId, employeeId),
      eq(shifts.dayOfWeek, dayOfWeek)
    )
  );

  return employeeShifts.some(shift => {
    return currentTime >= shift.startTime && currentTime <= shift.endTime;
  });
}
