import {
  ElectronAPI,
  Task,
  TimeSession,
  ActiveSessionInfo,
  TodaySummary,
  DayDetail,
  TaskCalendarDay,
  TaskStats,
  DateSummary,
  WeeklyStats,
  MonthlyStats,
} from '@shared/types';
import { getTodayString } from '../utils/date';

const STORAGE_KEY_TASKS = 'tt_browser_tasks';
const STORAGE_KEY_SESSIONS = 'tt_browser_sessions';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to persist tasks to localStorage:', err);
  }
}

function loadSessions(): TimeSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSessions(sessions: TimeSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to persist sessions to localStorage:', err);
  }
}

export const browserApi: ElectronAPI = {
  tasks: {
    getAll: async (): Promise<Task[]> => {
      const tasks = loadTasks();
      const sessions = loadSessions();
      const today = getTodayString();
      const activeSession = sessions.find((s) => s.status === 'running');

      return tasks.map((task) => {
        const taskSessions = sessions.filter((s) => s.taskId === task.id);
        const todaySessions = taskSessions.filter((s) => s.date === today);

        const totalDuration = taskSessions.reduce((sum, s) => {
          if (s.status === 'running') {
            return sum + Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
          }
          return sum + (s.duration || 0);
        }, 0);

        const todayDuration = todaySessions.reduce((sum, s) => {
          if (s.status === 'running') {
            return sum + Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
          }
          return sum + (s.duration || 0);
        }, 0);

        return {
          ...task,
          todayDuration,
          totalDuration,
          isRunning: activeSession?.taskId === task.id,
        };
      });
    },

    getById: async (id: number): Promise<Task | null> => {
      const all = await browserApi.tasks.getAll();
      return all.find((t) => t.id === id) || null;
    },

    create: async (name: string): Promise<Task> => {
      const tasks = loadTasks();
      const newTask: Task = {
        id: Date.now(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        todayDuration: 0,
        totalDuration: 0,
        isRunning: false,
      };
      tasks.push(newTask);
      saveTasks(tasks);
      return newTask;
    },

    delete: async (id: number): Promise<boolean> => {
      const tasks = loadTasks().filter((t) => t.id !== id);
      const sessions = loadSessions().filter((s) => s.taskId !== id);
      saveTasks(tasks);
      saveSessions(sessions);
      return true;
    },
  },

  sessions: {
    getActive: async (): Promise<ActiveSessionInfo | null> => {
      const sessions = loadSessions();
      const running = sessions.find((s) => s.status === 'running');
      if (!running) return null;

      const tasks = loadTasks();
      const task = tasks.find((t) => t.id === running.taskId);
      if (!task) return null;

      const currentElapsedSeconds = Math.max(0, Math.floor((Date.now() - running.startTime) / 1000));
      return {
        session: running,
        task,
        currentElapsedSeconds,
      };
    },

    start: async (taskId: number): Promise<TimeSession> => {
      const tasks = loadTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);

      const sessions = loadSessions();
      const now = Date.now();

      // Pause any currently running session
      sessions.forEach((s) => {
        if (s.status === 'running') {
          s.status = 'completed';
          s.endTime = now;
          s.duration = Math.max(0, Math.floor((now - s.startTime) / 1000));
        }
      });

      const newSession: TimeSession = {
        id: now,
        taskId,
        date: getTodayString(),
        startTime: now,
        endTime: null,
        duration: 0,
        status: 'running',
        taskName: task.name,
      };

      sessions.push(newSession);
      saveSessions(sessions);
      return newSession;
    },

    pause: async (): Promise<TimeSession | null> => {
      const sessions = loadSessions();
      const now = Date.now();
      let paused: TimeSession | null = null;

      sessions.forEach((s) => {
        if (s.status === 'running') {
          s.status = 'completed';
          s.endTime = now;
          s.duration = Math.max(0, Math.floor((now - s.startTime) / 1000));
          paused = s;
        }
      });

      if (paused) {
        saveSessions(sessions);
      }
      return paused;
    },

    getTodaySummary: async (): Promise<TodaySummary> => {
      const tasks = await browserApi.tasks.getAll();
      const sessions = loadSessions();
      const today = getTodayString();
      const todaySessions = sessions.filter((s) => s.date === today);

      const activeSession = await browserApi.sessions.getActive();

      const taskSummaries = tasks.map((task) => {
        const taskTodaySessions = todaySessions.filter((s) => s.taskId === task.id);
        const duration = taskTodaySessions.reduce((sum, s) => {
          if (s.status === 'running') {
            return sum + Math.max(0, Math.floor((Date.now() - s.startTime) / 1000));
          }
          return sum + (s.duration || 0);
        }, 0);

        return {
          task,
          duration,
          isRunning: activeSession?.task.id === task.id,
        };
      });

      const totalSeconds = taskSummaries.reduce((sum, t) => sum + t.duration, 0);

      return {
        totalSeconds,
        tasks: taskSummaries,
        activeTask: activeSession
          ? {
              task: activeSession.task,
              session: activeSession.session,
              startTime: activeSession.session.startTime,
            }
          : null,
      };
    },

    getByDate: async (dateStr: string): Promise<DayDetail> => {
      const tasks = loadTasks();
      const sessions = loadSessions().filter((s) => s.date === dateStr);

      const taskMap = new Map<number, TimeSession[]>();
      sessions.forEach((s) => {
        const list = taskMap.get(s.taskId) || [];
        list.push(s);
        taskMap.set(s.taskId, list);
      });

      const taskBreakdowns = Array.from(taskMap.entries()).map(([taskId, sess]) => {
        const task = tasks.find((t) => t.id === taskId);
        const total = sess.reduce((sum, s) => sum + (s.duration || 0), 0);
        return {
          taskId,
          taskName: task?.name || 'Unknown Task',
          totalSeconds: total,
          sessions: sess,
        };
      });

      const totalSeconds = taskBreakdowns.reduce((sum, t) => sum + t.totalSeconds, 0);

      return {
        date: dateStr,
        totalSeconds,
        tasks: taskBreakdowns,
      };
    },

    getTaskCalendar: async (taskId: number, year: number, month: number): Promise<TaskCalendarDay[]> => {
      const sessions = loadSessions().filter((s) => {
        if (s.taskId !== taskId) return false;
        const [y, m] = s.date.split('-').map(Number);
        return y === year && m === month;
      });

      const dateMap = new Map<string, TimeSession[]>();
      sessions.forEach((s) => {
        const list = dateMap.get(s.date) || [];
        list.push(s);
        dateMap.set(s.date, list);
      });

      return Array.from(dateMap.entries()).map(([date, daySessions]) => ({
        date,
        totalSeconds: daySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
        sessions: daySessions,
      }));
    },

    getTaskStats: async (taskId: number): Promise<TaskStats> => {
      const sessions = loadSessions().filter((s) => s.taskId === taskId);
      const today = getTodayString();
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Week calculation
      const dayOfWeek = (now.getDay() + 6) % 7;
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - dayOfWeek);
      weekStartDate.setHours(0, 0, 0, 0);

      let todaySeconds = 0;
      let weekSeconds = 0;
      let monthSeconds = 0;
      let allTimeSeconds = 0;

      sessions.forEach((s) => {
        const dur = s.status === 'running'
          ? Math.max(0, Math.floor((Date.now() - s.startTime) / 1000))
          : (s.duration || 0);

        allTimeSeconds += dur;
        if (s.date === today) todaySeconds += dur;

        const sessionDate = new Date(s.startTime);
        if (sessionDate >= weekStartDate) weekSeconds += dur;

        const [y, m] = s.date.split('-').map(Number);
        if (y === currentYear && m === currentMonth) monthSeconds += dur;
      });

      return {
        taskId,
        todaySeconds,
        weekSeconds,
        monthSeconds,
        allTimeSeconds,
      };
    },

    getMonthCalendar: async (year: number, month: number): Promise<DateSummary[]> => {
      const sessions = loadSessions().filter((s) => {
        const [y, m] = s.date.split('-').map(Number);
        return y === year && m === month;
      });

      const dateMap = new Map<string, Set<number>>();
      const durationMap = new Map<string, number>();

      sessions.forEach((s) => {
        const dur = s.duration || 0;
        durationMap.set(s.date, (durationMap.get(s.date) || 0) + dur);

        const taskSet = dateMap.get(s.date) || new Set<number>();
        taskSet.add(s.taskId);
        dateMap.set(s.date, taskSet);
      });

      return Array.from(durationMap.entries()).map(([date, totalSeconds]) => ({
        date,
        totalSeconds,
        taskCount: dateMap.get(date)?.size || 0,
      }));
    },

    getWeeklyStats: async (dateStr?: string): Promise<WeeklyStats> => {
      const targetDate = dateStr ? new Date(dateStr) : new Date();
      const dayOfWeek = (targetDate.getDay() + 6) % 7;
      const start = new Date(targetDate);
      start.setDate(targetDate.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const pad = (n: number) => String(n).padStart(2, '0');
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

      const sessions = loadSessions().filter((s) => s.startTime >= start.getTime() && s.startTime <= end.getTime());
      const tasks = loadTasks();

      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyMap = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        dailyMap.set(ds, 0);
      }

      const taskMap = new Map<number, number>();
      let totalSeconds = 0;

      sessions.forEach((s) => {
        const dur = s.duration || 0;
        totalSeconds += dur;
        dailyMap.set(s.date, (dailyMap.get(s.date) || 0) + dur);
        taskMap.set(s.taskId, (taskMap.get(s.taskId) || 0) + dur);
      });

      const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, total], index) => ({
        date,
        dayName: dayNames[index],
        totalSeconds: total,
      }));

      const taskBreakdown = Array.from(taskMap.entries()).map(([taskId, total]) => ({
        taskId,
        taskName: tasks.find((t) => t.id === taskId)?.name || 'Unknown',
        totalSeconds: total,
      }));

      return {
        weekStart: startStr,
        weekEnd: endStr,
        totalSeconds,
        taskBreakdown,
        dailyBreakdown,
      };
    },

    getMonthlyStats: async (year?: number, month?: number): Promise<MonthlyStats> => {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth() + 1;

      const sessions = loadSessions().filter((s) => {
        const [y, m] = s.date.split('-').map(Number);
        return y === targetYear && m === targetMonth;
      });
      const tasks = loadTasks();

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dailyMap = new Map<string, number>();

      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${targetYear}-${pad(targetMonth)}-${pad(d)}`;
        dailyMap.set(ds, 0);
      }

      const taskMap = new Map<number, number>();
      let totalSeconds = 0;

      sessions.forEach((s) => {
        const dur = s.duration || 0;
        totalSeconds += dur;
        dailyMap.set(s.date, (dailyMap.get(s.date) || 0) + dur);
        taskMap.set(s.taskId, (taskMap.get(s.taskId) || 0) + dur);
      });

      const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, total]) => ({
        date,
        totalSeconds: total,
      }));

      const taskBreakdown = Array.from(taskMap.entries()).map(([taskId, total]) => ({
        taskId,
        taskName: tasks.find((t) => t.id === taskId)?.name || 'Unknown',
        totalSeconds: total,
      }));

      return {
        year: targetYear,
        month: targetMonth,
        monthName: monthNames[targetMonth - 1],
        totalSeconds,
        taskBreakdown,
        dailyBreakdown,
      };
    },
  },
};
