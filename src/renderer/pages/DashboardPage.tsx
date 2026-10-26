import React, { useState } from 'react';
import { Play, Pause, Plus, Clock, ArrowRight, CheckCircle2, Sparkles, History, ChevronDown } from 'lucide-react';
import { Task, ActiveSessionInfo, TodaySummary } from '@shared/types';
import { formatDuration, formatTimeTicker, formatDateFull, formatDateShort } from '../utils/time';
import { getTodayString } from '../utils/date';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { ConfirmModal } from '../components/ConfirmModal';

interface DashboardPageProps {
  tasks: Task[];
  activeSession: ActiveSessionInfo | null;
  todaySummary: TodaySummary | null;
  liveElapsed: number;
  onStartTask: (taskId: number) => Promise<void>;
  onPauseTask: () => Promise<void>;
  onCreateTask: (name: string) => Promise<Task>;
  onOpenTaskDetails: (taskId: number) => void;
  onNavigateToTasks: () => void;
}

export type DashboardTaskFilter = 'today' | 'recent';

export const DASHBOARD_TASK_FILTER_KEY = 'tt_dashboard_task_filter';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  tasks,
  activeSession,
  todaySummary,
  liveElapsed,
  onStartTask,
  onPauseTask,
  onCreateTask,
  onOpenTaskDetails,
  onNavigateToTasks,
}) => {
  const [taskFilter, setTaskFilter] = useState<DashboardTaskFilter>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(DASHBOARD_TASK_FILTER_KEY);
        if (saved === 'today' || saved === 'recent') {
          return saved;
        }
      }
    } catch {
      // Fallback to default
    }
    return 'today';
  });

  const handleTaskFilterChange = (newFilter: DashboardTaskFilter) => {
    setTaskFilter(newFilter);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(DASHBOARD_TASK_FILTER_KEY, newFilter);
      }
    } catch (err) {
      console.error('Failed to save dashboard task filter to localStorage:', err);
    }
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState<{
    targetTaskId: number;
    targetTaskName: string;
  } | null>(null);

  const todayStr = getTodayString();

  // Compute live today's total
  const baseCompletedToday = (todaySummary?.tasks || []).reduce((acc, t) => {
    return acc + t.duration;
  }, 0);
  const liveTotalToday = baseCompletedToday + (activeSession ? liveElapsed : 0);

  // Filter tasks based on taskFilter ('today' vs 'recent')
  const now = new Date();
  const startOf7DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime();

  const filteredTasks = tasks.filter((task) => {
    const isRunning = activeSession?.task.id === task.id;
    const todaySummaryItem = todaySummary?.tasks.find((t) => t.task.id === task.id);
    const taskBaseDuration = todaySummaryItem ? todaySummaryItem.duration : (task.todayDuration || 0);
    const displayTodayDuration = isRunning ? taskBaseDuration + liveElapsed : taskBaseDuration;
    const taskRecentDuration = (task.recentDuration || 0) + (isRunning ? liveElapsed : 0);

    const workedToday = isRunning || displayTodayDuration > 0;

    if (taskFilter === 'today') {
      return workedToday;
    } else {
      // Recent: tracked or worked on at least once during last 7 days, including today
      return (
        workedToday ||
        taskRecentDuration > 0 ||
        (task.lastTrackedAt !== null && task.lastTrackedAt !== undefined && task.lastTrackedAt >= startOf7DaysAgo)
      );
    }
  });

  // Sort displayed tasks: running task first, then highest activity/duration
  const displayedDashboardTasks = [...filteredTasks].sort((a, b) => {
    const aRunning = activeSession?.task.id === a.id;
    const bRunning = activeSession?.task.id === b.id;
    if (aRunning) return -1;
    if (bRunning) return 1;

    if (taskFilter === 'today') {
      const aSummary = todaySummary?.tasks.find((t) => t.task.id === a.id);
      const bSummary = todaySummary?.tasks.find((t) => t.task.id === b.id);
      const aDur = aSummary ? aSummary.duration : (a.todayDuration || 0);
      const bDur = bSummary ? bSummary.duration : (b.todayDuration || 0);
      return bDur - aDur;
    } else {
      const aTime = a.lastTrackedAt || 0;
      const bTime = b.lastTrackedAt || 0;
      if (bTime !== aTime) return bTime - aTime;
      const aRec = a.recentDuration || a.totalDuration || 0;
      const bRec = b.recentDuration || b.totalDuration || 0;
      return bRec - aRec;
    }
  });

  const handleTaskAction = (task: Task) => {
    if (activeSession) {
      if (activeSession.task.id === task.id) {
        onPauseTask();
      } else {
        // Prompt confirmation as requested: "Office is currently running. Pause Office and start Learning?"
        setConfirmSwitch({
          targetTaskId: task.id,
          targetTaskName: task.name,
        });
      }
    } else {
      onStartTask(task.id);
    }
  };

  const handleConfirmSwitch = async () => {
    if (confirmSwitch) {
      await onStartTask(confirmSwitch.targetTaskId);
      setConfirmSwitch(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome & Date Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Overview</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">{formatDateFull(todayStr)}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track your daily focus and sessions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today Total Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Tracked Today</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {formatDuration(liveTotalToday)}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sum of all sessions recorded today</p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Active Timer Card */}
        <div className={`p-6 rounded-2xl border shadow-sm transition-all md:col-span-2 relative overflow-hidden ${
          activeSession 
            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-600'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          {activeSession ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Currently Active</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{activeSession.task.name}</h2>
                <p className="text-xs text-blue-100">Started at {new Date(activeSession.session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider bg-black/20 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                  {formatTimeTicker(liveElapsed)}
                </div>
                <button
                  onClick={onPauseTask}
                  className="flex items-center space-x-2 px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                >
                  <Pause className="w-4 h-4 fill-current text-amber-600" />
                  <span>Pause</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between h-full">
              <div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">No Active Timer</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">Ready to work?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a task below or create a new one to start tracking</p>
              </div>
              <button
                onClick={onNavigateToTasks}
                className="flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors"
              >
                <span>View All Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks Tracking Breakdown with Filter Dropdown */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              {taskFilter === 'today' ? <CheckCircle2 className="w-5 h-5" /> : <History className="w-5 h-5" />}
            </div>
            <div className="relative">
              <label htmlFor="dashboard-task-filter" className="sr-only">Filter tasks view</label>
              <select
                id="dashboard-task-filter"
                value={taskFilter}
                onChange={(e) => handleTaskFilterChange(e.target.value as DashboardTaskFilter)}
                className="appearance-none bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-50 font-bold text-base rounded-xl pl-3 pr-8 py-1.5 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
              >
                <option value="today">Today's Tasks</option>
                <option value="recent">Recent Tasks</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {displayedDashboardTasks.length} {displayedDashboardTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">No tasks created yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Create your first task (such as Office, Learning, or Personal Project) to start recording time sessions.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        ) : displayedDashboardTasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              {taskFilter === 'today' ? <Clock className="w-6 h-6" /> : <History className="w-6 h-6" />}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              {taskFilter === 'today' ? "No tasks worked on today" : "No recent task activity"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {taskFilter === 'today'
                ? "You haven't tracked any time today yet. Start a task from your task list to begin tracking."
                : "No tasks have been worked on during the last 7 days. Select a task to start tracking time."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={onNavigateToTasks}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
              >
                <span>View All Tasks</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedDashboardTasks.map((task) => {
              const isRunning = activeSession?.task.id === task.id;
              // Today's total duration for this task
              const todaySummaryItem = todaySummary?.tasks.find((t) => t.task.id === task.id);
              const taskBaseDuration = todaySummaryItem ? todaySummaryItem.duration : (task.todayDuration || 0);
              const displayTodayDuration = isRunning ? taskBaseDuration + liveElapsed : taskBaseDuration;
              const taskRecentDuration = (task.recentDuration || 0) + (isRunning ? liveElapsed : 0);

              const showTodayMetric = taskFilter === 'today' || displayTodayDuration > 0;

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:px-6 flex items-center justify-between transition-colors ${
                    isRunning ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleTaskAction(task)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isRunning
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:scale-105 active:scale-95'
                      }`}
                      title={isRunning ? 'Pause Task' : 'Start Task'}
                    >
                      {isRunning ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <div>
                      <button
                        onClick={() => onOpenTaskDetails(task.id)}
                        className="text-base font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors flex items-center space-x-2"
                      >
                        <span>{task.name}</span>
                        {isRunning && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
                            Running
                          </span>
                        )}
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {showTodayMetric ? (
                          displayTodayDuration > 0
                            ? `Tracked ${formatDuration(displayTodayDuration)} today`
                            : 'No time tracked today'
                        ) : (
                          taskRecentDuration > 0
                            ? `Tracked ${formatDuration(taskRecentDuration)} in last 7 days`
                            : (task.lastTrackedAt
                                ? `Last worked on ${formatDateShort(new Date(task.lastTrackedAt).toISOString())}`
                                : 'No recent activity')
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                        {showTodayMetric
                          ? (isRunning ? formatTimeTicker(displayTodayDuration) : formatDuration(displayTodayDuration))
                          : formatDuration(taskRecentDuration > 0 ? taskRecentDuration : (task.totalDuration || 0))}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {showTodayMetric ? "Today's total" : "Last 7 days"}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenTaskDetails(task.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="View Details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (name) => {
          await onCreateTask(name);
        }}
      />

      <ConfirmModal
        isOpen={!!confirmSwitch}
        title="Switch Active Task?"
        message={`"${activeSession?.task.name}" is currently running. Pause "${activeSession?.task.name}" and start "${confirmSwitch?.targetTaskName}"?`}
        confirmLabel="Pause & Switch"
        onConfirm={handleConfirmSwitch}
        onCancel={() => setConfirmSwitch(null)}
      />
    </div>
  );
};
