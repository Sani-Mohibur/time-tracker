import React, { useState } from 'react';
import { Play, Pause, Plus, Trash2, CheckSquare } from 'lucide-react';
import { Task, ActiveSessionInfo } from '@shared/types';
import { formatDuration, formatTimeTicker } from '../utils/time';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { ConfirmModal } from '../components/ConfirmModal';

interface TasksPageProps {
  tasks: Task[];
  activeSession: ActiveSessionInfo | null;
  liveElapsed: number;
  onStartTask: (taskId: number) => Promise<void>;
  onPauseTask: () => Promise<void>;
  onCreateTask: (name: string) => Promise<Task>;
  onDeleteTask: (taskId: number) => Promise<boolean>;
  onOpenTaskDetails: (taskId: number) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  activeSession,
  liveElapsed,
  onStartTask,
  onPauseTask,
  onCreateTask,
  onDeleteTask,
  onOpenTaskDetails,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState<{
    targetTaskId: number;
    targetTaskName: string;
  } | null>(null);

  const handleTaskAction = (task: Task) => {
    if (activeSession) {
      if (activeSession.task.id === task.id) {
        onPauseTask();
      } else {
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

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      await onDeleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Management</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">All Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage tasks, start timers and view history</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Task List / Cards */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No tasks created yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Add categories like Office, Learning, Freelancing to start tracking time.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const isRunning = activeSession?.task.id === task.id;
            const todayDuration = (task.todayDuration || 0) + (isRunning ? liveElapsed : 0);
            const totalDuration = (task.totalDuration || 0) + (isRunning ? liveElapsed : 0);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                  isRunning
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center space-x-2">
                        <span
                          onClick={() => onOpenTaskDetails(task.id)}
                          className="text-lg font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors line-clamp-1"
                        >
                          {task.name}
                        </span>
                        {isRunning && (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Running</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Created on {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setTaskToDelete(task)}
                        title="Delete Task"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Time stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Today
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">
                        {isRunning ? formatTimeTicker(todayDuration) : formatDuration(todayDuration)}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                        All Time
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">
                        {formatDuration(totalDuration)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onOpenTaskDetails(task.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center space-x-1"
                  >
                    <span>View Calendar & Details</span>
                  </button>

                  <button
                    onClick={() => handleTaskAction(task)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{todayDuration > 0 ? 'Resume' : 'Start'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Task?"
        message={`Are you sure you want to delete "${taskToDelete?.name}"? All recorded time sessions for this task will be permanently deleted.`}
        confirmLabel="Delete Task"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
