import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { DateSummary, DayDetail, ActiveSessionInfo } from '@shared/types';
import { CalendarGrid } from '../components/CalendarGrid';
import { formatDuration, formatTimeTicker, formatTimestampTime, formatDateFull, formatDateShort } from '../utils/time';
import { getTodayString } from '../utils/date';

interface CalendarPageProps {
  activeSession: ActiveSessionInfo | null;
  liveElapsed: number;
  onOpenTaskDetails: (taskId: number) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  activeSession,
  liveElapsed,
  onOpenTaskDetails,
}) => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [monthSummaries, setMonthSummaries] = useState<DateSummary[]>([]);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);

  const loadMonthData = useCallback(async () => {
    try {
      if (!window.api) return;
      const data = await window.api.sessions.getMonthCalendar(year, month);
      setMonthSummaries(data);
    } catch (err) {
      console.error('[CalendarPage] Error fetching month data:', err);
    }
  }, [year, month]);

  const loadDayDetail = useCallback(async (dateStr: string) => {
    try {
      if (!window.api) return;
      const detail = await window.api.sessions.getByDate(dateStr);
      setDayDetail(detail);
    } catch (err) {
      console.error('[CalendarPage] Error fetching day detail:', err);
    }
  }, []);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  useEffect(() => {
    loadDayDetail(selectedDate);
  }, [selectedDate, loadDayDetail]);

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

  // Convert month summaries to Record<date, totalSeconds>
  const dayDurations: Record<string, number> = {};
  monthSummaries.forEach((s) => {
    dayDurations[s.date] = s.totalSeconds;
  });

  const todayStr = getTodayString();
  if (activeSession) {
    dayDurations[todayStr] = (dayDurations[todayStr] || 0) + liveElapsed;
  }

  // Calculate live total for selected day
  const isSelectedToday = selectedDate === todayStr;
  const liveSelectedTotal = (dayDetail?.totalSeconds || 0) + (isSelectedToday && activeSession ? liveElapsed : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">History</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">Overall Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Click any date to see the tasks and individual sessions recorded
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Calendar Grid */}
        <div className="lg:col-span-2">
          <CalendarGrid
            year={year}
            month={month}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onCurrentMonth={handleCurrentMonth}
            dayDurations={dayDurations}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        </div>

        {/* Right 1 Col: Day Breakdown Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                  Date Breakdown
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mt-0.5">
                  {formatDateShort(selectedDate)}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Day Total</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                  {formatDuration(liveSelectedTotal)}
                </span>
              </div>
            </div>

            {!dayDetail || dayDetail.tasks.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <Clock className="w-9 h-9 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No time tracked on this date</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select a day with tracked activity to view details.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {dayDetail.tasks.map((taskItem) => {
                  const isTaskActiveToday =
                    isSelectedToday && activeSession?.task.id === taskItem.taskId;
                  const taskTotal =
                    taskItem.totalSeconds + (isTaskActiveToday ? liveElapsed : 0);

                  return (
                    <div
                      key={taskItem.taskId}
                      className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onOpenTaskDetails(taskItem.taskId)}
                          className="text-sm font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600 text-left transition-colors flex items-center space-x-1.5"
                        >
                          <span>{taskItem.taskName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          {formatDuration(taskTotal)}
                        </span>
                      </div>

                      {/* Sessions under this task */}
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                        {taskItem.sessions.map((s) => {
                          const isSessionRunning = s.status === 'running';
                          const durationSec = isSessionRunning ? liveElapsed : s.duration;

                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
                            >
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {formatTimestampTime(s.startTime)} →{' '}
                                {isSessionRunning ? 'Now' : formatTimestampTime(s.endTime)}
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {isSessionRunning ? formatTimeTicker(durationSec) : formatDuration(durationSec)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              {formatDateFull(selectedDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
