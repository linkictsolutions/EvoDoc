"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultMessage(variant: ToastVariant): string {
  if (variant === "success") {
    return "Saved successfully.";
  }
  if (variant === "error") {
    return "Something went wrong.";
  }
  return "Done.";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Record<string, number>>({});
  const exitTimeoutsRef = useRef<Record<string, number>>({});

  const removeNow = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));

    const timeoutId = timeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete timeoutsRef.current[id];
    }

    const exitTimeoutId = exitTimeoutsRef.current[id];
    if (exitTimeoutId) {
      window.clearTimeout(exitTimeoutId);
      delete exitTimeoutsRef.current[id];
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      setToasts((items) => items.map((item) => (item.id === id ? { ...item, exiting: true } : item)));
      exitTimeoutsRef.current[id] = window.setTimeout(() => removeNow(id), 180);
    },
    [removeNow],
  );

  const show = useCallback(
    (variant: ToastVariant, message?: string) => {
      const id = uniqueId("toast");
      const resolvedMessage = (message ?? "").trim() || defaultMessage(variant);

      setToasts((items) => [...items, { id, message: resolvedMessage, variant }]);
      timeoutsRef.current[id] = window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => show("success", message),
      error: (message) => show("error", message),
      info: (message) => show("info", message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className={`toast toast-${toast.variant}${toast.exiting ? " is-exiting" : ""}`}
            onClick={() => dismiss(toast.id)}
            title="Dismiss"
          >
            <span className="toast-badge" aria-hidden>
              {toast.variant === "success" ? (
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path
                    d="M9.2 16.2 5.6 12.6a1.2 1.2 0 0 1 1.7-1.7l2.8 2.8 6.6-6.6a1.2 1.2 0 1 1 1.7 1.7l-7.5 7.5a1.2 1.2 0 0 1-1.7 0Z"
                    fill="currentColor"
                  />
                </svg>
              ) : toast.variant === "error" ? (
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path
                    d="M7.3 6.3a1.2 1.2 0 0 1 1.7 0L12 9.3l3-3a1.2 1.2 0 1 1 1.7 1.7l-3 3 3 3a1.2 1.2 0 1 1-1.7 1.7l-3-3-3 3a1.2 1.2 0 1 1-1.7-1.7l3-3-3-3a1.2 1.2 0 0 1 0-1.7Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path
                    d="M12 2.8a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4Zm0 5.1a1.1 1.1 0 0 1 1.1 1.1v3.4a1.1 1.1 0 0 1-2.2 0V9a1.1 1.1 0 0 1 1.1-1.1Zm0 9.1a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </span>
            <span className="toast-message">{toast.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
