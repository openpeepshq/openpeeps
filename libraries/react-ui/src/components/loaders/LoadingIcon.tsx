import { cn } from '@/lib/utils';

export interface LoadingIconProps {
  className?: string;
}

export function LoadingIcon({ className }: LoadingIconProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'block h-10 w-10 animate-spin rounded-full border-4 border-surface-400 border-t-surface-50',
        className,
      )}
    />
  );
}
