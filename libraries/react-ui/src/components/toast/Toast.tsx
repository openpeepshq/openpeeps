import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error';

export interface ToastProps {
  children: ReactNode;
  variant?: ToastVariant;
  /**
   * Auto-dismiss delay in ms. Pass 0 to keep the toast until unmounted.
   * Defaults to 5s for success; error toasts stay until dismissed so the
   * user doesn't miss why an action failed.
   */
  duration?: number;
  onDismiss?: () => void;
  testId?: string;
  /** When true, skip fixed positioning (for stacking inside a toast host). */
  inline?: boolean;
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-success text-success-foreground border-success',
  error: 'bg-error text-error-foreground border-error',
};

/**
 * Fixed top-right toast, mirroring the Svelte app's `<Toast position="tr" />`.
 * Used for transient success/error notices that should float above the page
 * rather than sit inline in the document flow.
 */
export function Toast({
  children,
  variant = 'success',
  duration,
  onDismiss,
  testId,
  inline = false,
}: ToastProps) {
  const [visible, setVisible] = useState(true);
  const effectiveDuration = duration ?? (variant === 'error' ? 0 : 5000);

  useEffect(() => {
    if (!effectiveDuration) return;
    const id = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, effectiveDuration);
    return () => clearTimeout(id);
  }, [effectiveDuration, onDismiss]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const body = (
    <div
      role="status"
      data-testid={testId}
      className={cn(
        'flex items-start gap-2 rounded-md border p-3 text-sm font-medium shadow-md',
        variantClasses[variant],
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="-mr-1 -mt-0.5 shrink-0 opacity-80 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );

  if (inline) return body;

  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-2">
      {body}
    </div>
  );
}
