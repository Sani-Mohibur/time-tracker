import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Clock,
  Timer,
} from 'lucide-react';
import { Task, ActiveSessionInfo, TaskStats, TaskCalendarDay, TimeSession } from '@shared/types';
import { formatDuration, formatTimeTicker, formatTimestampTime, formatDateShort } from '../utils/time';
import { getTodayString } from '../utils/date';
import { CalendarGrid } from '../components/CalendarGrid';
import { ConfirmModal } from '../components/ConfirmModal';

interface TaskDetailsPageProps {
  taskId: number;
  activeSession: ActiveSessionInfo | null;
  liveElapsed: number;
  onBack: () => void;
  onStartTask: (taskId: number) => Promise<void>;
  onPauseTask: () => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<boolean>;
}

export const TaskDetailsPage: React.FC<TaskDetailsPageProps> = ({
  taskId,
  activeSession,
  liveElapsed,
  onBack,
  onStartTask,
  onPauseTask,
  onDeleteTask,
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [calendarDays, setCalendarDays] = useState<TaskCalendarDay[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  const isRunning = activeSession?.task.id === taskId;

  const loadTaskData = useCallback(async () => {
    try {
      if (!window.api) return;
      const [taskData, taskStats, calendarData] = await Promise.all([
        window.api.tasks.getById(taskId),
        window.api.sessions.getTaskStats(taskId),
        window.api.sessions.getTaskCalendar(taskId, year, month),
      ]);

      setTask(taskData);
      setStats(taskStats);
      setCalendarDays(calendarData);
    } catch (err) {
      console.error('[TaskDetailsPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId, year, month]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDate(getTodayString());
  };

  // Convert calendar days list to map: Record<dateString, totalSeconds>
  const dayDurations: Record<string, number> = {};
  calendarDays.forEach((d) => {
    dayDurations[d.date] = d.totalSeconds;
  });

  // If running today, include live elapsed in today's calculation
  const todayStr = getTodayString();
  const liveExtra = isRunning ? liveElapsed : 0;
  if (isRunning) {
    dayDurations[todayStr] = (dayDurations[todayStr] || 0) + liveExtra;
  }

  // Selected date's sessions
  const selectedDayData = calendarDays.find((d) => d.date === selectedDate);
  const selectedSessions: TimeSession[] = selectedDayData ? [...selectedDayData.sessions] : [];

  // If selected date is today and task is running, add live session to the list
  if (isRunning && selectedDate === todayStr && activeSession) {
    const hasLiveInList = selectedSessions.some((s) => s.id === activeSession.session.id);
    if (!hasLiveInList) {
      selectedSessions.unshift({
        ...activeSession.session,
        duration: liveElapsed,
      });
    }
  }

  const selectedDayTotal = (selectedDayData?.totalSeconds || 0) + (isRunning && selectedDate === todayStr ? liveExtra : 0);

  const handleAction = () => {
    if (isRunning) {
      onPauseTask().then(() => loadTaskData());
    } else {
      if (activeSession) {
        setConfirmSwitch(true);
      } else {
        onStartTask(taskId).then(() => loadTaskData());
      }
    }
  };

  const handleConfirmSwitch = async () => {
    await onStartTask(taskId);
    setConfirmSwitch(false);
    loadTaskData();
  };

  const handleDelete = async () => {
    await onDeleteTask(taskId);
    onBack();
  };

  if (loading && !task) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p className="text-sm">Loading task details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
        <p className="text-slate-700 dark:text-slate-300 font-semibold">Task not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-xl transition-colors"
            title="Back to Tasks"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{task.name}</h1>
              {isRunning && (
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Running ({formatTimeTicker(liveElapsed)})</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Task ID: #{task.id} · Created {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDeleting(true)}
            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleAction}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{(stats?.todaySeconds || 0) > 0 ? 'Resume' : 'Start'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards: Today, This Week, This Month, All Time */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Today
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 block">
            {formatDuration((stats?.todaySeconds || 0) + liveExtra)}
          </span>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            This Week
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 block">
            {formatDuration((stats?.weekSeconds || 0) + liveExtra)}
          </span>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            This Month
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 block">
            {formatDuration((stats?.monthSeconds || 0) + liveExtra)}
          </span>
        </div>

        {/* All Time */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            All Time
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 block">
            {formatDuration((stats?.allTimeSeconds || 0) + liveExtra)}
          </span>
        </div>
      </div>

      {/* Task Calendar and Sessions Breakdown Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Task Specific Calendar Grid */}
        <div className="lg:col-span-2">
          <CalendarGrid
            year={year}
            month={month}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onCurrentMonth={handleCurrentMonth}
            dayDurations={dayDurations}
            selectedDate={selectedDate}
            onSelectDate={(dateStr) => setSelectedDate(dateStr)}
          />
        </div>

        {/* Right: Selected Date Sessions List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                  Session Log
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {formatDateShort(selectedDate)}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Daily Total</span>
                <span className="font-mono text-sm font-bold text-emerald-600">
                  {formatDuration(selectedDayTotal)}
                </span>
              </div>
            </div>

            {selectedSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No sessions on this day</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select another date with tracked time or start a timer.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {selectedSessions.map((session, idx) => {
                  const isCurrentRunning = session.status === 'running';
                  const durationSec = isCurrentRunning ? liveElapsed : session.duration;

                  return (
                    <div
                      key={session.id || idx}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrentRunning
                          ? 'bg-blue-50/70 border-blue-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Timer className={`w-3.5 h-3.5 ${isCurrentRunning ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {formatTimestampTime(session.startTime)} →{' '}
                            {isCurrentRunning ? 'Now' : formatTimestampTime(session.endTime)}
                          </span>
                        </div>
                        <span className={`font-mono text-xs font-bold ${
                          isCurrentRunning ? 'text-blue-700' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {isCurrentRunning ? formatTimeTicker(durationSec) : formatDuration(durationSec)}
                        </span>
                      </div>
                      {isCurrentRunning && (
                        <div className="mt-1 flex items-center space-x-1 text-[10px] font-semibold text-blue-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                          <span>Session in progress</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">
              {selectedSessions.length} {selectedSessions.length === 1 ? 'session' : 'sessions'} recorded for {task.name}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmSwitch}
        title="Switch Active Task?"
        message={`"${activeSession?.task.name}" is currently running. Pause "${activeSession?.task.name}" and start "${task.name}"?`}
        confirmLabel="Pause & Switch"
        onConfirm={handleConfirmSwitch}
        onCancel={() => setConfirmSwitch(false)}
      />

      <ConfirmModal
        isOpen={isDeleting}
        title="Delete Task?"
        message={`Are you sure you want to delete "${task.name}"? All recorded sessions for this task will be permanently deleted.`}
        confirmLabel="Delete Task"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setIsDeleting(false)}
      />
    </div>
  );
};
