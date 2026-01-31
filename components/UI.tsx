import React, { Fragment } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, Calendar } from 'lucide-react';
import { DateRange, DateRangePreset } from '../types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subWeeks } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Card
export interface CardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}
export const Card: React.FC<CardProps> = ({ children, className, onClick }) => (
  <div 
    onClick={onClick} 
    className={cn(
      "bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 p-6 transition-all duration-200", 
      onClick && "hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-[0.99] cursor-pointer",
      className
    )}
  >
    {children}
  </div>
);

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ className, variant = 'primary', size = 'md', ...props }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:shadow-none active:scale-95 transition-all',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all font-semibold',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all font-medium',
    ghost: 'hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-3 text-sm rounded-xl',
    lg: 'px-8 py-4 text-base rounded-2xl',
    icon: 'p-2 rounded-xl',
  };

  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:pointer-events-none", variants[variant], sizes[size], className)}
      {...props}
    />
  );
};

// Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}
export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => (
  <div className="w-full group">
    {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <input
      className={cn(
        "w-full rounded-xl border-slate-200 bg-slate-50/50 p-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-base",
        error && "border-red-300 focus:border-red-500 focus:ring-red-100",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
  </div>
);

// Select
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  className?: string;
}
export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-xl border-slate-200 bg-slate-50/50 p-3 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-base",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
);

// Modal
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Layout Container
export const Container: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("max-w-2xl mx-auto px-5 pb-32 pt-6", className)}>{children}</div>
);

// StatRow
export const StatRow: React.FC<{ label: string; value: string; subtext?: string; highlight?: boolean }> = ({ label, value, subtext, highlight }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
    <span className="text-sm font-medium text-slate-500">{label}</span>
    <div className="text-right">
      <div className={cn("font-bold text-base tracking-tight", highlight ? "text-blue-600" : "text-slate-900")}>{value}</div>
      {subtext && <div className="text-xs font-medium text-slate-400 mt-0.5">{subtext}</div>}
    </div>
  </div>
);

// ProgressBar
export const ProgressBar: React.FC<{ value: number; max: number; color?: string; className?: string }> = ({ value, max, color = "bg-blue-500", className }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={cn("h-1.5 w-full bg-slate-100 rounded-full overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percentage}%` }} />
    </div>
  );
};

// Badge
export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'red' | 'blue' | 'slate' | 'orange' }> = ({ children, color = 'slate' }) => {
  const styles = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
    orange: 'bg-amber-100 text-amber-700'
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide", styles[color])}>
      {children}
    </span>
  );
};

// TimeRangeSelector
export const TimeRangeSelector: React.FC<{ range: DateRange; onChange: (r: DateRange) => void }> = ({ range, onChange }) => {
  const presets: { label: string; value: DateRangePreset }[] = [
    { label: 'Today', value: 'TODAY' },
    { label: 'Week', value: 'WEEK' },
    { label: 'Last Week', value: 'LAST_WEEK' },
    { label: 'Month', value: 'MONTH' },
    { label: 'Last Month', value: 'LAST_MONTH' },
    { label: '3 Months', value: '3_MONTHS' },
    { label: '6 Months', value: '6_MONTHS' },
    { label: 'Year', value: 'YEAR' },
    { label: 'All', value: 'ALL' },
  ];

  const handlePresetChange = (preset: DateRangePreset) => {
    const now = new Date();
    let start = now;
    let end = now;
    let label = '';

    switch (preset) {
        case 'TODAY': start = startOfDay(now); end = endOfDay(now); label = 'Today'; break;
        case 'WEEK': start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); label = 'This Week'; break;
        case 'LAST_WEEK': 
            start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }); 
            end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }); 
            label = 'Last Week'; 
            break;
        case 'MONTH': start = startOfMonth(now); end = endOfMonth(now); label = 'This Month'; break;
        case 'LAST_MONTH': 
            start = startOfMonth(subMonths(now, 1)); 
            end = endOfMonth(subMonths(now, 1)); 
            label = 'Last Month'; 
            break;
        case '3_MONTHS': start = subMonths(now, 3); label = 'Last 3 Months'; break;
        case '6_MONTHS': start = subMonths(now, 6); label = 'Last 6 Months'; break;
        case 'YEAR': start = startOfYear(now); end = endOfYear(now); label = 'This Year'; break;
        case 'ALL': start = new Date(0); label = 'All Time'; break;
    }

    onChange({ preset, start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd'), label });
  };

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide flex gap-2">
      {presets.map(p => (
        <button
          key={p.value}
          onClick={() => handlePresetChange(p.value)}
          className={cn(
            "flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            range.preset === p.value 
              ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105" 
              : "bg-white text-slate-500 border border-slate-100 hover:border-slate-300"
          )}
        >
          {p.label}
        </button>
      ))}
      <div className="w-2" /> 
    </div>
  );
};