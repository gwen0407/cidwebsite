import {
  bigint,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Employees — internal team members managed by admins
// ---------------------------------------------------------------------------
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  /** The linked user account (nullable — may be invited before they sign in) */
  userId: int("userId"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ---------------------------------------------------------------------------
// Tasks — assigned by admin to a specific employee
// ---------------------------------------------------------------------------
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["pending", "completed"]).default("pending").notNull(),
  assignedToEmployeeId: int("assignedToEmployeeId").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ---------------------------------------------------------------------------
// Time Logs — clock-in / clock-out sessions per employee
// ---------------------------------------------------------------------------
export const timeLogs = mysqlTable("timeLogs", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  clockIn: bigint("clockIn", { mode: "number" }).notNull(),   // UTC ms
  clockOut: bigint("clockOut", { mode: "number" }),           // UTC ms, null while active
  hoursWorked: float("hoursWorked"),                          // computed on clock-out
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = typeof timeLogs.$inferInsert;

// ---------------------------------------------------------------------------
// Shifts — scheduled working hours for employees
// ---------------------------------------------------------------------------
export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("startTime", { length: 5 }).notNull(), // "HH:mm"
  endTime: varchar("endTime", { length: 5 }).notNull(),   // "HH:mm"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
