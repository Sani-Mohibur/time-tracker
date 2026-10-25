export interface Task {
  id: number;
  name: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  todayDuration?: number; // Total seconds tracked today
  totalDuration?: number; // All-time seconds
  isRunning?: boolean;
  lastTrackedAt?: number | null; // Timestamp of latest session activity (ms)
  sessionCount?: number; // Total number of sessions tracked
  recentDuration?: number; // Total seconds tracked during the last 7 days (including today)
}

export type SessionStatus = 'running' | 'completed';

export interface TimeSession {
  id: number;
  taskId: number;
  date: string; // YYYY-MM-DD
  startTime: number; // Unix timestamp in milliseconds
  endTime: number | null; // Unix timestamp in milliseconds or null if running
  duration: number; // Duration in seconds
  status: SessionStatus;
  taskName?: string;
}

export interface ActiveSessionInfo {
  session: TimeSession;
  task: Task;
  currentElapsedSeconds: number;
}

export interface TaskStats {
  taskId: number;
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  allTimeSeconds: number;
}

export interface DateTaskBreakdown {
  taskId: number;
  taskName: string;
  totalSeconds: number;
  sessions: TimeSession[];
}

export interface DayDetail {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  tasks: DateTaskBreakdown[];
}

export interface DateSummary {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  taskCount: number;
}

export interface TaskCalendarDay {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  sessions: TimeSession[];
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalSeconds: number;
  taskBreakdown: {
    taskId: number;
    taskName: string;
    totalSeconds: number;
  }[];
  dailyBreakdown: {
    date: string;
    dayName: string;
    totalSeconds: number;
  }[];
}

export interface MonthlyStats {
  year: number;
  month: number; // 1 - 12
  monthName: string;
  totalSeconds: number;
  taskBreakdown: {
    taskId: number;
    taskName: string;
    totalSeconds: number;
  }[];
  dailyBreakdown: {
    date: string;
    totalSeconds: number;
  }[];
}

export interface TodayTaskSummary {
  task: Task;
  duration: number; // in seconds
  isRunning: boolean;
}

export interface TodaySummary {
  totalSeconds: number;
  tasks: TodayTaskSummary[];
  activeTask: {
    task: Task;
    session: TimeSession;
    startTime: number;
  } | null;
}

export interface ElectronAPI {
  tasks: {
    getAll: () => Promise<Task[]>;
    getById: (id: number) => Promise<Task | null>;
    create: (name: string) => Promise<Task>;
    delete: (id: number) => Promise<boolean>;
  };
  sessions: {
    getActive: () => Promise<ActiveSessionInfo | null>;
    start: (taskId: number) => Promise<TimeSession>;
    pause: () => Promise<TimeSession | null>;
    getTodaySummary: () => Promise<TodaySummary>;
    getByDate: (date: string) => Promise<DayDetail>;
    getTaskCalendar: (taskId: number, year: number, month: number) => Promise<TaskCalendarDay[]>;
    getTaskStats: (taskId: number) => Promise<TaskStats>;
    getMonthCalendar: (year: number, month: number) => Promise<DateSummary[]>;
    getWeeklyStats: (date?: string) => Promise<WeeklyStats>;
    getMonthlyStats: (year?: number, month?: number) => Promise<MonthlyStats>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
