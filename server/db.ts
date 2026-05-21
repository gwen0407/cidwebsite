import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, isNull, lte, gte } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (_db) return _db;
  if (!ENV.databaseUrl) {
    console.warn("[Database] DATABASE_URL is not set");
    return null;
  }
  const sql = neon(ENV.databaseUrl);
  _db = drizzle(sql, { schema });
  return _db;
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------
export async function getUserByEmail(email: string): Promise<schema.User | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<schema.User | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
  role?: "user" | "admin" | "employee";
}): Promise<schema.User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await bcrypt.hash(data.password, 12);
  const rows = await db
    .insert(schema.users)
    .values({
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name ?? null,
      role: data.role ?? "user",
    })
    .returning();
  return rows[0];
}

export async function verifyPassword(user: schema.User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function updateUserLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(schema.users).set({ lastSignedIn: new Date() }).where(eq(schema.users.id, id));
}

export async function setPasswordResetToken(email: string, token: string, expiry: Date): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(schema.users)
    .set({ passwordResetToken: token, passwordResetExpiry: expiry })
    .where(eq(schema.users.email, email.toLowerCase()))
    .returning();
  return result.length > 0;
}

export async function getUserByResetToken(token: string): Promise<schema.User | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.passwordResetToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserByResetToken(token);
  if (!user) return false;
  // Check expiry
  if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) return false;
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(schema.users)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  return true;
}

// ---------------------------------------------------------------------------
// Employee helpers
// ---------------------------------------------------------------------------
export async function addEmployee(email: string, name?: string): Promise<schema.Employee> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.insert(schema.employees).values({ email: email.toLowerCase(), name: name ?? null }).returning();
  return rows[0];
}

export async function listEmployees(): Promise<schema.Employee[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.employees);
}

export async function getEmployeeByUserId(userId: number): Promise<schema.Employee | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(schema.employees).where(eq(schema.employees.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getEmployeeByEmail(email: string): Promise<schema.Employee | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(schema.employees).where(eq(schema.employees.email, email.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function linkEmployeeToUser(employeeId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(schema.employees).set({ userId }).where(eq(schema.employees.id, employeeId));
}

// ---------------------------------------------------------------------------
// Task helpers
// ---------------------------------------------------------------------------
export async function assignTask(employeeId: number, description: string): Promise<schema.Task> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.insert(schema.tasks).values({ assignedToEmployeeId: employeeId, description }).returning();
  return rows[0];
}

export async function listTasksByEmployee(employeeId: number): Promise<schema.Task[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.tasks).where(eq(schema.tasks.assignedToEmployeeId, employeeId));
}

export async function listAllTasks(): Promise<schema.Task[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.tasks);
}

export async function markTaskComplete(taskId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(schema.tasks).set({ status: "completed", completedAt: new Date() }).where(eq(schema.tasks.id, taskId));
}

// ---------------------------------------------------------------------------
// Time Log helpers
// ---------------------------------------------------------------------------
export async function clockIn(employeeId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.insert(schema.timeLogs).values({ employeeId, clockIn: Date.now() }).returning();
  return rows[0].id;
}

export async function clockOut(logId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select().from(schema.timeLogs).where(eq(schema.timeLogs.id, logId)).limit(1);
  const log = rows[0];
  if (!log) return;
  const clockOutMs = Date.now();
  const hoursWorked = (clockOutMs - log.clockIn) / 3_600_000;
  await db.update(schema.timeLogs).set({ clockOut: clockOutMs, hoursWorked }).where(eq(schema.timeLogs.id, logId));
}

export async function getActiveTimeLog(employeeId: number): Promise<schema.TimeLog | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.timeLogs)
    .where(and(eq(schema.timeLogs.employeeId, employeeId), isNull(schema.timeLogs.clockOut)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTimeLogsByEmployee(employeeId: number): Promise<schema.TimeLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.timeLogs).where(eq(schema.timeLogs.employeeId, employeeId));
}

export async function listAllTimeLogs(filter?: { startDate?: Date; endDate?: Date }): Promise<schema.TimeLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.timeLogs);
}

// ---------------------------------------------------------------------------
// Shift helpers
// ---------------------------------------------------------------------------
export async function addShift(data: { employeeId: number; dayOfWeek: number; startTime: string; endTime: string }): Promise<schema.Shift> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.insert(schema.shifts).values(data).returning();
  return rows[0];
}

export async function listShiftsByEmployee(employeeId: number): Promise<schema.Shift[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.shifts).where(eq(schema.shifts.employeeId, employeeId));
}

export async function deleteShift(shiftId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(schema.shifts).where(eq(schema.shifts.id, shiftId));
}

export async function hasActiveShift(employeeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const rows = await db
    .select()
    .from(schema.shifts)
    .where(
      and(
        eq(schema.shifts.employeeId, employeeId),
        eq(schema.shifts.dayOfWeek, dayOfWeek),
        lte(schema.shifts.startTime, currentTime),
        gte(schema.shifts.endTime, currentTime)
      )
    )
    .limit(1);
  return rows.length > 0;
}
