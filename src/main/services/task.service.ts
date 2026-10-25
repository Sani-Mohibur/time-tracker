import { eq, desc } from 'drizzle-orm';
import { getDb } from '../database/client';
import { tasks, timeSessions } from '../database/schema';
import { Task } from '../../shared/types';
import { getLocalDateString } from './session.service';

/**
 * Service for managing Task entities
 */
export class TaskService {
  /**
   * Get all tasks with today's tracked duration and running status
   */
  static async getAllTasks(): Promise<Task[]> {
    const db = getDb();
    const allTasks = db.select().from(tasks).orderBy(desc(tasks.updatedAt)).all();
    const today = getLocalDateString();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);

    // Fetch all sessions for today to compute today's duration and active status
    const todaySessions = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.date, today))
      .all();

    // Fetch all-time sessions for total duration
    const allSessions = db.select().from(timeSessions).all();

    const result: Task[] = allTasks.map((task) => {
      // Calculate today's duration (completed sessions only; live session is added dynamically on frontend)
      const taskTodaySessions = todaySessions.filter((s) => s.taskId === task.id);
      const taskAllSessions = allSessions.filter((s) => s.taskId === task.id);

      let todayDuration = 0;
      let totalDuration = 0;
      let recentDuration = 0;
      let isRunning = false;
      let lastTrackedAt: number | null = null;

      for (const s of taskTodaySessions) {
        if (s.status === 'running') {
          isRunning = true;
        } else {
          todayDuration += s.duration;
        }
      }

      // Calculate all-time and recent duration, lastTrackedAt, and sessionCount
      for (const s of taskAllSessions) {
        const sessionTime = s.endTime || s.startTime;
        if (!lastTrackedAt || sessionTime > lastTrackedAt) {
          lastTrackedAt = sessionTime;
        }

        if (s.status === 'running') {
          isRunning = true;
        } else {
          totalDuration += s.duration;
          if (s.date >= sevenDaysAgoStr) {
            recentDuration += s.duration;
          }
        }
      }

      return {
        id: task.id,
        name: task.name,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        todayDuration,
        totalDuration,
        recentDuration,
        lastTrackedAt,
        sessionCount: taskAllSessions.length,
        isRunning,
      };
    });

    return result;
  }

  /**
   * Get single task by ID
   */
  static async getTaskById(id: number): Promise<Task | null> {
    const db = getDb();
    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) return null;

    const today = getLocalDateString();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);

    const taskSessions = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.taskId, id))
      .all();

    let todayDuration = 0;
    let totalDuration = 0;
    let recentDuration = 0;
    let isRunning = false;
    let lastTrackedAt: number | null = null;

    for (const s of taskSessions) {
      const isToday = s.date === today;
      const sessionTime = s.endTime || s.startTime;
      if (!lastTrackedAt || sessionTime > lastTrackedAt) {
        lastTrackedAt = sessionTime;
      }

      if (s.status === 'running') {
        if (isToday) {
          isRunning = true;
        }
      } else {
        if (isToday) {
          todayDuration += s.duration;
        }
        totalDuration += s.duration;
        if (s.date >= sevenDaysAgoStr) {
          recentDuration += s.duration;
        }
      }
    }

    return {
      id: task.id,
      name: task.name,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      todayDuration,
      totalDuration,
      recentDuration,
      lastTrackedAt,
      sessionCount: taskSessions.length,
      isRunning,
    };
  }

  /**
   * Create a new task
   */
  static async createTask(name: string): Promise<Task> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Task name cannot be empty');
    }

    const db = getDb();
    const existing = db.select().from(tasks).where(eq(tasks.name, trimmed)).get();
    if (existing) {
      throw new Error(`A task named "${trimmed}" already exists`);
    }

    const now = new Date().toISOString();
    const inserted = db
      .insert(tasks)
      .values({
        name: trimmed,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return {
      id: inserted.id,
      name: inserted.name,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
      todayDuration: 0,
      totalDuration: 0,
      recentDuration: 0,
      lastTrackedAt: null,
      sessionCount: 0,
      isRunning: false,
    };
  }

  /**
   * Delete a task and all its associated time sessions
   */
  static async deleteTask(id: number): Promise<boolean> {
    const db = getDb();
    // Foreign key CASCADE in SQLite schema deletes associated sessions automatically
    const result = db.delete(tasks).where(eq(tasks.id, id)).run();
    return result.changes > 0;
  }
}
