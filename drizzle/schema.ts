import {
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", ["user", "admin", "employee"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "completed"]);

// ---------------------------------------------------------------------------
// Users — authenticated accounts
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordResetToken: text("passwordResetToken"),
  passwordResetExpiry: timestamp("passwordResetExpiry"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Employees — internal team members managed by admins
// ---------------------------------------------------------------------------
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ---------------------------------------------------------------------------
// Tasks — assigned by admin to a specific employee
// ---------------------------------------------------------------------------
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  status: taskStatusEnum("status").default("pending").notNull(),
  assignedToEmployeeId: integer("assignedToEmployeeId").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ---------------------------------------------------------------------------
// Time Logs — clock-in / clock-out sessions per employee
// ---------------------------------------------------------------------------
export const timeLogs = pgTable("timeLogs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId").notNull(),
  clockIn: bigint("clockIn", { mode: "number" }).notNull(),
  clockOut: bigint("clockOut", { mode: "number" }),
  hoursWorked: real("hoursWorked"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = typeof timeLogs.$inferInsert;

// ---------------------------------------------------------------------------
// Shifts — scheduled working hours for employees
// ---------------------------------------------------------------------------
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId").notNull(),
  dayOfWeek: integer("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
