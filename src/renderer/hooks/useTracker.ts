import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, ActiveSessionInfo, TodaySummary } from '@shared/types';

export function useTracker() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [liveElapsed, setLiveElapsed] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Reference to track active session start time for accurate live timer
  const activeStartTimeRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      if (!window.api) return;
      const [allTasks, active, summary] = await Promise.all([
        window.api.tasks.getAll(),
        window.api.sessions.getActive(),
        window.api.sessions.getTodaySummary(),
      ]);

      setTasks(allTasks);
      setActiveSession(active);
      setTodaySummary(summary);

      if (active && active.session) {
        activeStartTimeRef.current = active.session.startTime;
        setLiveElapsed(Math.max(0, Math.floor((Date.now() - active.session.startTime) / 1000)));
      } else {
        activeStartTimeRef.current = null;
        setLiveElapsed(0);
      }
    } catch (err) {
      console.error('[useTracker] Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live timer interval: updates every second based on actual timestamp diff
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      if (activeStartTimeRef.current) {
        const diff = Math.max(0, Math.floor((Date.now() - activeStartTimeRef.current) / 1000));
        setLiveElapsed(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Polling check every 15s to keep daily summaries in sync or handle midnight rollover
  useEffect(() => {
    const syncInterval = setInterval(() => {
      refresh();
    }, 15000);
    return () => clearInterval(syncInterval);
  }, [refresh]);

  const startTask = async (taskId: number) => {
    try {
      if (!window.api) {
        throw new Error('Tracker API unavailable. Please check application initialization.');
      }
      await window.api.sessions.start(taskId);
      await refresh();
    } catch (err: any) {
      console.error('[useTracker] Error starting task:', err);
      throw err;
    }
  };

  const pauseTask = async () => {
    try {
      if (!window.api) {
        throw new Error('Tracker API unavailable. Please check application initialization.');
      }
      await window.api.sessions.pause();
      await refresh();
    } catch (err: any) {
      console.error('[useTracker] Error pausing task:', err);
      throw err;
    }
  };

  const createTask = async (name: string) => {
    try {
      if (!window.api) {
        throw new Error('Tracker API unavailable. Please check application initialization.');
      }
      const newTask = await window.api.tasks.create(name);
      await refresh();
      return newTask;
    } catch (err: any) {
      console.error('[useTracker] Error creating task:', err);
      throw err;
    }
  };

  const deleteTask = async (id: number) => {
    try {
      if (!window.api) {
        throw new Error('Tracker API unavailable. Please check application initialization.');
      }
      const success = await window.api.tasks.delete(id);
      await refresh();
      return success;
    } catch (err: any) {
      console.error('[useTracker] Error deleting task:', err);
      throw err;
    }
  };

  return {
    tasks,
    activeSession,
    todaySummary,
    liveElapsed,
    loading,
    refresh,
    startTask,
    pauseTask,
    createTask,
    deleteTask,
  };
}
