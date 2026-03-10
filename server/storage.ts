import { userProfiles, events, tasks, type UserProfile, type InsertProfile, type CalendarEvent, type InsertEvent, type Task, type InsertTask } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export class DatabaseStorage {
  async getProfileByDeviceId(deviceId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.deviceId, deviceId));
    return profile || undefined;
  }

  async createProfile(profile: InsertProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateProfile(id: number, deviceId: string, profile: Partial<InsertProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles).set(profile)
      .where(and(eq(userProfiles.id, id), eq(userProfiles.deviceId, deviceId)))
      .returning();
    return updated || undefined;
  }

  async deleteProfileByDeviceId(deviceId: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.deviceId, deviceId));
    await db.delete(events).where(eq(events.deviceId, deviceId));
    await db.delete(userProfiles).where(eq(userProfiles.deviceId, deviceId));
  }

  async getEvents(deviceId: string): Promise<CalendarEvent[]> {
    return db.select().from(events).where(eq(events.deviceId, deviceId)).orderBy(events.date, events.startTime);
  }

  async getEventsByDateRange(deviceId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    return db.select().from(events).where(
      and(eq(events.deviceId, deviceId), gte(events.date, startDate), lte(events.date, endDate))
    ).orderBy(events.date, events.startTime);
  }

  async getEvent(id: number, deviceId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.deviceId, deviceId)));
    return event || undefined;
  }

  async createEvent(event: InsertEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async createEvents(eventList: InsertEvent[]): Promise<CalendarEvent[]> {
    if (eventList.length === 0) return [];
    const created = await db.insert(events).values(eventList).returning();
    return created;
  }

  async updateEvent(id: number, deviceId: string, event: Partial<InsertEvent>): Promise<CalendarEvent | undefined> {
    const [updated] = await db.update(events).set(event)
      .where(and(eq(events.id, id), eq(events.deviceId, deviceId)))
      .returning();
    return updated || undefined;
  }

  async deleteEvent(id: number, deviceId: string): Promise<void> {
    await db.delete(events).where(and(eq(events.id, id), eq(events.deviceId, deviceId)));
  }

  async getTasks(deviceId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.deviceId, deviceId)).orderBy(tasks.dueDate, tasks.createdAt);
  }

  async getTask(id: number, deviceId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.deviceId, deviceId)));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, deviceId: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(task)
      .where(and(eq(tasks.id, id), eq(tasks.deviceId, deviceId)))
      .returning();
    return updated || undefined;
  }

  async deleteTask(id: number, deviceId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.deviceId, deviceId)));
  }

  async toggleTask(id: number, deviceId: string): Promise<Task | undefined> {
    const task = await this.getTask(id, deviceId);
    if (!task) return undefined;
    const [updated] = await db.update(tasks).set({
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : null,
    }).where(and(eq(tasks.id, id), eq(tasks.deviceId, deviceId))).returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
