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

    // Fetch all sessions for today to compute today's duration and active status
    const todaySessions = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.date, today))
      .all();

    // Fetch all-time sessions for total duration
    const allSessions = db.select().from(timeSessions).all();

    const result: Task[] = allTasks.map((task) => {
      // Calculate today's duration
      const taskTodaySessions = todaySessions.filter((s) => s.taskId === task.id);
      let todayDuration = 0;
      let isRunning = false;

      for (const s of taskTodaySessions) {
        if (s.status === 'running') {
          isRunning = true;
          const liveElapsed = Math.floor((Date.now() - s.startTime) / 1000);
          todayDuration += Math.max(0, liveElapsed);
        } else {
          todayDuration += s.duration;
        }
      }

      // Calculate all-time duration
      const taskAllSessions = allSessions.filter((s) => s.taskId === task.id);
      let totalDuration = 0;
      for (const s of taskAllSessions) {
        if (s.status === 'running') {
          const liveElapsed = Math.floor((Date.now() - s.startTime) / 1000);
          totalDuration += Math.max(0, liveElapsed);
        } else {
          totalDuration += s.duration;
        }
      }

      return {
        id: task.id,
        name: task.name,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        todayDuration,
        totalDuration,
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
    const todaySessions = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.taskId, id))
      .all();

    let todayDuration = 0;
    let totalDuration = 0;
    let isRunning = false;

    for (const s of todaySessions) {
      const isToday = s.date === today;
      if (s.status === 'running') {
        const liveElapsed = Math.floor((Date.now() - s.startTime) / 1000);
        if (isToday) {
          isRunning = true;
          todayDuration += Math.max(0, liveElapsed);
        }
        totalDuration += Math.max(0, liveElapsed);
      } else {
        if (isToday) {
          todayDuration += s.duration;
        }
        totalDuration += s.duration;
      }
    }

    return {
      id: task.id,
      name: task.name,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      todayDuration,
      totalDuration,
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
