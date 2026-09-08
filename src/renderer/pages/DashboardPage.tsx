import React, { useState } from 'react';
import { Play, Pause, Plus, Clock, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Task, ActiveSessionInfo, TodaySummary } from '@shared/types';
import { formatDuration, formatTimeTicker, formatDateFull } from '../utils/time';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState<{
    targetTaskId: number;
    targetTaskName: string;
  } | null>(null);

  const todayStr = getTodayString();

  // Compute live today's total
  const baseCompletedToday = (todaySummary?.tasks || []).reduce((acc, t) => {
    return acc + (t.isRunning ? 0 : t.duration);
  }, 0);
  const liveTotalToday = baseCompletedToday + (activeSession ? liveElapsed : 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Overview</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{formatDateFull(todayStr)}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your daily focus and sessions</p>
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tracked Today</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatDuration(liveTotalToday)}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Sum of all sessions recorded today</p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Active Timer Card */}
        <div className={`p-6 rounded-2xl border shadow-sm transition-all md:col-span-2 relative overflow-hidden ${
          activeSession 
            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-600'
            : 'bg-white border-slate-200'
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
                  className="flex items-center space-x-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
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
                <h3 className="text-lg font-bold text-slate-800 mt-1">Ready to work?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select a task below or create a new one to start tracking</p>
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

      {/* Today's Tasks Tracking Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Today's Tasks</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No tasks created yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
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
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isRunning = activeSession?.task.id === task.id;
              // Today's total duration for this task
              const todaySummaryItem = todaySummary?.tasks.find((t) => t.task.id === task.id);
              const taskBaseDuration = todaySummaryItem ? todaySummaryItem.duration : (task.todayDuration || 0);
              const displayDuration = isRunning ? taskBaseDuration + liveElapsed : taskBaseDuration;

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:px-6 flex items-center justify-between transition-colors ${
                    isRunning ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleTaskAction(task)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isRunning
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:scale-105'
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
                        className="text-base font-bold text-slate-900 hover:text-blue-600 text-left transition-colors flex items-center space-x-2"
                      >
                        <span>{task.name}</span>
                        {isRunning && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            Running
                          </span>
                        )}
                      </button>
                      <span className="text-xs text-slate-500">
                        {displayDuration > 0
                          ? `Tracked ${formatDuration(displayDuration)} today`
                          : 'No time tracked today'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-slate-900">
                        {isRunning ? formatTimeTicker(displayDuration) : formatDuration(displayDuration)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Today's total</span>
                    </div>

                    <button
                      onClick={() => onOpenTaskDetails(task.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
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
