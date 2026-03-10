import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  schoolHours: text("school_hours"),
  workType: text("work_type"),
  workHours: text("work_hours"),
  scheduleDetails: text("schedule_details"),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id"),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  category: text("category").notNull().default("general"),
  color: text("color").notNull().default("blue"),
  priority: text("priority").notNull().default("medium"),
  profileId: integer("profile_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id"),
  title: text("title").notNull(),
  notes: text("notes"),
  dueDate: text("due_date"),
  dueTime: text("due_time"),
  category: text("category").notNull().default("personal"),
  color: text("color").notNull().default("blue"),
  priority: text("priority").notNull().default("medium"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  linkedEventId: integer("linked_event_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type CalendarEvent = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
