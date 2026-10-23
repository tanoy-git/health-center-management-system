'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global dispatcher to allow calling toast.success() / toast.error() outside of React component trees
type ToastListener = (type: ToastType, message: string, title?: string, duration?: number) => void;
let globalListener: ToastListener | null = null;

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    if (globalListener) {
      globalListener('success', message, title, duration);
    } else {
      console.log('[Toast Success]:', message);
    }
  },
  error: (message: string, title?: string, duration?: number) => {
    if (globalListener) {
      globalListener('error', message, title, duration);
    } else {
      console.error('[Toast Error]:', message);
    }
  },
  warning: (message: string, title?: string, duration?: number) => {
    if (globalListener) {
      globalListener('warning', message, title, duration);
    } else {
      console.warn('[Toast Warning]:', message);
    }
  },
  info: (message: string, title?: string, duration?: number) => {
    if (globalListener) {
      globalListener('info', message, title, duration);
    } else {
      console.info('[Toast Info]:', message);
    }
  },
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return the global standalone toast methods if used outside provider
    return {
      toasts: [],
      addToast: (type: ToastType, message: string, title?: string, duration?: number) =>
        toast[type](message, title, duration),
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      toast,
    };
  }
  return { ...context, toast };
};

const toastConfig: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    borderColor: string;
    bgColor: string;
    accentColor: string;
    iconColor: string;
    progressColor: string;
    defaultTitle: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    borderColor: 'border-emerald-500/30 dark:border-emerald-500/40',
    bgColor: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    accentColor: 'text-emerald-800 dark:text-emerald-200',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    progressColor: 'bg-emerald-500',
    defaultTitle: 'Success',
  },
  error: {
    icon: AlertCircle,
    borderColor: 'border-rose-500/30 dark:border-rose-500/40',
    bgColor: 'bg-rose-50/90 dark:bg-rose-950/40',
    accentColor: 'text-rose-800 dark:text-rose-200',
    iconColor: 'text-rose-500 dark:text-rose-400',
    progressColor: 'bg-rose-500',
    defaultTitle: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'border-amber-500/30 dark:border-amber-500/40',
    bgColor: 'bg-amber-50/90 dark:bg-amber-950/40',
    accentColor: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-500 dark:text-amber-400',
    progressColor: 'bg-amber-500',
    defaultTitle: 'Notice',
  },
  info: {
    icon: Info,
    borderColor: 'border-sky-500/30 dark:border-sky-500/40',
    bgColor: 'bg-sky-50/90 dark:bg-sky-950/40',
    accentColor: 'text-sky-800 dark:text-sky-200',
    iconColor: 'text-sky-500 dark:text-sky-400',
    progressColor: 'bg-sky-500',
    defaultTitle: 'Information',
  },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = item.duration || 4200;
  const config = toastConfig[item.type];
  const Icon = config.icon;
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);

  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(item.id);
          return 0;
        }
        return Math.max(0, prev - step);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, duration, item.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      className={`group relative overflow-hidden rounded-xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-top-3 fade-in duration-200 ${config.borderColor} ${config.bgColor} bg-card/95 text-foreground`}
      style={{
        boxShadow:
          item.type === 'error'
            ? '0 12px 30px -6px rgba(244, 63, 94, 0.2), 0 4px 10px rgba(0, 0, 0, 0.08)'
            : item.type === 'success'
            ? '0 12px 30px -6px rgba(16, 185, 129, 0.2), 0 4px 10px rgba(0, 0, 0, 0.08)'
            : '0 12px 30px -6px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            item.type === 'success'
              ? 'bg-emerald-500/10 dark:bg-emerald-500/20'
              : item.type === 'error'
              ? 'bg-rose-500/10 dark:bg-rose-500/20'
              : item.type === 'warning'
              ? 'bg-amber-500/10 dark:bg-amber-500/20'
              : 'bg-sky-500/10 dark:bg-sky-500/20'
          }`}
        >
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {item.title || config.defaultTitle}
            </h4>
          </div>
          <p className="mt-0.5 text-sm font-medium leading-snug break-words text-foreground">
            {item.message}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar countdown */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ease-linear ${config.progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration?: number) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message, title, duration }]);
    },
    []
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast('success', message, title, duration),
    [addToast]
  );
  const error = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast('error', message, title, duration),
    [addToast]
  );
  const warning = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast('warning', message, title, duration),
    [addToast]
  );
  const info = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast('info', message, title, duration),
    [addToast]
  );

  useEffect(() => {
    globalListener = (type, message, title, duration) => {
      addToast(type, message, title, duration);
    };

    // Override browser native window.alert globally as a safety net
    if (typeof window !== 'undefined') {
      window.alert = (msg: any) => {
        addToast('info', String(msg ?? ''));
      };
    }

    return () => {
      globalListener = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      {/* Toast floating container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
