import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../database/client';
import { tasks, timeSessions } from '../database/schema';
import {
  ActiveSessionInfo,
  DayDetail,
  DateSummary,
  TaskCalendarDay,
  TaskStats,
  TodaySummary,
  WeeklyStats,
  MonthlyStats,
  TimeSession,
  Task,
} from '../../shared/types';

/**
 * Returns YYYY-MM-DD in user's local timezone
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns unix timestamp (ms) for the end of a given local calendar day (23:59:59.999)
 */
export function getEndOfDayTimestamp(dateString: string): number {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/**
 * Returns unix timestamp (ms) for the start of a given local calendar day (00:00:00.000)
 */
export function getStartOfDayTimestamp(dateString: string): number {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export class SessionService {
  /**
   * Cleans up running sessions from previous days on startup.
   * If a session was running when the app or computer was closed on a previous date,
   * it closes that session at 23:59:59.999 of that previous date.
   */
  static cleanUpStaleRunningSessions(): void {
    const db = getDb();
    const today = getLocalDateString();

    const runningSessions = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.status, 'running'))
      .all();

    for (const session of runningSessions) {
      if (session.date < today) {
        console.log(
          `[SessionService] Auto-closing stale running session #${session.id} from previous date ${session.date}`
        );
        const endTimestamp = getEndOfDayTimestamp(session.date);
        const duration = Math.max(0, Math.floor((endTimestamp - session.startTime) / 1000));

        db.update(timeSessions)
          .set({
            endTime: endTimestamp,
            duration,
            status: 'completed',
          })
          .where(eq(timeSessions.id, session.id))
          .run();
      }
    }
  }

  /**
   * Handle midnight rollover while application is running.
   * If a session started yesterday is still active past midnight,
   * close it at yesterday's 23:59:59.999 and open a new session for today starting at 00:00:00.000.
   */
  static handleMidnightRollover(): void {
    const db = getDb();
    const today = getLocalDateString();

    const runningSession = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.status, 'running'))
      .get();

    if (runningSession && runningSession.date < today) {
      console.log(
        `[SessionService] Midnight rollover detected for running session #${runningSession.id}`
      );
      const endTimestamp = getEndOfDayTimestamp(runningSession.date);
      const duration = Math.max(0, Math.floor((endTimestamp - runningSession.startTime) / 1000));

      // Close previous date session
      db.update(timeSessions)
        .set({
          endTime: endTimestamp,
          duration,
          status: 'completed',
        })
        .where(eq(timeSessions.id, runningSession.id))
        .run();

      // Start today's session from midnight
      const startOfDay = getStartOfDayTimestamp(today);
      db.insert(timeSessions)
        .values({
          taskId: runningSession.taskId,
          date: today,
          startTime: startOfDay,
          endTime: null,
          duration: 0,
          status: 'running',
        })
        .run();
    }
  }

  /**
   * Get the active running session (if any)
   */
  static async getActiveSession(): Promise<ActiveSessionInfo | null> {
    this.handleMidnightRollover();
    const db = getDb();
    const today = getLocalDateString();

    const session = db
      .select()
      .from(timeSessions)
      .where(and(eq(timeSessions.status, 'running'), eq(timeSessions.date, today)))
      .get();

    if (!session) return null;

    const task = db.select().from(tasks).where(eq(tasks.id, session.taskId)).get();
    if (!task) return null;

    const currentElapsedSeconds = Math.max(0, Math.floor((Date.now() - session.startTime) / 1000));

    return {
      session: {
        id: session.id,
        taskId: session.taskId,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        status: session.status as 'running' | 'completed',
        taskName: task.name,
      },
      task: {
        id: task.id,
        name: task.name,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
      currentElapsedSeconds,
    };
  }

  /**
   * Start or resume a session for a task.
   * Pauses any currently active session first.
   */
  static async startSession(taskId: number): Promise<TimeSession> {
    this.handleMidnightRollover();
    const db = getDb();
    const today = getLocalDateString();

    // Verify task exists
    const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    // Pause any currently running session
    await this.pauseSession();

    // Create a new running session for today
    const now = Date.now();
    const inserted = db
      .insert(timeSessions)
      .values({
        taskId,
        date: today,
        startTime: now,
        endTime: null,
        duration: 0,
        status: 'running',
      })
      .returning()
      .get();

    // Update task's updatedAt timestamp
    db.update(tasks)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, taskId))
      .run();

    return {
      id: inserted.id,
      taskId: inserted.taskId,
      date: inserted.date,
      startTime: inserted.startTime,
      endTime: inserted.endTime,
      duration: inserted.duration,
      status: inserted.status as 'running' | 'completed',
      taskName: task.name,
    };
  }

  /**
   * Pause the currently running session
   */
  static async pauseSession(): Promise<TimeSession | null> {
    const db = getDb();
    const running = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.status, 'running'))
      .get();

    if (!running) return null;

    const now = Date.now();
    const duration = Math.max(0, Math.floor((now - running.startTime) / 1000));

    const updated = db
      .update(timeSessions)
      .set({
        endTime: now,
        duration,
        status: 'completed',
      })
      .where(eq(timeSessions.id, running.id))
      .returning()
      .get();

    const task = db.select().from(tasks).where(eq(tasks.id, updated.taskId)).get();

    return {
      id: updated.id,
      taskId: updated.taskId,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      duration: updated.duration,
      status: updated.status as 'running' | 'completed',
      taskName: task?.name,
    };
  }

  /**
   * Get Today's tracking summary for dashboard
   */
  static async getTodaySummary(): Promise<TodaySummary> {
    this.handleMidnightRollover();
    const db = getDb();
    const today = getLocalDateString();

    const allTasks = db.select().from(tasks).all();
    const todaySessions = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.date, today))
      .all();

    let totalSeconds = 0;
    let activeTaskInfo: TodaySummary['activeTask'] = null;

    const taskSummaries = allTasks.map((task) => {
      const taskSessions = todaySessions.filter((s) => s.taskId === task.id);
      let duration = 0;
      let isRunning = false;

      for (const s of taskSessions) {
        if (s.status === 'running') {
          isRunning = true;
          const liveDuration = Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
          duration += liveDuration;
          totalSeconds += liveDuration;

          activeTaskInfo = {
            task: {
              id: task.id,
              name: task.name,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt,
            },
            session: {
              id: s.id,
              taskId: s.taskId,
              date: s.date,
              startTime: s.startTime,
              endTime: s.endTime,
              duration: s.duration,
              status: s.status as 'running' | 'completed',
            },
            startTime: s.startTime,
          };
        } else {
          duration += s.duration;
          totalSeconds += s.duration;
        }
      }

      return {
        task: {
          id: task.id,
          name: task.name,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          todayDuration: duration,
          isRunning,
        },
        duration,
        isRunning,
      };
    });

    return {
      totalSeconds,
      tasks: taskSummaries,
      activeTask: activeTaskInfo,
    };
  }

  /**
   * Get day details breakdown across all tasks on a specific date
   */
  static async getDayDetail(dateString: string): Promise<DayDetail> {
    const db = getDb();
    const sessions = db
      .select({
        id: timeSessions.id,
        taskId: timeSessions.taskId,
        date: timeSessions.date,
        startTime: timeSessions.startTime,
        endTime: timeSessions.endTime,
        duration: timeSessions.duration,
        status: timeSessions.status,
        taskName: tasks.name,
      })
      .from(timeSessions)
      .innerJoin(tasks, eq(timeSessions.taskId, tasks.id))
      .where(eq(timeSessions.date, dateString))
      .all();

    let totalSeconds = 0;
    const taskMap = new Map<
      number,
      {
        taskId: number;
        taskName: string;
        totalSeconds: number;
        sessions: TimeSession[];
      }
    >();

    for (const s of sessions) {
      let duration = s.duration;
      if (s.status === 'running') {
        duration = Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
      }
      totalSeconds += duration;

      if (!taskMap.has(s.taskId)) {
        taskMap.set(s.taskId, {
          taskId: s.taskId,
          taskName: s.taskName,
          totalSeconds: 0,
          sessions: [],
        });
      }

      const entry = taskMap.get(s.taskId)!;
      entry.totalSeconds += duration;
      entry.sessions.push({
        id: s.id,
        taskId: s.taskId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        duration,
        status: s.status as 'running' | 'completed',
        taskName: s.taskName,
      });
    }

    return {
      date: dateString,
      totalSeconds,
      tasks: Array.from(taskMap.values()),
    };
  }

  /**
   * Get calendar day summaries for a specific task
   */
  static async getTaskCalendar(
    taskId: number,
    year: number,
    month: number
  ): Promise<TaskCalendarDay[]> {
    const db = getDb();
    const monthPadded = String(month).padStart(2, '0');
    const prefix = `${year}-${monthPadded}-`;

    const sessions = db
      .select()
      .from(timeSessions)
      .where(
        and(
          eq(timeSessions.taskId, taskId),
          sql`${timeSessions.date} LIKE ${prefix + '%'}`
        )
      )
      .all();

    const dateMap = new Map<string, { totalSeconds: number; sessions: TimeSession[] }>();

    for (const s of sessions) {
      let duration = s.duration;
      if (s.status === 'running') {
        duration = Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
      }

      if (!dateMap.has(s.date)) {
        dateMap.set(s.date, { totalSeconds: 0, sessions: [] });
      }

      const entry = dateMap.get(s.date)!;
      entry.totalSeconds += duration;
      entry.sessions.push({
        id: s.id,
        taskId: s.taskId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        duration,
        status: s.status as 'running' | 'completed',
      });
    }

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      totalSeconds: data.totalSeconds,
      sessions: data.sessions.sort((a, b) => a.startTime - b.startTime),
    }));
  }

  /**
   * Get comprehensive stats for a specific task: Today, Week, Month, All-Time
   */
  static async getTaskStats(taskId: number): Promise<TaskStats> {
    const db = getDb();
    const today = getLocalDateString();
    const now = new Date();

    // Week boundaries (Monday to Sunday)
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, ...
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const weekStartStr = getLocalDateString(monday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekEndStr = getLocalDateString(sunday);

    // Month prefix YYYY-MM-
    const year = now.getFullYear();
    const monthPadded = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${monthPadded}-`;

    const sessions = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.taskId, taskId))
      .all();

    let todaySeconds = 0;
    let weekSeconds = 0;
    let monthSeconds = 0;
    let allTimeSeconds = 0;

    for (const s of sessions) {
      let duration = s.duration;
      if (s.status === 'running') {
        duration = Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
      }

      allTimeSeconds += duration;

      if (s.date === today) {
        todaySeconds += duration;
      }

      if (s.date >= weekStartStr && s.date <= weekEndStr) {
        weekSeconds += duration;
      }

      if (s.date.startsWith(monthPrefix)) {
        monthSeconds += duration;
      }
    }

    return {
      taskId,
      todaySeconds,
      weekSeconds,
      monthSeconds,
      allTimeSeconds,
    };
  }

  /**
   * Get month calendar summaries across all tasks
   */
  static async getMonthCalendar(year: number, month: number): Promise<DateSummary[]> {
    const db = getDb();
    const monthPadded = String(month).padStart(2, '0');
    const prefix = `${year}-${monthPadded}-`;

    const sessions = db
      .select()
      .from(timeSessions)
      .where(sql`${timeSessions.date} LIKE ${prefix + '%'}`)
      .all();

    const dateMap = new Map<string, { totalSeconds: number; taskIds: Set<number> }>();

    for (const s of sessions) {
      let duration = s.duration;
      if (s.status === 'running') {
        duration = Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
      }

      if (!dateMap.has(s.date)) {
        dateMap.set(s.date, { totalSeconds: 0, taskIds: new Set() });
      }

      const entry = dateMap.get(s.date)!;
      entry.totalSeconds += duration;
      entry.taskIds.add(s.taskId);
    }

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      totalSeconds: data.totalSeconds,
      taskCount: data.taskIds.size,
    }));
  }

  /**
   * Get statistics for a specific week
   */
  static async getWeeklyStats(targetDateStr?: string): Promise<WeeklyStats> {
    const db = getDb();
    const baseDate = targetDateStr ? new Date(targetDateStr + 'T12:00:00') : new Date();

    const dayOfWeek = baseDate.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - diffToMonday);
    const weekStart = getLocalDateString(monday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekEnd = getLocalDateString(sunday);

    const allTasks = db.select().from(tasks).all();
    const sessions = db
      .select({
        id: timeSessions.id,
        taskId: timeSessions.taskId,
        date: timeSessions.date,
        startTime: timeSessions.startTime,
        endTime: timeSessions.endTime,
        duration: timeSessions.duration,
        status: timeSessions.status,
        taskName: tasks.name,
      })
      .from(timeSessions)
      .innerJoin(tasks, eq(timeSessions.taskId, tasks.id))
      .where(and(sql`${timeSessions.date} >= ${weekStart}`, sql`${timeSessions.date} <= ${weekEnd}`))
      .all();

    let totalSeconds = 0;
    const taskMap = new Map<number, { taskId: number; taskName: string; totalSeconds: number }>();
    const dayMap = new Map<string, number>();

    // Initialize days of the week Monday..Sunday
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyBreakdown: WeeklyStats['dailyBreakdown'] = [];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const curStr = getLocalDateString(cur);
      dayMap.set(curStr, 0);
      dailyBreakdown.push({
        date: curStr,
        dayName: dayNames[i],
        totalSeconds: 0,
      });
    }

    // Initialize tasks
    for (const t of allTasks) {
      taskMap.set(t.id, { taskId: t.id, taskName: t.name, totalSeconds: 0 });
    }

    for (const s of sessions) {
      let duration = s.duration;
      if (s.status === 'running') {
        duration = Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
      }

      totalSeconds += duration;

      if (!taskMap.has(s.taskId)) {
        taskMap.set(s.taskId, { taskId: s.taskId, taskName: s.taskName, totalSeconds: 0 });
      }
      taskMap.get(s.taskId)!.totalSeconds += duration;

      const dayIndex = dailyBreakdown.findIndex((d) => d.date === s.date);
      if (dayIndex !== -1) {
        dailyBreakdown[dayIndex].totalSeconds += duration;
      }
    }

    return {
      weekStart,
      weekEnd,
      totalSeconds,
      taskBreakdown: Array.from(taskMap.values()).filter((t) => t.totalSeconds > 0),
      dailyBreakdown,
    };
  }

  /**
   * Get statistics for a specific month
   */
  static async getMonthlyStats(targetYear?: number, targetMonth?: number): Promise<MonthlyStats> {
    const db = getDb();
    const now = new Date();
    const year = targetYear ?? now.getFullYear();
    const month = targetMonth ?? now.getMonth() + 1;
    const monthPadded = String(month).padStart(2, '0');
    const prefix = `${year}-${monthPadded}-`;

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const allTasks = db.select().from(tasks).all();
    const sessions = db
      .select({
        id: timeSessions.id,
        taskId: timeSessions.taskId,
        date: timeSessions.date,
        startTime: timeSessions.startTime,
        endTime: timeSessions.endTime,
        duration: timeSessions.duration,
        status: timeSessions.status,
        taskName: tasks.name,
      })
      .from(timeSessions)
      .innerJoin(tasks, eq(timeSessions.taskId, tasks.id))
      .where(sql`${timeSessions.date} LIKE ${prefix + '%'}`)
      .all();

    let totalSeconds = 0;
    const taskMap = new Map<number, { taskId: number; taskName: string; totalSeconds: number }>();
    const dateMap = new Map<string, number>();

    // Initialize all days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyBreakdown: MonthlyStats['dailyBreakdown'] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${monthPadded}-${String(day).padStart(2, '0')}`;
      dateMap.set(dateStr, 0);
      dailyBreakdown.push({ date: dateStr, totalSeconds: 0 });
    }

    for (const t of allTasks) {
      taskMap.set(t.id, { taskId: t.id, taskName: t.name, totalSeconds: 0 });
    }

    for (const s of sessions) {
      let duration = s.duration;
      if (s.status === 'running') {
        duration = Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
      }

      totalSeconds += duration;

      if (!taskMap.has(s.taskId)) {
        taskMap.set(s.taskId, { taskId: s.taskId, taskName: s.taskName, totalSeconds: 0 });
      }
      taskMap.get(s.taskId)!.totalSeconds += duration;

      const dayEntry = dailyBreakdown.find((d) => d.date === s.date);
      if (dayEntry) {
        dayEntry.totalSeconds += duration;
      }
    }

    return {
      year,
      month,
      monthName: monthNames[month - 1],
      totalSeconds,
      taskBreakdown: Array.from(taskMap.values()).filter((t) => t.totalSeconds > 0),
      dailyBreakdown,
    };
  }
}
