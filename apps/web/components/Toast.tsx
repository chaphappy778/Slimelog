// apps/web/components/Toast.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Style helpers ─────────────────────────────────────────────────────────────

const STYLES: Record<ToastType, { border: string; color: string }> = {
  success: {
    border: "1px solid rgba(57,255,20,0.4)",
    color: "#39FF14",
  },
  error: {
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#f87171",
  },
  info: {
    border: "1px solid rgba(0,240,255,0.4)",
    color: "#00F0FF",
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  );
}

function XCircleIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ToastIcon({ type, color }: { type: ToastType; color: string }) {
  if (type === "success") return <CheckIcon color={color} />;
  if (type === "error") return <XCircleIcon color={color} />;
  return <InfoIcon color={color} />;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 3000;
const EXIT_DURATION_MS = 150;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    // Mark as exiting (triggers fade-out animation)
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_DURATION_MS);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = ++counterRef.current;

      setToasts((prev) => {
        let next = [...prev, { id, message, type, exiting: false }];
        // Enforce max — dismiss oldest if over limit
        if (next.length > MAX_TOASTS) {
          const oldest = next[0];
          // Trigger dismiss side-effect outside state updater
          setTimeout(() => dismiss(oldest.id), 0);
          next = next.slice(1);
        }
        return next;
      });

      // Auto-dismiss
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack */}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
          width: "min(90vw, 360px)",
        }}
      >
        {toasts.map((toast) => {
          const style = STYLES[toast.type];
          return (
            <div
              key={toast.id}
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(10,0,20,0.92)",
                border: style.border,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: style.color,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Montserrat, Inter, sans-serif",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                pointerEvents: "auto",
                whiteSpace: "nowrap",
                animation: toast.exiting
                  ? `toastOut ${EXIT_DURATION_MS}ms ease forwards`
                  : "toastIn 200ms ease forwards",
              }}
            >
              <ToastIcon type={toast.type} color={style.color} />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
