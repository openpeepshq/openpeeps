import { cn } from '@/lib/utils';
import { variantClasses } from '@/lib/variants';
import type { Variant } from '@/types';

export interface BadgeProps {
  status: string;
  variant?: Variant;
  className?: string;
}

export function Badge({
  status,
  variant = 'variant-filled-primary',
  className,
}: BadgeProps) {
  return (
    <span className={cn('op-badge', variantClasses(variant), className)}>{status}</span>
  );
}
