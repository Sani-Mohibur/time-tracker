import React from 'react';
import { LayoutDashboard, CheckSquare, Calendar, BarChart3, Clock, Pause, Moon, Sun } from 'lucide-react';
import { ActiveSessionInfo } from '@shared/types';
import { formatTimeTicker } from '../utils/time';
import { useDarkMode } from '../hooks/useDarkMode';

export type NavTab = 'dashboard' | 'tasks' | 'calendar' | 'statistics';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeSession: ActiveSessionInfo | null;
  liveElapsed: number;
  onPause: () => void;
  onOpenTaskDetails?: (taskId: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeSession,
  liveElapsed,
  onPause,
  onOpenTaskDetails,
}) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Tabs */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Time Tracker</span>
                <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200/60 dark:border-blue-800/50">Desktop</span>
              </div>
            </div>

            <nav className="flex space-x-1">
              <button
                id="nav-dashboard-tab"
                onClick={() => onSelectTab('dashboard')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'dashboard'
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                id="nav-tasks-tab"
                onClick={() => onSelectTab('tasks')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'tasks'
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Tasks</span>
              </button>

              <button
                id="nav-calendar-tab"
                onClick={() => onSelectTab('calendar')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'calendar'
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Calendar</span>
              </button>

              <button
                id="nav-statistics-tab"
                onClick={() => onSelectTab('statistics')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'statistics'
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Statistics</span>
              </button>
            </nav>
          </div>

          {/* Active Live Stopwatch Widget in Header */}
          <div className="flex items-center space-x-4">
            {activeSession && (
              <div className="flex items-center space-x-3 bg-blue-50/90 dark:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl px-3.5 py-1.5 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div 
                  className="cursor-pointer hover:underline"
                  onClick={() => onOpenTaskDetails && onOpenTaskDetails(activeSession.task.id)}
                >
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block leading-tight">Running</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] block leading-tight">
                    {activeSession.task.name}
                  </span>
                </div>
                <div className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300 tracking-wider bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-blue-200/60 dark:border-blue-700/60 shadow-xs">
                  {formatTimeTicker(liveElapsed)}
                </div>
                <button
                  onClick={onPause}
                  title="Pause active timer"
                  className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            )}
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
