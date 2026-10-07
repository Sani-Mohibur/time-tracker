import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Clock,
} from 'lucide-react';
import { WeeklyStats, MonthlyStats, ActiveSessionInfo } from '@shared/types';
import { formatDuration, formatDateShort } from '../utils/time';
import { getTodayString } from '../utils/date';

interface StatisticsPageProps {
  activeSession: ActiveSessionInfo | null;
  liveElapsed: number;
  onOpenTaskDetails: (taskId: number) => void;
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({
  activeSession,
  liveElapsed,
  onOpenTaskDetails,
}) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  // Weekly state
  const [weekOffsetDays, setWeekOffsetDays] = useState<number>(0);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);

  // Monthly state
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);

  const loadWeeklyData = useCallback(async () => {
    try {
      if (!window.api) return;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + weekOffsetDays);
      const yearVal = targetDate.getFullYear();
      const monthVal = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dayVal = String(targetDate.getDate()).padStart(2, '0');
      const formattedDate = `${yearVal}-${monthVal}-${dayVal}`;

      const data = await window.api.sessions.getWeeklyStats(formattedDate);
      setWeeklyStats(data);
    } catch (err) {
      console.error('[StatisticsPage] Error loading weekly stats:', err);
    }
  }, [weekOffsetDays]);

  const loadMonthlyData = useCallback(async () => {
    try {
      if (!window.api) return;
      const data = await window.api.sessions.getMonthlyStats(year, month);
      setMonthlyStats(data);
    } catch (err) {
      console.error('[StatisticsPage] Error loading monthly stats:', err);
    }
  }, [year, month]);

  useEffect(() => {
    if (viewMode === 'weekly') {
      loadWeeklyData();
    } else {
      loadMonthlyData();
    }
  }, [viewMode, loadWeeklyData, loadMonthlyData]);

  // Week navigation
  const handlePrevWeek = () => setWeekOffsetDays((d) => d - 7);
  const handleNextWeek = () => setWeekOffsetDays((d) => d + 7);
  const handleCurrentWeek = () => setWeekOffsetDays(0);

  // Month navigation
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
  };

  // Compute live additions if timer is active
  const isCurrentWeek = weekOffsetDays === 0;
  const isCurrentMonthView =
    year === new Date().getFullYear() && month === new Date().getMonth() + 1;

  const liveExtra = activeSession ? liveElapsed : 0;

  const liveWeeklyTotal = (weeklyStats?.totalSeconds || 0) + (isCurrentWeek ? liveExtra : 0);
  const liveMonthlyTotal = (monthlyStats?.totalSeconds || 0) + (isCurrentMonthView ? liveExtra : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Analytics</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">Time Statistics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Overview of working trends across tasks and calendar periods
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'weekly'
                ? 'bg-white dark:bg-slate-800 text-blue-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-slate-800 text-blue-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {viewMode === 'weekly' ? (
        /* WEEKLY VIEW */
        <div className="space-y-6">
          {/* Period Header Controls */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Weekly Period</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {weeklyStats ? `${formatDateShort(weeklyStats.weekStart)} – ${formatDateShort(weeklyStats.weekEnd)}` : 'Loading...'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors"
              >
                This Week
              </button>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
                <button
                  onClick={handlePrevWeek}
                  title="Previous Week"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button
                  onClick={handleNextWeek}
                  title="Next Week"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekly Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Week Time */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Total Tracked This Week
              </span>
              <div className="mt-4 font-mono text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                {formatDuration(liveWeeklyTotal)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Across {weeklyStats?.taskBreakdown.length || 0} active tasks
              </p>
            </div>

            {/* Daily Breakdown Bars */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-4">
                Daily Activity (Mon - Sun)
              </span>
              <div className="grid grid-cols-7 gap-2">
                {weeklyStats?.dailyBreakdown.map((day) => {
                  const isToday = day.date === getTodayString();
                  const duration = day.totalSeconds + (isToday && isCurrentWeek ? liveExtra : 0);
                  const maxDayDuration = Math.max(
                    1,
                    ...(weeklyStats.dailyBreakdown.map((d) => d.totalSeconds) || [1])
                  );
                  const heightPercent = duration > 0 ? Math.max(15, Math.min(100, (duration / maxDayDuration) * 100)) : 6;

                  return (
                    <div key={day.date} className="flex flex-col items-center">
                      <div className="h-24 w-full bg-slate-50 dark:bg-slate-900 rounded-xl flex items-end justify-center p-1 border border-slate-100 dark:border-slate-800">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-lg transition-all ${
                            isToday
                              ? 'bg-blue-600 shadow-xs'
                              : duration > 0
                              ? 'bg-blue-400'
                              : 'bg-slate-200/50'
                          }`}
                        />
                      </div>
                      <span className={`text-[11px] mt-2 font-bold ${
                        isToday ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {day.dayName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {duration > 0 ? formatDuration(duration) : '0m'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Task Breakdown Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Task Breakdown</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {weeklyStats?.taskBreakdown.length || 0} tasks
              </span>
            </div>

            {!weeklyStats || weeklyStats.taskBreakdown.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No time recorded this week</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {weeklyStats.taskBreakdown.map((t) => {
                  const isRunningThisTask = isCurrentWeek && activeSession?.task.id === t.taskId;
                  const total = t.totalSeconds + (isRunningThisTask ? liveExtra : 0);
                  const percentage = liveWeeklyTotal > 0 ? Math.round((total / liveWeeklyTotal) * 100) : 0;

                  return (
                    <div
                      key={t.taskId}
                      onClick={() => onOpenTaskDetails(t.taskId)}
                      className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/70 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 pr-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600">
                            {t.taskName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({percentage}%)
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                          <div
                            style={{ width: `${percentage}%` }}
                            className="bg-blue-600 h-full rounded-full transition-all"
                          />
                        </div>
                      </div>

                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-50">
                        {formatDuration(total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MONTHLY VIEW */
        <div className="space-y-6">
          {/* Month Header Controls */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Monthly Period</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {monthlyStats ? `${monthlyStats.monthName} ${monthlyStats.year}` : 'Loading...'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCurrentMonth}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors"
              >
                This Month
              </button>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
                <button
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button
                  onClick={handleNextMonth}
                  title="Next Month"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Total Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Tracked in {monthlyStats?.monthName} {monthlyStats?.year}
            </span>
            <div className="mt-4 font-mono text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50">
              {formatDuration(liveMonthlyTotal)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Across {monthlyStats?.taskBreakdown.length || 0} active tasks
            </p>
          </div>

          {/* Monthly Task Breakdown Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Task Breakdown</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {monthlyStats?.taskBreakdown.length || 0} tasks
              </span>
            </div>

            {!monthlyStats || monthlyStats.taskBreakdown.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No time recorded this month</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyStats.taskBreakdown.map((t) => {
                  const isRunningThisTask = isCurrentMonthView && activeSession?.task.id === t.taskId;
                  const total = t.totalSeconds + (isRunningThisTask ? liveExtra : 0);
                  const percentage = liveMonthlyTotal > 0 ? Math.round((total / liveMonthlyTotal) * 100) : 0;

                  return (
                    <div
                      key={t.taskId}
                      onClick={() => onOpenTaskDetails(t.taskId)}
                      className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/70 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 pr-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600">
                            {t.taskName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({percentage}%)
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                          <div
                            style={{ width: `${percentage}%` }}
                            className="bg-blue-600 h-full rounded-full transition-all"
                          />
                        </div>
                      </div>

                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-50">
                        {formatDuration(total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
