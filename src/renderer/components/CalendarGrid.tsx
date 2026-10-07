import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { generateMonthCalendarGrid, getMonthName } from '../utils/date';
import { formatDuration } from '../utils/time';

interface CalendarGridProps {
  year: number;
  month: number; // 1 - 12
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  dayDurations: Record<string, number>; // dateString (YYYY-MM-DD) -> duration in seconds
  selectedDate: string | null;
  onSelectDate: (dateString: string) => void;
  badgeLabel?: string; // Optional custom label
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  dayDurations,
  selectedDate,
  onSelectDate,
}) => {
  const cells = generateMonthCalendarGrid(year, month);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Calendar Header Navigation */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {getMonthName(month)} {year}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onCurrentMonth}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
            <button
              onClick={onPrevMonth}
              title="Previous Month"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={onNextMonth}
              title="Next Month"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2.5">
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 bg-slate-100 dark:bg-slate-800">
        {cells.map((cell) => {
          const duration = dayDurations[cell.dateString] || 0;
          const isSelected = selectedDate === cell.dateString;
          const hasTime = duration > 0;

          return (
            <button
              key={cell.dateString}
              type="button"
              onClick={() => onSelectDate(cell.dateString)}
              className={`min-h-[85px] sm:min-h-[95px] p-2 text-left flex flex-col justify-between transition-all bg-white dark:bg-slate-800 hover:bg-blue-50/40 relative group ${
                !cell.isCurrentMonth ? 'opacity-40 bg-slate-50 dark:bg-slate-900/50' : ''
              } ${
                isSelected
                  ? 'ring-2 ring-blue-600 ring-inset bg-blue-50/60 z-10'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    cell.isToday
                      ? 'bg-blue-600 text-white font-bold'
                      : isSelected
                      ? 'text-blue-700 font-bold'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cell.dayNumber}
                </span>
                {cell.isToday && (
                  <span className="text-[10px] font-bold text-blue-600 tracking-tight">Today</span>
                )}
              </div>

              {hasTime && (
                <div className="mt-1">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs group-hover:bg-emerald-100 transition-colors">
                    {formatDuration(duration)}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
