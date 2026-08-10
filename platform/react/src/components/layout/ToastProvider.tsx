import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { Toast, type ToastVariant } from '@openpeepshq/react-ui';
import { randomString } from '@openpeepshq/common/lib';

export interface ToastOptions {
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Omit for defaults (5s success, persistent error). */
  duration?: number;
}

interface ToastEntry {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  /** Show a toast with optional variant/duration. */
  toast: (message: string, options?: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * App-wide toast host mirroring the Svelte `<Toast position="tr" />` store.
 * Mount once near the app root so any feature can fire transient feedback.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, options?: ToastOptions) => {
    const id = randomString(8);
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        variant: options?.variant ?? 'success',
        duration: options?.duration,
      },
    ]);
  }, []);

  const success = useCallback(
    (message: string) => toast(message, { variant: 'success' }),
    [toast],
  );

  const error = useCallback(
    (message: string) => toast(message, { variant: 'error' }),
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {toasts.length > 0 ? (
        <div className="fixed right-4 top-4 z-[100] flex max-w-sm flex-col gap-2">
          {toasts.map((entry) => (
            <Toast
              key={entry.id}
              variant={entry.variant}
              duration={entry.duration}
              inline
              onDismiss={() => dismiss(entry.id)}
            >
              {entry.message}
            </Toast>
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
