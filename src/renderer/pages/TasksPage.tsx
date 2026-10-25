import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  CheckSquare,
  Search,
  X,
  ArrowUpDown,
  GripVertical,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { Task, ActiveSessionInfo } from '@shared/types';
import { formatDuration, formatTimeTicker } from '../utils/time';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { ConfirmModal } from '../components/ConfirmModal';

export type TaskSortOption =
  | 'manual'
  | 'newest'
  | 'oldest'
  | 'most-time'
  | 'most-popular'
  | 'recently-worked';

const SORT_PREF_KEY = 'tt_tasks_sort_preference';
const MANUAL_ORDER_KEY = 'tt_tasks_manual_order';

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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting state with persistence
  const [sortBy, setSortBy] = useState<TaskSortOption>(() => {
    try {
      const saved = localStorage.getItem(SORT_PREF_KEY);
      if (
        saved &&
        ['manual', 'newest', 'oldest', 'most-time', 'most-popular', 'recently-worked'].includes(saved)
      ) {
        return saved as TaskSortOption;
      }
    } catch {
      // Fallback
    }
    return 'manual';
  });

  // Manual drag-and-drop order persistence
  const [manualOrder, setManualOrder] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(MANUAL_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);

  // Synchronize manualOrder whenever tasks list changes
  useEffect(() => {
    if (tasks.length === 0) return;
    const currentTaskIds = new Set(tasks.map((t) => t.id));
    const validSavedIds = manualOrder.filter((id) => currentTaskIds.has(id));
    const missingIds = tasks.filter((t) => !validSavedIds.includes(t.id)).map((t) => t.id);

    if (missingIds.length > 0 || validSavedIds.length !== manualOrder.length) {
      // Prepend newly added tasks to the top of the manual order
      const updatedOrder = [...missingIds, ...validSavedIds];
      setManualOrder(updatedOrder);
      try {
        localStorage.setItem(MANUAL_ORDER_KEY, JSON.stringify(updatedOrder));
      } catch (err) {
        console.error('Failed to save manual order to localStorage:', err);
      }
    }
  }, [tasks]);

  const handleSortChange = (newSort: TaskSortOption) => {
    setSortBy(newSort);
    try {
      localStorage.setItem(SORT_PREF_KEY, newSort);
    } catch (err) {
      console.error('Failed to save sort preference to localStorage:', err);
    }
  };

  const updateManualOrder = (newOrder: number[]) => {
    setManualOrder(newOrder);
    try {
      localStorage.setItem(MANUAL_ORDER_KEY, JSON.stringify(newOrder));
    } catch (err) {
      console.error('Failed to save manual order to localStorage:', err);
    }
  };

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
      // Clean up from manualOrder
      const updated = manualOrder.filter((id) => id !== taskToDelete.id);
      updateManualOrder(updated);
      setTaskToDelete(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    if (sortBy !== 'manual') return;
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    if (sortBy !== 'manual') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = (_e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    if (dragOverTaskId === taskId) {
      setDragOverTaskId(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTaskId: number) => {
    e.preventDefault();
    if (sortBy !== 'manual' || draggedTaskId === null || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const currentOrder = manualOrder.length > 0 ? [...manualOrder] : tasks.map((t) => t.id);
    const fromIndex = currentOrder.indexOf(draggedTaskId);
    const toIndex = currentOrder.indexOf(targetTaskId);

    if (fromIndex !== -1 && toIndex !== -1) {
      currentOrder.splice(fromIndex, 1);
      currentOrder.splice(toIndex, 0, draggedTaskId);
      updateManualOrder(currentOrder);
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  // Sort tasks according to selected sorting option
  const sortedTasks = [...tasks].sort((a, b) => {
    switch (sortBy) {
      case 'manual': {
        const indexA = manualOrder.indexOf(a.id);
        const indexB = manualOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (indexA === -1) return -1;
        if (indexB === -1) return 1;
        return indexA - indexB;
      }
      case 'newest': {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      case 'oldest': {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      case 'most-time': {
        const aLive = activeSession?.task.id === a.id ? liveElapsed : 0;
        const bLive = activeSession?.task.id === b.id ? liveElapsed : 0;
        const totalA = (a.totalDuration || 0) + aLive;
        const totalB = (b.totalDuration || 0) + bLive;
        if (totalB !== totalA) return totalB - totalA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      case 'most-popular': {
        // Activity or usage frequency based on sessionCount, tie-broken by totalDuration
        const countA = (a.sessionCount || 0) + (activeSession?.task.id === a.id ? 1 : 0);
        const countB = (b.sessionCount || 0) + (activeSession?.task.id === b.id ? 1 : 0);
        if (countB !== countA) return countB - countA;
        const totalA = (a.totalDuration || 0) + (activeSession?.task.id === a.id ? liveElapsed : 0);
        const totalB = (b.totalDuration || 0) + (activeSession?.task.id === b.id ? liveElapsed : 0);
        if (totalB !== totalA) return totalB - totalA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      case 'recently-worked': {
        // Tasks with most recent time-tracking activity first
        const timeA = activeSession?.task.id === a.id ? Date.now() : (a.lastTrackedAt || 0);
        const timeB = activeSession?.task.id === b.id ? Date.now() : (b.lastTrackedAt || 0);
        if (timeB !== timeA) return timeB - timeA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      default:
        return 0;
    }
  });

  // Apply search query filter dynamically
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const displayedTasks = sortedTasks.filter((task) => {
    if (!normalizedQuery) return true;
    return task.name.toLowerCase().includes(normalizedQuery);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Management</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">All Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage tasks, start timers and view history</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl">
            {searchQuery ? `${displayedTasks.length} of ${tasks.length}` : tasks.length}{' '}
            {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Search and Sort Controls Toolbar */}
      {tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Search Input Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by name..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 text-sm rounded-xl pl-9 pr-9 py-2 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sorting Control */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sort:</span>
            </span>
            <div className="relative shrink-0">
              <label htmlFor="tasks-sort-select" className="sr-only">Sort tasks</label>
              <select
                id="tasks-sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as TaskSortOption)}
                className="appearance-none bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 text-xs sm:text-sm font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
              >
                <option value="manual">Manual (Drag & Drop)</option>
                <option value="newest">Date Added – Newest First</option>
                <option value="oldest">Date Added – Oldest First</option>
                <option value="most-time">Most Time Tracked</option>
                <option value="most-popular">Most Popular</option>
                <option value="recently-worked">Recently Worked On</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Task List - Single Column Layout */}
      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">No tasks created yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
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
      ) : displayedTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">No tasks found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No tasks match &ldquo;{searchQuery}&rdquo;. Check the spelling or try searching for a different task name.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-semibold transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear Search</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedTasks.map((task) => {
            const isRunning = activeSession?.task.id === task.id;
            const todayDuration = (task.todayDuration || 0) + (isRunning ? liveElapsed : 0);
            const totalDuration = (task.totalDuration || 0) + (isRunning ? liveElapsed : 0);

            const isDragged = draggedTaskId === task.id;
            const isDragOver = dragOverTaskId === task.id && !isDragged;

            return (
              <div
                key={task.id}
                draggable={sortBy === 'manual'}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragLeave={(e) => handleDragLeave(e, task.id)}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`group bg-white dark:bg-slate-800 rounded-xl border p-3 sm:px-4 sm:py-3 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isRunning
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/25 dark:bg-blue-950/25'
                    : isDragOver
                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/30 dark:bg-slate-700/60'
                    : isDragged
                    ? 'opacity-30 border-dashed border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Left Side: Drag Handle, Start/Pause Button, Task Name & Info */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Drag Handle */}
                  <div
                    className={`shrink-0 p-1 rounded transition-colors ${
                      sortBy === 'manual'
                        ? 'cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                        : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                    title={
                      sortBy === 'manual'
                        ? 'Drag to reorder'
                        : 'Manual drag-and-drop is enabled in "Manual" sorting mode'
                    }
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Start / Pause Button */}
                  <button
                    onClick={() => handleTaskAction(task)}
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:scale-105 active:scale-95'
                    }`}
                    title={isRunning ? 'Pause Task' : todayDuration > 0 ? 'Resume Task' : 'Start Task'}
                  >
                    {isRunning ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onOpenTaskDetails(task.id)}
                        className="text-base font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600 dark:hover:text-blue-400 truncate text-left transition-colors"
                        title="View Task Details"
                      >
                        {task.name}
                      </button>
                      {isRunning && (
                        <span className="shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Running</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                      <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                      {task.sessionCount !== undefined && task.sessionCount > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            {task.sessionCount} {task.sessionCount === 1 ? 'session' : 'sessions'}
                          </span>
                        </>
                      )}
                      {task.lastTrackedAt && !isRunning && (
                        <>
                          <span className="hidden md:inline">•</span>
                          <span className="hidden md:inline">
                            Last active {new Date(task.lastTrackedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Durations (Today, All Time) & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end space-x-4 sm:space-x-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {/* Today's Duration */}
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Today
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-50">
                      {isRunning ? formatTimeTicker(todayDuration) : formatDuration(todayDuration)}
                    </span>
                  </div>

                  {/* All Time Duration */}
                  <div className="text-left sm:text-right hidden sm:block">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      All Time
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-50">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>

                  {/* Actions: View Details & Delete */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onOpenTaskDetails(task.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                      title="View Details & Calendar"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTaskToDelete(task)}
                      title="Delete Task"
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
