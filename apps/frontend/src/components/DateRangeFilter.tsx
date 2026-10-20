'use client';

import React from 'react';
import { Calendar, Filter } from 'lucide-react';

export interface DateFilterValue {
  mode: 'daily' | 'monthly' | 'range';
  dailyDate: string; // YYYY-MM-DD
  month: number;     // 1 - 12
  year: number;      // e.g. 2026
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export function getDefaultDateFilter(): DateFilterValue {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  return {
    mode: 'daily',
    dailyDate: todayStr,
    month: now.getMonth() + 1,
    year: yyyy,
    startDate: todayStr,
    endDate: todayStr,
  };
}

export function filterMatchesDate(
  itemDateStr: string | Date | null | undefined,
  filter: DateFilterValue,
): boolean {
  if (!itemDateStr) return false;
  const d = new Date(itemDateStr);
  if (isNaN(d.getTime())) return false;

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dateFormatted = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (filter.mode === 'daily') {
    return dateFormatted === filter.dailyDate;
  }

  if (filter.mode === 'monthly') {
    return y === Number(filter.year) && m === Number(filter.month);
  }

  if (filter.mode === 'range') {
    if (!filter.startDate && !filter.endDate) return true;
    if (filter.startDate && filter.endDate) {
      return dateFormatted >= filter.startDate && dateFormatted <= filter.endDate;
    }
    if (filter.startDate) return dateFormatted >= filter.startDate;
    if (filter.endDate) return dateFormatted <= filter.endDate;
  }

  return true;
}

interface DateRangeFilterProps {
  value: DateFilterValue;
  onChange: (val: DateFilterValue) => void;
  className?: string;
  showIcon?: boolean;
}

export default function DateRangeFilter({
  value,
  onChange,
  className = '',
  showIcon = true,
}: DateRangeFilterProps) {
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-sm ${className}`}
    >
      {showIcon && (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
          <Calendar className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex items-center gap-1">
        <label className="text-[11px] font-semibold text-muted-foreground mr-1">
          Period:
        </label>
        <select
          value={value.mode}
          onChange={(e) =>
            onChange({
              ...value,
              mode: e.target.value as 'daily' | 'monthly' | 'range',
            })
          }
          className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
        >
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="range">Date Range</option>
        </select>
      </div>

      {/* Daily Mode */}
      {value.mode === 'daily' && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <span className="text-[11px] text-muted-foreground font-medium">Date:</span>
          <input
            type="date"
            value={value.dailyDate}
            onChange={(e) =>
              onChange({
                ...value,
                dailyDate: e.target.value,
              })
            }
            className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>
      )}

      {/* Monthly Mode */}
      {value.mode === 'monthly' && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <span className="text-[11px] text-muted-foreground font-medium">Month:</span>
          <select
            value={value.month}
            onChange={(e) =>
              onChange({
                ...value,
                month: Number(e.target.value),
              })
            }
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-muted-foreground font-medium ml-1">Year:</span>
          <select
            value={value.year}
            onChange={(e) =>
              onChange({
                ...value,
                year: Number(e.target.value),
              })
            }
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range Mode */}
      {value.mode === 'range' && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <span className="text-[11px] text-muted-foreground font-medium">From:</span>
          <input
            type="date"
            value={value.startDate}
            onChange={(e) =>
              onChange({
                ...value,
                startDate: e.target.value,
              })
            }
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-[11px] text-muted-foreground font-medium">To:</span>
          <input
            type="date"
            value={value.endDate}
            onChange={(e) =>
              onChange({
                ...value,
                endDate: e.target.value,
              })
            }
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
